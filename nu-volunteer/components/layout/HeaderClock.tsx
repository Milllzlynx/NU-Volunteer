'use client';

import { useSyncExternalStore } from 'react';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR } from '@/lib/design';
import { formatDateWithDay, formatTimeWithSeconds } from '@/lib/dateFormat';

/**
 * นาฬิกาบนแถบหัวเรื่อง — เวลาปัจจุบันตามเขตเวลาไทย
 *
 * ใช้ตัวจับเวลาเดียวร่วมกันทุกที่ที่เรียกคอมโพเนนต์นี้ และเดินเฉพาะตอนมีคนใช้จริง
 * (unsubscribe ตัวสุดท้ายแล้วหยุด setInterval) จะได้ไม่ปลุกหน้าเว็บทิ้งไว้เปล่า ๆ
 *
 * เวลาปัจจุบันคำนวณฝั่งไคลเอนต์ไม่ได้ตอนเรนเดอร์ฝั่งเซิร์ฟเวอร์ — สองฝั่งจะได้คนละค่า
 * getServerSnapshot จึงคืน null แล้วเรนเดอร์เป็นช่องว่างที่กันพื้นที่ไว้ก่อน
 * พอ hydrate เสร็จ React จะเรนเดอร์ใหม่ด้วยเวลาจริง — ไม่มี hydration mismatch
 * และไม่ต้องใช้ setState ใน useEffect ซึ่ง eslint ของโปรเจกต์นี้ห้ามไว้
 */

const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now || Date.now();
const getServerSnapshot = () => null;

export function HeaderClock() {
  const { isEn } = useApp();
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      className="nuv-header-clock"
      /* aria-hidden เพราะนาฬิกาที่อัปเดตทุกวินาทีจะรบกวนโปรแกรมอ่านหน้าจออย่างหนัก
         ข้อมูลนี้เป็นส่วนประกอบ ไม่ใช่เนื้อหาที่ต้องอ่านให้ครบ */
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        lineHeight: 1.35,
        flexShrink: 0,
        // กันความกว้างไว้ล่วงหน้า ตัวเลขวินาทีเปลี่ยนแล้วปุ่มข้าง ๆ จะได้ไม่ขยับ
        minWidth: 128,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
        {tick == null ? ' ' : formatTimeWithSeconds(tick)}
      </span>
      <span style={{ fontSize: 10.5, color: COLOR.hint, whiteSpace: 'nowrap' }}>
        {tick == null ? ' ' : formatDateWithDay(tick, isEn)}
      </span>
    </div>
  );
}
