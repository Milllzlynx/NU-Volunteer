import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readJson } from '@/lib/validation';

const TITLE_MAX = 120;
const NOTE_MAX = 500;

/** สีที่เลือกได้บนปฏิทิน — จำกัดไว้ให้ตรงกับจานสีของระบบ ไม่รับ hex อิสระจาก client */
export const EVENT_COLORS = ['#A774F7', '#E97171', '#63D2A1', '#F5A623', '#7AB8FF'];

type Body = {
  title?: unknown;
  note?: unknown;
  date?: unknown; // YYYY-MM-DD
  time?: unknown; // HH:mm — ไม่ส่งมาถือว่าเป็นนัดหมายทั้งวัน
  endTime?: unknown; // HH:mm
  color?: unknown;
};

/**
 * แปลงวันที่/เวลาที่ผู้ใช้กรอก (เวลาไทย) เป็น Date
 *
 * ปฏิทินทั้งหน้าอ้างอิงเขตเวลาไทยตายตัวเหมือน lib/activities.ts — เซิร์ฟเวอร์อาจตั้งเขตเวลาอื่น
 * จึงต่อ "+07:00" ตรง ๆ แทนการพึ่ง new Date(...) ที่จะตีความเป็นเขตเวลาของเครื่อง
 */
function bangkokDate(date: string, time: string): Date {
  const d = new Date(`${date}T${time}:00.000+07:00`);
  if (Number.isNaN(d.getTime())) fail('VALIDATION_ERROR', 'วันที่หรือเวลาไม่ถูกต้อง');
  return d;
}

/* POST /api/v1/calendar-events — เพิ่มนัดหมายส่วนตัวลงปฏิทินของตัวเอง */
export const POST = handler(async (req) => {
  const user = await requireRole('student');
  const body = await readJson<Body>(req);

  const title = String(body.title ?? '').trim();
  const note = String(body.note ?? '').trim();
  const date = String(body.date ?? '').trim();
  const time = String(body.time ?? '').trim();
  const endTime = String(body.endTime ?? '').trim();
  const color = String(body.color ?? '');

  if (!title) fail('VALIDATION_ERROR', 'กรุณากรอกชื่อนัดหมาย');
  if (title.length > TITLE_MAX) fail('VALIDATION_ERROR', `ชื่อนัดหมายต้องไม่เกิน ${TITLE_MAX} ตัวอักษร`);
  if (note.length > NOTE_MAX) fail('VALIDATION_ERROR', `บันทึกต้องไม่เกิน ${NOTE_MAX} ตัวอักษร`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('VALIDATION_ERROR', 'กรุณาเลือกวันที่');
  if (time && !/^\d{2}:\d{2}$/.test(time)) fail('VALIDATION_ERROR', 'รูปแบบเวลาไม่ถูกต้อง');
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) fail('VALIDATION_ERROR', 'รูปแบบเวลาไม่ถูกต้อง');
  if (endTime && !time) fail('VALIDATION_ERROR', 'กรุณาระบุเวลาเริ่มก่อน');

  const allDay = !time;
  const startAt = bangkokDate(date, time || '00:00');
  const endAt = endTime ? bangkokDate(date, endTime) : null;
  if (endAt && endAt <= startAt) fail('VALIDATION_ERROR', 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title,
      note,
      startAt,
      endAt,
      allDay,
      color: EVENT_COLORS.includes(color) ? color : EVENT_COLORS[0],
    },
    select: { id: true, title: true, startAt: true },
  });

  return NextResponse.json({ ok: true, event });
});

/* DELETE /api/v1/calendar-events?id=... — ลบนัดหมายของตัวเอง */
export const DELETE = handler(async (req) => {
  const user = await requireRole('student');
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) fail('VALIDATION_ERROR');

  // จำกัดด้วย userId ในเงื่อนไขลบ — กันลบนัดหมายของคนอื่นด้วยการเดา id
  const { count } = await prisma.calendarEvent.deleteMany({ where: { id, userId: user.id } });
  if (!count) fail('NOT_FOUND');

  return NextResponse.json({ ok: true });
});
