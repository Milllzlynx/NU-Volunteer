'use client';

import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';
import { pageList } from '@/lib/pagination';

/**
 * เลื่อนหน้าจอกลับขึ้นบนสุดหลังเปลี่ยนหน้า
 *
 * รอหนึ่งเฟรมก่อนเลื่อน เพราะตอนกดปุ่ม React ยังไม่ได้วาดการ์ดชุดใหม่
 * ถ้าสั่งเลื่อนทันที ความสูงหน้าที่เปลี่ยนตามมาจะทำให้เบราว์เซอร์หนีบตำแหน่งสกรอลล์
 * แล้วตัดการเลื่อนแบบนุ่มทิ้งกลางคัน — หน้าสุดท้ายที่การ์ดน้อยกว่าเจอปัญหานี้ชัดที่สุด
 */
function scrollToTop() {
  // ผู้ใช้ที่ขอลดการเคลื่อนไหว — ทั้งจากระบบปฏิบัติการและจากหน้าตั้งค่าของเรา — ให้กระโดดทันที
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-nuv-motion') === 'reduced';

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
}

/**
 * แถบเลขหน้าของรายการกิจกรรม — กดแล้วพากลับขึ้นบนสุดให้ด้วย
 *
 * แถบนี้อยู่ท้ายรายการ ถ้าเปลี่ยนหน้าแล้วปล่อยให้ค้างอยู่ที่เดิม
 * ผู้ใช้จะเห็นแค่ท้ายรายการชุดใหม่ และไม่รู้ว่าเลื่อนหน้าสำเร็จแล้ว
 */
export function ActivityPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useApp();

  const goTo = (page: number) => {
    // กันกดหน้าเดิมซ้ำ — ไม่ควรเลื่อนหน้าจอทั้งที่รายการยังเหมือนเดิม
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
    scrollToTop();
  };

  return (
    <nav
      aria-label={t('การแบ่งหน้า')}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        flexWrap: 'wrap',
        marginTop: 4,
      }}
    >
      <PagerButton
        icon="chevron_left"
        label={t('หน้าก่อนหน้า')}
        disabled={currentPage === 1}
        onClick={() => goTo(currentPage - 1)}
      />

      {pageList(currentPage, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} style={{ padding: '0 2px', fontSize: 12.5, color: COLOR.hint }}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            style={{
              minWidth: 36,
              height: 36,
              padding: '0 10px',
              borderRadius: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 500,
              border: p === currentPage ? 'none' : '1px solid rgba(31,41,55,.1)',
              background: p === currentPage ? 'linear-gradient(135deg,#E97171,#A774F7)' : 'rgba(255,255,255,.7)',
              color: p === currentPage ? '#fff' : COLOR.body,
              boxShadow: p === currentPage ? '0 8px 20px rgba(167,116,247,.3)' : 'none',
            }}
          >
            {p}
          </button>
        ),
      )}

      <PagerButton
        icon="chevron_right"
        label={t('หน้าถัดไป')}
        disabled={currentPage === totalPages}
        onClick={() => goTo(currentPage + 1)}
      />
    </nav>
  );
}

function PagerButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 11,
        border: '1px solid rgba(31,41,55,.1)',
        background: 'rgba(255,255,255,.7)',
        color: disabled ? '#CBD5E1' : COLOR.body,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}
