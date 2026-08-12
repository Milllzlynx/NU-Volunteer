import { PrismaClient } from '@prisma/client';
export const prisma = global.__nuvPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__nuvPrisma = prisma;

export async function authLog(event, { email = '', ip = '', userAgent = '', detail = '' } = {}) {
  try { await prisma.authLog.create({ data: { event, email, ip, userAgent, detail } }); }
  catch (e) { console.error('[authLog]', e.message); }
}
