'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useT } from '@/components/providers/AppProviders';

export type AsideItem = { icon: string; label: string; desc?: string };

/**
 * โครงหน้า auth ที่ใช้ร่วมกันทั้ง 4 หน้า (เข้าสู่ระบบ / สมัคร / ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่)
 * ซ้าย = ภาพ + gradient แบรนด์ (ซ่อนบนมือถือ) · ขวา = ฟอร์ม
 */
export function AuthSplit({
  photo,
  overlay,
  maxWidth = 940,
  asideMinHeight = 520,
  headline,
  headlineSub,
  lead,
  items,
  footNote,
  stats,
  children,
}: {
  photo: string;
  overlay: string;
  maxWidth?: number;
  asideMinHeight?: number;
  headline: string;
  headlineSub: string;
  lead: string;
  items: AsideItem[];
  footNote?: string;
  stats?: { value: string; label: string }[];
  children: ReactNode;
}) {
  const t = useT();

  return (
    <div
      className="nuv-auth-wrap"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="nuv-auth-split"
        style={{
          width: '100%',
          maxWidth,
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          borderRadius: 28,
          overflow: 'hidden',
          background: 'rgba(255,255,255,.9)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.9)',
          boxShadow: '0 30px 70px rgba(31,41,55,.16)',
        }}
      >
        <div
          className="nuv-auth-aside nuv-keep"
          style={{
            position: 'relative',
            minHeight: asideMinHeight,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '38px 34px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ภาพจากปลายทางภายนอก ใช้ <img> ตามต้นแบบ */}
          <img
            src={photo}
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
          <div style={{ position: 'absolute', inset: 0, background: overlay }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                flexShrink: 0,
                background: 'rgba(255,255,255,.22)',
                border: '1px solid rgba(255,255,255,.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 23, height: 23, display: 'block' }} aria-hidden="true">
                <path
                  d="M12 9.4c-1.25-2.6-5.2-2.3-5.2.95 0 2.3 3 4.3 5.2 5.75 2.2-1.45 5.2-3.45 5.2-5.75 0-3.25-3.95-3.55-5.2-.95Z"
                  fill="#fff"
                />
                <path
                  d="M3.4 15.2c0 4.2 3.95 6.5 8.6 6.5s8.6-2.3 8.6-6.5"
                  stroke="#fff"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  opacity=".8"
                />
              </svg>
            </div>
            <div style={{ fontWeight: 600, fontSize: 17, color: '#fff' }}>NU Volunteer</div>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: 29,
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.35,
                textShadow: '0 2px 14px rgba(0,0,0,.22)',
                textWrap: 'pretty',
              }}
            >
              {t(headline)}
              <br />
              {t(headlineSub)}
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.85,
                color: 'rgba(255,255,255,.9)',
                marginTop: 12,
                maxWidth: 330,
              }}
            >
              {t(lead)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
              {items.map((it) => (
                <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: 'rgba(255,255,255,.2)',
                      border: '1px solid rgba(255,255,255,.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={it.icon} size={17} style={{ color: '#fff' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,.94)', lineHeight: 1.6 }}>
                    {t(it.label)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {stats ? (
            <div style={{ position: 'relative', display: 'flex', gap: 22 }}>
              {stats.map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.78)' }}>{t(s.label)}</div>
                </div>
              ))}
            </div>
          ) : footNote ? (
            <div
              style={{
                position: 'relative',
                fontSize: 11.5,
                color: 'rgba(255,255,255,.72)',
                lineHeight: 1.7,
              }}
            >
              {t(footNote)}
            </div>
          ) : (
            <div />
          )}
        </div>

        <div
          className="nuv-auth-pane"
          style={{
            padding: '40px 38px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
