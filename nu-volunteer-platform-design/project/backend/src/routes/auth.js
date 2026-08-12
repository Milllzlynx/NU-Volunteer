import { Router } from 'express';
import { z } from 'zod';
import { prisma, authLog } from '../lib/db.js';
import { ApiError, fail } from '../lib/errors.js';
import {
  hashPassword, verifyPassword, sha256, randomToken,
  issueSession, setAuthCookies, clearAuthCookies, deviceName,
} from '../lib/tokens.js';
import { sendMail } from '../lib/mailer.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginLimiter, registerLimiter, forgotLimiter } from '../middleware/rateLimit.js';
import { captchaGate } from '../lib/captcha.js';

export const auth = Router();

const DOMAIN = process.env.EMAIL_DOMAIN || 'nu.ac.th';
const RESET_TTL = Number(process.env.RESET_TTL_MINUTES || 30) * 60_000;
const norm = (e) => String(e || '').trim().toLowerCase();
const ctx = (req) => ({ ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 250) });

// validation ทั้งหมดทำซ้ำที่ backend — ไม่เชื่อฝั่ง client
function assertPassword(pw) {
  const s = String(pw || '');
  if (s.length < 8) fail('WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) fail('WEAK_PASSWORD', 'ต้องมีทั้งตัวอักษรและตัวเลข');
}
function assertDomain(email) {
  if (!new RegExp('@' + DOMAIN.replace('.', '\\.') + '$').test(email)) fail('EMAIL_DOMAIN');
}
const publicUser = (u) => ({
  id: u.id, email: u.email, role: u.role, name: u.name,
  studentId: u.studentId || '', faculty: u.faculty || '', loanStatus: u.loanStatus || '',
});

/* GET /api/v1/auth/check-email?email= */
auth.get('/check-email', async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({ where: { email: norm(req.query.email) } });
    res.json({ ok: true, exists: !!u });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/register */
auth.post('/register', registerLimiter, captchaGate, async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string(), password: z.string(), name: z.string().optional(),
      studentId: z.string().optional(), faculty: z.string().optional(),
      loanStatus: z.string().optional(), role: z.string().optional(),
      acceptedTerms: z.boolean().optional(),
    }).parse(req.body || {});

    const email = norm(body.email);
    assertDomain(email);
    assertPassword(body.password);
    if (!body.acceptedTerms) fail('TERMS_REQUIRED');

    const user = await prisma.user.create({
      data: {
        email, passwordHash: await hashPassword(body.password),
        role: body.role === 'organizer' || body.role === 'admin' ? 'student' : 'student', // สมัครเองได้เฉพาะนิสิต
        name: body.name || '', studentId: body.studentId || null,
        faculty: body.faculty || null, loanStatus: body.loanStatus || null,
      },
    }).catch((e) => {
      if (e.code === 'P2002') fail('EMAIL_TAKEN');   // unique constraint ในฐานข้อมูล
      throw e;
    });

    await authLog('register', { email, ...ctx(req) });
    const tokens = await issueSession(user, req);
    setAuthCookies(res, tokens);
    res.status(201).json({ ok: true, account: publicUser(user) });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/login */
auth.post('/login', loginLimiter, captchaGate, async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body || {};
    const email = norm(rawEmail);
    if (!email || !password) fail('INVALID_CREDENTIALS');

    const user = await prisma.user.findUnique({ where: { email } });
    // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด เพื่อไม่ให้ใช้ฟอร์มสแกนหาอีเมล
    const ok = user ? await verifyPassword(String(password), user.passwordHash) : false;
    if (!ok) {
      await authLog('login.failed', { email, ...ctx(req) });
      fail('INVALID_CREDENTIALS');
    }
    if (!user.active) fail('ACCOUNT_DISABLED');

    const tokens = await issueSession(user, req);
    setAuthCookies(res, tokens);
    await authLog('login.success', { email, ...ctx(req) });
    res.json({ ok: true, account: publicUser(user) });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/refresh — ต่ออายุ access token ด้วย refresh cookie (rotation) */
auth.post('/refresh', async (req, res, next) => {
  try {
    const rt = req.cookies?.nuv_rt;
    if (!rt) throw new ApiError('UNAUTHORIZED');
    const session = await prisma.session.findUnique({ where: { refreshHash: sha256(rt) }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) throw new ApiError('UNAUTHORIZED');
    if (session.user.tokensValidFrom > session.createdAt) throw new ApiError('UNAUTHORIZED');

    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await issueSession(session.user, req);
    setAuthCookies(res, tokens);
    res.json({ ok: true, account: publicUser(session.user) });
  } catch (e) { next(e); }
});

/* GET /api/v1/auth/me */
auth.get('/me', requireAuth, (req, res) => res.json({ ok: true, account: publicUser(req.user) }));

/* GET /api/v1/auth/sessions */
auth.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const list = await prisma.session.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
    const currentHash = req.cookies?.nuv_rt ? sha256(req.cookies.nuv_rt) : '';
    res.json({
      ok: true,
      sessions: list.map((s) => ({
        id: s.id, device: s.device, ip: s.ip, lastSeenAt: s.lastSeenAt,
        current: s.refreshHash === currentHash,
      })),
    });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/password — เปลี่ยนรหัสผ่าน + invalidate เซสชันอื่นจริง */
auth.post('/password', requireAuth, async (req, res, next) => {
  try {
    const { current, next: nextPw } = req.body || {};
    assertPassword(nextPw);
    if (String(current) === String(nextPw)) fail('SAME_PASSWORD');
    if (!(await verifyPassword(String(current || ''), req.user.passwordHash))) {
      fail('INVALID_CREDENTIALS', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    const now = new Date();
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: await hashPassword(nextPw), tokensValidFrom: now },
    });
    const currentHash = req.cookies?.nuv_rt ? sha256(req.cookies.nuv_rt) : '';
    await prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null, NOT: { refreshHash: currentHash } },
      data: { revokedAt: now },
    });
    const tokens = await issueSession(req.user, req);   // ออก token ใหม่ให้อุปกรณ์ปัจจุบัน
    setAuthCookies(res, tokens);
    sendMail('password.changed', {
      to: req.user.email, lang: req.body?.lang,
      vars: { time: now.toLocaleString('th-TH'), device: deviceName(req.get('user-agent') || '') },
    }).catch(() => {});
    const remaining = await prisma.session.count({ where: { userId: req.user.id, revokedAt: null } });
    res.json({ ok: true, revoked: true, sessionsRemaining: remaining });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/logout-other-sessions */
auth.post('/logout-other-sessions', requireAuth, async (req, res, next) => {
  try {
    const currentHash = req.cookies?.nuv_rt ? sha256(req.cookies.nuv_rt) : '';
    const r = await prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null, NOT: { refreshHash: currentHash } },
      data: { revokedAt: new Date() },
    });
    await authLog('logout.others', { email: req.user.email, ...ctx(req), detail: String(r.count) });
    res.json({ ok: true, revoked: r.count });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/logout */
auth.post('/logout', async (req, res, next) => {
  try {
    const rt = req.cookies?.nuv_rt;
    if (rt) await prisma.session.updateMany({ where: { refreshHash: sha256(rt) }, data: { revokedAt: new Date() } });
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/forgot — ตอบเหมือนกันทุกกรณี ไม่เปิดเผยว่าอีเมลมีบัญชี */
auth.post('/forgot', forgotLimiter, captchaGate, async (req, res, next) => {
  try {
    const email = norm(req.body?.email);
    const user = await prisma.user.findUnique({ where: { email } });
    await authLog('forgot', { email, ...ctx(req) });
    if (user) {
      const token = randomToken();
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() },   // ยกเลิกลิงก์เก่า
      });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL) },
      });
      const link = (req.body?.baseLink || process.env.RESET_LINK_BASE) + '?token=' + token;
      await sendMail('password.reset-requested', {
        to: email, lang: req.body?.lang,
        vars: { email, link, ttl: Math.round(RESET_TTL / 60000) },
      }).catch((e) => console.error('[mail]', e.message));
    }
    res.json({ ok: true, sent: true });    // ไม่คืน token ให้ client เด็ดขาด
  } catch (e) { next(e); }
});

/* POST /api/v1/auth/reset */
auth.post('/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    assertPassword(password);
    const rec = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token || '') }, include: { user: true },
    });
    if (!rec) fail('TOKEN_INVALID');
    if (rec.usedAt) fail('TOKEN_USED');
    if (rec.expiresAt < new Date()) fail('TOKEN_EXPIRED');

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: rec.userId },
        data: { passwordHash: await hashPassword(password), tokensValidFrom: now },
      }),
      prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: now } }),
      prisma.session.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    await authLog('reset', { email: rec.user.email, ...ctx(req) });
    sendMail('password.changed', {
      to: rec.user.email, lang: req.body?.lang,
      vars: { time: now.toLocaleString('th-TH'), device: deviceName(req.get('user-agent') || '') },
    }).catch(() => {});
    res.json({ ok: true, email: rec.user.email });
  } catch (e) { next(e); }
});
