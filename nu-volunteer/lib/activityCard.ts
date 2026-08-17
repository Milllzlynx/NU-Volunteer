/**
 * ตัวแปลงจากข้อมูลกิจกรรมของระบบ ให้เข้ารูปแบบ prop ของ ActivityCard
 *
 * ActivityCard รับค่าพื้นฐานทีละตัวเพื่อให้นำไปใช้ที่อื่นได้โดยไม่ต้องผูกกับสคีมา
 * ไฟล์นี้เป็นสะพานให้หน้าที่มี PublicActivity อยู่แล้วไม่ต้องแตกฟิลด์เองทุกที่
 */

import type { ActivityCardProps, ActivityCardStatus } from '@/components/activity/ActivityCard';
import type { PublicActivity } from '@/components/landing/types';

/**
 * ยุบสถานะการลงทะเบียนของระบบ (8 สถานะใน REG_STATUS) ให้เหลือ 3 สถานะที่การ์ดแสดง
 *
 * รออนุมัติ → pending · อนุมัติ/เช็กอิน/เช็กเอาต์ → registered · เสร็จสิ้น → completed
 * ส่วนที่ถูกปฏิเสธ ยกเลิก หรือไม่มาตามนัด คืน null เพราะไม่ใช่สถานะที่ควรอวดบนการ์ด
 * ผู้ใช้ดูรายละเอียดของสถานะเหล่านั้นได้ที่หน้าการลงทะเบียนซึ่งมีบริบทครบกว่า
 */
export function toCardStatus(status: string | null | undefined): ActivityCardStatus | null {
  if (!status) return null;
  if (status === 'pending') return 'pending';
  if (status === 'completed') return 'completed';
  if (status === 'approved' || status === 'checked-in' || status === 'checked-out') return 'registered';
  return null;
}

export type CardExtras = {
  registrationStatus?: string | null;
  isFavorite?: boolean;
  isEn?: boolean;
  /** false = ผู้เยี่ยมชม การ์ดจะย่อรายละเอียดลง — ดูหมายเหตุที่ ActivityCardProps.signedIn */
  signedIn?: boolean;
  href?: string;
  onFavoriteClick?: () => void | Promise<void>;
  onRegister?: () => void | Promise<void>;
  onViewDetails?: () => void;
  onViewParticipants?: () => void;
  onMessage?: () => void;
};

export function toActivityCardProps(a: PublicActivity, extras: CardExtras = {}): ActivityCardProps {
  const { isEn = false, registrationStatus, ...rest } = extras;

  return {
    id: a.id,
    title: a.title,
    category: isEn && a.category.labelEn ? a.category.labelEn : a.category.label,
    categoryColor: a.category.color,
    location: a.location,
    date: isEn ? a.dateEn : a.dateTh,
    time: a.time,
    imageUrl: a.photo,
    registeredSlots: a.seatsFilled,
    totalSlots: a.seatsTotal,
    notOpenYet: a.notOpenYet,
    regOpenDate: (isEn ? a.regOpenEn : a.regOpenTh) ?? null,
    hoursReward: a.hours,
    status: toCardStatus(registrationStatus),
    href: extras.href ?? `/activities/${a.id}`,
    ...rest,
  };
}
