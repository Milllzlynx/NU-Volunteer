'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, SuccessNote, Tabs, inputStyle } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useApp } from '@/components/providers/AppProviders';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { adminContentApi, errorMessage, organizerApi } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

export type AdminActivityRow = {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  categoryLabelEn: string;
  categoryColor: string;
  organizerName: string;
  orgName: string;
  status: string;
  startIso: string;
  dateTh: string;
  dateEn: string;
  endDateTh: string | null;
  endDateEn: string | null;
  time: string;
  location: string;
  hours: number;
  seatsTotal: number;
  seatsFilled: number;
  pending: number;
  past: boolean;
};

const CRLF = '\r\n';

/**
 * สถานะที่ตั้งได้จากแถบทำทีเดียวหลายรายการ
 *
 * ตรงกับ ACTIVITY_STATUSES ใน lib/organizer.ts ซึ่งเป็นชุดที่ปลายทางยอมรับ
 * ไม่รวม "done" เพราะระบบเป็นผู้ตั้งให้เองเมื่อกิจกรรมจบ ไม่ใช่สิ่งที่คนกดตั้งย้อนหลัง
 */
type TabKey = 'all' | 'draft' | 'open' | 'closed' | 'done' | 'cancelled' | 'past';

/**
 * จัดการกิจกรรมทั้งระบบ
 *
 * ต่างจาก /organizer/activities ตรงที่เห็นกิจกรรมของผู้จัดทุกคน มีคอลัมน์ผู้จัด
 * และทำทีเดียวหลายรายการได้ ส่วนการ "แก้ไข" ใช้ฟอร์มเดิมของฝั่งผู้จัด
 * (/organizer/activities/[id]) ซึ่งรับแอดมินอยู่แล้ว — ไม่ทำฟอร์มที่สองขึ้นมาให้ต้องดูแลคู่กัน
 *
 * ข้อมูลมาครบตั้งแต่เรนเดอร์ฝั่งเซิร์ฟเวอร์ การกรองทั้งหมดจึงทำในหน่วยความจำ
 * ระบบนี้มีกิจกรรมหลักสิบถึงหลักร้อยรายการ ไม่ใช่หลักแสน
 */
export function AdminActivities({ rows }: { rows: AdminActivityRow[] }) {
  const { t, isEn } = useApp();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminActivityRow | null>(null);

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; labelEn: string }>();
    for (const r of rows) {
      if (!seen.has(r.categoryId)) {
        seen.set(r.categoryId, { id: r.categoryId, label: r.categoryLabel, labelEn: r.categoryLabelEn });
      }
    }
    return [...seen.values()];
  }, [rows]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((r) => r.status === 'draft').length,
      open: rows.filter((r) => r.status === 'open').length,
      closed: rows.filter((r) => r.status === 'closed').length,
      done: rows.filter((r) => r.status === 'done').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      past: rows.filter((r) => r.past).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'past' ? !r.past : tab !== 'all' && r.status !== tab) return false;
      if (category && r.categoryId !== category) return false;
      // เทียบเป็นข้อความ YYYY-MM-DD ได้ตรง ๆ เพราะรูปแบบนี้เรียงตามเวลาอยู่แล้ว
      if (from && r.startIso < from) return false;
      if (to && r.startIso > to) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.organizerName.toLowerCase().includes(q) ||
        r.orgName.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query, category, from, to]);

  /** เลือกไว้แต่ถูกกรองออกไปแล้วต้องไม่ถูกนับ — ไม่งั้นกดทำทีเดียวจะโดนของที่มองไม่เห็น */
  const pickedVisible = useMemo(
    () => visible.filter((r) => picked.has(r.id)).map((r) => r.id),
    [visible, picked],
  );
  const allPicked = visible.length > 0 && pickedVisible.length === visible.length;

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(status: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await adminContentApi.bulkActivityStatus(pickedVisible, status);
      setNotice(`${t('เปลี่ยนสถานะแล้ว')} ${res.updated} ${t('รายการ')}`);
      setPicked(new Set());
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AdminActivityRow) {
    setBusy(true);
    setError(null);
    try {
      await organizerApi.deleteActivity(row.id);
      setNotice(`${t('ลบกิจกรรมแล้ว')}: ${row.title}`);
      setConfirmDelete(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const head = [
      t('ชื่อกิจกรรม'), t('หมวดหมู่'), t('ผู้จัด'), t('หน่วยงาน'), t('สถานะ'),
      t('วันที่'), t('เวลา'), t('สถานที่'), t('ชั่วโมง'), t('ที่นั่งที่ลงแล้ว'), t('ที่นั่งทั้งหมด'), t('รออนุมัติ'),
    ];
    const lines = visible.map((r) =>
      [
        r.title, r.categoryLabel, r.organizerName, r.orgName,
        t(ACTIVITY_STATUS_META[r.status]?.label ?? r.status),
        isEn ? r.dateEn : r.dateTh, r.time, r.location,
        r.hours, r.seatsFilled, r.seatsTotal, r.pending,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = '﻿' + [head.map((h) => `"${h}"`).join(','), ...lines].join(CRLF);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `nuv-activities-${tab}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  }

  /* แท็บ "เลยวันไปแล้ว" กรองตามวันที่ ส่วนแท็บอื่นกรองตามสถานะ — คนละแกนกัน
     กิจกรรมที่เลยวันแล้วอาจยังมีสถานะ open อยู่ก็ได้ ถ้าผู้จัดยังไม่ได้ปิด */
  const tabItems: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: t('ทั้งหมด'), count: counts.all },
    { key: 'draft', label: t('ฉบับร่าง'), count: counts.draft },
    { key: 'open', label: t('เปิดรับสมัคร'), count: counts.open },
    { key: 'closed', label: t('ปิดรับสมัคร'), count: counts.closed },
    { key: 'done', label: t('จบแล้ว'), count: counts.done },
    { key: 'cancelled', label: t('ยกเลิกแล้ว'), count: counts.cancelled },
    { key: 'past', label: t('เลยวันไปแล้ว'), count: counts.past },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('กิจกรรมทั้งหมด')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('กิจกรรมของผู้จัดทุกคนในระบบ')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      <Tabs items={tabItems} value={tab} onChange={setTab} />

      {/* ── ตัวกรอง ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ค้นหาชื่อกิจกรรม สถานที่ หรือผู้จัด...')}
          aria-label={t('ค้นหาชื่อกิจกรรม สถานที่ หรือผู้จัด...')}
          style={{ ...inputStyle(false), flex: 1, minWidth: 200 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('หมวดหมู่')}
          style={{ ...inputStyle(false), width: 'auto', minWidth: 160 }}
        >
          <option value="">{t('ทุกหมวดหมู่')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {isEn && c.labelEn ? c.labelEn : c.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* ช่องวันที่ของเบราว์เซอร์เรียงวัน-เดือนตามภาษาของเครื่องผู้ใช้ เครื่อง en-US จึงเห็น
            mm/dd/yyyy — DateTimeField บังคับให้เป็น วัน/เดือน/ปี เหมือนกันทุกเครื่อง
            ค่าที่ส่งออกยังเป็น "YYYY-MM-DD" เท่าเดิม ตัวกรองด้านบนจึงไม่ต้องแก้ */}
        <DateRangeField
          label={t('ตั้งแต่')}
          ariaLabel={t('กรองตั้งแต่วันที่ (วัน/เดือน/ปี)')}
          value={from}
          onChange={setFrom}
        />
        <DateRangeField
          label={t('ถึง')}
          ariaLabel={t('กรองถึงวันที่ (วัน/เดือน/ปี)')}
          value={to}
          onChange={setTo}
        />
        {/* ช่องวันที่สูงขึ้นเพราะมีชื่อช่องด้านบนกับบรรทัดบอกรูปแบบด้านล่าง
            เยื้องปุ่มลงมาให้อยู่ระดับเดียวกับตัวช่องกรอก ไม่ใช่ระดับชื่อช่อง */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, paddingTop: 22 }}>
          {from || to ? (
            <Button variant="secondary" icon="close" onClick={() => { setFrom(''); setTo(''); }} style={{ padding: '8px 13px', fontSize: 12.5 }}>
              {t('ล้างช่วงวันที่')}
            </Button>
          ) : null}
          <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!visible.length} style={{ marginInlineStart: 'auto' }}>
            {t('ส่งออก CSV')}
          </Button>
        </div>
      </div>

      {/* ── แถบทำทีเดียวหลายรายการ ── */}
      {pickedVisible.length ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            flexWrap: 'wrap',
            padding: '12px 15px',
            borderRadius: 15,
            background: 'rgba(167,116,247,.14)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#7C2FD9' }}>
            {`${t('เลือกไว้')} ${pickedVisible.length} ${t('รายการ')}`}
          </span>
          <Button variant="secondary" icon="how_to_reg" disabled={busy} onClick={() => bulk('open')} style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {t('เปิดรับสมัคร')}
          </Button>
          <Button variant="secondary" icon="lock_clock" disabled={busy} onClick={() => bulk('closed')} style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {t('ปิดรับสมัคร')}
          </Button>
          <Button variant="secondary" icon="block" disabled={busy} onClick={() => bulk('cancelled')} style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {t('ยกเลิก')}
          </Button>
          <Button variant="secondary" icon="close" disabled={busy} onClick={() => setPicked(new Set())} style={{ padding: '8px 14px', fontSize: 12.5, marginInlineStart: 'auto' }}>
            {t('ล้างที่เลือก')}
          </Button>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLOR.hint }}>
        {visible.length ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allPicked}
              onChange={() => setPicked(allPicked ? new Set() : new Set(visible.map((r) => r.id)))}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
            {t('เลือกทั้งหมดที่แสดงอยู่')}
          </label>
        ) : null}
        <span style={{ marginInlineStart: 'auto' }}>
          {`${t('แสดง')} ${visible.length} ${t('จาก')} ${rows.length} ${t('รายการ')}`}
        </span>
      </div>

      {/* ── รายการ ── */}
      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState icon="event_busy" title={t('ไม่พบกิจกรรมที่ตรงกับเงื่อนไข')} desc={t('ลองเปลี่ยนแท็บ คำค้น หมวดหมู่ หรือช่วงวันที่')} />
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {visible.map((r) => {
            const meta = ACTIVITY_STATUS_META[r.status] ?? ACTIVITY_STATUS_META.draft;
            const on = picked.has(r.id);
            return (
              <li
                key={r.id}
                style={{
                  ...glass(18),
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                  outline: on ? '2px solid rgba(167,116,247,.55)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(r.id)}
                    aria-label={`${t('เลือก')} ${r.title}`}
                    style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer', flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 190 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Link
                        href={`/activities/${r.id}`}
                        style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink, textDecoration: 'none' }}
                      >
                        {r.title}
                      </Link>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          background: `${r.categoryColor}26`,
                          color: r.categoryColor,
                        }}
                      >
                        {isEn && r.categoryLabelEn ? r.categoryLabelEn : r.categoryLabel}
                      </span>
                      <Badge tone={meta.tone} label={t(meta.label)} />
                      {r.pending > 0 ? (
                        <Badge tone="warning" icon="hourglass_top" label={`${t('รออนุมัติ')} ${r.pending}`} />
                      ) : null}
                    </div>

                    <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 5, lineHeight: 1.8 }}>
                      {`${isEn ? r.dateEn : r.dateTh}${
                        (isEn ? r.endDateEn : r.endDateTh) ? ` - ${isEn ? r.endDateEn : r.endDateTh}` : ''
                      } · ${r.time}`}
                      {r.location ? ` · ${r.location}` : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 2, lineHeight: 1.8 }}>
                      {`${r.organizerName}${r.orgName ? ` · ${r.orgName}` : ''}`}
                    </div>
                  </div>

                  {/* สถิติย่อของกิจกรรมนี้ */}
                  <div style={{ display: 'grid', gap: 3, textAlign: 'end', flexShrink: 0, fontSize: 11.5, color: COLOR.hint }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink }}>
                      {r.seatsTotal > 0 ? `${r.seatsFilled}/${r.seatsTotal}` : r.seatsFilled}
                    </span>
                    <span>{t('ที่นั่ง')}</span>
                    <span>{`${r.hours} ${t('ชม.')}`}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid rgba(31,41,55,.08)' }}>
                  <Link href={`/activities/${r.id}`}>
                    <Button variant="secondary" icon="visibility" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                      {t('ดู')}
                    </Button>
                  </Link>
                  <Link href={`/organizer/activities/${r.id}`}>
                    <Button variant="secondary" icon="edit" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                      {t('แก้ไข')}
                    </Button>
                  </Link>
                  <Link href={`/activities/${r.id}/participants`}>
                    <Button variant="secondary" icon="groups" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                      {t('ผู้เข้าร่วม')}
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    icon="delete"
                    disabled={busy}
                    onClick={() => setConfirmDelete(r)}
                    style={{ padding: '8px 14px', fontSize: 12.5, marginInlineStart: 'auto' }}
                  >
                    {t('ลบ')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบกิจกรรมนี้?')}
          body={`${confirmDelete.title} — ${
            confirmDelete.seatsFilled > 0
              ? `${t('มีผู้ลงทะเบียนไว้แล้ว')} ${confirmDelete.seatsFilled} ${t('คน')} ${t('การลบย้อนกลับไม่ได้')}`
              : t('การลบย้อนกลับไม่ได้')
          }`}
          confirmLabel={t('ลบ')}
          busy={busy}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      ) : null}
    </div>
  );
}

/**
 * ช่องวันที่หนึ่งข้างของตัวกรองช่วงวันที่
 *
 * ชื่อช่องอยู่เหนือช่องกรอก ไม่ใช่ข้าง ๆ เหมือนเดิม เพราะ DateTimeField มีบรรทัด
 * บอกรูปแบบวันที่อยู่ใต้ช่องด้วย ถ้าวางชื่อไว้ข้าง ๆ ชื่อจะลอยไม่ตรงกับอะไรเลย
 *
 * ใช้ <div> ไม่ใช่ <label> เพราะข้างในมีช่องกรอกมากกว่าหนึ่งช่อง (ช่องวันที่กับปุ่มปฏิทิน)
 * ซึ่ง <label> ผูกให้ได้แค่ช่องเดียว — จึงบอกชื่อผ่าน ariaLabel ของ DateTimeField แทน
 */
function DateRangeField({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 5, minWidth: 168 }}>
      <span style={{ fontSize: 12, color: COLOR.label }}>{label}</span>
      <DateTimeField value={value} onChange={onChange} ariaLabel={ariaLabel} />
    </div>
  );
}
