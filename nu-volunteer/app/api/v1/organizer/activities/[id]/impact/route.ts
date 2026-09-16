import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';

/**
 * GET /api/v1/organizer/activities/:id/impact — ใครและอะไรจะได้รับผลถ้าลบกิจกรรมนี้
 *
 * กล่องยืนยันการลบต้องบอกให้ได้ว่ากระทบนิสิตกี่คน ชั่วโมงเท่าไร ใบประกาศกี่ใบ
 * ตัวเลขพวกนี้ไม่ได้อยู่ในข้อมูลของแถวในหน้ารายการ (มีแค่ที่นั่งที่ลงแล้วกับจำนวนที่รออนุมัติ)
 * และการใส่เพิ่มเข้าไปทุกแถวแปลว่าต้องนับให้กิจกรรมทุกอันทั้งที่เปิดกล่องยืนยันทีละอัน
 * จึงแยกมาเป็นปลายทางที่เรียกตอนเปิดกล่องแทน
 */
export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireStaff();
  await requireOwnedActivity(user, id);

  const [students, registrations, hours, certificates, activeCertificates, reviews] = await Promise.all([
    prisma.registration.groupBy({ by: ['userId'], where: { activityId: id } }),
    prisma.registration.count({ where: { activityId: id } }),
    prisma.registration.aggregate({
      where: { activityId: id, hoursApprovedAt: { not: null } },
      _sum: { hoursAwarded: true },
    }),
    prisma.certificate.count({ where: { activityId: id } }),
    prisma.certificate.count({ where: { activityId: id, revokedAt: null } }),
    prisma.review.count({ where: { activityId: id } }),
  ]);

  return NextResponse.json({
    ok: true,
    impact: {
      students: students.length,
      registrations,
      hours: hours._sum.hoursAwarded ?? 0,
      certificates,
      activeCertificates,
      reviews,
    },
  });
});
