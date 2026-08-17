'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { ActivityPagination } from '@/components/student/ActivityPagination';
import { toActivityCardProps } from '@/lib/activityCard';
import { useApp } from '@/components/providers/AppProviders';
import { Button, EmptyState, ErrorNote, Icon, Tabs, inputStyle } from '@/components/ui';
import { activityApi, errorMessage } from '@/lib/api';
import { COLOR, seatStatus } from '@/lib/design';
import type { PublicActivity, PublicCategory } from '@/components/landing/types';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.62)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.75)',
  borderRadius: 22,
  boxShadow: '0 15px 45px rgba(31,41,55,.10), inset 0 1px 0 rgba(255,255,255,.6)',
};

const PER_PAGE = 12;

type Availability = 'all' | 'open' | 'almost' | 'full';

const TABS: { key: Availability; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'open', label: 'เปิดรับสมัคร' },
  { key: 'almost', label: 'ใกล้เต็ม' },
  { key: 'full', label: 'ที่นั่งเต็ม' },
];

export function StudentDiscover({
  activities,
  categories,
  favorites,
  registrations,
}: {
  activities: PublicActivity[];
  categories: PublicCategory[];
  /** รหัสกิจกรรมที่นิสิตกดหัวใจไว้ */
  favorites: string[];
  /** รหัสกิจกรรม → สถานะการลงทะเบียนของนิสิตคนนี้ */
  registrations: Record<string, string>;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [avail, setAvail] = useState<Availability>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // สถานะที่แก้ได้ทันทีหลังกดสมัคร/กดหัวใจ โดยไม่ต้องรอโหลดหน้าใหม่
  const [regs, setRegs] = useState(registrations);
  const [likes, setLikes] = useState(() => new Set(favorites));

  const byText = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (cat !== 'all' && a.category.id !== cat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.orgName.toLowerCase().includes(q) ||
        a.category.label.toLowerCase().includes(q)
      );
    });
  }, [activities, search, cat]);

  const counts = useMemo(() => {
    const c: Record<Availability, number> = { all: byText.length, open: 0, almost: 0, full: 0 };
    for (const a of byText) {
      const key = seatStatus(a.seatsFilled, a.seatsTotal).key;
      if (key === 'open') c.open += 1;
      else if (key === 'almost') c.almost += 1;
      else if (key === 'full') c.full += 1;
    }
    return c;
  }, [byText]);

  const filtered = useMemo(
    () =>
      avail === 'all'
        ? byText
        : byText.filter((a) => seatStatus(a.seatsFilled, a.seatsTotal).key === avail),
    [byText, avail],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  /** เปลี่ยนตัวกรองแล้วต้องกลับไปหน้าแรกเสมอ ไม่งั้นจะค้างอยู่หน้าที่ไม่มีข้อมูล */
  function change<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }

  async function toggleFavorite(a: PublicActivity) {
    setError(null);
    try {
      const res = await activityApi.toggleFavorite(a.id);
      setLikes((prev) => {
        const next = new Set(prev);
        if (res.favorited) next.add(a.id);
        else next.delete(a.id);
        return next;
      });
      // ตัวเลข "รายการโปรด" บนหน้าหลักและแถบข้างต้องตรงกัน
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function apply(a: PublicActivity) {
    setError(null);
    try {
      const res = await activityApi.apply(a.id);
      setRegs((prev) => ({ ...prev, [a.id]: res.registration.status }));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const chips = [
    { id: 'all', label: t('ทั้งหมด'), color: '#1F2937' },
    ...categories.map((c) => ({
      id: c.id,
      label: isEn && c.labelEn ? c.labelEn : c.label,
      color: c.color,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon
            name="search"
            size={19}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLOR.hint,
              pointerEvents: 'none',
            }}
          />
          <input
            value={search}
            onChange={(e) => change(setSearch)(e.target.value)}
            placeholder={t('ค้นหาชื่อกิจกรรม...')}
            aria-label={t('ค้นหาชื่อกิจกรรม...')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>
        <div className="nuv-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {chips.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => change(setCat)(c.id)}
                aria-pressed={on}
                style={{
                  padding: '8px 15px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: `1px solid ${on ? c.color : 'rgba(30,37,48,.12)'}`,
                  background: on ? c.color : 'rgba(255,255,255,.6)',
                  color: on ? '#fff' : COLOR.body,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={avail}
        onChange={change(setAvail)}
      />

      {filtered.length === 0 ? (
        <div style={{ ...CARD }}>
          <EmptyState
            icon="search_off"
            title={t('ไม่พบรายการที่ตรงกับเงื่อนไข')}
            desc={t('ลองเปลี่ยนคำค้นหรือล้างตัวกรอง')}
            action={
              <Button
                variant="secondary"
                icon="filter_alt_off"
                onClick={() => {
                  setSearch('');
                  setCat('all');
                  setAvail('all');
                  setPage(1);
                }}
              >
                {t('ล้างตัวกรอง')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: COLOR.hint }}>
            {t('แสดง ')}
            {shown.length}
            {t(' จาก ')}
            {filtered.length}
            {t(' กิจกรรม')}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
              gap: 16,
            }}
          >
            {shown.map((a) => (
              <ActivityCard
                key={a.id}
                {...toActivityCardProps(a, {
                  isEn,
                  // หน้านี้อยู่หลังการเข้าสู่ระบบเสมอ ส่งค่าไว้ชัด ๆ ไม่พึ่งค่าเริ่มต้น
                  signedIn: true,
                  registrationStatus: regs[a.id] ?? null,
                  isFavorite: likes.has(a.id),
                  onFavoriteClick: () => toggleFavorite(a),
                  onRegister: () => apply(a),
                })}
              />
            ))}
          </div>

          {pages > 1 ? (
            <ActivityPagination currentPage={current} totalPages={pages} onPageChange={setPage} />
          ) : null}
        </>
      )}
    </div>
  );
}


