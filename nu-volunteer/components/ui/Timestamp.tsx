'use client';

import { memo, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';
import {
  formatDate,
  formatDateTime,
  formatDateWithDay,
  formatRelative,
  formatTime,
  formatTimeWithSeconds,
} from '@/lib/dateFormat';

/**
 * แสดงวันเวลาในรูปแบบเดียวกันทั้งแอป
 *
 * ภาษาไทย/อังกฤษมาจาก useApp() ไม่ต้องส่งเข้ามา — ผู้ใช้สลับภาษาแล้วทุกจุดเปลี่ยนตาม
 *
 * เขตเวลาถูกตรึงเป็นไทยใน lib/dateFormat.ts จึงเรนเดอร์ฝั่งเซิร์ฟเวอร์ได้โดยไม่ผิดเพี้ยน
 * ยกเว้น variant="relative" ที่ต้องอ่านเวลาปัจจุบัน — ดูหมายเหตุด้านล่าง
 */

/*
  นาฬิกากลางสำหรับข้อความแบบ "เมื่อสักครู่" — เดินนาทีละครั้ง และมีตัวจับเวลาเดียวทั้งหน้า
  ต่อให้มีร้อย <Timestamp variant="relative"> ก็ไม่ได้สร้าง setInterval ร้อยตัว

  getServerSnapshot คืน null เสมอ ฝั่งเซิร์ฟเวอร์และรอบ hydrate จึงแสดงวันที่จริง
  แล้ว React ค่อยเรนเดอร์ใหม่ด้วยเวลาปัจจุบันหลัง hydrate เสร็จ — ไม่มี mismatch
*/
const listeners = new Set<() => void>();
let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    tick = Date.now();
    timer = setInterval(() => {
      tick = Date.now();
      for (const l of listeners) l();
    }, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getClock = () => tick || Date.now();
const getServerClock = () => null;

export type TimestampVariant = 'full' | 'date' | 'time' | 'time-seconds' | 'date-with-day' | 'relative';

export interface TimestampProps {
  date: Date | string | number;
  variant?: TimestampVariant;
  /** แสดงไอคอนปฏิทินนำหน้า */
  showIcon?: boolean;
  /** ไอคอนอื่นแทนปฏิทิน เช่น schedule สำหรับเวลา */
  icon?: string;
  style?: React.CSSProperties;
  className?: string;
}

function TimestampBase({
  date,
  variant = 'full',
  showIcon = false,
  icon = 'calendar_today',
  style,
  className,
}: TimestampProps) {
  const { isEn } = useApp();

  // null ระหว่างเรนเดอร์ฝั่งเซิร์ฟเวอร์และรอบ hydrate — ตกลงไปแสดงวันที่จริงแทน
  const now = useSyncExternalStore(subscribeClock, getClock, getServerClock);

  let text: string;
  switch (variant) {
    case 'date':
      text = formatDate(date, isEn);
      break;
    case 'time':
      text = formatTime(date);
      break;
    case 'time-seconds':
      text = formatTimeWithSeconds(date);
      break;
    case 'date-with-day':
      text = formatDateWithDay(date, isEn);
      break;
    case 'relative':
      text = now == null ? formatDate(date, isEn) : formatRelative(date, isEn, now);
      break;
    default:
      text = formatDateTime(date, isEn);
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: COLOR.label,
        ...style,
      }}
    >
      {showIcon ? <Icon name={icon} size={15} style={{ flexShrink: 0, color: COLOR.hint }} /> : null}
      {text}
    </span>
  );
}

/**
 * ห่อด้วย memo เพราะหน้ารายการเรนเดอร์ทีละหลายสิบแถว
 * และ prop ของแต่ละแถวแทบไม่เปลี่ยนหลังโหลดเสร็จ
 */
export const Timestamp = memo(TimestampBase);
