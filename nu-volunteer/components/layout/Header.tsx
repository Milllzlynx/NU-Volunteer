'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { HeaderClock } from '@/components/layout/HeaderClock';
import { HeaderSearch } from '@/components/layout/HeaderSearch';
import { Icon } from '@/components/ui';
import { MOOD_DESC, MOOD_LABEL, MOOD_LABEL_EN, useApp, type Mood } from '@/components/providers/AppProviders';
import { COLOR, ROLE_ACCENT, ROLE_LABEL, ROLE_LABEL_EN, ROLE_NAV, solidGlass } from '@/lib/design';
import type { PublicUser } from '@/lib/auth';

const MOODS: Mood[] = ['pastel', 'candy', 'neon', 'minimal'];

/** ตัวเลขแจ้งเตือนบนกระดิ่ง — ขอบขาวกันกลืนกับไอคอนด้านหลัง */
const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -5,
  insetInlineEnd: -5,
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
};

/** รายการหนึ่งบรรทัดในเมนูบัญชี — ใช้ทั้งกับลิงก์และปุ่มออกจากระบบให้หน้าตาตรงกัน */
const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  padding: '9px 11px',
  borderRadius: 11,
  fontSize: 13,
  color: COLOR.ink,
  textAlign: 'start',
};

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
  available = [],
}: {
  account: PublicUser;
  pageTitle: string;
  onOpenMobileNav: () => void;
  unreadCount?: number;
  /** คีย์หน้าที่บทบาทนี้เปิดใช้แล้ว — ปุ่มลัดจะขึ้นเฉพาะหน้าที่ไปถึงได้จริง */
  available?: string[];
}) {
  const router = useRouter();
  const { isEn, toggleLang, darkMode, toggleTheme, mood, setMood, t } = useApp();
  const [styleMenu, setStyleMenu] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const roleLabel = isEn ? ROLE_LABEL_EN[account.role] : ROLE_LABEL[account.role];
  const accent = ROLE_ACCENT[account.role] ?? '#1F2937';

  /**
   * เมนูบัญชี — ดึง href และป้ายจาก ROLE_NAV ตัวเดียวกับแถบข้าง เมนูสองที่จะได้ไม่หลุดจากกัน
   * และกรองด้วย available เหมือนที่อื่น เพราะบางบทบาทยังไม่มีหน้าเหล่านี้ กดไปก็เจอ 404
   */
  const accountLinks = (ROLE_NAV[account.role] ?? []).filter(
    (item) => (item.key === 'profile' || item.key === 'settings') && available.includes(item.key),
  );

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  /** แชร์หน้าที่เปิดอยู่ — ใช้เมนูของระบบถ้ามี ไม่มีก็คัดลอกลิงก์ให้แทน (แบบเดียวกับหน้ารายละเอียดกิจกรรม) */
  async function shareLink() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: pageTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ผู้ใช้กดยกเลิกเมนูแชร์เอง หรือเบราว์เซอร์ไม่ให้สิทธิ์คลิปบอร์ด — ไม่ใช่ข้อผิดพลาดที่ต้องแจ้ง
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        /* ช่องค้นหาของจอแคบกว้างเต็มแถบ จึงตกไปขึ้นบรรทัดใหม่เองโดยไม่ต้องมี div ครอบแถวบน */
        flexWrap: 'wrap',
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

      {/* ── ซ้าย: ชื่อหน้าปัจจุบัน ── */}
      <div className="nuv-header-title" style={{ minWidth: 0, flexShrink: 0 }}>
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
        <div style={{ fontSize: 11.5, color: COLOR.hint, lineHeight: 1.6 }}>NU Volunteer</div>
      </div>

      {/* ── กลาง: ค้นหากิจกรรม ── */}
      <HeaderSearch />

      {/* ดันกลุ่มปุ่มควบคุมไปชิดขวาเสมอ — ช่องค้นหาโตได้ถึง maxWidth ที่เหลือจึงตกมาที่นี่
          และเมื่อจอแคบจนช่องค้นหาถูกซ่อน ตัวเว้นนี้ยังกันไม่ให้ปุ่มไหลไปกองทางซ้าย */}
      <div aria-hidden="true" style={{ flex: 1, minWidth: 0 }} />

      {/* ── ขวา: นาฬิกา ปุ่มควบคุม และบัญชีผู้ใช้ ── */}
      <HeaderClock />

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

      {/* กระดิ่งแจ้งเตือน — ตัวเลขอยู่ที่กระดิ่ง ไม่ใช่ที่รูปโปรไฟล์ จะได้สื่อว่านับอะไร */}
      {available.includes('notifications') ? (
        <Link
          href={`/${account.role}/notifications`}
          title={t('การแจ้งเตือน')}
          aria-label={
            unreadCount > 0 ? `${t('การแจ้งเตือน')} · ${unreadCount} ${t('ยังไม่อ่าน')}` : t('การแจ้งเตือน')
          }
          style={{ ...chipButton(), position: 'relative' }}
        >
          <Icon name="notifications" size={19} />
          {unreadCount > 0 ? (
            <span className="nuv-keep" style={badgeStyle}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Link>
      ) : null}

      {/* ชื่อและบทบาทของผู้ใช้ — ย้ายมาอยู่คู่รูปโปรไฟล์ทางขวา กดแล้วเปิดเมนูบัญชี */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setAccountMenu((v) => !v)}
          className="nuv-header-user"
          aria-haspopup="menu"
          aria-expanded={accountMenu}
          aria-label={t('เมนูบัญชี')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            minWidth: 0,
            padding: 0,
            border: 'none',
            background: 'transparent',
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span style={{ minWidth: 0, textAlign: 'end' }}>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 600,
                color: COLOR.ink,
                lineHeight: 1.45,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 140,
              }}
            >
              {account.name || account.email}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: COLOR.hint, lineHeight: 1.5 }}>
              {roleLabel}
            </span>
          </span>
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
        </button>

        {accountMenu ? (
          <>
            <div onClick={() => setAccountMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
            <div
              role="menu"
              style={{ ...solidGlass(18), position: 'absolute', top: 48, insetInlineEnd: 0, width: 196, padding: 8, zIndex: 31 }}
            >
              {accountLinks.map((item) => (
                <Link
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setAccountMenu(false)}
                  style={menuItemStyle}
                >
                  <Icon name={item.icon} size={18} />
                  {isEn ? item.labelEn : item.label}
                </Link>
              ))}
              {accountLinks.length ? (
                <div style={{ height: 1, background: 'rgba(31,41,55,.1)', margin: '6px 4px' }} />
              ) : null}
              <button
                role="menuitem"
                onClick={() => {
                  setAccountMenu(false);
                  signOut();
                }}
                disabled={busy}
                style={{
                  ...menuItemStyle,
                  border: 'none',
                  background: 'transparent',
                  font: 'inherit',
                  color: '#E4572E',
                  cursor: 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Icon name="logout" size={18} />
                {t('ออกจากระบบ')}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <button
        onClick={shareLink}
        className="nuv-header-extra"
        title={copied ? t('คัดลอกลิงก์แล้ว') : t('คัดลอกลิงก์')}
        aria-label={copied ? t('คัดลอกลิงก์แล้ว') : t('คัดลอกลิงก์')}
        style={chipButton()}
      >
        <Icon name={copied ? 'check' : 'share'} size={19} />
      </button>

      <button
        onClick={signOut}
        disabled={busy}
        title={t('ออกจากระบบ')}
        aria-label={t('ออกจากระบบ')}
        style={{ ...chipButton(), opacity: busy ? 0.5 : 1 }}
      >
        <Icon name="logout" size={19} />
      </button>

      {/* จอแคบ: ช่องค้นหาลงมาเป็นแถวของตัวเอง แถบบนแน่นเกินกว่าจะใส่ไว้ในแถวเดียวกัน */}
      <HeaderSearch variant="mobile" />
    </header>
  );
}
