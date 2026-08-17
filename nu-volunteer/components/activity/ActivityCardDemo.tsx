'use client';

import { useState } from 'react';
import { ActivityCard, ActivityCardEmpty, ActivityCardSkeleton } from '@/components/activity/ActivityCard';
import type { ActivityCardProps } from '@/components/activity/ActivityCard';
import { useApp } from '@/components/providers/AppProviders';
import { Button, Icon } from '@/components/ui';
import { COLOR, glass } from '@/lib/design';

/**
 * หน้าตัวอย่างของ ActivityCard — ใช้ดูทุกสถานะพร้อมกันโดยไม่ต้องจัดข้อมูลจริงให้ตรงเงื่อนไข
 * ข้อมูลในหน้านี้เป็นค่าคงที่ ไม่แตะฐานข้อมูล จึงเปิดดูได้โดยไม่กระทบข้อมูลของใคร
 */

/** สีหมวดหมู่ตรงกับที่ตั้งไว้ใน prisma/seed.ts */
const CAT = {
  service: { label: 'ด้านบำเพ็ญประโยชน์', color: '#63D2A1' },
  health: { label: 'ด้านส่งเสริมสุขภาพ กีฬา', color: '#E97171' },
  acad: { label: 'ด้านส่งเสริมวิชาการ', color: '#B37CF6' },
};

const PHOTO = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70';

const BASE: ActivityCardProps = {
  id: 'demo-1',
  title: 'ปลูกป่าชายเลนฟื้นฟูชายฝั่ง',
  category: CAT.service.label,
  categoryColor: CAT.service.color,
  location: 'อ.บางระกำ จ.พิษณุโลก',
  date: '20 ส.ค. 2569',
  time: '07:00 - 11:00',
  imageUrl: PHOTO,
  registeredSlots: 32,
  totalSlots: 50,
  hoursReward: 6,
  href: '#',
};

type Variant = { key: string; label: string; props: ActivityCardProps };

const VARIANTS: Variant[] = [
  {
    key: 'open',
    label: 'เปิดรับสมัคร · ยังไม่ลงทะเบียน',
    props: { ...BASE },
  },
  {
    key: 'pending',
    label: 'ลงทะเบียนแล้ว · รออนุมัติ',
    props: { ...BASE, id: 'demo-2', status: 'pending', isFavorite: true },
  },
  {
    key: 'registered',
    label: 'อนุมัติแล้ว',
    props: {
      ...BASE,
      id: 'demo-3',
      title: 'ค่ายอาสาสอนน้องคณิตศาสตร์',
      category: CAT.acad.label,
      categoryColor: CAT.acad.color,
      status: 'registered',
      registeredSlots: 18,
      totalSlots: 20,
      hoursReward: 12,
    },
  },
  {
    key: 'completed',
    label: 'เสร็จสิ้นแล้ว',
    props: {
      ...BASE,
      id: 'demo-4',
      title: 'NU Run เดิน-วิ่งการกุศล',
      category: CAT.health.label,
      categoryColor: CAT.health.color,
      status: 'completed',
      registeredSlots: 200,
      totalSlots: 200,
      hoursReward: 4,
    },
  },
  {
    key: 'almost',
    label: 'ใกล้เต็ม (ตั้งแต่ 80%)',
    props: { ...BASE, id: 'demo-5', registeredSlots: 45, totalSlots: 50 },
  },
  {
    key: 'full',
    label: 'ที่นั่งเต็ม',
    props: { ...BASE, id: 'demo-6', registeredSlots: 50, totalSlots: 50 },
  },
  {
    key: 'range',
    label: 'ชั่วโมงเป็นช่วง',
    props: { ...BASE, id: 'demo-7', hoursReward: 4, maxHours: 8 },
  },
  {
    key: 'nophoto',
    label: 'ไม่มีภาพประกอบ',
    props: { ...BASE, id: 'demo-8', imageUrl: null },
  },
];

export function ActivityCardDemo() {
  const { t } = useApp();
  const [favorites, setFavorites] = useState<string[]>(['demo-2']);
  const [registered, setRegistered] = useState<string[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  /* แสดงผลการกดปุ่มไอคอนไว้ในหน้า แทนการเปิดกล่องข้อความของเบราว์เซอร์ที่บล็อกหน้าจอ */
  const [lastAction, setLastAction] = useState<string | null>(null);

  /** หน่วงไว้ให้เห็นสปินเนอร์บนปุ่มจริง ๆ — ของจริงคือเวลาที่รอเซิร์ฟเวอร์ตอบ */
  const delay = () => new Promise((r) => setTimeout(r, 700));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="widgets" size={21} style={{ color: '#7C2FD9' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, color: COLOR.ink }}>ActivityCard</h1>
            <div style={{ fontSize: 12, color: COLOR.label, marginTop: 3 }}>
              ทุกสถานะของการ์ดกิจกรรม พร้อมสถานะรอข้อมูลและสถานะว่าง
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            variant="secondary"
            icon={showSkeleton ? 'visibility_off' : 'hourglass_top'}
            onClick={() => setShowSkeleton((v) => !v)}
            style={{ padding: '9px 14px' }}
          >
            {showSkeleton ? 'ซ่อนสถานะรอข้อมูล' : 'แสดงสถานะรอข้อมูล'}
          </Button>
          <Button
            variant="secondary"
            icon={showEmpty ? 'visibility_off' : 'event_busy'}
            onClick={() => setShowEmpty((v) => !v)}
            style={{ padding: '9px 14px' }}
          >
            {showEmpty ? 'ซ่อนสถานะว่าง' : 'แสดงสถานะว่าง'}
          </Button>
        </div>

        {lastAction ? (
          <div role="status" style={{ fontSize: 12, color: '#7C2FD9' }}>
            {`เรียก callback: ${lastAction}`}
          </div>
        ) : null}
      </div>

      {/* กริดตอบสนอง: มือถือ 1 คอลัมน์ · แท็บเล็ต 2 · เดสก์ท็อป 3 */}
      <div
        className="nuv-demo-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}
      >
        {showEmpty ? (
          <ActivityCardEmpty
            title="ยังไม่มีกิจกรรมที่เปิดรับสมัคร"
            desc="เมื่อมีผู้จัดประกาศกิจกรรมใหม่ รายการจะขึ้นที่นี่"
            action={
              <Button variant="primary" icon="refresh">
                โหลดใหม่
              </Button>
            }
          />
        ) : showSkeleton ? (
          <>
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </>
        ) : (
          VARIANTS.map((v) => (
            <div key={v.key} style={{ display: 'grid', gap: 7 }}>
              <span style={{ fontSize: 11.5, color: COLOR.hint }}>{v.label}</span>
              <ActivityCard
                {...v.props}
                isFavorite={favorites.includes(v.props.id)}
                status={registered.includes(v.props.id) ? 'pending' : v.props.status}
                onFavoriteClick={async () => {
                  await delay();
                  setFavorites((prev) =>
                    prev.includes(v.props.id) ? prev.filter((x) => x !== v.props.id) : [...prev, v.props.id],
                  );
                }}
                onRegister={
                  v.props.status
                    ? undefined
                    : async () => {
                        await delay();
                        setRegistered((prev) => [...prev, v.props.id]);
                      }
                }
                onViewDetails={() => setLastAction(`${t('ดูรายละเอียด')} · ${v.props.title}`)}
                onViewParticipants={() => setLastAction(`${t('ผู้เข้าร่วม')} · ${v.props.title}`)}
                onMessage={() => setLastAction(`${t('ติดต่อผู้จัดกิจกรรม')} · ${v.props.title}`)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
