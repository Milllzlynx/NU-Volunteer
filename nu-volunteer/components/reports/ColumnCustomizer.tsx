'use client';

import { useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { COLOR, solidGlass } from '@/lib/design';
import { COLUMNS, DEFAULT_VISIBLE, OPTIONAL_COLUMNS, type ColumnKey } from '@/components/reports/columns';

/**
 * คีย์ที่เก็บคอลัมน์ที่ผู้ใช้เลือกไว้ — ผูกกับเครื่อง ไม่ผูกกับบัญชี เหมือนการย่อแถบข้าง
 *
 * ต่อท้ายด้วยเลขรุ่น: ค่าที่บันทึกไว้ทับค่าเริ่มต้นเสมอ พอชุดคอลัมน์เริ่มต้นเปลี่ยน
 * คนที่เคยเข้าหน้านี้แล้วจะไม่มีวันเห็นของใหม่ เว้นแต่จะขึ้นรุ่นคีย์ให้เริ่มนับหนึ่งใหม่
 * (v2 = ถอด "ประเภท" ออกจากตาราง แล้วย้ายไปเป็นแถบหมวดหมู่ด้านบน)
 */
export const LS_COLUMNS = 'nuv:reports:columns:v2';

/** อ่านค่าที่บันทึกไว้ คืน null เมื่อไม่มีหรือพัง — ให้ผู้เรียกตัดสินใจใช้ค่าเริ่มต้นเอง */
export function readSavedColumns(): ColumnKey[] | null {
  try {
    const raw = localStorage.getItem(LS_COLUMNS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = COLUMNS.map((c) => c.key);
    // กรองคีย์ที่ไม่รู้จักทิ้ง เผื่อเคยบันทึกไว้ตอนที่คอลัมน์ยังไม่เหมือนตอนนี้
    return parsed.filter((k): k is ColumnKey => valid.includes(k as ColumnKey));
  } catch {
    return null;
  }
}

function saveColumns(keys: ColumnKey[]) {
  try {
    localStorage.setItem(LS_COLUMNS, JSON.stringify(keys));
  } catch {
    /* เบราว์เซอร์ปิดที่เก็บข้อมูลไว้ — ใช้งานต่อได้ แค่ไม่จำข้ามครั้ง */
  }
}

export function ColumnCustomizer({
  visible,
  onChange,
  t,
}: {
  visible: ColumnKey[];
  onChange: (next: ColumnKey[]) => void;
  t: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);

  const apply = (next: ColumnKey[]) => {
    onChange(next);
    saveColumns(next);
  };

  const toggle = (key: ColumnKey) => {
    apply(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]);
  };

  const hiddenCount = OPTIONAL_COLUMNS.filter((c) => !visible.includes(c.key)).length;

  return (
    <div style={{ position: 'relative' }}>
      <Button variant="secondary" icon="tune" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {t('ปรับแต่งคอลัมน์')}
        {hiddenCount ? ` (${hiddenCount})` : ''}
      </Button>

      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div
            role="group"
            aria-label={t('ปรับแต่งคอลัมน์')}
            style={{ ...solidGlass(18), position: 'absolute', top: 46, insetInlineEnd: 0, width: 252, padding: 12, zIndex: 31 }}
          >
            <div
              style={{
                fontSize: 11,
                color: COLOR.hint,
                padding: '2px 4px 9px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              {t('คอลัมน์ที่แสดง')}
            </div>

            <div style={{ display: 'grid', gap: 2, maxHeight: 300, overflowY: 'auto' }}>
              {COLUMNS.map((c) => {
                const on = visible.includes(c.key);
                return (
                  <label
                    key={c.key}
                    title={c.locked ? t('คอลัมน์นี้ซ่อนไม่ได้') : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '8px 10px',
                      borderRadius: 11,
                      fontSize: 13,
                      color: c.locked ? COLOR.hint : COLOR.ink,
                      cursor: c.locked ? 'not-allowed' : 'pointer',
                      background: on && !c.locked ? 'rgba(167,116,247,.10)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={c.locked}
                      onChange={() => toggle(c.key)}
                      style={{ width: 15, height: 15 }}
                    />
                    {t(c.label)}
                    {c.locked ? <Icon name="lock" size={14} style={{ marginInlineStart: 'auto' }} /> : null}
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button variant="secondary" icon="restart_alt" onClick={() => apply(DEFAULT_VISIBLE)} full>
                {t('คืนค่าเริ่มต้น')}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
