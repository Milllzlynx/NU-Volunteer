'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon, IconButton } from '@/components/ui';
import { COLOR, solidGlass } from '@/lib/design';
import type { ActivityReportRow } from '@/lib/organizerStats';

const MENU_WIDTH = 208;
/** ระยะห่างระหว่างปุ่มกับกล่องเมนู และระยะกันชนจากขอบจอ */
const GAP = 6;
const EDGE = 8;

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  padding: '9px 11px',
  borderRadius: 11,
  fontSize: 13,
  color: COLOR.ink,
  textAlign: 'start',
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  cursor: 'pointer',
};

/**
 * เมนูสามจุดท้ายแถว — เก็บคำสั่งรายกิจกรรมไว้ไม่ให้กินความกว้างของตาราง
 *
 * ทุกปลายทางเป็นหน้าที่มีอยู่จริงแล้ว (ไม่ผูกปุ่มที่ยังไปไหนไม่ได้)
 * ส่วนคัดลอกลิงก์ใช้วิธีเดียวกับหน้ารายละเอียดกิจกรรมและแถบหัวเรื่อง
 */
export function RowActions({ row, t }: { row: ActivityReportRow; t: (s: string) => string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /**
   * วางเมนูจากตำแหน่งจริงของปุ่มบนจอ แล้วยึดแบบ fixed
   *
   * เดิมเมนูเป็น absolute อยู่ในเซลล์ท้ายแถว ซึ่งอยู่ในกล่องตารางที่เลื่อนแนวนอนได้
   * กล่องนั้นตัดทุกอย่างที่ล้นออกไป เมนูจึงโดนเฉือนหรือไปโผล่มุมขวาล่างของการ์ด
   * คิดพิกัดเองแล้วยึดกับหน้าต่างแทน เมนูจะเกาะปุ่มของแถวตัวเองเสมอ
   */
  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const h = menuRef.current?.offsetHeight ?? 0;
    // ไม่มีที่ข้างล่างพอก็พลิกขึ้นไปอยู่เหนือปุ่มแทน ไม่ให้ทะลุก้นจอ
    const below = r.bottom + GAP;
    const top = h > 0 && below + h > window.innerHeight - EDGE ? Math.max(EDGE, r.top - GAP - h) : below;
    const left = Math.max(EDGE, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - EDGE));
    setPos({ top, left });
  }, []);

  /* ล้างพิกัดเก่าทุกครั้งที่สลับสถานะ เปิดรอบใหม่จะได้วัดความสูงก่อนแล้วค่อยโผล่ ไม่วาบที่ตำแหน่งเดิม */
  const toggle = () => {
    setPos(null);
    setOpen((v) => !v);
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // ใช้ capture เพื่อให้ได้ยินการเลื่อนของกล่องตารางด้วย ไม่ใช่แค่การเลื่อนหน้า
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const shareLink = async () => {
    const url = `${window.location.origin}/activities/${row.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: row.title, url });
        setOpen(false);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ผู้ใช้กดยกเลิกเมนูแชร์ หรือเบราว์เซอร์ไม่ให้สิทธิ์คลิปบอร์ด — ไม่ใช่ข้อผิดพลาดที่ต้องแจ้ง
    }
  };

  const links = [
    { href: `/activities/${row.id}`, icon: 'visibility', label: 'ดูหน้ากิจกรรม' },
    { href: `/organizer/activities/${row.id}`, icon: 'edit', label: 'แก้ไขกิจกรรม' },
    { href: `/organizer/registrations/${row.id}`, icon: 'groups', label: 'ผู้เข้าร่วมกิจกรรม' },
  ];

  return (
    <div ref={anchorRef} style={{ display: 'inline-flex' }}>
      <IconButton
        icon="more_vert"
        label={`${t('คำสั่งเพิ่มเติม')} — ${row.title}`}
        aria-expanded={open}
        onClick={toggle}
      />

      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div
            role="menu"
            ref={menuRef}
            style={{
              ...solidGlass(18),
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: MENU_WIDTH,
              padding: 8,
              zIndex: 31,
              // รอบแรกเมนูถูกวาดไว้เพื่อวัดความสูงก่อน ยังไม่ต้องให้เห็นตำแหน่งชั่วคราว
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {links.map((l) => (
              <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} style={itemStyle}>
                <Icon name={l.icon} size={18} />
                {t(l.label)}
              </Link>
            ))}
            <div style={{ height: 1, background: 'rgba(31,41,55,.1)', margin: '6px 4px' }} />
            <button role="menuitem" onClick={shareLink} style={itemStyle}>
              <Icon name={copied ? 'check' : 'share'} size={18} />
              {copied ? t('คัดลอกลิงก์แล้ว') : t('คัดลอกลิงก์')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
