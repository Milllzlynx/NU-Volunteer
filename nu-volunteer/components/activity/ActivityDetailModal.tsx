'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, seatStatus } from '@/lib/design';
import type { PublicActivity } from '@/components/landing/types';

/**
 * รายละเอียดกิจกรรมแบบอ่านอย่างเดียว — ใช้ทั้งหน้าแรกและหน้าของนิสิต
 * (หน้ารายละเอียดเต็มยังไม่มี route ของตัวเอง จึงแสดงเป็นโมดัลไปก่อน)
 */
export function ActivityDetailModal({
  activity,
  onClose,
  footer,
}: {
  activity: PublicActivity;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const { t, isEn } = useApp();
  const seats = seatStatus(activity.seatsFilled, activity.seatsTotal);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const meta = [
    { icon: 'calendar_today', label: isEn ? activity.dateEn : activity.dateTh },
    { icon: 'schedule', label: `${activity.hours} ${t('ชั่วโมง')}` },
    { icon: 'place', label: activity.location || '—' },
    {
      icon: 'groups',
      label: `${activity.seatsFilled}/${activity.seatsTotal || '—'} ${t('ที่นั่ง')}`,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activity.title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(30,37,48,.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'rgba(255,255,255,.94)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.8)',
          borderRadius: 26,
          boxShadow: '0 30px 80px rgba(24,20,34,.32)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'nuPop .22s ease',
        }}
      >
        {activity.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
          <img
            src={activity.photo}
            alt=""
            style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
          />
        ) : null}

        <div style={{ padding: 26, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: activity.category.color,
                  background: activity.category.color + '22',
                  marginBottom: 10,
                }}
              >
                {isEn && activity.category.labelEn ? activity.category.labelEn : activity.category.label}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, color: COLOR.ink, lineHeight: 1.45 }}>
                {activity.title}
              </div>
              {activity.orgName ? (
                <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 4 }}>
                  {activity.orgName}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              title={t('ปิด')}
              aria-label={t('ปิด')}
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                border: '1px solid rgba(31,41,55,.1)',
                background: 'rgba(255,255,255,.75)',
                color: COLOR.body,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="close" size={19} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                color: seats.color,
                background: seats.bg,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: seats.dot }} />
              {t(seats.label)}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              background: 'rgba(31,41,55,.035)',
            }}
          >
            {meta.map((m) => (
              <div key={m.icon} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={m.icon} size={16} style={{ color: COLOR.hint, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.6 }}>{m.label}</span>
              </div>
            ))}
          </div>

          {activity.description ? (
            <div
              style={{
                fontSize: 13,
                color: COLOR.body,
                lineHeight: 1.9,
                marginTop: 16,
                textWrap: 'pretty',
                whiteSpace: 'pre-line',
              }}
            >
              {activity.description}
            </div>
          ) : null}

          {footer}
        </div>
      </div>
    </div>
  );
}
