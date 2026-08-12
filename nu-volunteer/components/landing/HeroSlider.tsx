'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useT } from '@/components/providers/AppProviders';
import { BRAND_GRADIENT } from '@/lib/design';

/** ภาพหัวหน้าแรก — เนื้อหาประชาสัมพันธ์ตายตัวตามต้นแบบ (ไม่ผูกกับฐานข้อมูล) */
const SLIDES = [
  {
    tag: 'สิ่งแวดล้อม',
    icon: 'eco',
    title: 'Green Campus Initiative',
    translateTitle: false,
    desc: 'ร่วมปลูกต้นไม้และฟื้นฟูพื้นที่สีเขียวรอบมหาวิทยาลัย สร้างระบบนิเวศที่ยั่งยืนไปด้วยกัน',
    photo:
      'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1400&q=75',
  },
  {
    tag: 'ชุมชน',
    icon: 'diversity_3',
    title: 'อาสาพัฒนาชุมชน',
    translateTitle: true,
    desc: 'ลงพื้นที่ช่วยเหลือชุมชนรอบมหาวิทยาลัย ทั้งด้านการศึกษา สาธารณสุข และสาธารณูปโภค',
    photo:
      'https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=1400&q=75',
  },
  {
    tag: 'การศึกษา',
    icon: 'school',
    title: 'ค่ายอาสาสอนน้อง',
    translateTitle: true,
    desc: 'แบ่งปันความรู้ให้น้องๆ ในโรงเรียนขยายโอกาส พร้อมสะสมชั่วโมงจิตอาสาไปในตัว',
    photo:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=75',
  },
  {
    tag: 'สุขภาพและกีฬา',
    icon: 'volunteer_activism',
    title: 'บริจาคโลหิตเพื่อเพื่อนมนุษย์',
    translateTitle: true,
    desc: 'ร่วมบริจาคโลหิตกับสภากาชาดไทย หนึ่งการให้ของคุณช่วยชีวิตได้ถึงสามคน',
    photo:
      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1400&q=75',
  },
  {
    tag: 'จิตสาธารณะ',
    icon: 'cleaning_services',
    title: 'เก็บขยะคืนความสะอาดให้ธรรมชาติ',
    translateTitle: true,
    desc: 'ลงมือเก็บขยะชายหาดและพื้นที่สาธารณะ คืนสิ่งแวดล้อมที่ดีให้ชุมชนของเรา',
    photo:
      'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1400&q=75',
  },
];

const ROUND_BTN: React.CSSProperties = {
  position: 'absolute',
  bottom: 26,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,.8)',
  color: '#1F2937',
  cursor: 'pointer',
  transition: 'all 220ms ease',
  boxShadow: '0 6px 18px rgba(0,0,0,.2)',
};

export function HeroSlider() {
  const t = useT();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const active = SLIDES[idx];

  return (
    <div
      className="nuv-slider nuv-keep"
      style={{
        position: 'relative',
        borderRadius: 28,
        overflow: 'hidden',
        height: 400,
        boxShadow: '0 24px 60px rgba(31,41,55,.2)',
      }}
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.title}
          style={{
            position: 'absolute',
            inset: 0,
            transition: 'opacity 700ms ease',
            opacity: i === idx ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ภาพจากปลายทางภายนอก ใช้ <img> ตามต้นแบบ */}
          <img
            src={s.photo}
            alt=""
            className="nuv-noinv"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(100deg,rgba(20,16,28,.72) 0%,rgba(20,16,28,.42) 46%,rgba(20,16,28,.08) 72%)',
            }}
          />
        </div>
      ))}

      <div
        className="nuv-slide-panel"
        style={{
          position: 'absolute',
          left: 36,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 400,
          padding: '28px 30px',
          borderRadius: 22,
          background: 'rgba(255,255,255,.14)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          border: '1px solid rgba(255,255,255,.28)',
          boxShadow: '0 18px 50px rgba(0,0,0,.24)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,.2)',
            color: '#fff',
            fontSize: 11.5,
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          <Icon name={active.icon} size={14} fill />
          {t(active.tag)}
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.32,
            textShadow: '0 2px 14px rgba(0,0,0,.35)',
            textWrap: 'pretty',
          }}
        >
          {active.translateTitle ? t(active.title) : active.title}
        </div>
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.8,
            color: 'rgba(255,255,255,.88)',
            marginTop: 10,
            textWrap: 'pretty',
          }}
        >
          {t(active.desc)}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <Link
            href="/register"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: BRAND_GRADIENT,
              color: '#fff',
              padding: '11px 22px',
              borderRadius: 13,
              fontWeight: 500,
              fontSize: 13.5,
              boxShadow: '0 8px 22px rgba(167,116,247,.4)',
              transition: 'all 220ms ease',
            }}
          >
            {t('สมัครเลย')}
          </Link>
          <a
            href="#nuv-activities"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 20px',
              borderRadius: 13,
              border: '1px solid rgba(255,255,255,.35)',
              background: 'rgba(255,255,255,.14)',
              color: '#fff',
              fontSize: 13.5,
              transition: 'all 220ms ease',
            }}
          >
            {t('ดูกิจกรรม')}
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        title={t('ก่อนหน้า')}
        aria-label={t('ก่อนหน้า')}
        style={{ ...ROUND_BTN, right: 74 }}
      >
        <Icon name="chevron_left" size={20} />
      </button>
      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % SLIDES.length)}
        title={t('ถัดไป')}
        aria-label={t('ถัดไป')}
        style={{ ...ROUND_BTN, right: 26 }}
      >
        <Icon name="chevron_right" size={20} />
      </button>

      <div style={{ position: 'absolute', left: 36, bottom: 26, display: 'flex', gap: 7 }}>
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`${t('ภาพที่')} ${i + 1}`}
            style={{
              width: i === idx ? 24 : 8,
              height: 8,
              padding: 0,
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 300ms ease',
              background: i === idx ? '#fff' : 'rgba(255,255,255,.45)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
