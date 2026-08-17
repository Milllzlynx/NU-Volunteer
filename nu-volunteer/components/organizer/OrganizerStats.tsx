'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, ColorBadge, EmptyState, Icon, inputStyle } from '@/components/ui';
import { DateEcho } from '@/components/ui/DateEcho';
import { useApp } from '@/components/providers/AppProviders';
import { monthLabel } from '@/lib/calendarMath';
import { COLOR, glass } from '@/lib/design';
import { round1, summarize, type ActivityReportRow } from '@/lib/organizerStats';

/** สูงสุดของแท่งกราฟรายเดือน (พิกเซล) — ที่เหลือคิดเป็นสัดส่วนจากค่านี้ */
const BAR_MAX = 110;
/** จำนวนกิจกรรมที่แสดงในตาราง "กิจกรรมที่คนมามากที่สุด" */
const TOP_N = 8;

function StatCard({ icon, color, label, value, hint }: {
  icon: string;
  color: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div style={{ ...glass(18), padding: 16, display: 'grid', gap: 8, alignContent: 'start' }}>
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}28`,
          color,
        }}
      >
        <Icon name={icon} size={20} />
      </span>
      <span style={{ fontSize: 24, fontWeight: 700, color: COLOR.ink, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 12, color: COLOR.label }}>{label}</span>
      {hint ? <span style={{ fontSize: 11, color: COLOR.hint }}>{hint}</span> : null}
    </div>
  );
}

export function OrganizerStats({ rows }: { rows: ActivityReportRow[] }) {
  const { t, isEn } = useApp();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');

  /** หมวดหมู่ที่ผู้จัดคนนี้เคยจัดจริง — ไม่ต้องแสดงหมวดที่ไม่มีกิจกรรมสักอัน */
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; labelEn: string; color: string }>();
    for (const r of rows) {
      if (!map.has(r.categoryId)) {
        map.set(r.categoryId, {
          id: r.categoryId,
          label: r.categoryLabel,
          labelEn: r.categoryLabelEn,
          color: r.categoryColor,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!from || r.dayKey >= from) &&
          (!to || r.dayKey <= to) &&
          (!category || r.categoryId === category),
      ),
    [rows, from, to, category],
  );

  const totals = useMemo(() => summarize(filtered), [filtered]);
  const active = Boolean(from || to || category);

  /** จำนวนกิจกรรมและผู้เข้าร่วมรายเดือน เรียงตามเดือนจริง ไม่ใช่ตามลำดับที่เจอ */
  const months = useMemo(() => {
    const map = new Map<string, { activities: number; attended: number }>();
    for (const r of filtered) {
      const key = `${r.dayKey.slice(0, 7)}-01`;
      const cur = map.get(key) ?? { activities: 0, attended: 0 };
      cur.activities += 1;
      cur.attended += r.attended;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  /** ชั่วโมงที่รับรองแล้วแยกตามหมวดหมู่ — เรียงจากมากไปน้อย */
  const byCategory = useMemo(() => {
    const map = new Map<string, { hours: number; attended: number; color: string; label: string; labelEn: string }>();
    for (const r of filtered) {
      const cur = map.get(r.categoryId);
      if (cur) {
        cur.hours += r.hoursAwarded;
        cur.attended += r.attended;
      } else {
        map.set(r.categoryId, {
          hours: r.hoursAwarded,
          attended: r.attended,
          color: r.categoryColor,
          label: r.categoryLabel,
          labelEn: r.categoryLabelEn,
        });
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v, hours: round1(v.hours) }))
      .sort((a, b) => b.hours - a.hours);
  }, [filtered]);

  /** ขั้นตอนตั้งแต่ยื่นใบจนรับรองชั่วโมง — เห็นว่าคนหล่นหายที่ขั้นไหน */
  const funnel = useMemo(() => {
    const approved = filtered.reduce((s, r) => s + r.approved + r.attended, 0);
    return [
      { key: 'registered', label: 'ยื่นใบลงทะเบียน', value: totals.registered, color: '#7AB8FF' },
      { key: 'approved', label: 'อนุมัติแล้ว', value: approved, color: '#A774F7' },
      { key: 'attended', label: 'เช็กอินจริง', value: totals.attended, color: '#63D2A1' },
      { key: 'completed', label: 'รับรองชั่วโมงแล้ว', value: totals.completed, color: '#E97171' },
    ];
  }, [filtered, totals]);

  const top = useMemo(
    () => [...filtered].sort((a, b) => b.attended - a.attended).slice(0, TOP_N),
    [filtered],
  );

  const maxMonth = Math.max(1, ...months.map((m) => m.attended));
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.hours));
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  if (!rows.length) {
    return (
      <div style={{ ...glass(22) }}>
        <EmptyState
          icon="insights"
          title={t('ยังไม่มีข้อมูลสถิติ')}
          desc={t('สถิติจะขึ้นที่นี่เมื่อคุณมีกิจกรรมและผู้เข้าร่วมแล้ว')}
          action={
            <Link href="/organizer/activities/new">
              <Button variant="primary" icon="add">
                {t('สร้างกิจกรรม')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{t('สถิติ')}</div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('ภาพรวมผู้เข้าร่วมและชั่วโมงจากกิจกรรมที่คุณดูแล')}
        </div>
      </div>

      {/* ── ตัวกรอง ── */}
      <div style={{ ...glass(20), padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
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
        <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: COLOR.body }}>
          {`${filtered.length} ${t('กิจกรรม')}`}
        </span>
      </div>

      {!filtered.length ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon="filter_alt_off"
            title={t('ไม่มีกิจกรรมในช่วงที่เลือก')}
            desc={t('ลองขยายช่วงวันหรือเลือกหมวดหมู่อื่น')}
          />
        </div>
      ) : (
        <>
          {/* ── ตัวเลขสรุป ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            <StatCard icon="campaign" color="#A774F7" label={t('กิจกรรมทั้งหมด')} value={String(totals.activities)} hint={`${totals.open} ${t('เปิดรับสมัครอยู่')}`} />
            <StatCard icon="groups" color="#7AB8FF" label={t('ใบลงทะเบียนทั้งหมด')} value={String(totals.registered)} />
            <StatCard icon="how_to_reg" color="#63D2A1" label={t('เช็กอินจริง')} value={String(totals.attended)} hint={totals.turnoutRate != null ? `${totals.turnoutRate}% ${t('ของผู้ที่อนุมัติแล้ว')}` : undefined} />
            <StatCard icon="schedule" color="#E97171" label={t('ชั่วโมงที่รับรองแล้ว')} value={String(totals.hoursAwarded)} hint={`${totals.completed} ${t('ใบ')}`} />
            <StatCard icon="event_seat" color="#F5A623" label={t('อัตราที่นั่งเต็ม')} value={totals.fillRate != null ? `${totals.fillRate}%` : '—'} hint={t('เฉพาะกิจกรรมที่จำกัดที่นั่ง')} />
            <StatCard icon="star" color="#F5A623" label={t('คะแนนเฉลี่ย')} value={totals.ratingAvg != null ? `${totals.ratingAvg}` : '—'} hint={`${totals.reviewCount} ${t('รีวิว')}`} />
          </div>

          {/* ── ผู้เข้าร่วมรายเดือน ── */}
          <div style={{ ...glass(22), padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <Icon name="bar_chart" size={19} style={{ color: '#A774F7' }} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ผู้เข้าร่วมรายเดือน')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto', paddingBottom: 4, minHeight: 170 }}>
              {months.map((m) => (
                <div key={m.key} style={{ display: 'grid', gap: 6, justifyItems: 'center', minWidth: 60 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink }}>{m.attended}</span>
                  <div
                    title={`${monthLabel(m.key, isEn)} — ${m.attended} ${t('คน')} · ${m.activities} ${t('กิจกรรม')}`}
                    style={{
                      width: 34,
                      height: Math.max(6, (m.attended / maxMonth) * BAR_MAX),
                      borderRadius: 9,
                      background: 'linear-gradient(180deg,#A774F7,#7AB8FF)',
                    }}
                  />
                  <span style={{ fontSize: 10.5, color: COLOR.label, whiteSpace: 'nowrap' }}>{monthLabel(m.key, isEn)}</span>
                  <span style={{ fontSize: 10.5, color: COLOR.hint, whiteSpace: 'nowrap' }}>
                    {`${m.activities} ${t('กิจกรรม')}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ขั้นตอนการเข้าร่วม ── */}
          <div style={{ ...glass(22), padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <Icon name="filter_alt" size={19} style={{ color: '#A774F7' }} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ขั้นตอนการเข้าร่วม')}</span>
            </div>
            <div style={{ fontSize: 11.5, color: COLOR.hint, marginBottom: 14 }}>
              {t('ดูว่าผู้สมัครหล่นหายไปที่ขั้นตอนไหนมากที่สุด')}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {funnel.map((f) => {
                const share = Math.round((f.value / funnelMax) * 100);
                const ofTotal = totals.registered > 0 ? Math.round((f.value / totals.registered) * 100) : 0;
                return (
                  <div key={f.key}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, color: COLOR.body }}>{t(f.label)}</span>
                      <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: COLOR.body }}>
                        {`${f.value} · ${ofTotal}%`}
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: 'rgba(31,41,55,.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${share}%`, height: '100%', background: f.color, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── แยกตามหมวดหมู่ ── */}
          {byCategory.length ? (
            <div style={{ ...glass(22), padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <Icon name="donut_small" size={19} style={{ color: '#A774F7' }} />
                <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ชั่วโมงแยกตามประเภทกิจกรรม')}</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {byCategory.map((c) => (
                  <div key={c.id}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                      <ColorBadge label={isEn ? c.labelEn : c.label} color={c.color} />
                      <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: COLOR.body }}>
                        {`${c.hours} ${t('ชม.')} · ${c.attended} ${t('คน')}`}
                      </span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: 'rgba(31,41,55,.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((c.hours / maxCategory) * 100)}%`, height: '100%', background: c.color, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── กิจกรรมที่คนมามากที่สุด ── */}
          <div style={{ ...glass(22), padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="leaderboard" size={19} style={{ color: '#A774F7' }} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('กิจกรรมที่มีผู้เข้าร่วมมากที่สุด')}</span>
              <Badge tone="neutral" label={String(top.length)} />
            </div>
            <div className="nuv-tablewrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: COLOR.label, fontSize: 11.5 }}>
                    <th style={{ textAlign: 'start', padding: '8px 10px', fontWeight: 500 }}>{t('กิจกรรม')}</th>
                    <th style={{ textAlign: 'end', padding: '8px 10px', fontWeight: 500 }}>{t('ใบลงทะเบียน')}</th>
                    <th style={{ textAlign: 'end', padding: '8px 10px', fontWeight: 500 }}>{t('เช็กอินจริง')}</th>
                    <th style={{ textAlign: 'end', padding: '8px 10px', fontWeight: 500 }}>{t('ชม.')}</th>
                    <th style={{ textAlign: 'end', padding: '8px 10px', fontWeight: 500 }}>{t('คะแนน')}</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(31,41,55,.08)' }}>
                      <td style={{ padding: '11px 10px', color: COLOR.ink }}>
                        <Link href={`/organizer/activities/${r.id}`} style={{ color: 'inherit' }}>
                          <span style={{ borderInlineStart: `3px solid ${r.categoryColor}`, paddingInlineStart: 8, display: 'inline-block' }}>
                            {r.title}
                            <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label }}>
                              {isEn ? r.dateEn : r.dateTh}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'end', color: COLOR.body }}>{r.registered}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'end', fontWeight: 600, color: COLOR.ink }}>{r.attended}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'end', color: COLOR.body }}>{r.hoursAwarded}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'end', color: COLOR.body }}>
                        {r.ratingAvg != null ? `${r.ratingAvg} (${r.reviewCount})` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
