import { notFound, redirect } from 'next/navigation';
import { ActivityForm, type ActivityFormValues } from '@/components/organizer/ActivityForm';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { toDateTimeLocal } from '@/lib/organizer';
import type { PublicCategory } from '@/components/landing/types';

/** คลี่คอลัมน์ที่เก็บเป็น JSON string — ข้อมูลเสียหายต้องไม่ทำให้หน้าแก้ไขเปิดไม่ขึ้น */
function jsonList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** perks/prep เก็บเป็น JSON string — ฟอร์มแก้ไขเป็นข้อความหลายบรรทัด จึงคลี่กลับก่อน */
function listToText(raw: string): string {
  return jsonList(raw).join('\n');
}

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [activity, categoryRows] = await Promise.all([
    prisma.activity.findUnique({ where: { id } }),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] }),
  ]);

  // ผู้จัดแก้ได้เฉพาะกิจกรรมของตัวเอง — ตอบ 404 เหมือนกรณีไม่พบ ไม่บอกว่ามีอยู่แต่ห้ามแตะ
  if (!activity) notFound();
  if (user.role !== 'admin' && activity.organizerId !== user.id) notFound();

  const categories: PublicCategory[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    color: c.color,
  }));

  const initial: ActivityFormValues = {
    title: activity.title,
    categoryId: activity.categoryId,
    orgName: activity.orgName,
    description: activity.description,
    location: activity.location,
    startAt: toDateTimeLocal(activity.startAt),
    endAt: toDateTimeLocal(activity.endAt),
    regOpenAt: toDateTimeLocal(activity.regOpenAt),
    regCloseAt: toDateTimeLocal(activity.regCloseAt),
    seatsTotal: activity.seatsTotal,
    hours: activity.hours,
    status: activity.status,
    requiresApproval: activity.requiresApproval,
    photo: activity.photo ?? '',
    mapLink: activity.mapLink ?? '',
    mapImage: activity.mapImage ?? '',
    gallery: jsonList(activity.gallery),
    perks: listToText(activity.perks),
    prep: listToText(activity.prep),
    notes: activity.notes,
  };

  return <ActivityForm categories={categories} initial={initial} activityId={activity.id} />;
}
