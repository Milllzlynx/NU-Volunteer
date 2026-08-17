'use client';

import { type RefObject } from 'react';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { Badge, Button, Icon, inputStyle } from '@/components/ui';
import { DateEcho } from '@/components/ui/DateEcho';
import { COLOR, glass } from '@/lib/design';

export const STATUSES = ['draft', 'open', 'closed', 'cancelled', 'done'];

/** ช่วงเวลาสำเร็จรูป — custom คือผู้ใช้กรอกวันเอง จึงไม่ถูกปุ่มลัดทับ */
export type QuickRange = 'month' | 'year' | 'all' | 'custom';

export type FilterState = {
  quick: QuickRange;
  from: string;
  to: string;
  category: string;
  /** ว่าง = ทุกสถานะ */
  statuses: string[];
  query: string;
};

export const EMPTY_FILTERS: FilterState = {
  quick: 'all',
  from: '',
  to: '',
  category: '',
  statuses: [],
  query: '',
};

const QUICK: { key: QuickRange; label: string; icon: string }[] = [
  { key: 'month', label: 'เดือนนี้', icon: 'calendar_month' },
  { key: 'year', label: 'ปีนี้', icon: 'event' },
  { key: 'all', label: 'ทั้งหมด', icon: 'all_inclusive' },
];

export function ReportsFilters({
  value,
  onChange,
  advancedOpen,
  onToggleAdvanced,
  searchRef,
  resultCount,
  t,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
  resultCount: number;
  t: (s: string) => string;
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  /* นับเฉพาะเงื่อนไขที่ไม่ใช่ค่าเริ่มต้น เพื่อบอกบนปุ่มว่ากรองอยู่กี่ชั้น */
  const activeCount =
    (value.from ? 1 : 0) +
    (value.to ? 1 : 0) +
    (value.category ? 1 : 0) +
    (value.statuses.length ? 1 : 0) +
    (value.query.trim() ? 1 : 0);

  const toggleStatus = (s: string) => {
    const next = value.statuses.includes(s)
      ? value.statuses.filter((x) => x !== s)
      : [...value.statuses, s];
    set({ statuses: next });
  };

  return (
    <div className="nuv-no-print" style={{ ...glass(20), padding: 16, display: 'grid', gap: 14 }}>
      {/* ── ปุ่มลัดช่วงเวลา ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {QUICK.map((q) => {
          const active = value.quick === q.key;
          return (
            <button
              key={q.key}
              type="button"
              aria-pressed={active}
              onClick={() => set({ quick: q.key, from: '', to: '' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 999,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${active ? 'rgba(167,116,247,.5)' : 'rgba(31,41,55,.12)'}`,
                background: active ? 'rgba(167,116,247,.16)' : 'rgba(255,255,255,.6)',
                color: active ? COLOR.ink : COLOR.body,
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon name={q.icon} size={16} />
              {t(q.label)}
            </button>
          );
        })}

        <Button
          variant="secondary"
          icon={advancedOpen ? 'expand_less' : 'tune'}
          onClick={onToggleAdvanced}
          style={{ marginInlineStart: 'auto' }}
        >
          {t('ตัวกรองเพิ่มเติม')}
          {activeCount ? ` (${activeCount})` : ''}
        </Button>
      </div>

      {/* ── ตัวกรองเพิ่มเติม ── */}
      {advancedOpen ? (
        <div style={{ display: 'grid', gap: 14, padding: 14, borderRadius: 16, background: 'rgba(167,116,247,.07)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ตั้งแต่วันที่')}</span>
              <input
                type="date"
                value={value.from}
                onChange={(e) => set({ from: e.target.value, quick: 'custom' })}
                style={{ ...inputStyle(false), width: 'auto' }}
              />
              <DateEcho value={value.from} />
            </label>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ถึงวันที่')}</span>
              <input
                type="date"
                value={value.to}
                onChange={(e) => set({ to: e.target.value, quick: 'custom' })}
                style={{ ...inputStyle(false), width: 'auto' }}
              />
              <DateEcho value={value.to} />
            </label>
            {/* ประเภทกิจกรรมย้ายไปอยู่บนแถบหมวดหมู่เหนือตาราง จึงไม่ซ้ำไว้ตรงนี้อีก
                แต่ยังนับรวมใน activeCount ด้านบน เพราะเป็นเงื่อนไขที่มีผลกับผลลัพธ์เหมือนกัน */}
            <label style={{ display: 'grid', gap: 5, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 11.5, color: COLOR.label }}>
                {`${t('ค้นหาชื่อกิจกรรมหรือหน่วยงาน')} ( / )`}
              </span>
              <input
                ref={searchRef}
                value={value.query}
                onChange={(e) => set({ query: e.target.value })}
                placeholder={t('พิมพ์คำที่ต้องการค้นหา')}
                style={inputStyle(false)}
              />
            </label>
          </div>

          {/* สถานะเลือกได้หลายอัน — ไม่เลือกเลยหมายถึงทุกสถานะ */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 11.5, color: COLOR.label, padding: 0, marginBottom: 7 }}>
              {t('สถานะ')}
            </legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => {
                const meta = ACTIVITY_STATUS_META[s] ?? ACTIVITY_STATUS_META.draft;
                const on = value.statuses.includes(s);
                return (
                  <label
                    key={s}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 13px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      border: `1px solid ${on ? 'rgba(167,116,247,.5)' : 'rgba(31,41,55,.12)'}`,
                      background: on ? 'rgba(167,116,247,.14)' : 'rgba(255,255,255,.6)',
                      color: COLOR.body,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleStatus(s)}
                      style={{ width: 15, height: 15 }}
                    />
                    <Icon name={meta.icon} size={15} />
                    {t(meta.label)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Button
              variant="secondary"
              icon="filter_alt_off"
              onClick={() => onChange(EMPTY_FILTERS)}
              disabled={activeCount === 0 && value.quick === 'all'}
            >
              {t('ล้างตัวกรอง')}
            </Button>
            <Badge tone="neutral" label={`${resultCount} ${t('กิจกรรม')}`} />
            <span style={{ fontSize: 11.5, color: COLOR.hint }}>
              {t('ตัวกรองมีผลทันที ไม่ต้องกดยืนยัน')}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
