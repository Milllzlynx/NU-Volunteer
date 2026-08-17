'use client';

import {
  NotificationsView,
  type ActionAlert,
  type NotificationRow,
} from '@/components/notifications/NotificationsView';
import { useApp } from '@/components/providers/AppProviders';

/**
 * กล่องการแจ้งเตือนของผู้ดูแลระบบ
 *
 * ตัวหน้าจออยู่ที่ NotificationsView ซึ่งใช้ร่วมกับฝั่งผู้จัดกิจกรรม
 * ที่นี่เหลือแค่ข้อความที่เป็นเรื่องของผู้ดูแลโดยเฉพาะ
 */

export type { NotificationRow };

export function AdminNotifications({
  notifications,
  alerts,
}: {
  notifications: NotificationRow[];
  alerts: ActionAlert[];
}) {
  const { t } = useApp();

  return (
    <NotificationsView
      notifications={notifications}
      alerts={alerts}
      clearTitle={t('ไม่มีงานค้างในระบบ')}
      clearBody={t('คำขอลบบัญชีและข้อความถึงผู้ดูแลถูกจัดการครบแล้ว')}
      emptyDesc={t('การแจ้งเตือนระดับระบบและงานที่ต้องให้ผู้ดูแลตัดสินใจจะมาแสดงที่นี่')}
    />
  );
}
