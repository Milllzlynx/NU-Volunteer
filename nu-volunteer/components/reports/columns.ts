/**
 * นิยามคอลัมน์ของรายงาน — ใช้ร่วมกันทั้งตาราง มุมมองการ์ด ไฟล์ CSV และกล่องปรับแต่งคอลัมน์
 *
 * ทุกอย่างที่เกี่ยวกับคอลัมน์หนึ่งอยู่ในที่เดียว ทั้งป้ายชื่อ วิธีอ่านค่า วิธีเรียง และค่าที่ลง CSV
 * เพิ่มคอลัมน์ใหม่ที่นี่ที่เดียวแล้วทุกมุมมองได้ตามทันที ไม่ต้องไล่แก้สี่ที่แล้วลืมไปหนึ่งที่
 *
 * ไฟล์นี้ไม่ import อะไรที่ลากฝั่งเซิร์ฟเวอร์เข้ามา เพราะคอมโพเนนต์ฝั่งไคลเอนต์ใช้ทั้งหมด
 */

import type { ActivityReportRow } from '@/lib/organizerStats';

export type ColumnKey =
  | 'date'
  | 'title'
  | 'status'
  | 'category'
  | 'seats'
  | 'registered'
  | 'pending'
  | 'attended'
  | 'completed'
  | 'hours'
  | 'rating';

export type ReportColumn = {
  key: ColumnKey;
  /** ป้ายภาษาไทย — ส่งผ่าน t() ตอนแสดงผล */
  label: string;
  /** หัวคอลัมน์ในไฟล์ CSV (อังกฤษเสมอ เพื่อให้เปิดข้ามเครื่องแล้วยังอ่านออก) */
  csvHeader: string;
  align: 'start' | 'end';
  /** true = ซ่อนไม่ได้ ถ้าซ่อนแล้วตารางจะอ่านไม่รู้เรื่องว่าแถวไหนคือกิจกรรมอะไร */
  locked?: boolean;
  /** ค่าที่ใช้เรียงลำดับ — ตัวเลขเรียงแบบตัวเลข ข้อความเรียงแบบภาษาไทย */
  sortValue: (r: ActivityReportRow) => string | number;
  /** ค่าที่เขียนลงไฟล์ CSV */
  csvValue: (r: ActivityReportRow) => string | number;
};

export const COLUMNS: ReportColumn[] = [
  {
    key: 'date',
    label: 'วันที่',
    csvHeader: 'date',
    align: 'start',
    locked: true,
    // เรียงด้วย dayKey (YYYY-MM-DD) ไม่ใช่ข้อความวันที่ที่แสดง เพราะ "5 ต.ค." เรียงผิดแน่นอน
    sortValue: (r) => r.dayKey,
    csvValue: (r) => r.dateEn,
  },
  {
    key: 'title',
    label: 'กิจกรรม',
    csvHeader: 'activity',
    align: 'start',
    locked: true,
    sortValue: (r) => r.title,
    csvValue: (r) => r.title,
  },
  {
    key: 'status',
    label: 'สถานะ',
    csvHeader: 'status',
    align: 'start',
    locked: true,
    sortValue: (r) => r.status,
    csvValue: (r) => r.status,
  },
  {
    key: 'category',
    label: 'ประเภท',
    csvHeader: 'category',
    align: 'start',
    sortValue: (r) => r.categoryLabel,
    csvValue: (r) => r.categoryLabelEn,
  },
  {
    key: 'seats',
    label: 'ที่นั่ง',
    csvHeader: 'seats',
    align: 'end',
    sortValue: (r) => r.seatsTotal,
    csvValue: (r) => (r.seatsTotal > 0 ? r.seatsTotal : ''),
  },
  {
    key: 'registered',
    label: 'ใบลงทะเบียน',
    csvHeader: 'registrations',
    align: 'end',
    sortValue: (r) => r.registered,
    csvValue: (r) => r.registered,
  },
  {
    key: 'pending',
    label: 'รออนุมัติ',
    csvHeader: 'pending',
    align: 'end',
    sortValue: (r) => r.pending,
    csvValue: (r) => r.pending,
  },
  {
    key: 'attended',
    label: 'เช็กอินจริง',
    csvHeader: 'attended',
    align: 'end',
    sortValue: (r) => r.attended,
    csvValue: (r) => r.attended,
  },
  {
    key: 'completed',
    label: 'รับรองแล้ว',
    csvHeader: 'completed',
    align: 'end',
    sortValue: (r) => r.completed,
    csvValue: (r) => r.completed,
  },
  {
    key: 'hours',
    label: 'ชม. ที่รับรอง',
    csvHeader: 'hours_awarded',
    align: 'end',
    sortValue: (r) => r.hoursAwarded,
    csvValue: (r) => r.hoursAwarded,
  },
  {
    key: 'rating',
    label: 'คะแนน',
    csvHeader: 'rating',
    align: 'end',
    // ยังไม่มีรีวิว = -1 เพื่อให้ไปกองท้ายสุดตอนเรียงจากมากไปน้อย ไม่ใช่ปนกับกิจกรรมที่ได้ 0
    sortValue: (r) => r.ratingAvg ?? -1,
    csvValue: (r) => r.ratingAvg ?? '',
  },
];

export const LOCKED_KEYS = COLUMNS.filter((c) => c.locked).map((c) => c.key);
export const OPTIONAL_COLUMNS = COLUMNS.filter((c) => !c.locked);

/**
 * คอลัมน์ที่เปิดไว้ตั้งแต่แรก
 *
 * ปิด "ประเภท" ไว้เพราะหมวดหมู่ย้ายไปอยู่บนแถบด้านบนตารางแล้ว ทั้งกรองได้และเป็นคำอธิบายสีในตัว
 * ในตารางเหลือขีดสีหน้าชื่อกิจกรรมเป็นตัวบอกหมวดแทน ไม่ต้องเสียคอลัมน์เต็ม ๆ ให้ข้อความไทยยาว ๆ
 * นิยามคอลัมน์ยังอยู่ครบ ใครอยากได้กลับมาก็เปิดเองได้จากปุ่มปรับแต่งคอลัมน์ และไฟล์ CSV ก็ได้ตามไปด้วย
 */
export const DEFAULT_VISIBLE: ColumnKey[] = COLUMNS.filter((c) => c.key !== 'category').map((c) => c.key);

/**
 * คอลัมน์ที่ถูกตัดออกก่อนเมื่อจอแคบ (เรียงตามลำดับที่ยอมเสียได้)
 * ใช้กับกฎ CSS ในหน้าจอขนาดแท็บเล็ต ไม่ได้แก้ค่าที่ผู้ใช้ตั้งไว้เอง
 */
export const TABLET_HIDDEN: ColumnKey[] = ['category', 'seats', 'pending', 'rating'];
