'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { BRAND_GRADIENT, COLOR } from '@/lib/design';
import type { PublicActivity } from '@/components/landing/types';

export type StudentBanner = {
  id: string;
  title: string;
  desc: string;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  type: string;
  date: string;
  dateEn: string;
};

export type HoursProgress = { total: number; goal: number; remaining: number; pct: number };

export type StudentStats = {
  joined: number;
  hours: number;
  certificates: number;
  favorites: number;
};

const BANNER_TAG: Record<string, { label: string; bg: string; color: string }> = {
  update: { label: 'อัพเดทระบบ', bg: 'rgba(122,184,255,.14)', color: '#3268c9' },
  reminder: { label: 'เตือนความจำ', bg: 'rgba(245,166,35,.14)', color: '#c2760f' },
  general: { label: 'ประกาศทั่วไป', bg: 'rgba(167,116,247,.14)', color: '#8b2fe0' },
};

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,.62)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.75)',
};

const ROUND_BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(240,241,244,.94)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  color: COLOR.body,
  cursor: 'pointer',
  transition: 'all 220ms ease',
};

/** แบนเนอร์ประกาศ — เลื่อนอัตโนมัติ หยุดเมื่อชี้เมาส์ค้าง */
function BannerHero({ banners }: { banners: StudentBanner[] }) {
  const { t, isEn } = useApp();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % banners.length), 7000);
    return () => clearInterval(id);
  }, [paused, banners.length]);

  const b = banners[idx % banners.length];
  const tag = BANNER_TAG[b.type] ?? BANNER_TAG.general;

  return (
    <div
      className="nuv-keep nuv-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        borderRadius: 26,
        overflow: 'hidden',
        minHeight: 330,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 20px 55px rgba(31,41,55,.2)',
      }}
    >
      {b.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
        <img
          src={b.image}
          alt=""
          className="nuv-noinv"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : null}
      <div
        className="nuv-hero-scrim"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(96deg,rgba(248,249,252,.97) 0%,rgba(248,249,252,.92) 30%,rgba(248,249,252,.55) 52%,rgba(248,249,252,.05) 72%)',
        }}
      />

      <div className="nuv-hero-body" style={{ position: 'relative', padding: '38px 42px 62px', maxWidth: 560 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '5px 13px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: tag.bg,
              color: tag.color,
            }}
          >
            {t(tag.label)}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: 500,
              color: '#A774F7',
            }}
          >
            <Icon name="star" size={14} fill />
            {isEn ? b.dateEn : b.date}
          </div>
        </div>
        <div
          className="nuv-hero-title"
          style={{
            fontSize: 34,
            fontWeight: 600,
            color: COLOR.ink,
            lineHeight: 1.32,
            textWrap: 'pretty',
          }}
        >
          {b.title}
        </div>
        <div
          className="nuv-hero-desc"
          style={{
            fontSize: 13.5,
            lineHeight: 1.9,
            color: COLOR.body,
            marginTop: 14,
            maxWidth: 440,
            textWrap: 'pretty',
          }}
        >
          {b.desc}
        </div>
        {b.ctaLabel ? (
          <div style={{ display: 'flex', gap: 11, marginTop: 22, flexWrap: 'wrap' }}>
            <Link
              href={b.ctaHref}
              className="nuv-hero-cta"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 13,
                background: BRAND_GRADIENT,
                color: '#fff',
                fontWeight: 500,
                fontSize: 13.5,
                boxShadow: '0 8px 22px rgba(167,116,247,.35)',
                transition: 'all 220ms ease',
              }}
            >
              {b.ctaLabel}
              <Icon name="rocket_launch" size={18} />
            </Link>
          </div>
        ) : null}
      </div>

      {banners.length > 1 ? (
        <div
          className="nuv-hero-nav"
          style={{
            position: 'absolute',
            left: 42,
            right: 26,
            bottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {banners.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`${t('ประกาศที่')} ${i + 1}`}
                style={{
                  width: i === idx ? 30 : 9,
                  height: 9,
                  padding: 0,
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  transition: 'all 320ms ease',
                  background: i === idx ? COLOR.ink : 'rgba(31,41,55,.26)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
              title={t('ประกาศก่อนหน้า')}
              aria-label={t('ประกาศก่อนหน้า')}
              style={ROUND_BTN}
            >
              <Icon name="chevron_left" size={22} />
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % banners.length)}
              title={t('ประกาศถัดไป')}
              aria-label={t('ประกาศถัดไป')}
              style={ROUND_BTN}
            >
              <Icon name="chevron_right" size={22} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StudentHome({
  studentName,
  banners,
  progress,
  stats,
  latest,
}: {
  studentName: string;
  banners: StudentBanner[];
  progress: HoursProgress | null;
  stats: StudentStats;
  latest: PublicActivity[];
}) {
  const { t, isEn } = useApp();

  const statCards = [
    {
      label: 'กิจกรรมที่เข้าร่วม',
      value: String(stats.joined),
      color: '#E97171',
      accentTo: '#F5A9A0',
      iconBg: 'rgba(233,113,113,.16)',
      icon: 'volunteer_activism',
    },
    {
      label: 'ชั่วโมงสะสม',
      value: `${stats.hours} ${t('ชม.')}`,
      color: '#A774F7',
      accentTo: '#C9A5FA',
      iconBg: 'rgba(167,116,247,.16)',
      icon: 'schedule',
    },
    {
      label: 'ใบประกาศ',
      value: String(stats.certificates),
      color: '#63D2A1',
      accentTo: '#9BE5C6',
      iconBg: 'rgba(99,210,161,.16)',
      icon: 'workspace_premium',
    },
    {
      label: 'รายการโปรด',
      value: String(stats.favorites),
      color: '#7AB8FF',
      accentTo: '#AED5FF',
      iconBg: 'rgba(122,184,255,.16)',
      icon: 'favorite',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'nuFadeUp .3s ease' }}>
      {banners.length ? <BannerHero banners={banners} /> : null}

      <div style={{ fontSize: 22, lineHeight: 1.7, fontWeight: 600, color: COLOR.ink }}>
        {t('สวัสดี,')} {studentName}
      </div>

      {progress ? (
        <div
          style={{
            background: 'linear-gradient(120deg,rgba(233,113,113,.14),rgba(167,116,247,.1))',
            border: '1px solid rgba(233,113,113,.2)',
            borderRadius: 22,
            padding: '22px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  fontWeight: 500,
                  color: '#c2410c',
                  textTransform: 'uppercase',
                  letterSpacing: '.03em',
                }}
              >
                {t('สถานะผู้กู้ยืม กยศ.')}
              </div>
              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1.7,
                  fontWeight: 600,
                  color: COLOR.ink,
                  marginTop: 4,
                }}
              >
                {progress.total} / {progress.goal} {t('ชม.')}
              </div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: COLOR.label, textAlign: 'right' }}>
              {t('เป้าหมาย 36 ชม./ปี')}
              <br />
              {t('เหลืออีก')} {progress.remaining} {t('ชม.')}
            </div>
          </div>
          <div
            style={{
              height: 9,
              borderRadius: 6,
              background: 'rgba(30,37,48,.08)',
              marginTop: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.pct}%`,
                background: 'linear-gradient(90deg,#E97171,#A774F7)',
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 14,
        }}
      >
        {statCards.map((c) => (
          <div
            key={c.label}
            style={{
              ...GLASS,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 24,
              padding: '20px 18px 18px',
              boxShadow: '0 15px 45px rgba(31,41,55,.10), inset 0 1px 0 rgba(255,255,255,.6)',
              transition: 'all 300ms ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg,${c.color},${c.accentTo})`,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 26, lineHeight: 1.5, fontWeight: 600, color: COLOR.ink }}>
                {c.value}
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: c.iconBg,
                }}
              >
                <Icon name={c.icon} size={21} fill style={{ color: c.color }} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: COLOR.label, marginTop: 2 }}>
              {t(c.label)}
            </div>
          </div>
        ))}
      </div>

      <div id="nuv-latest" style={{ scrollMarginTop: 90 }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: 15,
            lineHeight: 1.7,
            color: COLOR.ink,
            marginBottom: 10,
          }}
        >
          {t('กิจกรรมล่าสุด')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {latest.length === 0 ? (
            <div
              style={{
                ...GLASS,
                borderRadius: 16,
                padding: '22px 16px',
                textAlign: 'center',
                fontSize: 12.5,
                color: COLOR.hint,
              }}
            >
              {t('ยังไม่มีกิจกรรมที่เปิดรับสมัครในขณะนี้')}
            </div>
          ) : (
            latest.map((a) => (
              <div
                key={a.id}
                style={{
                  ...GLASS,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  borderRadius: 16,
                  padding: '12px 16px',
                }}
              >
                <div
                  style={{
                    width: 5,
                    alignSelf: 'stretch',
                    borderRadius: 4,
                    background: a.category.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: COLOR.ink,
                      textWrap: 'pretty',
                    }}
                  >
                    {a.title}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: COLOR.label }}>
                    {a.orgName ? `${a.orgName} · ` : ''}
                    {isEn ? a.dateEn : a.dateTh}
                  </div>
                </div>
                <Link
                  href={`/activities/${a.id}`}
                  title={t('ดูรายละเอียด')}
                  aria-label={`${t('ดูรายละเอียด')}: ${a.title}`}
                  className="nuv-iconbtn"
                  style={{
                    ...GLASS,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    cursor: 'pointer',
                    transition: 'all 220ms ease',
                    flexShrink: 0,
                    border: '1px solid rgba(31,41,55,.10)',
                    color: COLOR.body,
                  }}
                >
                  <Icon name="visibility" size={18} />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
