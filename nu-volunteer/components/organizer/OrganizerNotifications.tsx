'use client';

import { NotificationsView, type NotificationRow } from '@/components/notifications/NotificationsView';
import { useApp } from '@/components/providers/AppProviders';
import type { OrganizerAlert } from '@/lib/organizer';

/**
 * กล่องการแจ้งเตือนของผู้จัดกิจกรรม
 *
 * ตัวหน้าจออยู่ที่ NotificationsView ซึ่งใช้ร่วมกับฝั่งผู้ดูแลระบบ
 * ที่นี่เหลือแค่ข้อความที่เป็นเรื่องของผู้จัดโดยเฉพาะ
 */

export type { NotificationRow };

export function OrganizerNotifications({
  notifications,
  alerts,
}: {
  notifications: NotificationRow[];
  alerts: OrganizerAlert[];
}) {
  const { t } = useApp();

  return (
    <NotificationsView
      notifications={notifications}
      alerts={alerts}
      clearTitle={t('ไม่มีงานค้าง')}
      clearBody={t('ใบลงทะเบียน คำขอยกเลิก และการรับรองชั่วโมงถูกจัดการครบแล้ว')}
      emptyDesc={t('การแจ้งเตือนเกี่ยวกับกิจกรรมและผู้เข้าร่วมของคุณจะมาแสดงที่นี่')}
    />
  );
}
