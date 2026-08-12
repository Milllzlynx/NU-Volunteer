import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { AT_COOKIE, verifyAccess } from '@/lib/tokens';
import type { UserModel as User } from '@/lib/generated/prisma/models';

export type PublicUser = {
  id: string;
  email: string;
  role: string;
  name: string;
  studentId: string;
  faculty: string;
  loanStatus: string;
  avatarUrl: string | null;
};

export const publicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  name: u.name,
  studentId: u.studentId || '',
  faculty: u.faculty || '',
  loanStatus: u.loanStatus || '',
  avatarUrl: u.avatarUrl || null,
});

/**
 * อ่านผู้ใช้จาก access token cookie — คืน null ถ้าไม่มี/หมดอายุ
 * ใช้ได้ทั้งใน route handler และ server component
 */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(AT_COOKIE)?.value;
  if (!token) return null;

  try {
    const claims = await verifyAccess(token);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || !user.active) return null;
    // เปลี่ยนรหัสผ่าน/ออกจากทุกอุปกรณ์แล้ว token เก่าต้องใช้ไม่ได้ทันที
    if (Math.floor(user.tokensValidFrom.getTime() / 1000) > claims.iat) return null;
    return user;
  } catch {
    return null;
  }
}

/** เหมือน requireAuth ของ Express — โยน UNAUTHORIZED ถ้าไม่ได้ล็อกอิน */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError('UNAUTHORIZED');
  return user;
}

/** จำกัดตามบทบาท — admin เข้าถึงได้ทุกอย่างที่ organizer ทำได้ */
export async function requireRole(...roles: string[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError('FORBIDDEN');
  return user;
}

export async function requireStaff(): Promise<User> {
  return requireRole('organizer', 'admin');
}

export async function requireAdmin(): Promise<User> {
  return requireRole('admin');
}
