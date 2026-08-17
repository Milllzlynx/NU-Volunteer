'use client';

import Link from 'next/link';
import { Button, Icon } from '@/components/ui';
import { COLOR } from '@/lib/design';

/**
 * ข้อความชวนเข้าสู่ระบบ — ใช้ทั้งหน้ารายชื่อผู้เข้าร่วมและหน้ารีวิว
 *
 * onClose มีไว้สำหรับตอนที่ข้อความนี้อยู่ในโมดัล (ต้องปิดโมดัลก่อนพาไปหน้าเข้าสู่ระบบ)
 * บนหน้าเต็มไม่มีอะไรต้องปิด จึงไม่บังคับให้ส่งมา
 */
export function GuestNotice({ text, cta, onClose }: { text: string; cta: string; onClose?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '22px 12px' }}>
      <Icon name="lock" size={34} style={{ color: '#CBD5E1' }} />
      <div style={{ marginTop: 10, fontSize: 13, color: COLOR.label, lineHeight: 1.8 }}>{text}</div>
      <Link href="/login" onClick={onClose} style={{ display: 'inline-block', marginTop: 14 }}>
        <Button variant="primary" icon="login">
          {cta}
        </Button>
      </Link>
    </div>
  );
}
