'use client';

import { Icon } from '@/components/ui';
import { COLOR, glass, withAlpha } from '@/lib/design';

export type CategoryOption = { id: string; label: string; labelEn: string; color: string };

/**
 * แถบหมวดหมู่ด้านบนตาราง — ทำหน้าที่สองอย่างพร้อมกัน
 *
 * เป็นทั้งปุ่มกรองและคำอธิบายสี เพราะคอลัมน์ "ประเภท" ถูกถอดออกจากตารางแล้ว
 * เหลือแค่ขีดสีหน้าชื่อกิจกรรมเป็นตัวบอกหมวด แถบนี้จึงเป็นที่เดียวที่บอกว่าสีไหนคืออะไร
 *
 * รายการหมวดมาจากกิจกรรมจริงของผู้จัด ไม่ได้ฝังไว้ในโค้ด
 * หมวดที่ไม่มีกิจกรรมเลยจะกดแล้วได้ตารางว่าง จึงไม่ต้องแสดงตั้งแต่แรก
 */
export function CategoryFilter({
  categories,
  value,
  onChange,
  counts,
  isEn,
  t,
}: {
  categories: CategoryOption[];
  /** ว่าง = ทุกหมวด */
  value: string;
  onChange: (categoryId: string) => void;
  /** จำนวนกิจกรรมของแต่ละหมวด นับจากตัวกรองอื่นที่เปิดอยู่แล้ว */
  counts: Record<string, number>;
  isEn: boolean;
  t: (s: string) => string;
}) {
  if (!categories.length) return null;

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div
      className="nuv-no-print nuv-tabs"
      style={{ ...glass(20), padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
    >
      <Pill
        active={value === ''}
        color={COLOR.ink}
        onClick={() => onChange('')}
        label={t('ทั้งหมด')}
        count={total}
        icon="apps"
      />

      {categories.map((c) => (
        <Pill
          key={c.id}
          active={value === c.id}
          color={c.color}
          onClick={() => onChange(value === c.id ? '' : c.id)}
          label={isEn ? c.labelEn : c.label}
          count={counts[c.id] ?? 0}
          /* หมวดที่ยังไม่มีกิจกรรมยังอยู่บนแถบ เพราะแถบนี้เป็นคำอธิบายสีด้วย
             แค่จางลงให้เห็นได้ทันทีว่ากดไปก็ยังไม่มีอะไร */
          muted={(counts[c.id] ?? 0) === 0}
        />
      ))}
    </div>
  );
}

function Pill({
  active,
  color,
  onClick,
  label,
  count,
  icon,
  muted = false,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
  count: number;
  icon?: string;
  /** ยังไม่มีข้อมูลในหมวดนี้ — กดได้ แต่แสดงจางลง */
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        border: `1px solid ${active ? withAlpha(color, 'aa') : 'rgba(31,41,55,.12)'}`,
        background: active ? withAlpha(color, '22') : 'rgba(255,255,255,.6)',
        color: active ? COLOR.ink : COLOR.body,
        fontWeight: active ? 600 : 400,
        opacity: muted && !active ? 0.55 : 1,
      }}
    >
      {icon ? (
        <Icon name={icon} size={15} style={{ color: active ? COLOR.ink : COLOR.label }} />
      ) : (
        <span
          aria-hidden="true"
          style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }}
        />
      )}
      {label}
      <span style={{ fontSize: 11, color: COLOR.hint }}>{count}</span>
    </button>
  );
}
