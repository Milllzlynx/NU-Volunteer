'use client';

import { useEffect } from 'react';
import { Button, Icon } from '@/components/ui';
import { COLOR, SEMANTIC, solidGlass } from '@/lib/design';

/**
 * กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ — ใช้ร่วมกันทุกหน้าของแอดมิน
 *
 * ไม่ใช้ window.confirm() เพราะสไตล์ไม่เข้ากับส่วนอื่นของระบบ ปรับข้อความยาว ๆ
 * หรือใส่ชื่อรายการลงไปไม่ได้ และบล็อกเธรดหลักของเบราว์เซอร์ทั้งเส้น
 *
 * ปิดด้วย Escape ได้เสมอ — ทางออกที่ไม่ทำอะไรต้องหาเจอง่ายกว่าทางที่ทำ
 */
export function ConfirmDialog({
  icon = 'help',
  tone = 'danger',
  title,
  body,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  icon?: string;
  tone?: 'danger' | 'warning';
  title: string;
  body?: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const accent = SEMANTIC[tone];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background: 'rgba(20,16,28,.42)',
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* คลิกนอกกล่อง = ยกเลิก ตามที่ผู้ใช้คาดหวังจากกล่องแบบนี้ */}
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0 }} />

      <div style={{ ...solidGlass(20), position: 'relative', width: '100%', maxWidth: 400, padding: 22 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: accent.bg,
              color: accent.color,
            }}
          >
            <Icon name={icon} size={21} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, lineHeight: 1.55 }}>{title}</div>
            {/* whiteSpace: pre-line ให้ผู้เรียกขึ้นบรรทัดใหม่ได้เมื่อคำเตือนมีหลายประเด็น
                ข้อความบรรทัดเดียวที่ผู้เรียกเดิมส่งมาแสดงผลเหมือนเดิมทุกประการ */}
            {body ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: COLOR.label,
                  marginTop: 6,
                  lineHeight: 1.8,
                  textWrap: 'pretty',
                  whiteSpace: 'pre-line',
                }}
              >
                {body}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={onCancel} disabled={busy} style={{ padding: '9px 16px', fontSize: 13 }}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={onConfirm}
            style={{ padding: '9px 16px', fontSize: 13, background: accent.color, boxShadow: 'none' }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
