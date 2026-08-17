import { requireStaff } from '@/lib/auth';
import { subscribeActivity, type CheckinEvent } from '@/lib/checkinBus';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { requireOwnedActivity } from '@/lib/organizer';

/** จำนวนรายการล่าสุดที่ส่งไปตั้งต้นให้หน้าจอ ก่อนจะเริ่มไหลแบบสด */
const SNAPSHOT_SIZE = 30;

/**
 * สภาพปัจจุบันของกิจกรรม ณ วินาทีที่เปิดสตรีม
 *
 * ต้องมี เพราะผู้จัดอาจเปิดหน้านี้กลางงาน หรือรีเฟรชหน้าจอ ถ้าส่งแต่เหตุการณ์สด ๆ
 * จอจะขึ้นว่างเปล่าทั้งที่มีคนเช็กอินไปแล้วครึ่งงาน
 */
async function snapshot(activityId: string) {
  const rows = await prisma.registration.findMany({
    where: { activityId, checkedInAt: { not: null } },
    orderBy: [{ checkedOutAt: 'desc' }, { checkedInAt: 'desc' }],
    take: SNAPSHOT_SIZE,
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      checkedOutAt: true,
      checkinOutOfRange: true,
      user: { select: { name: true, studentId: true, avatarUrl: true } },
    },
  });

  const [approved, checkedIn, checkedOut] = await Promise.all([
    prisma.registration.count({ where: { activityId, status: 'approved' } }),
    prisma.registration.count({ where: { activityId, status: 'checked-in' } }),
    prisma.registration.count({
      where: { activityId, status: { in: ['checked-out', 'completed'] } },
    }),
  ]);

  const recent = rows.map((r) => {
    const out = r.checkedOutAt != null;
    return {
      type: 'checkin' as const,
      activityId,
      registrationId: r.id,
      kind: out ? ('out' as const) : ('in' as const),
      studentName: r.user.name,
      studentId: r.user.studentId ?? '',
      avatarUrl: r.user.avatarUrl,
      outOfRange: r.checkinOutOfRange,
      at: (out ? r.checkedOutAt! : r.checkedInAt!).getTime(),
    };
  });

  return { counts: { approved, checkedIn, checkedOut }, recent };
}

/** ต้องรันแบบ Node เพราะสตรีมค้างไว้ยาว และบัสอยู่ในหน่วยความจำของโปรเซส */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 20_000;

/**
 * GET /api/v1/organizer/checkin-stream?activityId=... — เหตุการณ์เช็กอินสด ๆ ของกิจกรรมเดียว
 *
 * แยกสตรีมต่อกิจกรรม ไม่รวมทุกกิจกรรมของผู้จัดไว้เส้นเดียว เพราะหน้าจอหน้างานเปิดทีละกิจกรรม
 * ถ้ารวมกันแล้วผู้จัดดูแลหลายงานในวันเดียว จะมีเหตุการณ์ของงานอื่นแทรกเข้ามาบนจอที่ตั้งโชว์อยู่
 */
export const GET = handler(async (req) => {
  const user = await requireStaff();

  const activityId = new URL(req.url).searchParams.get('activityId') ?? '';
  if (!activityId) fail('VALIDATION_ERROR', 'ต้องระบุกิจกรรมที่จะติดตาม');

  // ตรวจสิทธิ์ก่อนเปิดสตรีม ไม่งั้นผู้จัดคนหนึ่งจะดูการเช็กอินของหน่วยงานอื่นได้
  await requireOwnedActivity(user, activityId);

  const initial = await snapshot(activityId);

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown, event?: string) => {
        try {
          const prefix = event ? `event: ${event}\n` : '';
          controller.enqueue(encoder.encode(`${prefix}data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // สตรีมถูกปิดไปแล้ว — ปล่อยให้ cancel() เก็บกวาด
        }
      };

      send({ ok: true, activityId, ...initial }, 'ready');
      // ชื่อ event ตามชนิดของเหตุการณ์ ('checkin' หรือ 'token') ฝั่งหน้าเว็บจะได้แยกฟังทีละอย่าง
      unsubscribe = subscribeActivity(activityId, (e: CheckinEvent) => send(e, e.type));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          /* ปิดไปแล้ว */
        }
      }, HEARTBEAT_MS);
    },

    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
