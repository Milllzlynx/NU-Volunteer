'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { BRAND_GRADIENT, COLOR, seatStatus } from '@/lib/design';
import type { PublicActivity, PublicCategory } from '@/components/landing/types';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.72)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.85)',
  borderRadius: 22,
  boxShadow: '0 12px 34px rgba(31,41,55,.09), inset 0 1px 0 rgba(255,255,255,.7)',
};

const PREVIEW_COUNT = 3;

function CategoryLabel({ c, isEn }: { c: PublicCategory; isEn: boolean }) {
  return <>{isEn && c.labelEn ? c.labelEn : c.label}</>;
}

/** รายละเอียดกิจกรรมแบบอ่านอย่างเดียว — ผู้เยี่ยมชมยังไม่ต้องเข้าสู่ระบบ */
function ActivityModal({
  activity,
  onClose,
  signedIn,
}: {
  activity: PublicActivity;
  onClose: () => void;
  signedIn: boolean;
}) {
  const { t, isEn } = useApp();
  const seats = seatStatus(activity.seatsFilled, activity.seatsTotal);

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
                <CategoryLabel c={activity.category} isEn={isEn} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, color: COLOR.ink, lineHeight: 1.45 }}>
                {activity.title}
              </div>
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 14,
            }}
          >
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
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: seats.dot }}
              />
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

          {/* ผู้ที่เข้าสู่ระบบแล้วลงทะเบียนจากหน้าของบทบาทตัวเอง — ที่นี่ชวนเฉพาะผู้เยี่ยมชม */}
          {signedIn ? null : (
            <Link
              href="/register"
              className="nuv-keep"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 22,
                padding: 14,
                borderRadius: 14,
                background: BRAND_GRADIENT,
                color: '#fff',
                fontWeight: 500,
                fontSize: 14,
                boxShadow: '0 8px 22px rgba(167,116,247,.34)',
              }}
            >
              <Icon name="how_to_reg" size={19} />
              {t('สมัครสมาชิกเพื่อลงทะเบียน')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityGrid({
  activities,
  categories,
  signedIn,
}: {
  activities: PublicActivity[];
  categories: PublicCategory[];
  signedIn: boolean;
}) {
  const { t, isEn } = useApp();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<PublicActivity | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (cat !== 'all' && a.category.id !== cat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.category.label.toLowerCase().includes(q)
      );
    });
  }, [activities, search, cat]);

  const shown = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const chips = [{ id: 'all', label: t('ทั้งหมด'), color: '#1F2937' }, ...categories.map((c) => ({
    id: c.id,
    label: isEn && c.labelEn ? c.labelEn : c.label,
    color: c.color,
  }))];

  return (
    <div
      id="nuv-activities"
      className="nuv-land-body"
      style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '34px 40px 20px',
        scrollMarginTop: 90,
      }}
    >
      {open ? (
        <ActivityModal activity={open} onClose={() => setOpen(null)} signedIn={signedIn} />
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
            {t('กิจกรรมที่แนะนำ')}
          </div>
          <div style={{ fontSize: 13, color: COLOR.label, marginTop: 2 }}>
            {t('เลือกกิจกรรมที่ตรงกับความสนใจของคุณ')}
          </div>
        </div>
        {filtered.length > PREVIEW_COUNT ? (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '8px 14px',
              borderRadius: 11,
              border: '1px solid rgba(31,41,55,.12)',
              background: 'rgba(255,255,255,.7)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#A774F7',
              cursor: 'pointer',
              transition: 'all 220ms ease',
            }}
          >
            {showAll ? t('แสดงน้อยลง') : `${t('ดูทั้งหมด')} (${filtered.length})`}
            <Icon name={showAll ? 'expand_less' : 'arrow_forward'} size={17} />
          </button>
        ) : null}
      </div>

      <div
        id="nuv-cats"
        className="nuv-land-filters"
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          marginBottom: 22,
          flexWrap: 'wrap',
          scrollMarginTop: 90,
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon
            name="search"
            size={20}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLOR.hint,
              pointerEvents: 'none',
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ค้นหากิจกรรม...')}
            aria-label={t('ค้นหากิจกรรม...')}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: 14,
              border: '1px solid rgba(31,41,55,.1)',
              background: 'rgba(255,255,255,.8)',
              fontFamily: 'inherit',
              fontSize: 14,
              color: COLOR.ink,
              outlineOffset: 2,
            }}
          />
        </div>
        <div className="nuv-land-chips nuv-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {chips.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={on}
                style={{
                  padding: '8px 15px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: `1px solid ${on ? c.color : 'rgba(30,37,48,.12)'}`,
                  background: on ? c.color : '#fff',
                  color: on ? '#fff' : '#475569',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ ...CARD, borderRadius: 24, textAlign: 'center', padding: '56px 20px' }}>
          <Icon name="search_off" size={42} style={{ color: '#CBD5E1' }} />
          <div style={{ fontSize: 13.5, color: COLOR.hint, marginTop: 8 }}>
            {activities.length === 0
              ? t('ยังไม่มีกิจกรรมที่เปิดรับสมัครในขณะนี้')
              : t('ไม่พบกิจกรรมที่ตรงกับการค้นหา')}
          </div>
        </div>
      ) : (
        <div
          className="nuv-land-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
            gap: 20,
          }}
        >
          {shown.map((a) => {
            const seats = seatStatus(a.seatsFilled, a.seatsTotal);
            return (
              <div
                key={a.id}
                className="nuv-card"
                style={{ ...CARD, padding: 12, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
                  {a.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
                    <img
                      src={a.photo}
                      alt=""
                      style={{ width: '100%', height: 165, objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 165,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(140deg, ${a.category.color}33, ${a.category.color}14)`,
                        color: a.category.color,
                      }}
                    >
                      <Icon name="volunteer_activism" size={40} fill />
                    </div>
                  )}
                  <div
                    className="nuv-keep"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      padding: '5px 12px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: a.category.color,
                      color: '#fff',
                      boxShadow: '0 5px 14px rgba(31,41,55,.22)',
                    }}
                  >
                    <CategoryLabel c={a.category} isEn={isEn} />
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px 6px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      color: COLOR.hint,
                    }}
                  >
                    <Icon name="calendar_today" size={16} />
                    {isEn ? a.dateEn : a.dateTh}
                  </div>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: 14.5,
                      color: COLOR.ink,
                      lineHeight: 1.5,
                      textWrap: 'pretty',
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginTop: 'auto',
                      paddingTop: 10,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: seats.color,
                        background: seats.bg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{ width: 6, height: 6, borderRadius: '50%', background: seats.dot }}
                      />
                      {a.seatsTotal > 0 ? `${a.seatsFilled}/${a.seatsTotal}` : t(seats.label)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(a)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: 11,
                        border: '1px solid rgba(31,41,55,.12)',
                        background: 'rgba(255,255,255,.8)',
                        color: COLOR.ink,
                        fontFamily: 'inherit',
                        fontWeight: 500,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 220ms ease',
                      }}
                    >
                      {t('ดูรายละเอียด')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
