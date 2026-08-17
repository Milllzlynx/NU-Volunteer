'use client';

import Link from 'next/link';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { RowActions } from '@/components/reports/RowActions';
import { COLUMNS, TABLET_HIDDEN, type ColumnKey, type ReportColumn } from '@/components/reports/columns';
import { Badge, Icon } from '@/components/ui';
import { COLOR } from '@/lib/design';
import type { ActivityReportRow } from '@/lib/organizerStats';
import type { OrganizerTotals } from '@/lib/organizerStats';

export type SortState = { key: ColumnKey; dir: 'asc' | 'desc' } | null;

/** วนสามสถานะต่อการกดหนึ่งครั้ง: น้อยไปมาก → มากไปน้อย → กลับไปลำดับเดิม */
export function nextSort(current: SortState, key: ColumnKey): SortState {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return null;
}

function SortIcon({ state }: { state: 'asc' | 'desc' | null }) {
  // flexShrink:0 กันไอคอนถูกบีบแบนตอนหัวคอลัมน์ขึ้นสองบรรทัด
  if (!state) return <Icon name="unfold_more" size={14} style={{ color: 'rgba(31,41,55,.28)', flexShrink: 0 }} />;
  return (
    <Icon
      name={state === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      size={14}
      style={{ color: '#7C2FD9', flexShrink: 0 }}
    />
  );
}

/** ค่าที่แสดงในเซลล์ — แยกจาก csvValue เพราะบางคอลัมน์ต้องเป็น badge หรือลิงก์ ไม่ใช่ข้อความเปล่า */
function Cell({
  column,
  row,
  isEn,
  t,
}: {
  column: ReportColumn;
  row: ActivityReportRow;
  isEn: boolean;
  t: (s: string) => string;
}) {
  switch (column.key) {
    case 'date':
      return <>{isEn ? row.dateEn : row.dateTh}</>;
    case 'title':
      return (
        <Link href={`/organizer/activities/${row.id}`} style={{ color: 'inherit' }}>
          <span style={{ borderInlineStart: `3px solid ${row.categoryColor}`, paddingInlineStart: 8, display: 'inline-block' }}>
            {row.title}
            {row.orgName ? (
              <span style={{ display: 'block', fontSize: 11, color: COLOR.label }}>{row.orgName}</span>
            ) : null}
          </span>
        </Link>
      );
    case 'status': {
      const meta = ACTIVITY_STATUS_META[row.status] ?? ACTIVITY_STATUS_META.draft;
      return <Badge tone={meta.tone} label={t(meta.label)} />;
    }
    case 'category':
      return <>{isEn ? row.categoryLabelEn : row.categoryLabel}</>;
    case 'seats':
      return <>{row.seatsTotal > 0 ? row.seatsTotal : '—'}</>;
    case 'pending':
      return <span style={{ color: row.pending > 0 ? '#E4572E' : COLOR.body }}>{row.pending}</span>;
    case 'rating':
      return <>{row.ratingAvg != null ? `${row.ratingAvg} (${row.reviewCount})` : '—'}</>;
    default:
      return <>{column.csvValue(row)}</>;
  }
}

export function ReportsTable({
  rows,
  visible,
  sort,
  onSort,
  selected,
  onToggleRow,
  onTogglePage,
  totals,
  isEn,
  t,
}: {
  rows: ActivityReportRow[];
  visible: ColumnKey[];
  sort: SortState;
  onSort: (key: ColumnKey) => void;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  onTogglePage: (ids: string[], select: boolean) => void;
  /** ยอดรวมของทุกแถวที่ผ่านตัวกรอง ไม่ใช่แค่หน้านี้ — เขียนกำกับไว้ที่แถวรวมด้วย */
  totals: OrganizerTotals;
  isEn: boolean;
  t: (s: string) => string;
}) {
  const cols = COLUMNS.filter((c) => visible.includes(c.key));
  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));

  const sumOf = (key: ColumnKey): string => {
    switch (key) {
      case 'registered':
        return String(totals.registered);
      case 'attended':
        return String(totals.attended);
      case 'completed':
        return String(totals.completed);
      case 'hours':
        return String(totals.hoursAwarded);
      case 'rating':
        return totals.ratingAvg != null ? String(totals.ratingAvg) : '—';
      case 'pending':
        return String(rows.reduce((s, r) => s + r.pending, 0));
      default:
        return '';
    }
  };

  return (
    <div className="nuv-tablewrap">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ color: COLOR.label, fontSize: 11 }}>
            <th className="nuv-no-print" style={{ padding: '8px 9px', width: 34 }}>
              <input
                /* สถานะกลาง (เลือกบางแถว) ตั้งผ่าน ref เพราะ HTML ไม่มี attribute นี้ให้เขียนใน JSX */
                ref={(el) => {
                  if (el) el.indeterminate = someOnPage && !allOnPage;
                }}
                type="checkbox"
                checked={allOnPage}
                onChange={(e) => onTogglePage(pageIds, e.target.checked)}
                aria-label={t('เลือกทุกแถวในหน้านี้')}
                style={{ width: 15, height: 15 }}
              />
            </th>

            {cols.map((c) => {
              const state = sort?.key === c.key ? sort.dir : null;
              return (
                <th
                  key={c.key}
                  className={TABLET_HIDDEN.includes(c.key) ? 'nuv-col-optional' : undefined}
                  aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : 'none'}
                  style={{ textAlign: c.align, padding: 0, fontWeight: 500 }}
                >
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    title={t('กดเพื่อเรียงลำดับ')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '8px 9px',
                      border: 'none',
                      background: 'transparent',
                      font: 'inherit',
                      color: state ? COLOR.ink : COLOR.label,
                      fontWeight: state ? 600 : 500,
                      cursor: 'pointer',
                      flexDirection: c.align === 'end' ? 'row-reverse' : 'row',
                      textAlign: c.align,
                      /* หัวคอลัมน์ตัวเลขยาวกว่าตัวเลขข้างล่างหลายเท่า ("ใบลงทะเบียน" ต่อ "12")
                         ปล่อยให้ขึ้นบรรทัดที่สองแทนที่จะดันคอลัมน์ให้กว้างตามหัว */
                      whiteSpace: 'normal',
                      maxWidth: c.align === 'end' ? 86 : undefined,
                    }}
                  >
                    {t(c.label)}
                    <SortIcon state={state} />
                  </button>
                </th>
              );
            })}

            <th className="nuv-no-print" style={{ padding: '8px 9px', width: 46 }}>
              {/* หัวคอลัมน์ปุ่มคำสั่งไม่ต้องมีข้อความให้ตาเห็น แต่โปรแกรมอ่านหน้าจอต้องได้ยิน */}
              <span className="nuv-visually-hidden">{t('คำสั่งเพิ่มเติม')}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const on = selected.has(r.id);
            return (
              <tr
                key={r.id}
                style={{
                  borderTop: '1px solid rgba(31,41,55,.08)',
                  background: on ? 'rgba(167,116,247,.10)' : undefined,
                }}
              >
                <td className="nuv-no-print" style={{ padding: '10px 9px' }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleRow(r.id)}
                    aria-label={`${t('เลือก')} ${r.title}`}
                    style={{ width: 15, height: 15 }}
                  />
                </td>

                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={TABLET_HIDDEN.includes(c.key) ? 'nuv-col-optional' : undefined}
                    style={{
                      padding: '10px 9px',
                      textAlign: c.align,
                      color: c.key === 'attended' ? COLOR.ink : COLOR.body,
                      fontWeight: c.key === 'attended' ? 600 : 400,
                      /* ชื่อกิจกรรมและชื่อประเภทเป็นข้อความไทยยาว ๆ ถ้าห้ามขึ้นบรรทัดใหม่
                         สองคอลัมน์นี้จะกินความกว้างเกินครึ่งตารางไปคนเดียว */
                      whiteSpace: c.key === 'title' || c.key === 'category' ? 'normal' : 'nowrap',
                      minWidth: c.key === 'title' ? 150 : undefined,
                      maxWidth: c.key === 'title' ? 260 : c.key === 'category' ? 130 : undefined,
                    }}
                  >
                    <Cell column={c} row={r} isEn={isEn} t={t} />
                  </td>
                ))}

                <td className="nuv-no-print" style={{ padding: '6px 9px' }}>
                  <RowActions row={r} t={t} />
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{ borderTop: '2px solid rgba(31,41,55,.15)' }}>
            <td className="nuv-no-print" />
            {cols.map((c, i) => (
              <td
                key={c.key}
                className={TABLET_HIDDEN.includes(c.key) ? 'nuv-col-optional' : undefined}
                style={{ padding: '11px 9px', textAlign: c.align, fontWeight: 600, color: COLOR.ink }}
              >
                {i === 0 ? t('รวมทุกหน้า') : sumOf(c.key)}
              </td>
            ))}
            <td className="nuv-no-print" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
