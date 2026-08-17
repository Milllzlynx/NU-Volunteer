'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { useApp } from '@/components/providers/AppProviders';
import { EmptyState, Icon, inputStyle } from '@/components/ui';
import { toActivityCardProps } from '@/lib/activityCard';
import { activityApi } from '@/lib/api';
import { COLOR, glass, withAlpha } from '@/lib/design';
import type { PublicActivity, PublicCategory } from '@/components/landing/types';

/**
 * หน้ารวมกิจกรรมของหมวดหมู่เดียว
 *
 * สีทั้งหน้ามาจาก category.color ในฐานข้อมูล ไม่ได้ฝังไว้ในโค้ด
 * หมวด "ด้านส่งเสริมวิชาการ" จึงออกมาเป็นสีม่วงตามที่ตั้งไว้ (#B37CF6) โดยไม่ต้องมีเงื่อนไขพิเศษ
 * และถ้าวันหนึ่งแอดมินเปลี่ยนสีหมวด หน้านี้เปลี่ยนตามทันทีโดยไม่ต้องแก้โค้ด
 */
export function CategoryActivities({
  category,
  activities,
  signedIn,
  backHref,
  myStatus = {},
  myFavorites = [],
}: {
  category: PublicCategory;
  activities: PublicActivity[];
  signedIn: boolean;
  /** ปลายทางของลิงก์ย้อนกลับ — ไม่มีหน้า /activities ที่รวมทุกหมวด ผู้เรียกจึงต้องบอกมา */
  backHref: string;
  myStatus?: Record<string, string>;
  myFavorites?: string[];
}) {
  const { t, isEn } = useApp();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Record<string, string>>(myStatus);
  const [favorites, setFavorites] = useState<string[]>(myFavorites);

  const name = isEn && category.labelEn ? category.labelEn : category.label;

  const toggleFavorite = async (id: string) => {
    // สลับทันทีให้หัวใจตอบสนองเร็ว แล้วยึดผลจริงจากเซิร์ฟเวอร์
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    try {
      const res = await activityApi.toggleFavorite(id);
      setFavorites((prev) =>
        res.favorited ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
      );
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
      // ที่นั่งเต็มหรือปิดรับระหว่างนั้น — หน้ารายละเอียดอธิบายเหตุผลได้ครบกว่าการ์ด
      router.push(`/activities/${id}`);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.orgName.toLowerCase().includes(q),
    );
  }, [activities, search]);

  const openCount = activities.filter((a) => !a.notOpenYet).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {/* ── หัวหน้าเพจ แต่งด้วยสีประจำหมวด ── */}
      <div
        style={{
          ...glass(22),
          padding: 22,
          borderTop: `4px solid ${category.color}`,
          background: `linear-gradient(135deg, ${withAlpha(category.color, '1f')}, rgba(255,255,255,.72))`,
        }}
      >
        <Link
          href={backHref}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: COLOR.label }}
        >
          <Icon name="arrow_back" size={16} />
          {t('กิจกรรมทั้งหมด')}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <span
            aria-hidden="true"
            style={{ width: 14, height: 14, borderRadius: 999, background: category.color, flexShrink: 0 }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4, margin: 0 }}>
            {name}
          </h1>
        </div>

        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 6 }}>
          {`${activities.length} ${t('กิจกรรม')} · ${openCount} ${t('เปิดรับสมัคร')}`}
        </div>
      </div>

      {activities.length > 0 ? (
        <div style={{ ...glass(20), padding: 14 }}>
          <label style={{ display: 'block', position: 'relative' }}>
            <span className="nuv-visually-hidden">{t('ค้นหากิจกรรม...')}</span>
            <Icon
              name="search"
              size={19}
              style={{
                position: 'absolute',
                insetInlineStart: 13,
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
              style={{ ...inputStyle(false), paddingInlineStart: 42 }}
            />
          </label>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon={activities.length === 0 ? 'event_busy' : 'search_off'}
            title={
              activities.length === 0
                ? `${t('ยังไม่มีกิจกรรมในหมวด')} ${name}`
                : t('ไม่พบกิจกรรมที่ตรงกับการค้นหา')
            }
            desc={
              activities.length === 0
                ? t('เมื่อมีกิจกรรมในหมวดนี้เปิดรับสมัคร จะแสดงที่หน้านี้')
                : t('ลองใช้คำค้นที่สั้นลง')
            }
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
            gap: 18,
          }}
        >
          {filtered.map((a) => (
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
