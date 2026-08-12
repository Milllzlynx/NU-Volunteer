import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);

export const AT_COOKIE = 'nuv_at';
export const RT_COOKIE = 'nuv_rt';

// refresh cookie จำกัด path ไว้ที่ endpoint ของ auth เท่านั้น
export const RT_PATH = '/api/v1/auth';

function accessSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12); // ห้ามเก็บ plain text
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const sha256 = (s: string) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

export type AccessClaims = {
  sub: string;
  role: string;
  email: string;
  iat: number;
};

export async function signAccess(user: { id: string; role: string; email: string }) {
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('nuv')
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(accessSecret());
}

export async function verifyAccess(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessSecret(), { issuer: 'nuv' });
  return payload as unknown as AccessClaims;
}

export function deviceName(ua: string) {
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Unknown device';
}

export function requestContext(req: Request) {
  const h = req.headers;
  const forwarded = h.get('x-forwarded-for') || '';
  const ip = (forwarded.split(',')[0] || h.get('x-real-ip') || '').trim() || '127.0.0.1';
  const userAgent = (h.get('user-agent') || '').slice(0, 250);
  return { ip, userAgent };
}

export async function issueSession(
  user: { id: string; role: string; email: string },
  req: Request,
) {
  const refresh = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 864e5);
  const { ip, userAgent } = requestContext(req);
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshHash: sha256(refresh),
      expiresAt,
      userAgent,
      ip,
      device: deviceName(userAgent),
    },
  });
  return { access: await signAccess(user), refresh, expiresAt };
}

const secure = String(process.env.COOKIE_SECURE || 'true') !== 'false';

function baseCookie() {
  return {
    httpOnly: true as const, // ป้องกัน XSS อ่าน token — ห้ามเก็บใน localStorage
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

export async function setAuthCookies(tokens: {
  access: string;
  refresh: string;
  expiresAt: Date;
}) {
  const jar = await cookies();
  const base = baseCookie();
  jar.set(AT_COOKIE, tokens.access, { ...base, maxAge: 15 * 60 });
  jar.set(RT_COOKIE, tokens.refresh, { ...base, expires: tokens.expiresAt, path: RT_PATH });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  const base = baseCookie();
  jar.set(AT_COOKIE, '', { ...base, maxAge: 0 });
  jar.set(RT_COOKIE, '', { ...base, path: RT_PATH, maxAge: 0 });
}

export async function currentRefreshHash() {
  const jar = await cookies();
  const rt = jar.get(RT_COOKIE)?.value;
  return rt ? sha256(rt) : '';
}
