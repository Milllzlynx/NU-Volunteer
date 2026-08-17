import { requireUser } from '@/lib/auth';
import { pruneLastSeen, publishTo, subscribe, touch, type ChatEvent } from '@/lib/chatBus';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/errors';

/** ต้องรันแบบ Node เพราะสตรีมค้างไว้ยาว และบัสอยู่ในหน่วยความจำของโปรเซส */
export const runtime = 'nodejs';
/** ห้ามแคช — เป็นสตรีมที่เปิดค้าง */
export const dynamic = 'force-dynamic';

/** ส่ง comment ทุก ๆ ช่วง เพื่อกัน proxy ตัดการเชื่อมต่อที่เงียบเกินไป */
const HEARTBEAT_MS = 20_000;

/**
 * GET /api/v1/chat/stream — Server-Sent Events สำหรับข้อความใหม่ พิมพ์อยู่ และสถานะออนไลน์
 *
 * เลือก SSE แทน WebSocket เพราะ route handler ของ Next รองรับการสตรีมได้เลย
 * ไม่ต้องเปลี่ยนไปใช้ custom server ซึ่งจะทำให้คำสั่งรัน/deploy ในคู่มือใช้ไม่ได้
 */
export const GET = handler(async (req) => {
  const user = await requireUser();

  const threads = await prisma.chatThread.findMany({
    where: user.role === 'student' ? { studentId: user.id } : { staffId: user.id },
    select: { studentId: true, staffId: true },
  });
  // คนที่ควรรู้ว่าเราออนไลน์ = คู่สนทนาทุกคนของเรา
  const peers = [
    ...new Set(threads.map((t) => (t.studentId === user.id ? t.staffId : t.studentId))),
  ];

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

      send({ ok: true, userId: user.id }, 'ready');

      unsubscribe = subscribe(user.id, (e: ChatEvent) => send(e, e.type));

      // บอกคู่สนทนาว่าเราออนไลน์แล้ว
      publishTo(peers, { type: 'presence', userId: user.id, online: true, at: Date.now() });

      heartbeat = setInterval(() => {
        touch(user.id);
        pruneLastSeen();
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
      publishTo(peers, { type: 'presence', userId: user.id, online: false, at: Date.now() });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      // ปิด buffering ของ nginx ถ้ามีอยู่ข้างหน้า ไม่อย่างนั้นข้อความจะถูกกองไว้
      'X-Accel-Buffering': 'no',
    },
  });
});
