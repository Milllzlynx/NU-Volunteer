'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, EmptyState, ErrorNote, Icon, IconButton, Tabs, inputStyle } from '@/components/ui';
import { DateEcho } from '@/components/ui/DateEcho';
import { calendarApi, errorMessage } from '@/lib/api';
import { COLOR, REG_STATUS, glass, solidGlass } from '@/lib/design';
import {
  DOW_EN,
  DOW_TH,
  addDays,
  addMonths,
  firstOfMonth,
  fullDayLabel,
  monthLabel,
  sameMonth,
  dayNum,
  startOfWeek,
} from '@/lib/calendarMath';
import type { PublicActivity } from '@/components/landing/types';

/**
 * รายการหนึ่งช่องบนปฏิทิน — เซิร์ฟเวอร์คำนวณวัน/เวลาตามเขตเวลาไทยมาให้แล้ว
 * ฝั่ง client จึงทำแค่คณิตศาสตร์ปฏิทินกับสตริง YYYY-MM-DD ไม่แตะ timezone อีก
 */
export type CalendarItem = {
  kind: ItemKind;
  id: string;
  /** วันเริ่ม (YYYY-MM-DD เวลาไทย) */
  day: string;
  /** วันสิ้นสุด — เท่ากับ day ถ้าไม่ข้ามวัน */
  endDay: string;
  title: string;
  /** HH:mm — null คือรายการทั้งวัน */
  time: string | null;
  endTime: string | null;
  color: string;
  /** สถานะใบลงทะเบียน (เฉพาะ kind = registration) */
  status?: string;
  /** บันทึกของนัดหมายส่วนตัว */
  note?: string;
  location?: string;
  orgName?: string;
  hours?: number;
  /** ใช้ลิงก์ไปหน้ารายละเอียด — มีเฉพาะรายการที่มาจากกิจกรรมจริง */
  activity?: PublicActivity;
};

type ItemKind = 'registration' | 'activity' | 'personal';
type ViewKey = 'month' | 'week';

const EVENT_COLORS = ['#A774F7', '#E97171', '#63D2A1', '#F5A623', '#7AB8FF'];

const KIND_ICON: Record<ItemKind, string> = {
  registration: 'how_to_reg',
  activity: 'campaign',
  personal: 'push_pin',
};

export function StudentCalendar({
  items,
  todayKey,
}: {
  items: CalendarItem[];
  /** วันนี้ตามเวลาไทย คำนวณจากเซิร์ฟเวอร์ — กัน hydration mismatch จากนาฬิกาเครื่องผู้ใช้ */
  todayKey: string;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [view, setView] = useState<ViewKey>('month');
  const [cursor, setCursor] = useState(todayKey);
  const [selected, setSelected] = useState(todayKey);
  const [adding, setAdding] = useState(false);
  const [layers, setLayers] = useState<Record<ItemKind, boolean>>({
    registration: true,
    activity: true,
    personal: true,
  });

  const visible = useMemo(() => items.filter((it) => layers[it.kind]), [items, layers]);

  /** กระจายรายการลงทุกวันที่มันคาบเกี่ยว เพื่อให้กิจกรรมข้ามวันโผล่ครบทุกช่อง */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of visible) {
      let d = it.day;
      // กันลูปไม่รู้จบถ้าข้อมูลวันสิ้นสุดเพี้ยน
      for (let guard = 0; guard < 90; guard++) {
        const list = map.get(d);
        if (list) list.push(it);
        else map.set(d, [it]);
        if (d >= it.endDay) break;
        d = addDays(d, 1);
      }
    }
    for (const list of map.values()) {
      // ทั้งวันขึ้นก่อน จากนั้นเรียงตามเวลาเริ่ม
      list.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    }
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

  const step = (dir: 1 | -1) => {
    setCursor((c) => (view === 'week' ? addDays(c, dir * 7) : addMonths(c, dir)));
  };
  const goToday = () => {
    setCursor(todayKey);
    setSelected(todayKey);
  };

  const heading =
    view === 'week'
      ? `${fullDayLabel(startOfWeek(cursor), isEn)} – ${fullDayLabel(addDays(startOfWeek(cursor), 6), isEn)}`
      : monthLabel(firstOfMonth(cursor), isEn);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── แถบควบคุม ── */}
      <div style={{ ...glass(20), padding: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon="chevron_left" label={t('ก่อนหน้า')} onClick={() => step(-1)} />
          <IconButton icon="chevron_right" label={t('ถัดไป')} onClick={() => step(1)} />
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: COLOR.ink, minWidth: 190 }}>{heading}</div>

        <Button variant="secondary" icon="today" onClick={goToday} style={{ padding: '9px 15px' }}>
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
          <Button variant="primary" icon="add" onClick={() => setAdding(true)}>
            {t('เพิ่มนัดหมาย')}
          </Button>
        </div>
      </div>

      {/* ── ชั้นข้อมูลที่แสดง ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {/* สีของป้ายในปฏิทินมาจากหมวดหมู่กิจกรรม ตัวกรองนี้จึงแยกด้วยไอคอน ไม่ใช่สี */}
        {(
          [
            { key: 'registration', label: t('กิจกรรมที่ลงทะเบียน') },
            { key: 'activity', label: t('กิจกรรมที่เปิดรับ') },
            { key: 'personal', label: t('นัดหมายส่วนตัว') },
          ] as { key: ItemKind; label: string }[]
        ).map((l) => {
          const on = layers[l.key];
          const count = items.filter((i) => i.kind === l.key).length;
          return (
            <button
              key={l.key}
              onClick={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
              aria-pressed={on}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                cursor: 'pointer',
                border: `1px solid ${on ? 'rgba(167,116,247,.45)' : 'rgba(31,41,55,.12)'}`,
                background: on ? 'rgba(167,116,247,.14)' : 'rgba(255,255,255,.55)',
                color: on ? COLOR.ink : COLOR.hint,
                fontWeight: on ? 500 : 400,
              }}
            >
              <Icon name={KIND_ICON[l.key]} size={15} />
              {l.label}
              <span style={{ opacity: 0.7 }}>{count}</span>
              <Icon name={on ? 'visibility' : 'visibility_off'} size={14} style={{ opacity: 0.65 }} />
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
            {gridDays.map((key) => (
              <DayCell
                key={key}
                dayKey={key}
                items={byDay.get(key) ?? []}
                muted={view === 'month' && !sameMonth(key, cursor)}
                today={key === todayKey}
                active={key === selected}
                tall={view === 'week'}
                isEn={isEn}
                t={t}
                onSelect={() => setSelected(key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── รายละเอียดของวันที่เลือก ── */}
      <DayPanel
        dayKey={selected}
        items={selectedItems}
        isEn={isEn}
        t={t}
        onAdd={() => setAdding(true)}
        onDeleted={() => startTransition(() => router.refresh())}
      />


      {adding ? (
        <AddEventModal
          defaultDate={selected}
          isEn={isEn}
          t={t}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            startTransition(() => router.refresh());
          }}
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ช่องวัน ───────────────── */

function DayCell({
  dayKey,
  items,
  muted,
  today,
  active,
  tall,
  isEn,
  t,
  onSelect,
}: {
  dayKey: string;
  items: CalendarItem[];
  muted: boolean;
  today: boolean;
  active: boolean;
  tall: boolean;
  isEn: boolean;
  t: (s: string) => string;
  onSelect: () => void;
}) {
  const max = tall ? 8 : 3;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;

  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`${fullDayLabel(dayKey, isEn)} — ${items.length} ${t('รายการ')}`}
      style={{
        display: 'block',
        textAlign: 'start',
        width: '100%',
        minHeight: tall ? 240 : 104,
        padding: 7,
        borderRadius: 13,
        cursor: 'pointer',
        background: active ? 'rgba(167,116,247,.13)' : 'rgba(255,255,255,.5)',
        border: active ? '1px solid rgba(167,116,247,.55)' : '1px solid rgba(255,255,255,.7)',
        opacity: muted ? 0.42 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 23,
            height: 23,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: today ? 700 : 500,
            color: today ? '#fff' : COLOR.ink,
            background: today ? 'linear-gradient(135deg,#E97171,#A774F7)' : 'transparent',
          }}
        >
          {dayNum(dayKey)}
        </span>
        {items.length ? (
          <span style={{ fontSize: 10.5, color: COLOR.hint }}>{items.length}</span>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 3 }}>
        {shown.map((it) => (
          <Chip key={`${it.kind}-${it.id}`} item={it} />
        ))}
        {rest > 0 ? (
          <span style={{ fontSize: 10.5, color: COLOR.link, paddingInlineStart: 4 }}>
            +{rest} {t('เพิ่มเติม')}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** ป้ายรายการในช่องวัน — กิจกรรมที่ยังไม่ได้ลงทะเบียนใช้เส้นประให้ต่างจากของที่ลงไว้แล้ว */
function Chip({ item }: { item: CalendarItem }) {
  const ghost = item.kind === 'activity';
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 6px',
        borderRadius: 7,
        fontSize: 10.5,
        lineHeight: 1.45,
        color: COLOR.ink,
        background: ghost ? 'transparent' : `${item.color}26`,
        border: ghost ? `1px dashed ${item.color}88` : '1px solid transparent',
        overflow: 'hidden',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
      {item.time ? <span style={{ color: COLOR.label, flexShrink: 0 }}>{item.time}</span> : null}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
    </span>
  );
}

/* ───────────────── แผงรายละเอียดรายวัน ───────────────── */

function DayPanel({
  dayKey,
  items,
  isEn,
  t,
  onAdd,
  onDeleted,
}: {
  dayKey: string;
  items: CalendarItem[];
  isEn: boolean;
  t: (s: string) => string;
  onAdd: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await calendarApi.remove(id);
      setConfirmId(null);
      onDeleted();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...glass(22), padding: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <Icon name="event_note" size={20} style={{ color: '#A774F7' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink }}>{fullDayLabel(dayKey, isEn)}</span>
        <span style={{ fontSize: 12.5, color: COLOR.label }}>
          {items.length} {t('รายการ')}
        </span>
        <Button
          variant="secondary"
          icon="add"
          onClick={onAdd}
          style={{ marginInlineStart: 'auto', padding: '9px 15px' }}
        >
          {t('เพิ่มนัดหมายวันนี้')}
        </Button>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {!items.length ? (
        <EmptyState
          icon="event_available"
          title={t('วันนี้ยังไม่มีรายการ')}
          desc={t('เลือกวันอื่นบนปฏิทิน หรือเพิ่มนัดหมายส่วนตัวของคุณเองไว้เตือนความจำ')}
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((it) => {
            const reg = it.status ? REG_STATUS[it.status] : null;
            return (
              <div
                key={`${it.kind}-${it.id}`}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 14,
                  borderRadius: 15,
                  background: 'rgba(255,255,255,.55)',
                  border: '1px solid rgba(255,255,255,.75)',
                  borderInlineStart: `4px solid ${it.color}`,
                }}
              >
                <Icon name={KIND_ICON[it.kind]} size={20} style={{ color: it.color, flexShrink: 0 }} />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{it.title}</div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginTop: 6,
                      fontSize: 12,
                      color: COLOR.label,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="schedule" size={14} />
                      {it.time ? `${it.time}${it.endTime ? `–${it.endTime}` : ''}` : t('ทั้งวัน')}
                    </span>
                    {it.location ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="place" size={14} />
                        {it.location}
                      </span>
                    ) : null}
                    {it.hours ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="hourglass_top" size={14} />
                        {it.hours} {t('ชั่วโมง')}
                      </span>
                    ) : null}
                    {it.orgName ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="apartment" size={14} />
                        {it.orgName}
                      </span>
                    ) : null}
                  </div>

                  {it.note ? (
                    <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 8, lineHeight: 1.7 }}>{it.note}</div>
                  ) : null}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    {reg ? <Badge tone={reg.tone} icon={reg.icon} label={t(reg.label)} /> : null}
                    {it.kind === 'activity' ? (
                      <Badge tone="info" icon="campaign" label={t('ยังไม่ได้ลงทะเบียน')} />
                    ) : null}

                    {it.activity ? (
                      <Link href={`/activities/${it.activity.id}`}>
                        <Button variant="secondary" icon="visibility" style={{ padding: '8px 14px' }}>
                          {t('ดูรายละเอียด')}
                        </Button>
                      </Link>
                    ) : null}

                    {it.kind === 'personal' ? (
                      confirmId === it.id ? (
                        <>
                          <Button
                            variant="danger"
                            icon="delete"
                            loading={busy}
                            onClick={() => remove(it.id)}
                            style={{ padding: '8px 14px' }}
                          >
                            {t('ยืนยันลบ')}
                          </Button>
                          <Button variant="secondary" onClick={() => setConfirmId(null)} style={{ padding: '8px 14px' }}>
                            {t('ไม่ลบ')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          icon="delete"
                          onClick={() => setConfirmId(it.id)}
                          style={{ padding: '8px 14px' }}
                        >
                          {t('ลบนัดหมาย')}
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────── เพิ่มนัดหมาย ───────────────── */

function AddEventModal({
  defaultDate,
  isEn,
  t,
  onClose,
  onSaved,
}: {
  defaultDate: string;
  isEn: boolean;
  t: (s: string) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!title.trim()) {
      setError(t('กรุณากรอกชื่อนัดหมาย'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await calendarApi.create({
        title: title.trim(),
        date,
        time: allDay ? undefined : time,
        endTime: allDay || !endTime ? undefined : endTime,
        note: note.trim(),
        color,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('เพิ่มนัดหมาย')}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background: 'rgba(31,41,55,.42)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...solidGlass(26), width: 'min(520px,100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Icon name="event" size={22} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: COLOR.ink }}>{t('เพิ่มนัดหมาย')}</span>
          <IconButton icon="close" label={t('ปิด')} onClick={onClose} style={{ marginInlineStart: 'auto' }} />
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 6 }}>
              {t('ชื่อนัดหมาย')}
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder={t('เช่น ส่งรายงานอาสา')}
              style={inputStyle(false)}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 6 }}>{t('วันที่')}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle(false)} />
            <DateEcho value={date} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            <span style={{ fontSize: 13, color: COLOR.body }}>{t('ทั้งวัน')}</span>
          </label>

          {!allDay ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 6 }}>
                  {t('เวลาเริ่ม')}
                </span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle(false)} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 6 }}>
                  {t('เวลาสิ้นสุด')}
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={inputStyle(false)}
                />
              </label>
            </div>
          ) : null}

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 6 }}>
              {t('บันทึกเพิ่มเติม')}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>

          <div>
            <span style={{ fontSize: 12.5, color: COLOR.label, display: 'block', marginBottom: 8 }}>{t('สี')}</span>
            <div style={{ display: 'flex', gap: 9 }}>
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={c === color}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    border: c === color ? '3px solid rgba(31,41,55,.55)' : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <ErrorNote>{error}</ErrorNote>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="secondary" onClick={onClose}>
              {t('ยกเลิก')}
            </Button>
            <Button variant="primary" icon="check" loading={saving} onClick={submit}>
              {t('บันทึก')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
