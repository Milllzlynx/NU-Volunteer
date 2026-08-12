'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { NAV_GROUPS, ROLE_NAV, type NavItem } from '@/lib/design';

const LS_COLLAPSED = 'nuv-sidebar-collapsed';

function navItemStyle(active: boolean, collapsed: boolean): React.CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: collapsed ? '11px 0' : '11px 14px',
    justifyContent: collapsed ? 'center' : undefined,
    borderRadius: 14,
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'none',
    transition: 'background 180ms ease,color 180ms ease,box-shadow 180ms ease',
    fontWeight: active ? 500 : 300,
    color: active ? '#fff' : '#4B5563',
    background: active ? 'linear-gradient(135deg,#E97171,#F0918B)' : 'transparent',
    boxShadow: active
      ? '0 8px 22px rgba(233,113,113,.32), inset 0 1px 0 rgba(255,255,255,.35)'
      : 'none',
  };
}

function Badge({ count, active, collapsed }: { count: number; active: boolean; collapsed: boolean }) {
  // บนเมนูที่ active พื้นเป็นเฉดคอรัล — ป้ายต้องสลับเป็นพื้นขาวตัวอักษรเข้ม ไม่งั้นสีกลืนกัน
  const shared: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    fontWeight: 600,
    background: active ? '#fff' : '#E4572E',
    color: active ? '#B23A17' : '#fff',
  };
  return (
    <span
      style={
        collapsed
          ? {
              ...shared,
              position: 'absolute',
              top: 3,
              right: 3,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              fontSize: 9.5,
              boxShadow: active
                ? '0 2px 6px rgba(31,41,55,.3)'
                : '0 0 0 2px #fff,0 2px 6px rgba(228,87,46,.4)',
            }
          : {
              ...shared,
              flexShrink: 0,
              marginLeft: 'auto',
              minWidth: 21,
              height: 21,
              padding: '0 7px',
              fontSize: 10.5,
              boxShadow: active
                ? '0 2px 8px rgba(31,41,55,.28)'
                : '0 2px 6px rgba(228,87,46,.35)',
            }
      }
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar({
  role,
  page,
  badges = {},
  mobileOpen,
  onClose,
}: {
  role: string;
  page: string;
  badges?: Record<string, number>;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { isEn } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // อ่านค่าที่ผู้ใช้ย่อแถบไว้ หลัง hydration เสร็จ
    const id = setTimeout(() => {
      try {
        if (localStorage.getItem(LS_COLLAPSED) === '1') setCollapsed(true);
      } catch {
        /* ไม่เป็นไร */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const isCollapsed = collapsed && !mobileOpen;
  const items = ROLE_NAV[role] ?? [];
  const byKey = new Map(items.map((i) => [i.key, i]));
  const groups = NAV_GROUPS[role] ?? [
    { label: 'เมนู', labelEn: 'Menu', keys: items.map((i) => i.key) },
  ];

  const used = new Set<string>();
  const sections = groups
    .map((g) => {
      const its = g.keys
        .map((k) => byKey.get(k))
        .filter((x): x is NavItem => !!x)
        .map((x) => {
          used.add(x.key);
          return x;
        });
      return { label: isEn ? g.labelEn : g.label, items: its };
    })
    .filter((s) => s.items.length > 0);

  const leftover = items.filter((i) => !used.has(i.key));
  if (leftover.length) sections.push({ label: isEn ? 'Other' : 'อื่นๆ', items: leftover });

  const width = isCollapsed ? 76 : 260;

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(LS_COLLAPSED, next ? '1' : '0');
    } catch {
      /* ไม่เป็นไร */
    }
  };

  return (
    <>
      {mobileOpen ? (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,37,48,.4)', zIndex: 40 }}
        />
      ) : null}

      <aside
        className={mobileOpen ? 'nuv-sidebar-mobile' : 'nuv-sidebar-desktop'}
        style={{
          position: mobileOpen ? 'fixed' : 'sticky',
          top: mobileOpen ? 0 : 10,
          left: 0,
          zIndex: mobileOpen ? 50 : 10,
          width,
          height: mobileOpen ? '100vh' : 'calc(100vh - 20px)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 16,
          background: 'rgba(255,255,255,.62)',
          backdropFilter: 'blur(26px) saturate(180%)',
          WebkitBackdropFilter: 'blur(26px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.75)',
          borderRadius: mobileOpen ? '0 22px 22px 0' : 20,
          boxShadow: '0 10px 30px rgba(31,41,55,.08)',
          transition: 'width 200ms ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isCollapsed ? '18px 0' : '18px 20px',
            justifyContent: isCollapsed ? 'center' : undefined,
          }}
        >
          <BrandMark size={36} radius={11} />
          {!isCollapsed ? (
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1.7,
                color: '#1F2937',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              NU Volunteer
            </div>
          ) : null}
          {mobileOpen ? (
            <button
              onClick={onClose}
              aria-label={isEn ? 'Close menu' : 'ปิดเมนู'}
              title={isEn ? 'Close menu' : 'ปิดเมนู'}
              style={{
                marginRight: 12,
                width: 36,
                height: 36,
                borderRadius: 11,
                border: '1px solid rgba(31,41,55,.1)',
                background: 'rgba(255,255,255,.6)',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>

        <button
          onClick={toggleCollapse}
          className="nuv-collapse-btn"
          title={isEn ? (collapsed ? 'Expand menu' : 'Collapse menu') : collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          aria-label={isEn ? 'Toggle menu width' : 'ย่อ/ขยายเมนู'}
          style={{
            position: 'absolute',
            top: 30,
            right: -13,
            width: 26,
            height: 26,
            display: mobileOpen ? 'none' : 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid rgba(31,41,55,.1)',
            background: 'rgba(255,255,255,.92)',
            color: '#6B7280',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(31,41,55,.14)',
            zIndex: 12,
          }}
        >
          <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} size={17} />
        </button>

        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {sections.map((sec, gi) => (
            <div
              key={sec.label + gi}
              style={{
                marginTop: gi === 0 ? 4 : 18,
                paddingTop: gi > 0 ? 14 : undefined,
                borderTop: gi > 0 ? '1px solid rgba(31,41,55,.07)' : undefined,
              }}
            >
              {!isCollapsed ? (
                <div
                  style={{
                    padding: '0 14px 8px',
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '.08em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  {sec.label}
                </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {sec.items.map((it) => {
                  const active = it.key === page;
                  const count = badges[it.key] || 0;
                  const label = isEn ? it.labelEn : it.label;
                  return (
                    <Link
                      key={it.key}
                      href={it.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      title={isCollapsed ? label : undefined}
                      style={navItemStyle(active, isCollapsed)}
                    >
                      <Icon
                        name={it.icon}
                        size={19}
                        style={{
                          flexShrink: 0,
                          color: active ? '#fff' : 'currentColor',
                          opacity: active ? 1 : 0.8,
                          fontVariationSettings: `'FILL' 0,'wght' ${active ? 400 : 300},'GRAD' 0,'opsz' 24`,
                        }}
                      />
                      {!isCollapsed ? (
                        <span
                          style={{
                            lineHeight: 1.6,
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {label}
                        </span>
                      ) : null}
                      {count > 0 ? (
                        <Badge count={count} active={active} collapsed={isCollapsed} />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
