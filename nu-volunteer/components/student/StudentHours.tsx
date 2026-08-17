'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, ColorBadge, EmptyState, Icon, inputStyle } from '@/components/ui';
import { DateEcho } from '@/components/ui/DateEcho';
import { COLOR, SEMANTIC, glass } from '@/lib/design';

export type HourEntry = {
  id: string;
  title: string;
  orgName: string;
  hours: number;
  categoryId: string;
  categoryLabel: string;
  categoryLabelEn: string;
  color: string;
  /** YYYY-MM-DD ตามเวลาไทย */
  day: string;
  dateTh: string;
  dateEn: string;
  atMs: number;
};

export type MonthBucket = { key: string; hours: number };

type Category = { id: string; label: string; labelEn: string; color: string };

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ป้ายเดือนจากคีย์ YYYY-MM — ประกอบเองเพื่อให้ผล SSR กับ client ตรงกัน */
function monthLabel(key: string, isEn: boolean) {
  const [y, m] = key.split('-').map(Number);
  return isEn ? `${MONTHS_EN[m - 1]} ${y}` : `${MONTHS_TH[m - 1]} ${y + 543}`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function StudentHours({
  entries,
  months,
  categories,
  totals,
  goal,
  academicYear,
  adjustments,
  studentName,
}: {
  entries: HourEntry[];
  months: MonthBucket[];
  categories: Category[];
  totals: { all: number; thisMonth: number; academicYear: number; adjustments: number };
  goal: number;
  academicYear: number;
  adjustments: { id: string; hours: number; reason: string; dateTh: string; dateEn: string }[];
  studentName: string;
}) {
  const { t, isEn } = useApp();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(
    () =>
      entries
        .filter((e) => (!from || e.day >= from) && (!to || e.day <= to) && (!category || e.categoryId === category))
        .sort((a, b) => b.atMs - a.atMs),
    [entries, from, to, category],
  );

  const filteredMonths = useMemo(() => {
    if (!from && !to && !category) return months;
    const map = new Map<string, number>();
    for (const e of filtered) {
      const k = e.day.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + e.hours);
    }
    return [...map.entries()].map(([key, hours]) => ({ key, hours })).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered, months, from, to, category]);

  /** รวมชั่วโมงตามหมวดหมู่ของรายการที่ผ่านตัวกรอง */
  const byCategory = useMemo(() => {
    const map = new Map<string, { hours: number; color: string; label: string; labelEn: string }>();
    for (const e of filtered) {
      const cur = map.get(e.categoryId);
      if (cur) cur.hours += e.hours;
      else map.set(e.categoryId, { hours: e.hours, color: e.color, label: e.categoryLabel, labelEn: e.categoryLabelEn });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.hours - a.hours);
  }, [filtered]);

  const filteredTotal = round1(filtered.reduce((s, e) => s + e.hours, 0));
  const active = Boolean(from || to || category);
  const pct = goal > 0 ? Math.min(100, Math.round((totals.academicYear / goal) * 100)) : 0;

  const exportCsv = () => {
    const head = ['date', 'activity', 'organisation', 'category', 'hours'];
    const lines = filtered.map((e) =>
      [e.dateEn, e.title, e.orgName, e.categoryLabelEn, String(e.hours)]
        // หุ้มด้วยเครื่องหมายคำพูดและ escape ให้ปลอดภัยกับคอมมาในชื่อกิจกรรม
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง
    const csv = '﻿' + [head.join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuv-hours-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonth = Math.max(1, ...filteredMonths.map((m) => m.hours));

  return (
    <div className="nuv-print-root" style={{ display: 'grid', gap: 16 }}>
      {/* หัวกระดาษ — เห็นเฉพาะตอนพิมพ์ */}
      <div className="nuv-print-only" style={{ display: 'none' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{t('สรุปชั่วโมงจิตอาสา')}</h1>
        <div style={{ fontSize: 13, marginTop: 4 }}>{studentName}</div>
      </div>

      {/* ── การ์ดสถิติ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div style={{ ...glass(20), padding: 20, gridColumn: 'span 1' }}>
          <div style={{ fontSize: 12, color: COLOR.label }}>{t('ชั่วโมงสะสมทั้งหมด')}</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: COLOR.ink, lineHeight: 1.15 }}>{round1(totals.all)}</div>
          <div style={{ fontSize: 12, color: COLOR.label }}>{t('ชั่วโมง')}</div>
        </div>

        <Stat icon="calendar_month" tone="info" label={t('เดือนนี้')} value={round1(totals.thisMonth)} t={t} />
        <Stat icon="school" tone="purple" label={`${t('ปีการศึกษา')} ${academicYear}`} value={round1(totals.academicYear)} t={t} />
        {totals.adjustments !== 0 ? (
          <Stat
            icon="tune"
            tone={totals.adjustments > 0 ? 'success' : 'danger'}
            label={t('ปรับโดยเจ้าหน้าที่')}
            value={round1(totals.adjustments)}
            t={t}
          />
        ) : null}
      </div>

      {/* ── ความคืบหน้าตามเป้าหมาย ── */}
      <div style={{ ...glass(20), padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <Icon name="flag" size={19} style={{ color: '#E4572E' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>
            {`${t('เป้าหมายปีการศึกษา')} ${academicYear}`}
          </span>
          <Badge tone={pct >= 100 ? 'success' : 'warning'} label={`${round1(totals.academicYear)} / ${goal} ${t('ชม.')}`} />
          <span style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('ความคืบหน้าชั่วโมงจิตอาสา')}
          style={{ height: 12, borderRadius: 999, background: 'rgba(31,41,55,.1)', overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 999,
              background: pct >= 100 ? '#63D2A1' : 'linear-gradient(90deg,#E97171,#A774F7)',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: COLOR.label, marginTop: 8 }}>
          {pct >= 100
            ? t('ครบเกณฑ์แล้ว')
            : `${t('เหลืออีก')} ${round1(Math.max(0, goal - totals.academicYear))} ${t('ชม.')}`}
        </div>
      </div>

      {/* ── ตัวกรอง ── */}
      <div className="nuv-no-print" style={{ ...glass(20), padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ตั้งแต่วันที่')}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle(false), width: 'auto' }} />
          <DateEcho value={from} />
        </label>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ถึงวันที่')}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle(false), width: 'auto' }} />
          <DateEcho value={to} />
        </label>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ประเภทกิจกรรม')}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(false), width: 'auto', minWidth: 190 }}>
            <option value="">{t('ทุกหมวดหมู่')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {isEn ? c.labelEn : c.label}
              </option>
            ))}
          </select>
        </label>

        {active ? (
          <Button
            variant="secondary"
            icon="filter_alt_off"
            onClick={() => {
              setFrom('');
              setTo('');
              setCategory('');
            }}
          >
            {t('ล้างตัวกรอง')}
          </Button>
        ) : null}

        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!filtered.length}>
            {t('ส่งออก CSV')}
          </Button>
          <Button variant="secondary" icon="print" onClick={() => window.print()}>
            {t('พิมพ์ / บันทึก PDF')}
          </Button>
        </div>
      </div>

      {active ? (
        <div style={{ fontSize: 12.5, color: COLOR.body }}>
          {`${t('ผลตามตัวกรอง')}: ${filtered.length} ${t('รายการ')} · ${filteredTotal} ${t('ชม.')}`}
        </div>
      ) : null}

      {/* ── กราฟรายเดือน ── */}
      <div style={{ ...glass(22), padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <Icon name="bar_chart" size={19} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ชั่วโมงรายเดือน')}</span>
        </div>

        {!filteredMonths.length ? (
          <div style={{ fontSize: 12.5, color: COLOR.hint }}>{t('ยังไม่มีข้อมูลในช่วงที่เลือก')}</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto', paddingBottom: 4, minHeight: 170 }}>
            {filteredMonths.map((m) => (
              <div key={m.key} style={{ display: 'grid', gap: 6, justifyItems: 'center', minWidth: 56 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink }}>{round1(m.hours)}</span>
                <div
                  title={`${monthLabel(m.key, isEn)} — ${round1(m.hours)} ${t('ชม.')}`}
                  style={{
                    width: 34,
                    height: Math.max(6, (m.hours / maxMonth) * 110),
                    borderRadius: 9,
                    background: 'linear-gradient(180deg,#A774F7,#E97171)',
                  }}
                />
                <span style={{ fontSize: 10.5, color: COLOR.label, whiteSpace: 'nowrap' }}>{monthLabel(m.key, isEn)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── แยกตามหมวดหมู่ ── */}
      {byCategory.length ? (
        <div style={{ ...glass(22), padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <Icon name="donut_small" size={19} style={{ color: '#A774F7' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('แยกตามประเภทกิจกรรม')}</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {byCategory.map((c) => {
              const share = filteredTotal > 0 ? Math.round((c.hours / filteredTotal) * 100) : 0;
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                    <ColorBadge label={isEn ? c.labelEn : c.label} color={c.color} />
                    <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: COLOR.body }}>
                      {`${round1(c.hours)} ${t('ชม.')} · ${share}%`}
                    </span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: 'rgba(31,41,55,.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${share}%`, height: '100%', background: c.color, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── รายการกิจกรรม ── */}
      <div style={{ ...glass(22), padding: filtered.length ? 18 : 0 }}>
        {!filtered.length ? (
          <EmptyState
            icon="schedule"
            title={t('ยังไม่มีชั่วโมงที่รับรองแล้ว')}
            desc={t('ชั่วโมงจะขึ้นที่นี่หลังผู้จัดกิจกรรมรับรองการเข้าร่วมของคุณ')}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="list_alt" size={19} style={{ color: '#A774F7' }} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('รายการกิจกรรมและชั่วโมง')}</span>
              <Badge tone="neutral" label={String(filtered.length)} />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
                <thead>
                  <tr style={{ textAlign: 'start', color: COLOR.label, fontSize: 11.5 }}>
                    <th style={{ textAlign: 'start', padding: '8px 10px', fontWeight: 500 }}>{t('วันที่')}</th>
                    <th style={{ textAlign: 'start', padding: '8px 10px', fontWeight: 500 }}>{t('กิจกรรม')}</th>
                    <th style={{ textAlign: 'start', padding: '8px 10px', fontWeight: 500 }}>{t('ประเภท')}</th>
                    <th style={{ textAlign: 'end', padding: '8px 10px', fontWeight: 500 }}>{t('ชม.')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} style={{ borderTop: '1px solid rgba(31,41,55,.08)' }}>
                      <td style={{ padding: '11px 10px', color: COLOR.label, whiteSpace: 'nowrap' }}>
                        {isEn ? e.dateEn : e.dateTh}
                      </td>
                      <td style={{ padding: '11px 10px', color: COLOR.ink }}>
                        <span style={{ borderInlineStart: `3px solid ${e.color}`, paddingInlineStart: 8, display: 'inline-block' }}>
                          {e.title}
                          <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label }}>{e.orgName}</span>
                        </span>
                      </td>
                      <td style={{ padding: '11px 10px' }}>
                        <ColorBadge label={isEn ? e.categoryLabelEn : e.categoryLabel} color={e.color} />
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'end', fontWeight: 600, color: COLOR.ink }}>{e.hours}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(31,41,55,.15)' }}>
                    <td colSpan={3} style={{ padding: '11px 10px', fontWeight: 600, color: COLOR.ink }}>
                      {t('รวม')}
                    </td>
                    <td style={{ padding: '11px 10px', textAlign: 'end', fontWeight: 700, color: COLOR.ink }}>{filteredTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── การปรับชั่วโมงโดยเจ้าหน้าที่ ── */}
      {adjustments.length ? (
        <div style={{ ...glass(22), padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <Icon name="tune" size={19} style={{ color: '#B45309' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('การปรับชั่วโมงโดยเจ้าหน้าที่')}</span>
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {adjustments.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 11, alignItems: 'center', fontSize: 12.5 }}>
                <Badge tone={a.hours >= 0 ? 'success' : 'danger'} label={`${a.hours > 0 ? '+' : ''}${a.hours}`} />
                <span style={{ color: COLOR.body, flex: 1 }}>{a.reason}</span>
                <span style={{ color: COLOR.hint }}>{isEn ? a.dateEn : a.dateTh}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
  t,
}: {
  icon: string;
  tone: 'info' | 'purple' | 'success' | 'danger';
  label: string;
  value: number;
  t: (s: string) => string;
}) {
  return (
    <div style={{ ...glass(20), padding: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: SEMANTIC[tone].bg,
          color: SEMANTIC[tone].color,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={22} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: COLOR.ink }}>{value}</span>
        <span style={{ display: 'block', fontSize: 12, color: COLOR.label }}>
          {label} · {t('ชม.')}
        </span>
      </span>
    </div>
  );
}
