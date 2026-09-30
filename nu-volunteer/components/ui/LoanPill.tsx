'use client';

import { useApp } from '@/components/providers/AppProviders';
import { COLOR, SEMANTIC } from '@/lib/design';

/**
 * ป้ายเล็ก "กยศ." สำหรับผู้กู้ยืมกองทุนเงินให้กู้ยืมเพื่อการศึกษา
 *
 * ตั้งใจให้เรียบ — สีเทา ขอบบาง ไม่แย่งสายตากับป้ายสถานะหรือบทบาทที่มีสีอยู่แล้ว
 * ห้ามหดเพื่อไม่ให้ถูกชื่อยาว ๆ ดันจนตกขอบ
 */
export function LoanPill() {
  const { t } = useApp();
  return (
    <span
      title={t('ผู้กู้ยืม กยศ.')}
      style={{
        flexShrink: 0,
        padding: '1px 8px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 500,
        lineHeight: 1.7,
        color: COLOR.label,
        border: `1px solid ${SEMANTIC.neutral.bg}`,
      }}
    >
      กยศ.
    </span>
  );
}
