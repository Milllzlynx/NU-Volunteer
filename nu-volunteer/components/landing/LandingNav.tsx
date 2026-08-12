'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/layout/BrandMark';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { authApi } from '@/lib/api';
import { BRAND_GRADIENT, COLOR, ROLE_LABEL, ROLE_LABEL_EN } from '@/lib/design';
import type { SessionAccount } from '@/components/landing/types';

const ICON_BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  borderRadius: 11,
  border: '1px solid rgba(31,41,55,.1)',
  background: 'rgba(255,255,255,.6)',
  cursor: 'pointer',
  color: COLOR.label,
  fontFamily: 'inherit',
  transition: 'all 220ms ease',
  flexShrink: 0,
};

/** นาฬิกาบนแถบนำทาง — เรนเดอร์หลัง mount เท่านั้น เพื่อไม่ให้ HTML ฝั่งเซิร์ฟเวอร์กับ client ต่างกัน */
function Clock() {
  const { isEn } = useApp();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const locale = isEn ? 'en-GB' : 'th-TH';
  return (
    <div className="nuv-land-clock" style={{ textAlign: 'right', lineHeight: 1.35, marginRight: 2 }}>
      <div style={{ fontSize: 12.5, color: COLOR.body, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {now ? now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
      <div style={{ fontSize: 10.5, color: COLOR.hint, whiteSpace: 'nowrap' }}>
        {now
          ? now.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
          : ''}
      </div>
    </div>
  );
}

export function LandingNav({ account }: { account: SessionAccount | null }) {
  const { t, isEn, lang, toggleLang, darkMode, toggleTheme } = useApp();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // ซ่อนแถบเมื่อเลื่อนลง แสดงกลับเมื่อเลื่อนขึ้น
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const top = y < 8;
      setAtTop(top);
      if (top) setHidden(false);
      else if (y - last > 6) setHidden(true);
      else if (last - y > 6) setHidden(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const first = setTimeout(onScroll, 0); // เผื่อเปิดหน้ามาแล้วเบราว์เซอร์คืนตำแหน่งเลื่อนเดิม
    return () => {
      clearTimeout(first);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      /* ออกจากระบบฝั่ง client ต่อไปแม้เซิร์ฟเวอร์ตอบไม่สำเร็จ */
    }
    setMenuOpen(false);
    setLoggingOut(false);
    router.refresh();
  }

  const roleLabel = account
    ? (isEn ? ROLE_LABEL_EN : ROLE_LABEL)[account.role] || account.role
    : '';

  const authButtons = (
    <>
      <Link
        href="/login"
        className="nuv-land-authbtn"
        style={{
          background: 'rgba(255,255,255,.7)',
          color: COLOR.ink,
          border: '1px solid rgba(31,41,55,.1)',
          padding: '10px 20px',
          borderRadius: 13,
          fontWeight: 500,
          fontSize: 13.5,
          lineHeight: 1.7,
          whiteSpace: 'nowrap',
          transition: 'all 220ms ease',
        }}
      >
        {t('เข้าสู่ระบบ')}
      </Link>
      <Link
        href="/register"
        className="nuv-land-authbtn nuv-keep"
        style={{
          background: BRAND_GRADIENT,
          color: '#fff',
          padding: '10px 22px',
          borderRadius: 13,
          fontWeight: 500,
          fontSize: 13.5,
          lineHeight: 1.7,
          boxShadow: '0 6px 18px rgba(167,116,247,.32)',
          whiteSpace: 'nowrap',
          transition: 'all 220ms ease',
        }}
      >
        {t('สมัครสมาชิก')}
      </Link>
    </>
  );

  const accountBlock = account ? (
    <>
      <div style={{ textAlign: 'right', lineHeight: 1.4, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: COLOR.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 180,
          }}
        >
          {account.name || account.email}
        </div>
        <div style={{ fontSize: 11, color: COLOR.hint }}>{roleLabel}</div>
      </div>
      <button
        type="button"
        onClick={logout}
        title={t('ออกจากระบบ')}
        aria-label={t('ออกจากระบบ')}
        style={{ ...ICON_BTN, width: 36 }}
      >
        <Icon name="logout" size={19} />
      </button>
    </>
  ) : null;

  return (
    <div
      className="nuv-land-navwrap"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '16px 16px 0',
        isolation: 'isolate',
        pointerEvents: 'none',
        transition: 'transform 300ms ease',
        transform: `translateY(${hidden && !menuOpen ? '-140%' : '0'})`,
      }}
    >
      <div
        className="nuv-land-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '11px 14px 11px 18px',
          background: 'rgba(255,255,255,.93)',
          backdropFilter: 'blur(26px) saturate(180%)',
          WebkitBackdropFilter: 'blur(26px) saturate(180%)',
          border: '1px solid rgba(31,41,55,.07)',
          borderRadius: 20,
          pointerEvents: 'auto',
          transition: 'box-shadow 260ms ease',
          boxShadow: atTop ? '0 4px 16px rgba(31,41,55,.07)' : '0 12px 34px rgba(31,41,55,.18)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <BrandMark />
          <span
            className="nuv-land-brandtext"
            style={{
              fontWeight: 600,
              fontSize: 17,
              lineHeight: 1.7,
              color: COLOR.ink,
              whiteSpace: 'nowrap',
            }}
          >
            NU Volunteer
          </span>
        </Link>

        <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexShrink: 0 }}>
          <Clock />

          <button
            type="button"
            onClick={toggleLang}
            title={lang === 'en' ? 'Switch to Thai' : 'เปลี่ยนเป็นภาษาอังกฤษ'}
            style={{
              ...ICON_BTN,
              minWidth: 36,
              padding: '0 9px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.03em',
            }}
          >
            {lang === 'en' ? 'EN' : 'TH'}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={darkMode ? t('โหมดสว่าง') : t('โหมดมืด')}
            aria-label={darkMode ? t('โหมดสว่าง') : t('โหมดมืด')}
            style={{ ...ICON_BTN, width: 36 }}
          >
            <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={19} />
          </button>

          <div className="nuv-land-authgroup" style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            {account ? accountBlock : authButtons}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((m) => !m)}
            title={t('เมนู')}
            aria-label={t('เมนู')}
            aria-expanded={menuOpen}
            className="nuv-land-burger"
            style={{ ...ICON_BTN, width: 36, display: 'none' }}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          style={{
            margin: '10px 0 0',
            padding: 14,
            borderRadius: 18,
            background: 'rgba(255,255,255,.96)',
            backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
            border: '1px solid rgba(31,41,55,.08)',
            boxShadow: '0 14px 36px rgba(31,41,55,.16)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}
        >
          {account ? (
            <>
              <div style={{ fontSize: 13, color: COLOR.ink, padding: '2px 2px 6px' }}>
                {account.name || account.email}
                <span style={{ color: COLOR.hint, fontSize: 11.5 }}> · {roleLabel}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 13,
                  border: '1px solid rgba(31,41,55,.12)',
                  background: 'rgba(255,255,255,.8)',
                  color: COLOR.ink,
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                {t('ออกจากระบบ')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 13,
                  border: '1px solid rgba(31,41,55,.12)',
                  background: 'rgba(255,255,255,.8)',
                  color: COLOR.ink,
                  fontWeight: 500,
                  fontSize: 13.5,
                  textAlign: 'center',
                }}
              >
                {t('เข้าสู่ระบบ')}
              </Link>
              <Link
                href="/register"
                className="nuv-keep"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 13,
                  background: BRAND_GRADIENT,
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: 13.5,
                  textAlign: 'center',
                  boxShadow: '0 6px 18px rgba(167,116,247,.32)',
                }}
              >
                {t('สมัครสมาชิก')}
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
