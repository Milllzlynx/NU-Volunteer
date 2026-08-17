'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, IconButton, SuccessNote, Tabs } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { adminContentApi, errorMessage } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';
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

export type AdminCalendarItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD ตามเวลาไทย คำนวณจากเซิร์ฟเวอร์ */
  day: string;
  endDay: string;
  time: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  categoryLabelEn: string;
  categoryColor: string;
  organizerId: string;
  organizerName: string;
  location: string;
  seatsFilled: number;
  seatsTotal: number;
  pending: number;
};

type ViewKey = 'month' | 'week';

/**
 * จำนวนกิจกรรมที่แสดงเต็มในหนึ่งช่องวัน
 *
 * สองใบ ไม่ใช่สามหรือสี่ — ช่องวันที่ยัดแน่นอ่านไม่ออกอยู่ดี ที่เหลือยุบเป็น "+N"
 * แล้วกดดูครบในแถบข้าง ซึ่งมีที่ให้แสดงรายละเอียดมากกว่าอยู่แล้ว
 */
const CHIPS_PER_DAY = 2;

/**
 * ปฏิทินกิจกรรมของผู้ดูแลระบบ
 *
 * ต่างจากปฏิทินฝั่งผู้จัด (components/organizer/OrganizerCalendar.tsx) สามอย่าง:
 * เห็นกิจกรรมของผู้จัดทุกคน, ระบายสีตามหมวดหมู่แทนสถานะ (ผู้ดูแลมองภาพรวมว่าช่วงนี้
 * มีกิจกรรมด้านไหนกระจุกกัน), และลากกิจกรรมข้ามวันเพื่อเลื่อนกำหนดการได้
 *
 * การจัดวาง: ตารางใหญ่กินสองในสามทางซ้าย แถบข้างหนึ่งในสามทางขวา ประกอบด้วย
 * การ์ดวันที่เลือก (ปิดได้) และรายการกิจกรรมที่กำลังจะถึงแบบเลื่อนดูได้
 *
 * คณิตศาสตร์วันทั้งหมดใช้ lib/calendarMath.ts ร่วมกับปฏิทินอีกสองหน้า และคีย์วัน
 * คำนวณจากเซิร์ฟเวอร์ตามเวลาไทยมาแล้ว ฝั่งนี้จึงไม่ต้องแตะ timezone เลย
 *
 * การลากวางเป็นทางลัดสำหรับเมาส์เท่านั้น — คนที่ใช้คีย์บอร์ดหรือหน้าจอสัมผัสยังเลื่อนวัน
 * ได้จากฟอร์มแก้ไขกิจกรรมตามปกติ ปฏิทินนี้จึงไม่ใช่ทางเดียวที่ทำสิ่งนี้ได้
 */
export function AdminCalendar({
  items,
  todayKey,
}: {
  items: AdminCalendarItem[];
  todayKey: string;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();

  const [view, setView] = useState<ViewKey>('month');
  const [cursor, setCursor] = useState(todayKey);
  /** null = ปิดการ์ดวันที่เลือกไปแล้ว แถบข้างจะเหลือแค่รายการที่กำลังจะถึง */
  const [selected, setSelected] = useState<string | null>(todayKey);
  const [category, setCategory] = useState('');
  const [organizer, setOrganizer] = useState('');

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ item: AdminCalendarItem; day: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* ── ตัวเลือกในกล่องกรอง — สร้างจากข้อมูลจริงที่มี ไม่ใช่รายการตายตัว ── */
  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; labelEn: string; color: string }>();
    for (const it of items) {
      if (!seen.has(it.categoryId)) {
        seen.set(it.categoryId, {
          id: it.categoryId,
          label: it.categoryLabel,
          labelEn: it.categoryLabelEn,
          color: it.categoryColor,
        });
      }
    }
    return [...seen.values()];
  }, [items]);

  const organizers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) if (!seen.has(it.organizerId)) seen.set(it.organizerId, it.organizerName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter(
        (it) => (!category || it.categoryId === category) && (!organizer || it.organizerId === organizer),
      ),
    [items, category, organizer],
  );

  /** กระจายกิจกรรมลงทุกวันที่คาบเกี่ยว เพื่อให้กิจกรรมข้ามวันโผล่ครบทุกช่อง */
  const byDay = useMemo(() => {
    const map = new Map<string, AdminCalendarItem[]>();
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

  /** กิจกรรมที่กำลังจะถึง — นับจากวันนี้ ไม่ใช่จากเดือนที่กำลังเปิดดู */
  const upcoming = useMemo(
    () =>
      visible
        .filter((it) => it.endDay >= todayKey && it.status !== 'cancelled')
        .sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))
        .slice(0, 12),
    [visible, todayKey],
  );

  const selectedItems = selected ? (byDay.get(selected) ?? []) : [];
  const step = (dir: 1 | -1) =>
    setCursor((c) => (view === 'week' ? addDays(c, dir * 7) : addMonths(c, dir)));

  const heading =
    view === 'week'
      ? `${fullDayLabel(startOfWeek(cursor), isEn)} – ${fullDayLabel(addDays(startOfWeek(cursor), 6), isEn)}`
      : monthLabel(firstOfMonth(cursor), isEn);

  async function applyMove() {
    if (!pendingMove) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await adminContentApi.rescheduleActivity(pendingMove.item.id, pendingMove.day);
      setNotice(
        res.moved
          ? `${t('เลื่อนกิจกรรมแล้ว')}${res.notified ? ` · ${t('แจ้งผู้ลงทะเบียน')} ${res.notified} ${t('คน')}` : ''}`
          : t('วันเดิมอยู่แล้ว ไม่มีอะไรเปลี่ยน'),
      );
      setPendingMove(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setPendingMove(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18, animation: 'nuFadeUp .3s ease' }}>
      {/* ── หัวเรื่อง + การเลื่อนเดือน ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
            {t('ปฏิทินกิจกรรม')}
          </div>
          <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
            {t('กิจกรรมของผู้จัดทุกคน ระบายสีตามหมวดหมู่ · ลากกิจกรรมไปวางในวันอื่นเพื่อเลื่อนกำหนดการ')}
          </div>
        </div>

        <div
          style={{
            ...glass(16),
            marginInlineStart: 'auto',
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <IconButton icon="chevron_left" label={t('ก่อนหน้า')} onClick={() => step(-1)} />
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: COLOR.ink,
              minWidth: view === 'week' ? 230 : 150,
              textAlign: 'center',
            }}
          >
            {heading}
          </div>
          <IconButton icon="chevron_right" label={t('ถัดไป')} onClick={() => step(1)} />
          <Button
            variant="secondary"
            icon="today"
            onClick={() => {
              setCursor(todayKey);
              setSelected(todayKey);
            }}
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            {t('วันนี้')}
          </Button>
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      {/* ── มุมมอง ตัวกรอง และปุ่มสร้าง ── */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tabs
          items={[
            { key: 'month' as ViewKey, label: t('รายเดือน') },
            { key: 'week' as ViewKey, label: t('รายสัปดาห์') },
          ]}
          value={view}
          onChange={setView}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('กรองตามหมวดหมู่')}
          style={selectStyle}
        >
          <option value="">{t('ทุกหมวดหมู่')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {isEn && c.labelEn ? c.labelEn : c.label}
            </option>
          ))}
        </select>

        <select
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          aria-label={t('กรองตามผู้จัด')}
          style={selectStyle}
        >
          <option value="">{t('ผู้จัดทุกคน')}</option>
          {organizers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {category || organizer ? (
          <Button
            variant="secondary"
            icon="close"
            onClick={() => {
              setCategory('');
              setOrganizer('');
            }}
            style={{ padding: '8px 13px', fontSize: 12.5 }}
          >
            {t('ล้างตัวกรอง')}
          </Button>
        ) : null}

        <span style={{ fontSize: 12.5, color: COLOR.hint }}>
          {`${t('แสดง')} ${visible.length} ${t('จาก')} ${items.length} ${t('รายการ')}`}
        </span>

        <Link href="/organizer/activities/new" style={{ marginInlineStart: 'auto' }}>
          <Button variant="primary" icon="add">
            {t('สร้างกิจกรรม')}
          </Button>
        </Link>
      </div>

      {/* ── ตารางใหญ่ (ซ้าย 2/3) + แถบข้าง (ขวา 1/3) ── */}
      <div
        className="nuv-admin-cal"
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, alignItems: 'start' }}
      >
        <div style={{ ...glass(22), padding: 18, minWidth: 0, overflowX: 'auto' }}>
          {/* 420px คือจุดที่เลขวันกับป้ายจำนวนยังอ่านออก แคบกว่านี้ค่อยให้เลื่อนแนวนอน */}
          <div style={{ minWidth: 420 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 12 }}>
              {(isEn ? DOW_EN : DOW_TH).map((d, i) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: i === 0 || i === 6 ? '#C2410C' : COLOR.label,
                    paddingBottom: 6,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
              {gridDays.map((day) => {
                const list = byDay.get(day) ?? [];
                const inMonth = view === 'week' || sameMonth(day, cursor);
                const isToday = day === todayKey;
                const isSelected = day === selected;
                const isDrop = dropTarget === day;
                const hidden = list.length - CHIPS_PER_DAY;

                return (
                  <div
                    key={day}
                    className="nuv-cal-day"
                    onClick={() => setSelected(day)}
                    onDragOver={(e) => {
                      // ต้อง preventDefault ใน dragOver ไม่งั้นเบราว์เซอร์จะไม่ยอมให้ปล่อย
                      if (!dragging) return;
                      e.preventDefault();
                      setDropTarget(day);
                    }}
                    onDragLeave={() => setDropTarget((d) => (d === day ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropTarget(null);
                      const id = e.dataTransfer.getData('text/plain') || dragging;
                      setDragging(null);
                      const item = items.find((x) => x.id === id);
                      if (item && item.day !== day) setPendingMove({ item, day });
                    }}
                    style={{
                      minHeight: view === 'week' ? 260 : 150,
                      /* ช่องใน grid มี min-width:auto เป็นค่าเริ่มต้น ซึ่งเท่ากับความกว้าง
                         ของเนื้อหาที่แคบที่สุดได้ — แท่งกิจกรรมตั้ง white-space:nowrap ไว้
                         ความกว้างขั้นต่ำจึงกลายเป็นความยาวชื่อกิจกรรมเต็ม ๆ แล้วดันตารางจน
                         ล้นออกไปทางขวา ต้องสั่ง 0 เพื่อให้ช่องหดได้จริงและตัดชื่อด้วย ellipsis */
                      minWidth: 0,
                      padding: 14,
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: isDrop
                        ? 'rgba(167,116,247,.2)'
                        : isSelected
                          ? 'rgba(167,116,247,.11)'
                          : inMonth
                            ? 'rgba(255,255,255,.72)'
                            : 'rgba(255,255,255,.3)',
                      border: isDrop
                        ? '2px dashed #A774F7'
                        : isToday
                          ? '2px solid #A774F7'
                          : '1px solid rgba(31,41,55,.09)',
                      opacity: inMonth ? 1 : 0.45,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: isToday ? '#7C2FD9' : inMonth ? COLOR.ink : COLOR.hint,
                        }}
                      >
                        {dayNum(day)}
                      </span>
                      {/* จำนวนกิจกรรมในวันนั้น — เห็นความหนาแน่นได้โดยไม่ต้องนับแท่งเอง */}
                      {list.length ? (
                        <span
                          style={{
                            marginInlineStart: 'auto',
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#7C2FD9',
                            background: 'rgba(167,116,247,.16)',
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          {list.length}
                        </span>
                      ) : null}
                    </div>

                    {list.slice(0, CHIPS_PER_DAY).map((it) => (
                      <div
                        key={`${day}-${it.id}`}
                        className="nuv-cal-chip"
                        draggable={it.status !== 'cancelled'}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', it.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDragging(it.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                        title={`${it.title} · ${it.time}${it.location ? ` · ${it.location}` : ''}`}
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          padding: '6px 10px',
                          borderRadius: 7,
                          background: `${it.categoryColor}2E`,
                          color: COLOR.ink,
                          borderInlineStart: `3px solid ${it.categoryColor}`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: it.status === 'cancelled' ? 'default' : 'grab',
                          opacity: dragging === it.id ? 0.4 : it.status === 'cancelled' ? 0.55 : 1,
                          textDecoration: it.status === 'cancelled' ? 'line-through' : 'none',
                        }}
                      >
                        {it.title}
                      </div>
                    ))}

                    {hidden > 0 ? (
                      <button
                        type="button"
                        className="nuv-cal-more"
                        onClick={(e) => {
                          // กัน onClick ของช่องวันไม่ให้ทำงานซ้ำ แล้วพาไปดูครบในแถบข้าง
                          e.stopPropagation();
                          setSelected(day);
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          textAlign: 'start',
                          fontFamily: 'inherit',
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#7C2FD9',
                          cursor: 'pointer',
                        }}
                      >
                        {`+${hidden} ${t('รายการ')}`}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* ── คำอธิบายสี ── */}
            {categories.length ? (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(31,41,55,.09)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.label, marginBottom: 11 }}>
                  {t('สัญลักษณ์สี')}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
                    gap: 9,
                  }}
                >
                  {categories.map((c) => (
                    <span
                      key={c.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLOR.body, minWidth: 0 }}
                    >
                      <span
                        style={{ width: 12, height: 12, borderRadius: 4, background: c.color, flexShrink: 0 }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isEn && c.labelEn ? c.labelEn : c.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── แถบข้างทางขวา ── */}
        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          {/* การ์ดวันที่เลือก — ปิดได้ กดวันในตารางแล้วกลับมาใหม่ */}
          {selected ? (
            <div style={{ ...glass(20), padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink, lineHeight: 1.55, minWidth: 0 }}>
                  {fullDayLabel(selected, isEn)}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  title={t('ปิด')}
                  aria-label={t('ปิด')}
                  className="nuv-iconbtn"
                  style={{
                    marginInlineStart: 'auto',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    border: 'none',
                    background: 'transparent',
                    color: COLOR.hint,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>

              {selectedItems.length ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 9 }}>
                  {selectedItems.map((it) => (
                    <DayItem key={it.id} item={it} t={t} />
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 12.5, color: COLOR.hint, lineHeight: 1.8, paddingBottom: 4 }}>
                  {t('ไม่มีกิจกรรมในวันนี้')}
                </div>
              )}

              <Link href="/organizer/activities/new" style={{ display: 'block', marginTop: 14 }}>
                <Button variant="primary" icon="add" full>
                  {t('เพิ่มกิจกรรม')}
                </Button>
              </Link>
            </div>
          ) : null}

          {/* รายการกิจกรรมที่กำลังจะถึง */}
          <div style={{ ...glass(20), padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="upcoming" size={18} style={{ color: COLOR.hint }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>
                {t('กิจกรรมที่กำลังจะถึง')}
              </span>
            </div>

            {upcoming.length ? (
              <>
                {/* จำกัดความสูงแล้วให้เลื่อนในกล่อง แถบข้างจะได้ไม่ยาวกว่าตารางไปมาก */}
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: 9,
                    maxHeight: 560,
                    overflowY: 'auto',
                  }}
                >
                  {upcoming.map((it) => (
                    <DayItem key={it.id} item={it} t={t} showDate />
                  ))}
                </ul>

                <Link
                  href="/admin/activities"
                  style={{
                    display: 'block',
                    marginTop: 13,
                    textAlign: 'center',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#7C2FD9',
                    textDecoration: 'none',
                  }}
                >
                  {`${t('ดูทั้งหมด')} →`}
                </Link>
              </>
            ) : (
              <EmptyState icon="event_available" title={t('ไม่มีกิจกรรมที่กำลังจะถึง')} />
            )}
          </div>
        </div>
      </div>

      {pendingMove ? (
        <ConfirmDialog
          icon="event_repeat"
          tone="warning"
          title={t('เลื่อนกิจกรรมไปวันนี้?')}
          body={`${pendingMove.item.title}\n${pendingMove.item.day} → ${pendingMove.day} · ${t(
            'เวลาและความยาวกิจกรรมคงเดิม ช่วงรับสมัครเลื่อนตาม และระบบจะแจ้งผู้ที่ลงทะเบียนไว้แล้ว',
          )}`}
          confirmLabel={t('เลื่อนวัน')}
          busy={busy}
          onCancel={() => setPendingMove(null)}
          onConfirm={applyMove}
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ชิ้นส่วนย่อย ───────────────── */

const selectStyle: React.CSSProperties = {
  padding: '9px 13px',
  borderRadius: 12,
  border: '1px solid rgba(31,41,55,.12)',
  background: 'rgba(255,255,255,.7)',
  color: COLOR.ink,
  fontSize: 12.5,
  fontFamily: 'inherit',
  cursor: 'pointer',
  minWidth: 160,
};

function DayItem({
  item: it,
  t,
  showDate = false,
}: {
  item: AdminCalendarItem;
  t: (th: string) => string;
  showDate?: boolean;
}) {
  const meta = ACTIVITY_STATUS_META[it.status] ?? ACTIVITY_STATUS_META.draft;

  return (
    <li>
      <Link
        href={`/activities/${it.id}`}
        className="nuv-row"
        style={{
          display: 'block',
          padding: 12,
          borderRadius: 12,
          textDecoration: 'none',
          borderInlineStart: `3px solid ${it.categoryColor}`,
          background: 'rgba(255,255,255,.6)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{it.title}</div>
        <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 4, lineHeight: 1.7 }}>
          {showDate ? `${it.day} · ` : ''}
          {it.time}
          {it.location ? ` · ${it.location}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
          <Badge tone={meta.tone} label={t(meta.label)} />
          <span style={{ fontSize: 11, color: COLOR.hint }}>
            {it.seatsTotal > 0 ? `${it.seatsFilled}/${it.seatsTotal} ${t('ที่นั่ง')}` : `${it.seatsFilled} ${t('คน')}`}
          </span>
          {it.pending > 0 ? (
            <span style={{ fontSize: 11, color: '#B45309' }}>{`${t('รออนุมัติ')} ${it.pending}`}</span>
          ) : null}
        </div>
        <div style={{ fontSize: 10.5, color: COLOR.hint, marginTop: 5 }}>{it.organizerName}</div>
      </Link>
    </li>
  );
}
