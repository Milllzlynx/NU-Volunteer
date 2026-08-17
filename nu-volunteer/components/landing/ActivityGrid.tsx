'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { toActivityCardProps } from '@/lib/activityCard';
import { activityApi } from '@/lib/api';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';
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

export function ActivityGrid({
  activities,
  categories,
  signedIn,
  myStatus = {},
  myFavorites = [],
}: {
  activities: PublicActivity[];
  categories: PublicCategory[];
  signedIn: boolean;
  /** activityId → สถานะการลงทะเบียนของผู้ใช้ที่ล็อกอินอยู่ */
  myStatus?: Record<string, string>;
  myFavorites?: string[];
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [showAll, setShowAll] = useState(false);

  /* สถานะที่ผู้ใช้เปลี่ยนได้จากการ์ด — เริ่มจากค่าที่เซิร์ฟเวอร์ส่งมา แล้วอัปเดตในหน้าเลย */
  const [status, setStatus] = useState<Record<string, string>>(myStatus);
  const [favorites, setFavorites] = useState<string[]>(myFavorites);

  const toggleFavorite = async (id: string) => {
    // สลับทันทีให้หัวใจตอบสนองเร็ว แล้วยึดผลจริงจากเซิร์ฟเวอร์
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    try {
      const res = await activityApi.toggleFavorite(id);
      setFavorites((prev) => (res.favorited ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
    } catch {
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
  };

  const register = async (id: string) => {
    try {
      const res = await activityApi.apply(id);
      setStatus((prev) => ({ ...prev, [id]: res.registration.status }));
      router.refresh();
    } catch {
      // ที่นั่งเต็มหรือปิดรับสมัครระหว่างนั้น — หน้ารายละเอียดบอกเหตุผลได้ครบกว่าการ์ด
      router.push(`/activities/${id}`);
    }
  };

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
  const chips = [
    { id: 'all', label: t('ทั้งหมด'), color: '#1F2937' },
    ...categories.map((c) => ({
      id: c.id,
      label: isEn && c.labelEn ? c.labelEn : c.label,
      color: c.color,
    })),
  ];

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
          {/* การ์ดพาไปหน้ารายละเอียดเต็มแล้ว จึงไม่ต้องมีโมดัลบนหน้าแรกอีก */}
          {shown.map((a) => (
            <ActivityCard
              key={a.id}
              {...toActivityCardProps(a, {
                isEn,
                signedIn,
                registrationStatus: status[a.id] ?? null,
                isFavorite: favorites.includes(a.id),
                // ผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบไม่ต้องมีปุ่มที่กดแล้วเด้งไปหน้าเข้าสู่ระบบ
                onFavoriteClick: signedIn ? () => toggleFavorite(a.id) : undefined,
                onRegister: signedIn ? () => register(a.id) : undefined,
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
