'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';

/**
 * โครงโมดัลที่ใช้ร่วมกันของการ์ดกิจกรรม (รายชื่อผู้เข้าร่วม / ความเห็น)
 *
 * แยกออกมาเพราะทั้งสองโมดัลต้องการพฤติกรรมเดียวกันทุกอย่าง — ปิดด้วย Esc,
 * ล็อกการเลื่อนหน้าหลัง, คืนโฟกัสให้ปุ่มที่เปิดมัน, และกลายเป็นแผ่นเต็มจอบนมือถือ
 * ถ้าปล่อยให้แต่ละโมดัลทำเอง จะหลุดอย่างใดอย่างหนึ่งเสมอเวลามีโมดัลใหม่
 *
 * ชั้นสไตล์: ใช้ inline style ตาม §1 ของ DESIGN-SYSTEM.md เหมือนคอมโพเนนต์อื่น
 * ส่วนพฤติกรรมเต็มจอบนจอแคบอยู่ใน .nuv-sheet ที่ globals.css
 */
export function ModalShell({
  title,
  count,
  icon,
  onClose,
  children,
  footer,
  variant = 'center',
}: {
  title: string;
  /** จำนวนรายการ แสดงต่อท้ายหัวเรื่อง — ไม่ส่งมาก็ไม่แสดง */
  count?: number;
  icon: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * center = กล่องกลางจอ (ค่าเริ่มต้น) · drawer = แผงเลื่อนเข้าจากขอบขวา
   *
   * แผงด้านข้างเหมาะกับ "รายการที่ไล่อ่านยาว ๆ" อย่างรายชื่อผู้เข้าร่วมและรีวิว
   * เพราะได้ความสูงเต็มจอและไม่บังเนื้อหาหลักทั้งหมด
   * ส่วนกล่องกลางจอยังเหมาะกับกล่องตัดสินใจสั้น ๆ ที่ต้องการให้สายตาจดจ่อจุดเดียว
   * (อนุมัติชั่วโมง ดูหลักฐาน พิจารณาคำขอยกเลิก) จึงคงเป็นค่าเริ่มต้นไว้
   */
  variant?: 'center' | 'drawer';
}) {
  const { t } = useApp();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = `nuv-modal-${icon}`;

  useEffect(() => {
    // จำปุ่มที่เปิดโมดัลไว้ เพื่อคืนโฟกัสกลับไปตอนปิด (ผู้ใช้คีย์บอร์ดจะได้ไม่หลงตำแหน่ง)
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const drawer = variant === 'drawer';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        display: 'flex',
        // แผงด้านข้างชิดขอบท้ายบรรทัดและสูงเต็มจอ ส่วนกล่องกลางจอยังอยู่กลางเหมือนเดิม
        alignItems: drawer ? 'stretch' : 'center',
        justifyContent: drawer ? 'flex-end' : 'center',
        padding: drawer ? 0 : 20,
        background: 'rgba(30,37,48,.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: drawer ? 'hidden' : 'auto',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className={drawer ? 'nuv-drawer' : 'nuv-sheet'}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: drawer ? 420 : 520,
          maxHeight: drawer ? '100%' : '86vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,.95)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.8)',
          // มุมโค้งเฉพาะด้านที่หันเข้าหาเนื้อหา ด้านที่ชิดขอบจอไม่ต้องโค้ง
          borderRadius: drawer ? '24px 0 0 24px' : 24,
          boxShadow: '0 30px 80px rgba(24,20,34,.32)',
          overflow: 'hidden',
          animation: drawer ? 'nuDrawerIn .24s ease' : 'nuPop .22s ease',
          outline: 'none',
        }}
      >
        {/* ── หัวโมดัล ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '18px 20px',
            borderBottom: '1px solid rgba(31,41,55,.08)',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={21} style={{ color: COLOR.label, flexShrink: 0 }} />
          <h2 id={headingId} style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLOR.ink, flex: 1, minWidth: 0 }}>
            {title}
            {count != null ? <span style={{ color: COLOR.hint, fontWeight: 500 }}>{` (${count})`}</span> : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title={t('ปิด')}
            aria-label={t('ปิด')}
            className="nuv-iconbtn"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              border: '1px solid rgba(31,41,55,.1)',
              background: 'rgba(255,255,255,.75)',
              color: COLOR.body,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        {/* ── เนื้อหา (เลื่อนได้เมื่อยาว) ── */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer ? (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(31,41,55,.08)', flexShrink: 0 }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** แถวโครงร่างระหว่างรอข้อมูล — ใช้ทั้งสองโมดัล */
export function ModalRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="nuv-sk" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ display: 'grid', gap: 6, flex: 1 }}>
            <div className="nuv-sk" style={{ height: 13, width: '45%', borderRadius: 8 }} />
            <div className="nuv-sk" style={{ height: 11, width: '30%', borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
