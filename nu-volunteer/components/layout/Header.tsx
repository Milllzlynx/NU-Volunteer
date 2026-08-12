'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui';
import { MOOD_DESC, MOOD_LABEL, MOOD_LABEL_EN, useApp, type Mood } from '@/components/providers/AppProviders';
import { COLOR, ROLE_ACCENT, ROLE_LABEL, ROLE_LABEL_EN, solidGlass } from '@/lib/design';
import type { PublicUser } from '@/lib/auth';

const MOODS: Mood[] = ['pastel', 'candy', 'neon', 'minimal'];

function chipButton(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 12,
    border: '1px solid rgba(31,41,55,.1)',
    background: 'rgba(255,255,255,.6)',
    color: COLOR.label,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 220ms ease',
  };
}

export function Header({
  account,
  pageTitle,
  onOpenMobileNav,
  unreadCount = 0,
}: {
  account: PublicUser;
  pageTitle: string;
  onOpenMobileNav: () => void;
  unreadCount?: number;
}) {
  const router = useRouter();
  const { isEn, toggleLang, darkMode, toggleTheme, mood, setMood, t } = useApp();
  const [styleMenu, setStyleMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const roleLabel = isEn ? ROLE_LABEL_EN[account.role] : ROLE_LABEL[account.role];
  const accent = ROLE_ACCENT[account.role] ?? '#1F2937';

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        marginBottom: 14,
        background: 'rgba(255,255,255,.62)',
        backdropFilter: 'blur(26px) saturate(180%)',
        WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        border: '1px solid rgba(255,255,255,.75)',
        borderRadius: 20,
        boxShadow: '0 10px 30px rgba(31,41,55,.08)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <button
        className="nuv-mobile-burger"
        onClick={onOpenMobileNav}
        aria-label={isEn ? 'Open menu' : 'เปิดเมนู'}
        title={isEn ? 'Open menu' : 'เปิดเมนู'}
        style={{ ...chipButton(), display: 'none' }}
      >
        <Icon name="menu" size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: COLOR.ink,
            lineHeight: 1.45,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pageTitle}
        </div>
        <div style={{ fontSize: 11.5, color: COLOR.hint, lineHeight: 1.6 }}>
          {account.name || account.email} · {roleLabel}
        </div>
      </div>

      <button
        onClick={toggleLang}
        title={isEn ? 'สลับเป็นภาษาไทย' : 'Switch to English'}
        aria-label={isEn ? 'สลับเป็นภาษาไทย' : 'Switch to English'}
        style={{ ...chipButton(), width: 'auto', padding: '0 11px', fontSize: 12, fontWeight: 600 }}
      >
        {isEn ? 'TH' : 'EN'}
      </button>

      <button
        onClick={toggleTheme}
        title={darkMode ? t('เปิดโหมดสว่าง') : t('เปิดโหมดมืด')}
        aria-label={darkMode ? t('เปิดโหมดสว่าง') : t('เปิดโหมดมืด')}
        style={chipButton()}
      >
        <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={19} />
      </button>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setStyleMenu((v) => !v)}
          title={t('ปรับแต่งสไตล์')}
          aria-label={t('ปรับแต่งสไตล์')}
          aria-expanded={styleMenu}
          style={chipButton()}
        >
          <Icon name="palette" size={19} />
        </button>
        {styleMenu ? (
          <>
            <div
              onClick={() => setStyleMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 30 }}
            />
            <div
              style={{
                ...solidGlass(20),
                position: 'absolute',
                top: 46,
                right: 0,
                width: 268,
                padding: 12,
                zIndex: 31,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: COLOR.hint,
                  padding: '2px 8px 8px',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t('สไตล์ภาพรวม')}
              </div>
              {MOODS.map((m) => {
                const active = m === mood;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMood(m);
                      setStyleMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? 'rgba(167,116,247,.14)' : 'transparent',
                      color: COLOR.ink,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>
                      {isEn ? MOOD_LABEL_EN[m] : MOOD_LABEL[m]}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: COLOR.label,
                        lineHeight: 1.6,
                        marginTop: 2,
                      }}
                    >
                      {t(MOOD_DESC[m])}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${accent}, #A774F7)`,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
          }}
        >
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt=""
              className="nuv-noinv"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            (account.name || account.email).trim().charAt(0).toUpperCase()
          )}
        </div>
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: '#E4572E',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>

      <button
        onClick={signOut}
        disabled={busy}
        title={t('ออกจากระบบ')}
        aria-label={t('ออกจากระบบ')}
        style={{ ...chipButton(), opacity: busy ? 0.5 : 1 }}
      >
        <Icon name="logout" size={19} />
      </button>
    </header>
  );
}
