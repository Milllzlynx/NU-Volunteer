'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProviders';
import { Icon, inputStyle } from '@/components/ui';
import { COLOR } from '@/lib/design';
import { formatDate, isoToDmy, maskDmy, parseDmy } from '@/lib/dateFormat';

/**
 * ช่องกรอกวันเวลาแบบ วัน/เดือน/ปี
 *
 * <input type="datetime-local"> ของเบราว์เซอร์วาดลำดับวัน-เดือนตามภาษาของ "เครื่องผู้ใช้"
 * เครื่องที่ตั้งเป็น en-US จึงเห็น mm/dd/yyyy และไม่มีวิธีสั่งจากฝั่งเว็บให้เปลี่ยน
 * ช่องนี้จึงรับกรอกเป็นข้อความเองเพื่อคุมลำดับให้เป็น dd/mm/yyyy เสมอทุกเครื่อง
 *
 * สิ่งที่ยังรักษาไว้จากช่องเดิม:
 * - ปุ่มปฏิทิน เรียก showPicker() ของ input type=date ที่ซ่อนไว้ ไม่ได้ทิ้งตัวเลือกวันแบบกดเอา
 * - ช่องเวลายังเป็น input type=time ของเบราว์เซอร์ เพราะ HH:mm ไม่มีปัญหาลำดับให้สับสน
 * - แป้นตัวเลขบนมือถือ ผ่าน inputMode="numeric"
 *
 * ค่าที่ส่งออกยังเป็นรูปแบบเดิมทุกประการ (YYYY-MM-DD หรือ YYYY-MM-DDTHH:mm ตามเวลาไทย)
 * ฝั่งเซิร์ฟเวอร์ที่ lib/organizer.ts readDate() จึงไม่ต้องแก้อะไรเลย
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function DateTimeField({
  value,
  onChange,
  withTime = false,
  disabled = false,
  ariaLabel,
}: {
  /** "YYYY-MM-DD" หรือ "YYYY-MM-DDTHH:mm" — รูปแบบเดียวกับที่ input เดิมส่งออก */
  value: string;
  onChange: (next: string) => void;
  withTime?: boolean;
  disabled?: boolean;
  /**
   * ชื่อช่องสำหรับโปรแกรมอ่านหน้าจอ — ส่งมาเมื่อมีช่องวันที่หลายช่องอยู่ด้วยกัน
   * เช่น ตัวกรอง "ตั้งแต่/ถึง" ที่ถ้าใช้ชื่อมาตรฐานจะอ่านออกมาเหมือนกันทั้งสองช่อง
   */
  ariaLabel?: string;
}) {
  const { t, isEn } = useApp();

  const [dateText, setDateText] = useState(() => isoToDmy(value));
  const [timeText, setTimeText] = useState(() => value.slice(11, 16));

  const pickerRef = useRef<HTMLInputElement | null>(null);
  /** ค่าที่ช่องนี้ส่งออกไปครั้งล่าสุด ใช้แยกว่า value ที่เข้ามาใหม่มาจากเราเองหรือจากข้างนอก */
  const emittedRef = useRef(value);

  /* ค่าถูกเปลี่ยนจากข้างนอก (เช่น โหลดฟอร์มแก้ไข) จึงค่อยเขียนทับข้อความที่พิมพ์ค้างไว้
     ถ้าซิงก์ทุกครั้งที่ value เปลี่ยน ตัวเลขที่กำลังพิมพ์จะถูกลบทิ้งกลางคัน */
  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    setDateText(isoToDmy(value));
    setTimeText(value.slice(11, 16));
  }, [value]);

  const emit = (nextDate: string, nextTime: string) => {
    const parts = parseDmy(nextDate);

    // ล้างช่องทิ้ง = ไม่มีค่า ไม่ใช่ค่าผิด
    if (!nextDate.trim() && (!withTime || !nextTime)) {
      emittedRef.current = '';
      onChange('');
      return;
    }
    if (!parts) return;
    if (withTime && !/^\d{2}:\d{2}$/.test(nextTime)) return;

    const iso = `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
    const next = withTime ? `${iso}T${nextTime}` : iso;
    emittedRef.current = next;
    onChange(next);
  };

  const parsed = parseDmy(dateText);
  // ผิดจริงต่อเมื่อกรอกครบแล้วแต่ไม่ใช่วันที่ที่มีอยู่ — ระหว่างพิมพ์ยังไม่ต้องขึ้นแดง
  const invalid = dateText.length === 10 && !parsed;

  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={dateText}
            disabled={disabled}
            placeholder="วว/ดด/ปปปป"
            aria-label={ariaLabel ?? t('วันที่ (วัน/เดือน/ปี)')}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              const next = maskDmy(e.target.value);
              setDateText(next);
              emit(next, timeText);
            }}
            style={{ ...inputStyle(invalid), paddingInlineEnd: 38 }}
          />
          <button
            type="button"
            disabled={disabled}
            aria-label={t('เลือกจากปฏิทิน')}
            onClick={() => {
              const el = pickerRef.current;
              if (!el) return;
              // showPicker ยังไม่มีในเบราว์เซอร์เก่า — ถอยไปโฟกัสให้กดเองแทน
              if (typeof el.showPicker === 'function') el.showPicker();
              else el.focus();
            }}
            style={{
              position: 'absolute',
              insetInlineEnd: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              border: 'none',
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 4,
            }}
          >
            <Icon name="calendar_month" size={18} style={{ color: COLOR.label }} />
          </button>

          {/* ตัวเลือกวันของเบราว์เซอร์ที่ซ่อนไว้ — ไม่ให้ตาเห็น แต่ยังเปิดปฏิทินได้ */}
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={parsed ? `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}` : ''}
            onChange={(e) => {
              const next = isoToDmy(e.target.value);
              setDateText(next);
              emit(next, timeText);
            }}
            style={{ position: 'absolute', insetInlineEnd: 10, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        </div>

        {withTime ? (
          <input
            type="time"
            value={timeText}
            disabled={disabled}
            aria-label={t('เวลา')}
            onChange={(e) => {
              setTimeText(e.target.value);
              emit(dateText, e.target.value);
            }}
            style={{ ...inputStyle(false), width: 'auto' }}
          />
        ) : null}
      </div>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, minHeight: 16, color: invalid ? '#E4572E' : COLOR.hint }}>
        <Icon name={invalid ? 'error' : 'event'} size={13} style={{ color: 'inherit' }} />
        {invalid
          ? t('ไม่มีวันที่นี้อยู่จริง')
          : parsed
            ? formatDate(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)), isEn)
            : t('รูปแบบ: วัน/เดือน/ปี')}
      </span>
    </div>
  );
}
