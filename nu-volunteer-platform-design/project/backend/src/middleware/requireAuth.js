import { verifyAccess } from '../lib/tokens.js';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const bearer = (req.get('authorization') || '').replace(/^Bearer /i, '');
    const token = req.cookies?.nuv_at || bearer;
    if (!token) throw new ApiError('UNAUTHORIZED');
    const claims = verifyAccess(token);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || !user.active) throw new ApiError('UNAUTHORIZED');
    // token ที่ออกก่อนเปลี่ยนรหัสผ่าน / ก่อน logout-other-sessions ถือว่าใช้ไม่ได้
    if (claims.iat * 1000 < new Date(user.tokensValidFrom).getTime()) throw new ApiError('UNAUTHORIZED');
    req.user = user;
    next();
  } catch (e) {
    next(e instanceof ApiError ? e : new ApiError('UNAUTHORIZED'));
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  next(roles.includes(req.user?.role) ? undefined : new ApiError('UNAUTHORIZED', 'ไม่มีสิทธิ์เข้าถึง', 403));
