'use client';

import Link from 'next/link';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { RowActions } from '@/components/reports/RowActions';
import { COLUMNS, type ColumnKey } from '@/components/reports/columns';
import { Badge } from '@/components/ui';
import { COLOR, glass } from '@/lib/design';
import type { ActivityReportRow } from '@/lib/organizerStats';

/** ตัวเลขที่ยกขึ้นมาโชว์ตัวใหญ่บนการ์ด — ที่เหลือแสดงเป็นบรรทัดเล็กด้านล่าง */
const HIGHLIGHT: ColumnKey[] = ['registered', 'attended', 'hours'];

export function ReportsCards({
  rows,
  visible,
  selected,
  onToggleRow,
  isEn,
  t,
}: {
  rows: ActivityReportRow[];
  visible: ColumnKey[];
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  isEn: boolean;
  t: (s: string) => string;
}) {
  const shownHighlights = COLUMNS.filter((c) => HIGHLIGHT.includes(c.key) && visible.includes(c.key));
  const shownRest = COLUMNS.filter(
    (c) => visible.includes(c.key) && !HIGHLIGHT.includes(c.key) && !['date', 'title', 'status'].includes(c.key),
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 12 }}>
      {rows.map((r) => {
        const meta = ACTIVITY_STATUS_META[r.status] ?? ACTIVITY_STATUS_META.draft;
        const on = selected.has(r.id);
        return (
          <div
            key={r.id}
            style={{
              ...glass(18),
              padding: 15,
              display: 'grid',
              gap: 11,
              alignContent: 'start',
              borderInlineStart: `4px solid ${r.categoryColor}`,
              outline: on ? '2px solid rgba(167,116,247,.55)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggleRow(r.id)}
                aria-label={`${t('เลือก')} ${r.title}`}
                style={{ width: 15, height: 15, marginTop: 3, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link href={`/organizer/activities/${r.id}`} style={{ color: 'inherit' }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
                    {r.title}
                  </span>
                </Link>
                <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint, marginTop: 3 }}>
                  {`${isEn ? r.dateEn : r.dateTh} · ${r.time}`}
                </span>
              </div>
              <RowActions row={r} t={t} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
              <Badge tone={meta.tone} label={t(meta.label)} />
              {visible.includes('category') ? (
                <span style={{ fontSize: 11.5, color: COLOR.label }}>
                  {isEn ? r.categoryLabelEn : r.categoryLabel}
                </span>
              ) : null}
              {r.pending > 0 && visible.includes('pending') ? (
                <Badge tone="warning" label={`${t('รออนุมัติ')} ${r.pending}`} />
              ) : null}
            </div>

            {shownHighlights.length ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {shownHighlights.map((c) => (
                  <div key={c.key}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: COLOR.ink, lineHeight: 1.3 }}>
                      {c.csvValue(r) === '' ? '—' : c.csvValue(r)}
                    </div>
                    <div style={{ fontSize: 11, color: COLOR.label }}>{t(c.label)}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {shownRest.length ? (
              <div style={{ display: 'grid', gap: 4, borderTop: '1px solid rgba(31,41,55,.08)', paddingTop: 9 }}>
                {shownRest.map((c) => (
                  <div key={c.key} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    <span style={{ color: COLOR.label }}>{t(c.label)}</span>
                    <span style={{ marginInlineStart: 'auto', color: COLOR.body }}>
                      {c.key === 'rating'
                        ? r.ratingAvg != null
                          ? `${r.ratingAvg} (${r.reviewCount})`
                          : '—'
                        : c.csvValue(r) === ''
                          ? '—'
                          : c.csvValue(r)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
