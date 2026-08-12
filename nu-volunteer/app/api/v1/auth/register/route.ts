import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLog, prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { captchaGate } from '@/lib/captcha';
import { checkLimit, recordFailure, registerLimiter, resetLimit } from '@/lib/rateLimit';
import { hashPassword, issueSession, requestContext, setAuthCookies } from '@/lib/tokens';
import { publicUser } from '@/lib/auth';
import { assertDomain, assertPassword, normEmail, readJson } from '@/lib/validation';

const Body = z.object({
  email: z.string(),
  password: z.string(),
  name: z.string().optional(),
  studentId: z.string().optional(),
  faculty: z.string().optional(),
  loanStatus: z.string().optional(),
  role: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
  captchaToken: z.string().optional(),
});

/* POST /api/v1/auth/register */
export const POST = handler(async (req) => {
  const raw = await readJson(req);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) fail('VALIDATION_ERROR');
  const body = parsed.data;

  const email = normEmail(body.email);
  const { ip, userAgent } = requestContext(req);

  await checkLimit(registerLimiter, ip, email);
  await captchaGate(ip, body.captchaToken);

  try {
    assertDomain(email);
    assertPassword(body.password);
    if (!body.acceptedTerms) fail('TERMS_REQUIRED');
  } catch (e) {
    recordFailure(registerLimiter, ip, email);
    throw e;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    recordFailure(registerLimiter, ip, email);
    fail('EMAIL_TAKEN');
  }

  const user = await prisma.user
    .create({
      data: {
        email,
        passwordHash: await hashPassword(body.password),
        // สมัครเองจากหน้าเว็บได้เฉพาะบทบาทนิสิตเท่านั้น — บทบาทอื่นแอดมินเป็นผู้กำหนด
        role: 'student',
        name: body.name || '',
        studentId: body.studentId || null,
        faculty: body.faculty || null,
        loanStatus: body.loanStatus || null,
      },
    })
    .catch((e: { code?: string }) => {
      if (e.code === 'P2002') fail('EMAIL_TAKEN'); // unique constraint ในฐานข้อมูล
      throw e;
    });

  resetLimit(registerLimiter, ip, email);
  await authLog('register', { email, ip, userAgent });

  const tokens = await issueSession(user, req);
  await setAuthCookies(tokens);

  return NextResponse.json({ ok: true, account: publicUser(user) }, { status: 201 });
});
