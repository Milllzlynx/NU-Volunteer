import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);

export const hashPassword = (pw) => bcrypt.hash(pw, 12);          // ห้ามเก็บ plain text
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

export function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL, issuer: 'nuv' }
  );
}

export function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, { issuer: 'nuv' });
}

export async function issueSession(user, req) {
  const refresh = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 864e5);
  await prisma.session.create({
    data: {
      userId: user.id, refreshHash: sha256(refresh), expiresAt,
      userAgent: String(req.get('user-agent') || '').slice(0, 250),
      ip: req.ip || '', device: deviceName(req.get('user-agent') || ''),
    },
  });
  return { access: signAccess(user), refresh, expiresAt };
}

export function deviceName(ua) {
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Unknown device';
}

const secure = String(process.env.COOKIE_SECURE || 'true') !== 'false';
const base = {
  httpOnly: true,                 // ป้องกัน XSS อ่าน token — ห้ามเก็บใน localStorage
  secure,
  sameSite: secure ? 'none' : 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

export function setAuthCookies(res, { access, refresh, expiresAt }) {
  res.cookie('nuv_at', access, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('nuv_rt', refresh, { ...base, expires: expiresAt, path: '/api/v1/auth' });
}

export function clearAuthCookies(res) {
  res.clearCookie('nuv_at', { ...base });
  res.clearCookie('nuv_rt', { ...base, path: '/api/v1/auth' });
}
