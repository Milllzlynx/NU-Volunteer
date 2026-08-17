/**
 * ตัวช่วยฝั่งผู้ดูแลระบบ
 *
 * คู่ขนานกับ deriveOrganizerAlerts() ใน lib/organizer.ts แต่คนละชุดงาน —
 * ของผู้จัดคืองานที่ผูกกับกิจกรรมของตัวเอง ส่วนของแอดมินคืองานระดับระบบ
 * ที่ไม่มีใครอื่นทำแทนได้ (คำขอลบบัญชี ข้อความถึงผู้ดูแล ฯลฯ)
 */

import { prisma } from '@/lib/db';
import type { ActionAlert } from '@/components/notifications/NotificationsView';

/**
 * งานค้างของผู้ดูแลระบบ
 *
 * เกณฑ์ที่ใช้เลือกว่าอะไรควรอยู่ในรายการนี้: ต้องเป็นสิ่งที่ "ค้างอยู่จนกว่าจะมีคนกด"
 * ไม่ใช่แค่ตัวเลขที่น่าสนใจ — ตัวเลขภาพรวมมีอยู่แล้วบนแดชบอร์ด
 * ถ้าเอาทุกอย่างมากองที่นี่ รายการนี้จะไม่มีความหมายในฐานะ "งานที่ต้องทำ"
 */
export async function deriveAdminAlerts(): Promise<ActionAlert[]> {
  const [deletionRequests, unreadContact, draftActivities, suspendedUsers] = await Promise.all([
    prisma.user.count({ where: { deletionRequestedAt: { not: null } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.activity.count({ where: { status: 'draft' } }),
    prisma.user.count({ where: { active: false } }),
  ]);

  const alerts: ActionAlert[] = [];

  if (deletionRequests > 0) {
    alerts.push({
      key: 'deletion-requests',
      icon: 'person_remove',
      title: 'มีคำขอลบบัญชีรอพิจารณา',
      body: 'ระบบไม่ลบบัญชีให้อัตโนมัติ ต้องมีผู้ดูแลตรวจสอบก่อนเสมอ',
      href: '/admin/users?filter=deletion',
      count: deletionRequests,
      severity: 'danger',
    });
  }

  if (unreadContact > 0) {
    alerts.push({
      key: 'unread-contact',
      icon: 'mail',
      title: 'มีข้อความถึงผู้ดูแลที่ยังไม่ได้อ่าน',
      body: 'ผู้ส่งจะยังไม่ได้รับคำตอบจนกว่าจะมีคนเปิดอ่าน',
      href: '/admin/contact',
      count: unreadContact,
      severity: 'warning',
    });
  }

  if (draftActivities > 0) {
    alerts.push({
      key: 'draft-activities',
      icon: 'edit_note',
      title: 'มีกิจกรรมที่ยังเป็นฉบับร่าง',
      body: 'นิสิตยังมองไม่เห็นจนกว่าผู้จัดจะเผยแพร่',
      href: '/admin/activities',
      count: draftActivities,
      severity: 'info',
    });
  }

  if (suspendedUsers > 0) {
    alerts.push({
      key: 'suspended-users',
      icon: 'block',
      title: 'มีบัญชีที่ถูกระงับอยู่',
      body: 'บัญชีเหล่านี้เข้าสู่ระบบไม่ได้จนกว่าจะปลดระงับ',
      href: '/admin/users',
      count: suspendedUsers,
      severity: 'info',
    });
  }

  return alerts;
}
