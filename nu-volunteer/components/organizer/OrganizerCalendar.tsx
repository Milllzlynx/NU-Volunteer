'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, EmptyState, Icon, IconButton, Tabs } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { COLOR, SEMANTIC, glass } from '@/lib/design';
import {
  DOW_EN,
  DOW_TH,
  addDays,
  addMonths,
  dayNum,
  firstOfMonth,
  fullDayLabel,
  monthLabel,
  sameMonth,
  startOfWeek,
} from '@/lib/calendarMath';

/**
 * ปฏิทินกิจกรรมของผู้จัด — เห็นทุกกิจกรรมที่ตัวเองดูแลเรียงตามวัน
 *
 * ต่างจากปฏิทินของนิสิตตรงที่ไม่มีนัดหมายส่วนตัวและไม่มีใบลงทะเบียน
 * มีแต่กิจกรรม จึงกรองด้วย "สถานะกิจกรรม" แทนการกรองด้วยชนิดรายการ
 * คณิตศาสตร์วันใช้ lib/calendarMath.ts ร่วมกับปฏิทินของนิสิต
 */

export type OrganizerCalendarItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD ตามเวลาไทย คำนวณจากเซิร์ฟเวอร์ */
  day: string;
  endDay: string;
  time: string;
  status: string;
  categoryColor: string;
  location: string;
  seatsFilled: number;
  seatsTotal: number;
  pending: number;
};

type ViewKey = 'month' | 'week';

/** สีแท่งในช่องวัน — ตามสถานะกิจกรรม ไม่ใช่หมวดหมู่ เพราะหน้านี้ผู้จัดดูสถานะเป็นหลัก */
const STATUS_COLOR: Record<string, string> = {
  draft: SEMANTIC.neutral.dot,
  open: SEMANTIC.success.dot,
  closed: SEMANTIC.warning.dot,
  cancelled: SEMANTIC.danger.dot,
  done: SEMANTIC.purple.dot,
};

export function OrganizerCalendar({
  items,
  todayKey,
}: {
  items: OrganizerCalendarItem[];
  todayKey: string;
}) {
  const { t, isEn } = useApp();

  const [view, setView] = useState<ViewKey>('month');
  const [cursor, setCursor] = useState(todayKey);
  const [selected, setSelected] = useState(todayKey);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => items.filter((it) => !hidden[it.status]), [items, hidden]);

  /** กระจายกิจกรรมลงทุกวันที่คาบเกี่ยว เพื่อให้กิจกรรมข้ามวันโผล่ครบทุกช่อง */
  const byDay = useMemo(() => {
    const map = new Map<string, OrganizerCalendarItem[]>();
    for (const it of visible) {
      let d = it.day;
      for (let guard = 0; guard < 90; guard++) {
        const list = map.get(d);
        if (list) list.push(it);
        else map.set(d, [it]);
        if (d >= it.endDay) break;
        d = addDays(d, 1);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [visible]);

  const gridDays = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(firstOfMonth(cursor));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const selectedItems = byDay.get(selected) ?? [];

  const step = (dir: 1 | -1) =>
    setCursor((c) => (view === 'week' ? addDays(c, dir * 7) : addMonths(c, dir)));

  const heading =
    view === 'week'
      ? `${fullDayLabel(startOfWeek(cursor), isEn)} – ${fullDayLabel(addDays(startOfWeek(cursor), 6), isEn)}`
      : monthLabel(firstOfMonth(cursor), isEn);

  const statusKeys = Object.keys(ACTIVITY_STATUS_META);

  return (
    <div style={{ display: 'grid', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {/* ── แถบควบคุม ── */}
      <div style={{ ...glass(20), padding: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon="chevron_left" label={t('ก่อนหน้า')} onClick={() => step(-1)} />
          <IconButton icon="chevron_right" label={t('ถัดไป')} onClick={() => step(1)} />
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: COLOR.ink, minWidth: 190 }}>{heading}</div>

        <Button
          variant="secondary"
          icon="today"
          onClick={() => {
            setCursor(todayKey);
            setSelected(todayKey);
          }}
          style={{ padding: '9px 15px' }}
        >
          {t('วันนี้')}
        </Button>

        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs
            items={[
              { key: 'month' as ViewKey, label: t('รายเดือน') },
              { key: 'week' as ViewKey, label: t('รายสัปดาห์') },
            ]}
            value={view}
            onChange={setView}
          />
          <Link href="/organizer/activities/new">
            <Button variant="primary" icon="add">
              {t('สร้างกิจกรรม')}
            </Button>
          </Link>
        </div>
      </div>

      {/* ── ตัวกรองตามสถานะ ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {statusKeys.map((key) => {
          const meta = ACTIVITY_STATUS_META[key];
          const on = !hidden[key];
          const count = items.filter((i) => i.status === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setHidden((s) => ({ ...s, [key]: !!on }))}
              aria-pressed={on}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${on ? 'rgba(167,116,247,.45)' : 'rgba(31,41,55,.12)'}`,
                background: on ? 'rgba(167,116,247,.14)' : 'rgba(255,255,255,.55)',
                color: on ? COLOR.ink : COLOR.hint,
              }}
            >
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[key], flexShrink: 0 }}
              />
              {t(meta.label)}
              <span style={{ opacity: 0.7 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── ตารางปฏิทิน ── */}
      <div style={{ ...glass(22), padding: 14, overflowX: 'auto' }}>
        <div style={{ minWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 8 }}>
            {(isEn ? DOW_EN : DOW_TH).map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: i === 0 || i === 6 ? '#C2410C' : COLOR.label,
                  paddingBottom: 4,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
            {gridDays.map((key) => {
              const dayItems = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const dim = view === 'month' && !sameMonth(key, cursor);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${fullDayLabel(key, isEn)} — ${dayItems.length} ${t('กิจกรรม')}`}
                  aria-pressed={isSelected}
                  style={{
                    minHeight: view === 'week' ? 140 : 92,
                    padding: 7,
                    borderRadius: 12,
                    textAlign: 'start',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    border: `1px solid ${isSelected ? 'rgba(167,116,247,.55)' : 'rgba(31,41,55,.07)'}`,
                    background: isSelected
                      ? 'rgba(167,116,247,.10)'
                      : dim
                        ? 'rgba(255,255,255,.28)'
                        : 'rgba(255,255,255,.55)',
                    opacity: dim ? 0.65 : 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#7C2FD9' : COLOR.body,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isToday ? 'rgba(167,116,247,.22)' : 'transparent',
                    }}
                  >
                    {dayNum(key)}
                  </span>

                  {dayItems.slice(0, view === 'week' ? 5 : 2).map((it) => (
                    <span
                      key={it.id}
                      title={it.title}
                      style={{
                        display: 'block',
                        fontSize: 10.5,
                        lineHeight: 1.5,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: `${STATUS_COLOR[it.status] ?? SEMANTIC.neutral.dot}22`,
                        borderInlineStart: `3px solid ${STATUS_COLOR[it.status] ?? SEMANTIC.neutral.dot}`,
                        color: COLOR.body,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {it.title}
                    </span>
                  ))}

                  {dayItems.length > (view === 'week' ? 5 : 2) ? (
                    <span style={{ fontSize: 10, color: COLOR.hint }}>
                      {`+${dayItems.length - (view === 'week' ? 5 : 2)}`}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── รายการของวันที่เลือก ── */}
      <div style={{ ...glass(20), padding: selectedItems.length ? 18 : 0 }}>
        {selectedItems.length ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="event" size={19} style={{ color: COLOR.hint }} />
              <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
                {fullDayLabel(selected, isEn)}
              </h2>
              <Badge tone="neutral" label={String(selectedItems.length)} />
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              {selectedItems.map((it) => {
                const meta = ACTIVITY_STATUS_META[it.status] ?? ACTIVITY_STATUS_META.draft;
                return (
                  <div
                    key={it.id}
                    className="nuv-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 10px',
                      borderRadius: 13,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        alignSelf: 'stretch',
                        minHeight: 34,
                        borderRadius: 4,
                        background: it.categoryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: COLOR.ink }}>{it.title}</div>
                      <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3 }}>
                        {it.time}
                        {it.location ? ` · ${it.location}` : ''}
                        {it.seatsTotal > 0 ? ` · ${it.seatsFilled}/${it.seatsTotal} ${t('ที่นั่ง')}` : ''}
                      </div>
                    </div>

                    {it.pending > 0 ? (
                      <Link href={`/organizer/registrations?activity=${it.id}`}>
                        <Badge tone="warning" icon="hourglass_top" label={`${it.pending}`} />
                      </Link>
                    ) : null}

                    <Badge tone={meta.tone} label={t(meta.label)} />

                    <Link href={`/organizer/activities/${it.id}`}>
                      <Button variant="secondary" icon="edit" style={{ padding: '7px 13px', fontSize: 12.5, borderRadius: 11 }}>
                        {t('แก้ไข')}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon="event_busy"
            title={t('ไม่มีกิจกรรมในวันนี้')}
            desc={t('เลือกวันอื่นบนปฏิทิน หรือสร้างกิจกรรมใหม่')}
            action={
              <Link href="/organizer/activities/new">
                <Button variant="primary" icon="add">
                  {t('สร้างกิจกรรม')}
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
