'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, EmptyState, ErrorNote, Icon, SuccessNote, Tabs, inputStyle } from '@/components/ui';
import { DateEcho } from '@/components/ui/DateEcho';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { ModalShell } from '@/components/activity/ModalShell';
import { CertificateDocument, documentPropsOf } from '@/components/certificate/CertificateDocument';
import { CertificatesSummary, CertificatesTable } from '@/components/organizer/CertificatesTable';
import { Pagination } from '@/components/reports/Pagination';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, SEMANTIC, glass } from '@/lib/design';
import type { OrganizerCertificateView } from '@/lib/certificates';

/** ใบลงทะเบียนที่รับรองชั่วโมงแล้วแต่ยังไม่มีใบประกาศ */
export type PendingCertificateRow = {
  registrationId: string;
  studentName: string;
  studentId: string;
  faculty: string;
  avatarUrl: string | null;
  activityId: string;
  activityTitle: string;
  hours: number;
  approvedTh: string;
  approvedEn: string;
  /** วันที่รับรองชั่วโมงเป็นคีย์ YYYY-MM-DD — ตัวกรองช่วงวันใช้ค่านี้บนแท็บรอออกใบ */
  approvedKey: string;
};

type TabKey = 'pending' | 'issued' | 'revoked';

/** ครั้งละไม่เกินเท่านี้ ต้องตรงกับ MAX_BATCH ของ /api/v1/organizer/certificates */
const MAX_BATCH = 200;

export function OrganizerCertificates({
  certificates,
  pending,
  activities,
  verifyBase,
}: {
  certificates: OrganizerCertificateView[];
  pending: PendingCertificateRow[];
  activities: { id: string; title: string }[];
  /** โดเมนของหน้าตรวจสอบ — คำนวณฝั่งเซิร์ฟเวอร์ให้ SSR ตรงกับ client */
  verifyBase: string;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // เปิดมาที่ใบที่ค้างก่อนถ้ามี เพราะเป็นงานเดียวบนหน้านี้ที่ต้องลงมือ
  const [tab, setTabRaw] = useState<TabKey>(pending.length ? 'pending' : 'issued');
  const [activityId, setActivityId] = useState('all');
  const [faculty, setFaculty] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrganizerCertificateView | null>(null);
  const [revoking, setRevoking] = useState<OrganizerCertificateView | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reason, setReason] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);

  /* เปลี่ยนแท็บหรือตัวกรองแล้วต้องกลับไปหน้าแรก ไม่งั้นจะค้างอยู่หน้าที่ไม่มีข้อมูล */
  const setTab = (next: TabKey) => {
    setTabRaw(next);
    setPage(1);
  };
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  /* รายชื่อคณะอ่านจากข้อมูลจริงบนหน้านี้ ไม่ใช่ตารางคณะทั้งมหาวิทยาลัย
     เพราะผู้จัดเห็นเฉพาะกิจกรรมของตัวเอง — คณะที่ไม่มีใบเลยก็ไม่ควรมีให้เลือก */
  const faculties = useMemo(() => {
    const set = new Set<string>();
    for (const c of certificates) if (c.faculty) set.add(c.faculty);
    for (const r of pending) if (r.faculty) set.add(r.faculty);
    return [...set].sort((a, b) => a.localeCompare(b, 'th'));
  }, [certificates, pending]);

  const matches = (row: {
    activityId: string;
    faculty: string | null;
    dayKey: string;
    fields: string[];
  }) => {
    if (activityId !== 'all' && row.activityId !== activityId) return false;
    if (faculty !== 'all' && (row.faculty ?? '') !== faculty) return false;
    if (from && row.dayKey < from) return false;
    if (to && row.dayKey > to) return false;
    const q = query.trim().toLowerCase();
    return !q || row.fields.some((f) => f.toLowerCase().includes(q));
  };

  const shownPending = useMemo(
    () =>
      pending.filter((r) =>
        matches({
          activityId: r.activityId,
          faculty: r.faculty,
          dayKey: r.approvedKey,
          fields: [r.studentName, r.studentId, r.activityTitle],
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches อ่านแค่ค่าตัวกรองด้านล่างนี้
    [pending, activityId, faculty, from, to, query],
  );

  const shownCerts = useMemo(
    () =>
      certificates.filter((c) =>
        matches({
          activityId: c.activityId,
          faculty: c.faculty,
          dayKey: c.issuedKey,
          fields: [c.holderName, c.studentId ?? '', c.activityTitle, c.ref],
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches อ่านแค่ค่าตัวกรองด้านล่างนี้
    [certificates, activityId, faculty, from, to, query],
  );

  const issued = useMemo(() => shownCerts.filter((c) => !c.revoked), [shownCerts]);
  const revoked = useMemo(() => shownCerts.filter((c) => c.revoked), [shownCerts]);

  const list = tab === 'issued' ? issued : revoked;
  /** จำนวนแถวของแท็บที่เปิดอยู่ — ใช้คุมการแบ่งหน้าทั้งสามแท็บด้วยตัวเดียว */
  const rowCount = tab === 'pending' ? shownPending.length : list.length;

  const totalPages = Math.max(1, Math.ceil(rowCount / perPage));
  // หนีบหน้าปัจจุบันตอนเรนเดอร์แทนการ setState ใน effect — ตัวกรองที่แคบลงจะไม่ทำให้ค้างหน้าว่าง
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const pagedPending = shownPending.slice(start, start + perPage);
  const pagedList = list.slice(start, start + perPage);

  /** ใบที่เลือกไว้และยังอยู่ในผลลัพธ์ของตัวกรอง — เลือกไว้แล้วกรองออกไปก็ไม่ควรโดนเพิกถอน */
  const selectedRows = useMemo(
    () => issued.filter((c) => selected.has(c.id)),
    [issued, selected],
  );

  const urlOf = (ref: string) => `${verifyBase}/verify/${encodeURIComponent(ref)}`;

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = (ids: string[], select: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  async function run(key: string, work: () => Promise<string | null>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      setNotice(await work());
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const issue = (ids: string[], key: string) =>
    run(key, async () => {
      const res = await organizerApi.issueCertificates(ids);
      const done = t('ออกใบประกาศแล้ว {n} ใบ').replace('{n}', String(res.issued));
      return res.skipped
        ? `${done} · ${t('ข้าม {n} รายการที่ไม่เข้าเงื่อนไขหรือมีใบอยู่แล้ว').replace('{n}', String(res.skipped))}`
        : done;
    });

  const reissue = (c: OrganizerCertificateView) =>
    run(c.id, async () => {
      const res = await organizerApi.reissueCertificate(c.id);
      return `${t('ออกใบใหม่แล้ว รหัสอ้างอิง')} ${res.certificate.ref}`;
    });

  const confirmRevoke = () => {
    if (!revoking) return;
    const target = revoking;
    return run(target.id, async () => {
      await organizerApi.revokeCertificate(target.id, reason.trim());
      setRevoking(null);
      setReason('');
      return `${t('เพิกถอนใบประกาศแล้ว')} ${target.ref}`;
    });
  };

  const confirmBulkRevoke = () => {
    const ids = selectedRows.slice(0, MAX_BATCH).map((c) => c.id);
    return run('bulk', async () => {
      const res = await organizerApi.revokeCertificates(ids, reason.trim());
      setBulkOpen(false);
      setReason('');
      // ล้างที่เลือกหลังทำสำเร็จ ไม่งั้นแถวเดิมยังติ๊กค้างทั้งที่เพิกถอนไปแล้ว
      setSelected(new Set());
      const done = t('เพิกถอนใบประกาศแล้ว {n} ใบ').replace('{n}', String(res.revoked));
      return res.skipped
        ? `${done} · ${t('ข้าม {n} รายการที่ถูกเพิกถอนไปแล้ว').replace('{n}', String(res.skipped))}`
        : done;
    });
  };

  const openRevoke = (c: OrganizerCertificateView) => {
    setReason('');
    setError(null);
    setRevoking(c);
  };

  /** ส่งออกรายการใบประกาศที่กรองอยู่ — เปิดใน Excel ได้ตรง ๆ ด้วย BOM */
  function exportCsv() {
    const head = ['รหัสอ้างอิง', 'ชื่อนิสิต', 'รหัสนิสิต', 'คณะ', 'กิจกรรม', 'ชั่วโมง', 'วันที่ออกใบ', 'สถานะ', 'เหตุผลที่เพิกถอน'];
    const lines = shownCerts.map((c) =>
      [
        c.ref,
        c.holderName,
        c.studentId ?? '',
        c.faculty ?? '',
        c.activityTitle,
        c.hours,
        c.issuedTh,
        c.revoked ? 'ถูกเพิกถอน' : 'ใช้งานได้',
        c.revokeReason ?? '',
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
    a.download = `nuv-certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending', label: t('รอออกใบ'), count: shownPending.length },
    { key: 'issued', label: t('ออกแล้ว'), count: issued.length },
    { key: 'revoked', label: t('ถูกเพิกถอน'), count: revoked.length },
  ];

  const activeFilters =
    (activityId !== 'all' ? 1 : 0) + (faculty !== 'all' ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const pager = (
    <Pagination
      page={safePage}
      totalPages={totalPages}
      perPage={perPage}
      onPage={setPage}
      onPerPage={(n) => {
        setPerPage(n);
        setPage(1);
      }}
      rangeFrom={rowCount === 0 ? 0 : start + 1}
      rangeTo={Math.min(start + perPage, rowCount)}
      total={rowCount}
      t={t}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {error && !revoking && !bulkOpen ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      {/* ── วิธีออกใบ ── */}
      <div style={{ ...glass(20), padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="workspace_premium" size={20} style={{ color: SEMANTIC.purple.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
          {t('ใบประกาศออกให้อัตโนมัติเมื่อคุณรับรองชั่วโมงที่หน้าอนุมัติชั่วโมง นิสิตจะได้รับการแจ้งเตือนและอีเมลพร้อมรหัสอ้างอิง หน้านี้ใช้ตามออกใบที่ค้าง ดูใบ เพิกถอน และออกใบใหม่แทน')}{' '}
          <Link href="/organizer/hours-approval" style={{ color: SEMANTIC.purple.color, fontWeight: 500 }}>
            {t('ไปที่หน้าอนุมัติชั่วโมง')}
          </Link>
        </div>
      </div>

      {/* ── ตัวกรอง ── */}
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
            onChange={(e) => filter(setQuery)(e.target.value)}
            placeholder={t('ค้นหาชื่อนิสิต รหัสนิสิต กิจกรรม หรือรหัสอ้างอิง...')}
            aria-label={t('ค้นหา')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>

        <select
          value={activityId}
          onChange={(e) => filter(setActivityId)(e.target.value)}
          aria-label={t('กรองตามกิจกรรม')}
          style={{ ...inputStyle(), width: 'auto', minWidth: 200, maxWidth: '100%', flexShrink: 0 }}
        >
          <option value="all">{t('ทุกกิจกรรม')}</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>

        <select
          value={faculty}
          onChange={(e) => filter(setFaculty)(e.target.value)}
          aria-label={t('กรองตามคณะ')}
          style={{ ...inputStyle(), width: 'auto', minWidth: 170, maxWidth: '100%', flexShrink: 0 }}
        >
          <option value="all">{t('ทุกคณะ')}</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={shownCerts.length === 0}>
          {t('ส่งออก CSV')}
        </Button>
      </div>

      {/* ── ช่วงวันที่ ──
          แท็บใบประกาศกรองด้วยวันที่ออกใบ ส่วนแท็บรอออกใบยังไม่มีใบ จึงใช้วันที่รับรองชั่วโมงแทน */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>
            {tab === 'pending' ? t('รับรองตั้งแต่วันที่') : t('ออกใบตั้งแต่วันที่')}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => filter(setFrom)(e.target.value)}
            style={{ ...inputStyle(false), width: 'auto' }}
          />
          <DateEcho value={from} />
        </label>

        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ถึงวันที่')}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => filter(setTo)(e.target.value)}
            style={{ ...inputStyle(false), width: 'auto' }}
          />
          <DateEcho value={to} />
        </label>

        {activeFilters ? (
          <Button
            variant="secondary"
            icon="filter_alt_off"
            onClick={() => {
              setActivityId('all');
              setFaculty('all');
              setFrom('');
              setTo('');
              setPage(1);
            }}
          >
            {`${t('ล้างตัวกรอง')} (${activeFilters})`}
          </Button>
        ) : null}
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {/* ── แถบคำสั่งกับที่เลือกไว้ ── */}
      {tab === 'issued' && selectedRows.length ? (
        <div
          style={{
            ...glass(18),
            padding: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Badge tone="purple" label={`${t('เลือกไว้')} ${selectedRows.length}`} />
          <Button variant="secondary" icon="deselect" onClick={() => setSelected(new Set())}>
            {t('ล้างที่เลือก')}
          </Button>
          {selectedRows.length > MAX_BATCH ? (
            <span style={{ fontSize: 12, color: SEMANTIC.warning.color, lineHeight: 1.7 }}>
              {t('เพิกถอนได้ครั้งละไม่เกิน {n} ใบ ระบบจะทำให้เท่าที่ทำได้').replace('{n}', String(MAX_BATCH))}
            </span>
          ) : null}
          <Button
            variant="danger"
            icon="gpp_bad"
            disabled={busy !== null}
            onClick={() => {
              setReason('');
              setError(null);
              setBulkOpen(true);
            }}
            style={{ marginInlineStart: 'auto' }}
          >
            {`${t('เพิกถอน')} (${Math.min(selectedRows.length, MAX_BATCH)})`}
          </Button>
        </div>
      ) : null}

      {/* ── รอออกใบ ── */}
      {tab === 'pending' ? (
        shownPending.length === 0 ? (
          <div style={{ ...glass(20) }}>
            <EmptyState
              icon="task_alt"
              title={t('ไม่มีใบประกาศค้าง')}
              desc={t('ทุกคนที่รับรองชั่วโมงแล้วได้รับใบประกาศครบแล้ว')}
            />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: COLOR.label, flex: 1, minWidth: 200, lineHeight: 1.7 }}>
                {t('ผู้ที่รับรองชั่วโมงแล้วแต่ยังไม่มีใบประกาศ เช่น รับรองไว้ก่อนระบบจะออกใบให้อัตโนมัติ')}
              </span>
              <Button
                variant="primary"
                icon="workspace_premium"
                loading={busy === 'all'}
                disabled={busy !== null}
                onClick={() => issue(shownPending.slice(0, MAX_BATCH).map((r) => r.registrationId), 'all')}
              >
                {`${t('ออกใบทั้งหมด')} (${Math.min(shownPending.length, MAX_BATCH)})`}
              </Button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {pagedPending.map((r) => (
                <div key={r.registrationId} style={{ ...glass(18), padding: 14, display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Avatar name={r.studentName} src={r.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 190 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.ink }}>{r.studentName}</div>
                    <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3, lineHeight: 1.7 }}>
                      {r.studentId ? `${r.studentId} · ` : ''}
                      {r.faculty ? `${r.faculty} · ` : ''}
                      {`${t('รับรองเมื่อ')} ${isEn ? r.approvedEn : r.approvedTh}`}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                      <Icon name="campaign" size={14} style={{ verticalAlign: -2, marginInlineEnd: 5, color: COLOR.hint }} />
                      {r.activityTitle}
                    </div>
                  </div>
                  <Badge tone="success" icon="verified" label={`${r.hours} ${t('ชม.')}`} />
                  <Button
                    variant="primary"
                    icon="workspace_premium"
                    loading={busy === r.registrationId}
                    disabled={busy !== null}
                    onClick={() => issue([r.registrationId], r.registrationId)}
                    style={SMALL_BTN}
                  >
                    {t('ออกใบประกาศ')}
                  </Button>
                </div>
              ))}
            </div>

            {pager}
          </>
        )
      ) : list.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon={tab === 'issued' ? 'workspace_premium' : 'gpp_bad'}
            title={tab === 'issued' ? t('ยังไม่มีใบประกาศที่ออกแล้ว') : t('ไม่มีใบประกาศที่ถูกเพิกถอน')}
            desc={
              tab === 'issued'
                ? t('ใบประกาศจะขึ้นที่นี่เมื่อคุณรับรองชั่วโมงให้ผู้เข้าร่วมกิจกรรม')
                : t('ใบที่เพิกถอนแล้วยังเปิดตรวจสอบได้ และจะขึ้นว่าถูกเพิกถอนพร้อมเหตุผล')
            }
          />
        </div>
      ) : (
        <div style={{ ...glass(22), padding: 18, display: 'grid', gap: 14 }}>
          <CertificatesTable
            rows={pagedList}
            selected={selected}
            onToggleRow={toggleRow}
            onTogglePage={togglePage}
            onPreview={setPreview}
            onRevoke={openRevoke}
            onReissue={reissue}
            busy={busy}
            isEn={isEn}
            t={t}
          />
          <CertificatesSummary
            count={list.length}
            hours={list.reduce((s, c) => s + c.hours, 0)}
            t={t}
          />
          {pager}
        </div>
      )}

      {/* ── ดูใบ ── */}
      {preview ? (
        <ModalShell
          icon="workspace_premium"
          title={t('ตัวอย่างใบประกาศ')}
          onClose={() => setPreview(null)}
          maxWidth={1040}
        >
          <CertificateDocument {...documentPropsOf(preview, urlOf(preview.ref), isEn)} />
        </ModalShell>
      ) : null}

      {/* ── เพิกถอนใบเดียว ── */}
      {revoking ? (
        <ModalShell
          icon="gpp_bad"
          title={t('เพิกถอนใบประกาศ')}
          onClose={() => setRevoking(null)}
          footer={
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setRevoking(null)} disabled={busy === revoking.id}>
                {t('ย้อนกลับ')}
              </Button>
              <Button
                variant="danger"
                icon="gpp_bad"
                loading={busy === revoking.id}
                disabled={!reason.trim()}
                onClick={confirmRevoke}
              >
                {t('ยืนยันการเพิกถอน')}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {error ? <ErrorNote>{error}</ErrorNote> : null}

            <div style={{ fontSize: 13, color: COLOR.ink, fontWeight: 500 }}>{revoking.holderName}</div>
            <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.8 }}>
              {`${revoking.activityTitle} · ${revoking.ref}`}
            </div>
            <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.8 }}>
              {t('ใบนี้จะใช้อ้างอิงไม่ได้อีก หน้าตรวจสอบสาธารณะจะแสดงว่าถูกเพิกถอนพร้อมเหตุผล ชั่วโมงที่รับรองไว้ไม่เปลี่ยน และออกใบใหม่แทนได้ภายหลัง')}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              autoFocus
              placeholder={t('เหตุผลที่เพิกถอน เช่น ชื่อบนใบไม่ถูกต้อง')}
              aria-label={t('เหตุผลที่เพิกถอน')}
              style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11.5, color: COLOR.hint }}>
              {t('นิสิตและผู้ที่ตรวจสอบใบนี้จะเห็นเหตุผลนี้')}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* ── เพิกถอนหลายใบ ── */}
      {bulkOpen ? (
        <ModalShell
          icon="gpp_bad"
          title={`${t('เพิกถอนใบประกาศ')} ${Math.min(selectedRows.length, MAX_BATCH)} ${t('ใบ')}`}
          onClose={() => setBulkOpen(false)}
          footer={
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setBulkOpen(false)} disabled={busy === 'bulk'}>
                {t('ย้อนกลับ')}
              </Button>
              <Button
                variant="danger"
                icon="gpp_bad"
                loading={busy === 'bulk'}
                disabled={!reason.trim() || selectedRows.length === 0}
                onClick={confirmBulkRevoke}
              >
                {t('ยืนยันการเพิกถอน')}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {error ? <ErrorNote>{error}</ErrorNote> : null}

            <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.8 }}>
              {t('ใบทั้งหมดที่เลือกไว้จะถูกเพิกถอนด้วยเหตุผลเดียวกัน นิสิตทุกคนที่ถือใบเหล่านี้จะได้รับการแจ้งเตือน')}
            </div>

            {/* รายชื่อย่อ ๆ ให้ตรวจก่อนกดยืนยัน — ยาวเกินก็ตัดแล้วบอกว่าเหลืออีกกี่คน */}
            <ul
              style={{
                margin: 0,
                paddingInlineStart: 18,
                maxHeight: 180,
                overflowY: 'auto',
                fontSize: 12.5,
                color: COLOR.body,
                lineHeight: 1.9,
              }}
            >
              {selectedRows.slice(0, 12).map((c) => (
                <li key={c.id}>{`${c.holderName} · ${c.ref}`}</li>
              ))}
            </ul>
            {selectedRows.length > 12 ? (
              <div style={{ fontSize: 11.5, color: COLOR.hint }}>
                {t('และอีก {n} รายการ').replace('{n}', String(selectedRows.length - 12))}
              </div>
            ) : null}

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              autoFocus
              placeholder={t('เหตุผลที่เพิกถอน เช่น ชื่อบนใบไม่ถูกต้อง')}
              aria-label={t('เหตุผลที่เพิกถอน')}
              style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11.5, color: COLOR.hint }}>
              {t('นิสิตและผู้ที่ตรวจสอบใบนี้จะเห็นเหตุผลนี้')}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

const SMALL_BTN: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5, borderRadius: 11 };
