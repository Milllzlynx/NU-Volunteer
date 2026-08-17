import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma, systemLog } from '@/lib/db';
import { fail, handler } from '@/lib/errors';
import { readImageSrc } from '@/lib/imageSrc';
import { readJson } from '@/lib/validation';
import { NEWS_AUDIENCES, NEWS_STATUSES, assertNewsFields, readTags } from '../route';

/**
 * PATCH  /api/v1/admin/news/:id — แก้ไขข่าว เปลี่ยนสถานะ ปักหมุด
 * DELETE /api/v1/admin/news/:id — ลบถาวร
 *
 * "เก็บเข้ากรุ" (archived) กับ "ลบ" ต่างกันโดยตั้งใจ — ข่าวที่เคยเผยแพร่แล้วอาจถูกอ้างถึง
 * จากที่อื่น การเก็บเข้ากรุจึงเป็นทางที่ควรใช้ ส่วนการลบมีไว้สำหรับฉบับร่างที่เขียนทิ้งไว้
 */
export const PATCH = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();
  const body = await readJson<Record<string, unknown>>(req);

  const current = await prisma.news.findUnique({ where: { id } });
  if (!current) fail('NOT_FOUND');

  assertNewsFields(body);

  const data: Record<string, unknown> = {};
  const changes: string[] = [];

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.body !== undefined) data.body = String(body.body);
  if (body.image !== undefined) data.image = readImageSrc(body.image, 'ภาพประกอบข่าว');
  if (body.tags !== undefined) data.tags = JSON.stringify(readTags(body.tags));

  if (body.audience !== undefined && NEWS_AUDIENCES.includes(String(body.audience))) {
    if (body.audience !== current.audience) {
      data.audience = String(body.audience);
      changes.push(`กลุ่มผู้อ่าน → ${body.audience}`);
    }
  }

  if (body.pinned !== undefined) {
    const pinned = Boolean(body.pinned);
    if (pinned !== current.pinned) {
      data.pinned = pinned;
      changes.push(pinned ? 'ปักหมุด' : 'เลิกปักหมุด');
    }
  }

  if (body.status !== undefined && NEWS_STATUSES.includes(String(body.status))) {
    const status = String(body.status);
    if (status !== current.status) {
      data.status = status;
      changes.push(`สถานะ ${current.status} → ${status}`);
      // เผยแพร่ครั้งแรกโดยไม่ได้ตั้งเวลาไว้ = ลงเวลาให้เดี๋ยวนี้
      if (status === 'published' && current.publishedAt == null && body.publishedAt === undefined) {
        data.publishedAt = new Date();
      }
    }
  }

  if (body.publishedAt !== undefined) {
    data.publishedAt = body.publishedAt ? new Date(String(body.publishedAt)) : null;
  }

  if (!Object.keys(data).length) fail('VALIDATION_ERROR', 'ไม่มีอะไรเปลี่ยนแปลง');

  const updated = await prisma.news.update({
    where: { id },
    data,
    select: { id: true, title: true, status: true, pinned: true, publishedAt: true },
  });

  if (changes.length) {
    await systemLog('info', `แก้ไขข่าว ${current.title}: ${changes.join(' · ')}`, {
      actorId: admin.id,
      meta: { newsId: id, changes },
    });
  }

  return NextResponse.json({ ok: true, news: updated });
});

export const DELETE = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = await requireAdmin();

  const target = await prisma.news.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!target) fail('NOT_FOUND');

  await prisma.news.delete({ where: { id } });
  await systemLog('warning', `ลบข่าวประชาสัมพันธ์: ${target.title}`, {
    actorId: admin.id,
    meta: { newsId: id, status: target.status },
  });

  return NextResponse.json({ ok: true });
});
