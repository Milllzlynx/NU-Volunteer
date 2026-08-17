'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Shell } from '@/components/layout/Shell';
import { Sidebar } from '@/components/layout/Sidebar';
import { useApp } from '@/components/providers/AppProviders';
import { ROLE_NAV } from '@/lib/design';
import type { PublicUser } from '@/lib/auth';

/**
 * โครงหน้าสำหรับผู้ใช้ที่เข้าสู่ระบบแล้ว — แถบข้าง + แถบหัวเรื่อง + เนื้อหา
 * หน้าปัจจุบันดูจาก pathname เทียบกับ ROLE_NAV จึงไม่ต้องส่ง prop จากทุกหน้า
 */
export function AppShell({
  account,
  badges,
  available,
  unreadCount = 0,
  children,
}: {
  account: PublicUser;
  badges?: Record<string, number>;
  available?: string[];
  unreadCount?: number;
  children: ReactNode;
}) {
  const { isEn } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = ROLE_NAV[account.role] ?? [];
  // จับคู่ href ที่ยาวที่สุดที่ตรงกับ pathname — /student/hours ต้องไม่ถูกจับเป็น /student
  const current = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <Shell>
      <div
        className="nuv-appshell"
        style={{ display: 'flex', minHeight: '100vh', gap: 16, padding: 16 }}
      >
        <Sidebar
          role={account.role}
          page={current?.key ?? ''}
          badges={badges}
          available={available}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header
            account={account}
            pageTitle={current ? (isEn ? current.labelEn : current.label) : 'NU Volunteer'}
            unreadCount={unreadCount}
            available={available}
            onOpenMobileNav={() => setMobileOpen(true)}
          />
          <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
        </div>
      </div>
    </Shell>
  );
}
