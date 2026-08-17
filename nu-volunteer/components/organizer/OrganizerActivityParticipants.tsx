'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Icon,
  SuccessNote,
  Tabs,
  Timestamp,
  inputStyle,
} from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ModalShell } from '@/components/activity/ModalShell';
import { ParticipantsTable } from '@/components/organizer/ParticipantsTable';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, EVIDENCE_STATUS, REG_STATUS, glass } from '@/lib/design';

export type ParticipantRow = {
  id: string;
  name: string;
  /** null = นิสิตปิดการแชร์ข้อมูลติดต่อไว้ */
  email: string | null;
  studentId: string;
  faculty: string;
  avatarUrl: string | null;
  status: string;
  regAtMs: number;
  /** null = ยังไม่ได้เช็กอิน/เช็กเอาต์ */
  checkedInAtMs: number | null;
  checkedOutAtMs: number | null;
  hoursAwarded: number;
  /** หลักฐานใบล่าสุดที่นิสิตส่งมา — null = ยังไม่ได้ส่ง */
  evidence: {
    id: string;
    fileUrl: string;
    fileName: string;
    note: string;
    status: string;
    reviewNote: string | null;
  } | null;
};

export type ActivityHeader = {
  id: string;
  title: string;
  startAtMs: number;
  seatsTotal: number;
};

type TabKey = 'all' | 'pending' | 'approved' | 'rejected';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รออนุมัติ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ไม่อนุมัติ' },
];

/** สถานะที่ผ่านการอนุมัติมาแล้วทั้งหมด — เช็กอิน/เช็กเอาต์/เสร็จสิ้น ล้วนนับรวม */
const APPROVED_LIKE = ['approved', 'checked-in', 'checked-out', 'completed'];

type SortKey = 'recent' | 'name' | 'status';

export function OrganizerActivityParticipants({
  activity,
  rows,
}: {
  activity: ActivityHeader;
  rows: ParticipantRow[];
}) {
  const { t } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ ids: string[]; single?: ParticipantRow } | null>(null);
  const [reason, setReason] = useState('');
  /** แถวที่กดดูรายละเอียด — ตารางแสดงได้จำกัด ที่เหลือมาอยู่ในกล่องนี้ */
  const [details, setDetails] = useState<ParticipantRow | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => APPROVED_LIKE.includes(r.status)).length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (tab === 'pending' && r.status !== 'pending') return false;
      if (tab === 'approved' && !APPROVED_LIKE.includes(r.status)) return false;
      if (tab === 'rejected' && r.status !== 'rejected') return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'th');
      if (sort === 'status') return a.status.localeCompare(b.status);
      return b.regAtMs - a.regAtMs;
    });
  }, [rows, tab, query, sort]);

  /** เลือกได้เฉพาะใบที่ยังรออนุมัติ — ใบที่พิจารณาไปแล้วกดหมู่ก็ไม่เกิดอะไร */
  const selectableIds = useMemo(
    () => visible.filter((r) => r.status === 'pending').map((r) => r.id),
    [visible],
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set([...prev, ...selectableIds])));
  }

  async function runBulk(action: 'approve' | 'reject', ids: string[], why?: string) {
    setBusy('bulk');
    setError(null);
    setNote(null);
    try {
      const res = await organizerApi.bulkDecideRegistrations(ids, action, why);
      setSelected(new Set());
      setRejecting(null);
      setReason('');
      setNote(
        res.skipped > 0
          ? `${t('ดำเนินการแล้ว')} ${res.done} ${t('รายการ')} · ${t('ข้าม')} ${res.skipped} ${t('รายการ')} (${t('ที่นั่งเต็มหรือพิจารณาไปแล้ว')})`
          : `${t('ดำเนินการแล้ว')} ${res.done} ${t('รายการ')}`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /**
   * เช็กอิน/เช็กเอาต์แทนนิสิต — ใช้เมื่อสแกน QR หน้างานไม่สำเร็จ
   * เซิร์ฟเวอร์เป็นคนตัดสินว่าสถานะปัจจุบันทำแบบนี้ได้ไหม ที่นี่แค่ส่งคำสั่งกับแสดงผลลัพธ์
   */
  async function checkin(row: ParticipantRow, kind: 'in' | 'out') {
    setBusy(row.id);
    setError(null);
    setNote(null);
    try {
      await organizerApi.manualCheckin(row.id, kind);
      setNote(
        kind === 'in'
          ? `${t('เช็กอินให้')} ${row.name} ${t('เรียบร้อยแล้ว')}`
          : `${t('เช็กเอาต์ให้')} ${row.name} ${t('เรียบร้อยแล้ว')}`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /** ตรวจหลักฐานที่นิสิตอัปโหลด — ไม่ผ่านต้องมีเหตุผลติดไปด้วยเสมอ ฝั่งเซิร์ฟเวอร์บังคับไว้ */
  async function reviewEvidence(row: ParticipantRow, status: 'approved' | 'rejected') {
    if (!row.evidence) return;
    setBusy(row.id);
    setError(null);
    setNote(null);
    try {
      await organizerApi.reviewEvidence(
        row.evidence.id,
        status,
        status === 'rejected' ? t('หลักฐานไม่ชัดเจน กรุณาอัปโหลดใหม่') : undefined,
      );
      setDetails(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function decideOne(row: ParticipantRow, action: 'approve' | 'reject', why?: string) {
    setBusy(row.id);
    setError(null);
    setNote(null);
    try {
      await organizerApi.decideRegistration(row.id, action, why);
      setRejecting(null);
      setReason('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /** ส่งออกเฉพาะรายการที่กรองอยู่ตอนนี้ — BOM เพื่อให้ Excel อ่านภาษาไทยถูก */
  function exportCsv() {
    const head = [
      'ชื่อ',
      'อีเมล',
      'รหัสนิสิต',
      'คณะ',
      'วันลงทะเบียน',
      'สถานะ',
      'เช็กอิน',
      'เช็กเอาต์',
      'ชั่วโมงที่รับรอง',
    ];
    const lines = visible.map((r) =>
      [
        r.name,
        r.email ?? 'ไม่เปิดเผย',
        r.studentId,
        r.faculty,
        new Date(r.regAtMs).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }),
        t(REG_STATUS[r.status]?.label ?? r.status),
        clockTime(r.checkedInAtMs),
        clockTime(r.checkedOutAtMs),
        r.hoursAwarded,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    );

    const blob = new Blob([`﻿${[head.join(','), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuv-participants-${activity.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {rejecting ? (
        <ModalShell
          icon="close"
          title={rejecting.single ? t('ไม่อนุมัติการลงทะเบียน') : t('ไม่อนุมัติหลายรายการ')}
          onClose={() => {
            setRejecting(null);
            setReason('');
          }}
          footer={
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setRejecting(null);
                  setReason('');
                }}
                disabled={busy != null}
              >
                {t('ย้อนกลับ')}
              </Button>
              <Button
                variant="danger"
                icon="close"
                loading={busy != null}
                disabled={!reason.trim()}
                onClick={() =>
                  rejecting.single
                    ? decideOne(rejecting.single, 'reject', reason.trim())
                    : runBulk('reject', rejecting.ids, reason.trim())
                }
              >
                {t('ยืนยันไม่อนุมัติ')}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 11 }}>
            <div style={{ fontSize: 13, color: COLOR.label, lineHeight: 1.8 }}>
              {rejecting.single
                ? rejecting.single.name
                : `${t('เลือกไว้')} ${rejecting.ids.length} ${t('รายการ')}`}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              autoFocus
              placeholder={t('เหตุผล เช่น คุณสมบัติไม่ตรงกับที่กิจกรรมกำหนด')}
              aria-label={t('เหตุผลที่ไม่อนุมัติ')}
              style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11.5, color: COLOR.hint }}>
              {t('นิสิตทุกคนที่เลือกไว้จะเห็นเหตุผลนี้ในการแจ้งเตือน')}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {details ? (
        <ModalShell
          icon="badge"
          title={details.name}
          onClose={() => setDetails(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDetails(null)}>
                {t('ปิด')}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 11 }}>
            <DetailRow
              icon="badge"
              label={t('รหัสนิสิต')}
              value={details.studentId || t('ไม่มีข้อมูล')}
            />
            {/* อีเมลขึ้นกับการตั้งค่าความเป็นส่วนตัวของนิสิตแต่ละคน */}
            <DetailRow icon="mail" label={t('อีเมล')} value={details.email ?? t('ไม่เปิดเผยอีเมล')} />
            <DetailRow icon="school" label={t('คณะ')} value={details.faculty || t('ไม่มีข้อมูล')} />
            <DetailRow
              icon="how_to_reg"
              label={t('สถานะ')}
              value={t(REG_STATUS[details.status]?.label ?? details.status)}
            />
            <DetailRow
              icon="event_available"
              label={t('วันที่ลงทะเบียน')}
              value={new Date(details.regAtMs).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}
            />
            <DetailRow icon="login" label={t('เช็กอิน')} value={clockTime(details.checkedInAtMs)} />
            <DetailRow icon="logout" label={t('เช็กเอาต์')} value={clockTime(details.checkedOutAtMs)} />
            <DetailRow
              icon="schedule"
              label={t('ชั่วโมงที่รับรอง')}
              value={`${details.hoursAwarded} ${t('ชม.')}`}
            />

            {/* ── หลักฐานการเข้าร่วม ── */}
            <div style={{ borderTop: '1px solid rgba(31,41,55,.1)', paddingTop: 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <Icon name="attach_file" size={18} style={{ color: COLOR.hint }} />
                <span style={{ fontSize: 12.5, color: COLOR.label }}>{t('หลักฐานการเข้าร่วม')}</span>
                {details.evidence ? (
                  <Badge
                    tone={EVIDENCE_STATUS[details.evidence.status]?.tone ?? 'neutral'}
                    label={t(EVIDENCE_STATUS[details.evidence.status]?.label ?? details.evidence.status)}
                  />
                ) : (
                  <span style={{ fontSize: 12.5, color: COLOR.hint }}>{t('ยังไม่ได้ส่งหลักฐาน')}</span>
                )}
              </div>

              {details.evidence ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์อัปโหลดของผู้ใช้ */}
                  <img
                    src={details.evidence.fileUrl}
                    alt={details.evidence.fileName || t('หลักฐานการเข้าร่วม')}
                    style={{ width: '100%', borderRadius: 14, border: '1px solid rgba(31,41,55,.1)' }}
                  />

                  {details.evidence.note ? (
                    <div style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
                      {details.evidence.note}
                    </div>
                  ) : null}

                  {details.evidence.reviewNote ? (
                    <div style={{ fontSize: 11.5, color: COLOR.hint, lineHeight: 1.7 }}>
                      {`${t('บันทึกการตรวจ')}: ${details.evidence.reviewNote}`}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      icon="check"
                      loading={busy === details.id}
                      onClick={() => reviewEvidence(details, 'approved')}
                    >
                      {t('หลักฐานผ่าน')}
                    </Button>
                    <Button
                      variant="danger"
                      icon="close"
                      loading={busy === details.id}
                      onClick={() => reviewEvidence(details, 'rejected')}
                    >
                      {t('หลักฐานไม่ผ่าน')}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* ── หัวเรื่อง ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/organizer/registrations">
          <Button variant="secondary" icon="arrow_back" style={{ padding: '9px 15px' }}>
            {t('กลับ')}
          </Button>
        </Link>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
            {activity.title}
          </h1>
          <Timestamp date={activity.startAtMs} variant="date-with-day" style={{ marginTop: 3 }} />
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {note ? <SuccessNote>{note}</SuccessNote> : null}

      {/* ── ค้นหาและเรียง ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Icon
            name="search"
            size={18}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLOR.hint,
              pointerEvents: 'none',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ค้นหาชื่อ รหัสนิสิต หรืออีเมล...')}
            aria-label={t('ค้นหาผู้เข้าร่วม')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label={t('เรียงตาม')}
          style={{ ...inputStyle(), width: 'auto', minWidth: 170, flexShrink: 0 }}
        >
          <option value="recent">{t('ลงทะเบียนล่าสุด')}</option>
          <option value="name">{t('ชื่อ ก-ฮ')}</option>
          <option value="status">{t('สถานะ')}</option>
        </select>
        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={visible.length === 0}>
          {t('ส่งออก CSV')}
        </Button>
        {/* พิมพ์เฉพาะตาราง — สไตล์สั่งพิมพ์ใน globals.css ตัดแถบข้างกับปุ่มคำสั่งออกให้แล้ว */}
        <Button variant="secondary" icon="print" onClick={() => window.print()} disabled={visible.length === 0}>
          {t('พิมพ์')}
        </Button>
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={tab}
        onChange={(k) => {
          setTab(k);
          setSelected(new Set());
        }}
      />

      {/* ── แถบเลือกหลายรายการ ── */}
      {selectableIds.length > 0 ? (
        <div
          style={{
            ...glass(16),
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={{ width: 17, height: 17, accentColor: '#A774F7', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12.5, color: COLOR.body }}>
              {selected.size > 0
                ? `${t('เลือกไว้')} ${selected.size} ${t('รายการ')}`
                : `${t('เลือกทั้งหมดที่รออนุมัติ')} (${selectableIds.length})`}
            </span>
          </label>

          {selected.size > 0 ? (
            <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                icon="check"
                loading={busy === 'bulk'}
                onClick={() => runBulk('approve', [...selected])}
                style={SMALL_BTN}
              >
                {`${t('อนุมัติ')} ${selected.size}`}
              </Button>
              <Button
                variant="secondary"
                icon="close"
                disabled={busy === 'bulk'}
                onClick={() => setRejecting({ ids: [...selected] })}
                style={SMALL_BTN}
              >
                {`${t('ไม่อนุมัติ')} ${selected.size}`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ fontSize: 12.5, color: COLOR.label }}>
        {`${t('แสดงทั้งหมด')} ${visible.length} ${t('คน')}`}
      </div>

      {/* ── รายการผู้เข้าร่วม ── */}
      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="groups"
            title={t('ไม่มีรายการในหมวดนี้')}
            desc={t('เมื่อมีนิสิตลงทะเบียนกิจกรรมนี้ รายชื่อจะมาแสดงที่นี่')}
          />
        </div>
      ) : (
        <div style={{ ...glass(20), padding: 6 }}>
          <ParticipantsTable
            rows={visible}
            selected={selected}
            selectableIds={selectableIds}
            onToggleRow={toggle}
            onToggleAll={toggleAll}
            busyId={busy}
            onApprove={(r) => decideOne(r, 'approve')}
            onReject={(r) => setRejecting({ ids: [r.id], single: r })}
            onCheckin={checkin}
            onDetails={setDetails}
          />
        </div>
      )}
    </div>
  );
}

const SMALL_BTN: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5, borderRadius: 11 };

/** แถวข้อมูลหนึ่งบรรทัดในกล่องรายละเอียดผู้เข้าร่วม — ป้ายกำกับซ้าย ค่าขวา */
function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon name={icon} size={18} style={{ color: COLOR.hint, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12.5, color: COLOR.label, minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: COLOR.ink, lineHeight: 1.7, minWidth: 0 }}>{value}</span>
    </div>
  );
}

/** เวลานาฬิกาของกรุงเทพฯ สำหรับไฟล์ CSV — ขีดกลางเมื่อยังไม่มีเวลานั้น */
function clockTime(ms: number | null): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}
