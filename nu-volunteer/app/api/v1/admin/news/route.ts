import { NextResponse } from 'next/server';
import { DATE_EN, DATE_TH, timeOf } from '@/lib/activities';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readImageSrc } from '@/lib/imageSrc';
import { richTextExcerpt } from '@/lib/richText';
import { readJson } from '@/lib/validation';

/**
 * GET  /api/v1/admin/news — ข่าวประชาสัมพันธ์ทั้งหมด
 * POST /api/v1/admin/news — เขียนข่าวใหม่
 */

export const NEWS_STATUSES = ['draft', 'published', 'archived'];
export const NEWS_AUDIENCES = ['public', 'members'];

const MAX_TITLE = 160;
const MAX_BODY = 20_000;

/** ป้ายกำกับเก็บเป็น JSON array แบบเดียวกับ Activity.perks/gallery */
export function readTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))].slice(0, 12);
}

export function parseTags(stored: string): string[] {
  try {
    const parsed: unknown = JSON.parse(stored || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // ข้อมูลเสียหายต้องไม่ทำให้ทั้งหน้าพัง — แบบเดียวกับ jsonList() ใน lib/activityDetail.ts
    return [];
  }
}

/** ตรวจค่าที่ใช้ทั้งตอนสร้างและตอนแก้ไข */
export function assertNewsFields(body: Record<string, unknown>) {
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) fail('VALIDATION_ERROR', 'กรุณากรอกหัวข้อข่าว');
    if (title.length > MAX_TITLE) fail('VALIDATION_ERROR', `หัวข้อยาวเกิน ${MAX_TITLE} ตัวอักษร`);
  }
  if (body.body !== undefined && String(body.body).length > MAX_BODY) {
    fail('VALIDATION_ERROR', `เนื้อหายาวเกิน ${MAX_BODY} ตัวอักษร`);
  }
  if (body.status !== undefined && !NEWS_STATUSES.includes(String(body.status))) {
    fail('VALIDATION_ERROR', 'สถานะข่าวไม่ถูกต้อง');
  }
  if (body.audience !== undefined && !NEWS_AUDIENCES.includes(String(body.audience))) {
    fail('VALIDATION_ERROR', 'กลุ่มผู้อ่านไม่ถูกต้อง');
  }
  if (body.publishedAt !== undefined && body.publishedAt !== null && body.publishedAt !== '') {
    if (Number.isNaN(Date.parse(String(body.publishedAt)))) {
      fail('VALIDATION_ERROR', 'รูปแบบวันเวลาเผยแพร่ไม่ถูกต้อง');
    }
  }
}

export const GET = handler(async () => {
  await requireAdmin();
  const now = new Date();

  const rows = await prisma.news.findMany({
    // ปักหมุดขึ้นก่อน แล้วเรียงใหม่สุด — ตรงกับลำดับที่ผู้อ่านจะเห็นจริง
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({
    ok: true,
    news: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      excerpt: richTextExcerpt(n.body),
      status: n.status,
      /** ตั้งเวลาไว้แต่ยังไม่ถึง — เผยแพร่แล้วในระบบ แต่ยังไม่ควรนับว่าออกสู่สายตาผู้อ่าน */
      scheduled: n.status === 'published' && n.publishedAt != null && n.publishedAt > now,
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      publishedTh: n.publishedAt ? `${DATE_TH.format(n.publishedAt)} ${timeOf(n.publishedAt)}` : null,
      publishedEn: n.publishedAt ? `${DATE_EN.format(n.publishedAt)} ${timeOf(n.publishedAt)}` : null,
      image: n.image,
      pinned: n.pinned,
      audience: n.audience,
      views: n.views,
      tags: parseTags(n.tags),
      author: n.author?.name ?? null,
      updatedTh: DATE_TH.format(n.updatedAt),
      updatedEn: DATE_EN.format(n.updatedAt),
    })),
  });
});

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  assertNewsFields(body);
  const title = String(body.title ?? '').trim();
  if (!title) fail('VALIDATION_ERROR', 'กรุณากรอกหัวข้อข่าว');

  const status = NEWS_STATUSES.includes(String(body.status)) ? String(body.status) : 'draft';
  const at = body.publishedAt ? new Date(String(body.publishedAt)) : null;

  const created = await prisma.news.create({
    data: {
      title,
      body: String(body.body ?? ''),
      status,
      // เผยแพร่โดยไม่ระบุเวลา = เผยแพร่เดี๋ยวนี้ ฉบับร่างไม่ต้องมีเวลาเผยแพร่ติดไว้
      publishedAt: status === 'published' ? (at ?? new Date()) : at,
      image: readImageSrc(body.image, 'ภาพประกอบข่าว'),
      pinned: Boolean(body.pinned),
      audience: NEWS_AUDIENCES.includes(String(body.audience)) ? String(body.audience) : 'public',
      tags: JSON.stringify(readTags(body.tags)),
      authorId: admin.id,
    },
    select: { id: true, title: true, status: true },
  });

  await systemLog('success', `เขียนข่าวประชาสัมพันธ์: ${created.title}`, {
    actorId: admin.id,
    meta: { newsId: created.id, status: created.status },
  });

  return NextResponse.json({ ok: true, news: created });
});
