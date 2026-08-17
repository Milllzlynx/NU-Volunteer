'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, Tabs, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { ModalShell } from '@/components/activity/ModalShell';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, EVIDENCE_STATUS, SEMANTIC, glass } from '@/lib/design';

export type HoursRow = {
  id: string;
  status: string;
  studentName: string;
  studentId: string;
  faculty: string;
  avatarUrl: string | null;
  activityId: string;
  activityTitle: string;
  /** เพดานชั่วโมงของกิจกรรม — รับรองเกินนี้ไม่ได้ */
  activityHours: number;
  hoursComputed: number;
  hoursAwarded: number;
  approved: boolean;
  checkedOutTh: string;
  checkedOutEn: string;
  evidence: {
    id: string;
    fileUrl: string;
    fileName: string;
    note: string;
    status: string;
    reviewNote: string | null;
  } | null;
};

type TabKey = 'waiting' | 'approved' | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'waiting', label: 'รอรับรอง' },
  { key: 'approved', label: 'รับรองแล้ว' },
  { key: 'all', label: 'ทั้งหมด' },
];

export function OrganizerHours({
  rows,
  activities,
}: {
  rows: HoursRow[];
  activities: { id: string; title: string }[];
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('waiting');
  const [activityId, setActivityId] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<HoursRow | null>(null);
  /** ค่าชั่วโมงที่ผู้จัดพิมพ์แก้ไว้ต่อแถว — ไม่พิมพ์คือใช้ค่าของกิจกรรม */
  const [edits, setEdits] = useState<Record<string, string>>({});

  const byActivity = useMemo(
    () => (activityId === 'all' ? rows : rows.filter((r) => r.activityId === activityId)),
    [rows, activityId],
  );

  const counts = useMemo(
    () => ({
      waiting: byActivity.filter((r) => !r.approved).length,
      approved: byActivity.filter((r) => r.approved).length,
      all: byActivity.length,
    }),
    [byActivity],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byActivity.filter((r) => {
      if (tab === 'waiting' && r.approved) return false;
      if (tab === 'approved' && !r.approved) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.activityTitle.toLowerCase().includes(q)
      );
    });
  }, [byActivity, tab, query]);

  const totals = useMemo(
    () => ({
      awarded: visible.reduce((s, r) => s + r.hoursAwarded, 0),
      people: visible.length,
    }),
    [visible],
  );

  async function decide(row: HoursRow, action: 'approve' | 'reject') {
    setBusy(row.id);
    setError(null);
    try {
      const typed = edits[row.id];
      await organizerApi.decideHours(row.id, {
        action,
        hours: action === 'approve' && typed !== undefined && typed !== '' ? Number(typed) : undefined,
        note: action === 'reject' ? t('หลักฐานไม่เพียงพอต่อการรับรองชั่วโมง') : undefined,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function reviewEvidence(row: HoursRow, status: 'approved' | 'rejected') {
    if (!row.evidence) return;
    setBusy(row.id);
    setError(null);
    try {
      await organizerApi.reviewEvidence(
        row.evidence.id,
        status,
        status === 'rejected' ? t('หลักฐานไม่ชัดเจน กรุณาอัปโหลดใหม่') : undefined,
      );
      setViewing(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /** ส่งออกรายการที่กรองอยู่ตอนนี้ — เปิดใน Excel ได้ตรง ๆ ด้วย BOM */
  function exportCsv() {
    const head = ['ชื่อนิสิต', 'รหัสนิสิต', 'คณะ', 'กิจกรรม', 'ชั่วโมงที่คำนวณ', 'ชั่วโมงที่รับรอง', 'สถานะ'];
    const lines = visible.map((r) =>
      [
        r.studentName,
        r.studentId,
        r.faculty,
        r.activityTitle,
        r.hoursComputed,
        r.hoursAwarded,
        r.approved ? 'รับรองแล้ว' : 'รอรับรอง',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    const blob = new Blob([`﻿${[head.join(','), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuv-hours-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {viewing?.evidence ? (
        <ModalShell icon="attach_file" title={t('หลักฐานการเข้าร่วม')} onClose={() => setViewing(null)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, color: COLOR.ink, fontWeight: 500 }}>{viewing.studentName}</div>
            <div style={{ fontSize: 12, color: COLOR.label }}>{viewing.activityTitle}</div>

            {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์อัปโหลดของผู้ใช้ */}
            <img
              src={viewing.evidence.fileUrl}
              alt={viewing.evidence.fileName || t('หลักฐานการเข้าร่วม')}
              style={{ width: '100%', borderRadius: 14, border: '1px solid rgba(31,41,55,.1)' }}
            />

            {viewing.evidence.note ? (
              <div style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
                {viewing.evidence.note}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                icon="check"
                loading={busy === viewing.id}
                onClick={() => reviewEvidence(viewing, 'approved')}
              >
                {t('หลักฐานผ่าน')}
              </Button>
              <Button
                variant="danger"
                icon="close"
                loading={busy === viewing.id}
                onClick={() => reviewEvidence(viewing, 'rejected')}
              >
                {t('หลักฐานไม่ผ่าน')}
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

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
            placeholder={t('ค้นหาชื่อนิสิต รหัสนิสิต หรือกิจกรรม...')}
            aria-label={t('ค้นหา')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>

        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          aria-label={t('กรองตามกิจกรรม')}
          style={{ ...inputStyle(), width: 'auto', minWidth: 200, flexShrink: 0 }}
        >
          <option value="all">{t('ทุกกิจกรรม')}</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>

        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={visible.length === 0}>
          {t('ส่งออก CSV')}
        </Button>
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={tab}
        onChange={setTab}
      />

      {visible.length > 0 ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: COLOR.label }}>
          <span>{`${t('แสดง')} ${totals.people} ${t('รายการ')}`}</span>
          <span style={{ color: SEMANTIC.success.color, fontWeight: 500 }}>
            {`${t('รวมชั่วโมงที่รับรองแล้ว')} ${totals.awarded} ${t('ชม.')}`}
          </span>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="fact_check"
            title={t('ไม่มีรายการในหมวดนี้')}
            desc={t('เมื่อนิสิตเช็กเอาต์จากกิจกรรมของคุณแล้ว รายการจะมารอรับรองชั่วโมงที่นี่')}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {visible.map((r) => {
            const working = busy === r.id;
            const ev = r.evidence ? EVIDENCE_STATUS[r.evidence.status] : null;

            return (
              <div key={r.id} style={{ ...glass(18), padding: 14, display: 'grid', gap: 11 }}>
                <div style={{ display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Avatar name={r.studentName} src={r.avatarUrl} />

                  <div style={{ flex: 1, minWidth: 190 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.ink }}>{r.studentName}</div>
                    <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3, lineHeight: 1.7 }}>
                      {r.studentId ? `${r.studentId} · ` : ''}
                      {r.faculty ? `${r.faculty} · ` : ''}
                      {`${t('เช็กเอาต์')} ${isEn ? r.checkedOutEn : r.checkedOutTh}`}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                      <Icon name="campaign" size={14} style={{ verticalAlign: -2, marginInlineEnd: 5, color: COLOR.hint }} />
                      {r.activityTitle}
                    </div>
                  </div>

                  {ev ? (
                    <button
                      type="button"
                      onClick={() => setViewing(r)}
                      title={t('ดูหลักฐาน')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        border: 'none',
                        background: SEMANTIC[ev.tone].bg,
                        color: SEMANTIC[ev.tone].color,
                      }}
                    >
                      <Icon name="attach_file" size={14} />
                      {t(ev.label)}
                    </button>
                  ) : (
                    <Badge tone="neutral" icon="block" label={t('ไม่มีหลักฐาน')} />
                  )}

                  {r.approved ? (
                    <Badge tone="success" icon="verified" label={`${r.hoursAwarded} ${t('ชม.')}`} />
                  ) : null}
                </div>

                {!r.approved ? (
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: COLOR.label }}>
                      {t('รับรอง')}
                      <input
                        type="number"
                        min={0}
                        max={r.activityHours}
                        step={0.5}
                        value={edits[r.id] ?? String(r.activityHours)}
                        onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
                        aria-label={t('จำนวนชั่วโมงที่รับรอง')}
                        style={{ ...inputStyle(), width: 90, padding: '8px 10px' }}
                      />
                      {`/ ${r.activityHours} ${t('ชม.')}`}
                    </label>

                    <span style={{ fontSize: 11.5, color: COLOR.hint }}>
                      {`${t('ระบบคำนวณได้')} ${r.hoursComputed} ${t('ชม.')}`}
                    </span>

                    <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto', flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        icon="verified"
                        loading={working}
                        onClick={() => decide(r, 'approve')}
                        style={SMALL_BTN}
                      >
                        {t('รับรองชั่วโมง')}
                      </Button>
                      <Button
                        variant="secondary"
                        icon="close"
                        loading={working}
                        onClick={() => decide(r, 'reject')}
                        style={SMALL_BTN}
                      >
                        {t('ไม่รับรอง')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SMALL_BTN: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5, borderRadius: 11 };
