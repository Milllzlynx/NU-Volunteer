'use client';

import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { COLOR } from '@/lib/design';
import { formatDate, formatDateNumeric, formatDateTimeNumeric } from '@/lib/dateFormat';

/**
 * บรรทัดกำกับใต้ช่องกรอกวันที่ บอกว่าค่าที่เลือกไว้คือวันไหนกันแน่
 *
 * ทำไมต้องมี: ลำดับวัน-เดือนที่เบราว์เซอร์วาดใน <input type="date"> มาจากภาษาของ "เครื่องผู้ใช้"
 * ไม่ใช่ภาษาของเว็บ และสั่งจากฝั่งเว็บไม่ได้เลย เครื่องที่ตั้งเป็น en-US จะเห็น mm/dd/yyyy
 * ส่วนเครื่องที่ตั้งเป็นไทยเห็น dd/mm/yyyy ทั้งที่เป็นหน้าเดียวกัน
 *
 * ทางที่ยังได้ปฏิทินให้กด แป้นตัวเลขบนมือถือ และการอ่านออกเสียงของโปรแกรมอ่านหน้าจอไว้ครบ
 * คือคงช่องของเบราว์เซอร์ไว้ แล้วเขียนวันที่ที่เลือกกำกับไว้ด้วยรูปแบบที่อ่านผิดไม่ได้
 * — เลขวัน/เดือน/ปี คู่กับชื่อเดือนภาษาไทย ซึ่ง "14/09/2026 · 14 ก.ย. 2569" อ่านสลับกันไม่ได้
 */
export function DateEcho({
  value,
  withTime = false,
}: {
  /** ค่าดิบจาก input: "YYYY-MM-DD" หรือ "YYYY-MM-DDTHH:mm" */
  value: string;
  withTime?: boolean;
}) {
  const { t, isEn } = useApp();

  // ยังไม่ได้เลือก หรือกรอกค้างไว้ครึ่งทาง — กันเนื้อที่ไว้เท่าเดิมไม่ให้ฟอร์มกระตุก
  const parsed = value ? new Date(value) : null;
  const valid = parsed != null && !Number.isNaN(parsed.getTime());

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: COLOR.hint,
        minHeight: 16,
        marginTop: 3,
      }}
    >
      <Icon name="event" size={13} style={{ color: COLOR.hint }} />
      {valid
        ? `${withTime ? formatDateTimeNumeric(parsed) : formatDateNumeric(parsed)} · ${formatDate(parsed, isEn)}`
        : t('วัน/เดือน/ปี')}
    </span>
  );
}
