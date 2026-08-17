'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';
import type { ActivityDetailView } from '@/lib/activityDetail';

/**
 * หัวเรื่องร่วมของหน้ารายชื่อผู้เข้าร่วมและหน้ารีวิว
 *
 * ปุ่มย้อนกลับใช้ประวัติเบราว์เซอร์ (แบบเดียวกับหน้ารายละเอียดกิจกรรม) จะได้กลับไป
 * หน้าที่ผู้ใช้มาจริง ๆ — มาจากหน้าค้นหาก็กลับไปหน้าค้นหา มาจากรายการโปรดก็กลับไปที่นั่น
 * ไม่ใช่ตีกลับไปหน้ากิจกรรมทุกครั้งจนเส้นทางที่ผู้ใช้เดินมาหายไป
 *
 * ส่วนชื่อกิจกรรมด้านล่างยังเป็นลิงก์ตรงไปหน้ารายละเอียดอยู่ คนที่เปิดจากลิงก์ที่ถูกแชร์มา
 * (ไม่มีประวัติให้ย้อน) จึงยังมีทางไปหน้ากิจกรรมเสมอ
 */
export function PageHead({
  activity,
  icon,
  title,
  countLabel,
}: {
  activity: ActivityDetailView;
  icon: string;
  title: string;
  /** ตัวเลขในป้ายข้างชื่อหน้า — ไม่ส่งมาก็ไม่ต้องแสดงป้าย (เช่นตอนไม่มีสิทธิ์เห็นรายชื่อ) */
  countLabel?: string;
}) {
  const { t } = useApp();
  const router = useRouter();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <Button
          variant="secondary"
          icon="arrow_back"
          className="nuv-backbtn"
          onClick={() => router.back()}
          style={{ padding: '9px 15px' }}
        >
          {t('กลับไปหน้าก่อนหน้า')}
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
        <Icon name={icon} size={26} style={{ color: '#7C2FD9' }} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLOR.ink, lineHeight: 1.4 }}>
          {title}
        </h1>
        {countLabel != null ? (
          <span
            style={{
              padding: '3px 11px',
              borderRadius: 999,
              background: 'rgba(167,116,247,.16)',
              color: '#7C2FD9',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {countLabel}
          </span>
        ) : null}
      </div>

      {/* ชื่อกิจกรรม — กดกลับไปหน้ารายละเอียดได้เหมือนปุ่มย้อนกลับด้านบน */}
      <Link
        href={`/activities/${activity.id}`}
        style={{ fontSize: 13.5, color: COLOR.label, lineHeight: 1.7, textDecoration: 'none' }}
      >
        {activity.title}
      </Link>
    </div>
  );
}
