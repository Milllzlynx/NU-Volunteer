'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, EmptyState, ErrorNote, Icon, SuccessNote, Tabs, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { ModalShell } from '@/components/activity/ModalShell';
import { CertificateDocument, documentPropsOf } from '@/components/certificate/CertificateDocument';
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
};

type TabKey = 'pending' | 'issued' | 'revoked';

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
  const [tab, setTab] = useState<TabKey>(pending.length ? 'pending' : 'issued');
  const [activityId, setActivityId] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrganizerCertificateView | null>(null);
  const [revoking, setRevoking] = useState<OrganizerCertificateView | null>(null);
  const [reason, setReason] = useState('');

  const matches = (activity: string, fields: string[]) => {
    if (activityId !== 'all' && activity !== activityId) return false;
    const q = query.trim().toLowerCase();
    return !q || fields.some((f) => f.toLowerCase().includes(q));
  };

  const shownPending = useMemo(
    () =>
      pending.filter((r) => matches(r.activityId, [r.studentName, r.studentId, r.activityTitle])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches อ่านแค่ activityId กับ query
    [pending, activityId, query],
  );

  const shownCerts = useMemo(
    () =>
      certificates.filter((c) =>
        matches(c.activityId, [c.holderName, c.studentId ?? '', c.activityTitle, c.ref]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches อ่านแค่ activityId กับ query
    [certificates, activityId, query],
  );

  const issued = shownCerts.filter((c) => !c.revoked);
  const revoked = shownCerts.filter((c) => c.revoked);

  const urlOf = (ref: string) => `${verifyBase}/verify/${encodeURIComponent(ref)}`;

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

  const list = tab === 'issued' ? issued : revoked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ค้นหาชื่อนิสิต รหัสนิสิต กิจกรรม หรือรหัสอ้างอิง...')}
            aria-label={t('ค้นหา')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>

        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
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

        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={shownCerts.length === 0}>
          {t('ส่งออก CSV')}
        </Button>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} />

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
                onClick={() => issue(shownPending.slice(0, 200).map((r) => r.registrationId), 'all')}
              >
                {`${t('ออกใบทั้งหมด')} (${Math.min(shownPending.length, 200)})`}
              </Button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {shownPending.map((r) => (
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
        <div style={{ display: 'grid', gap: 10 }}>
          {list.map((c) => (
            <div
              key={c.id}
              style={{
                ...glass(18),
                padding: 14,
                display: 'grid',
                gap: 10,
                borderInlineStart: c.revoked ? `4px solid ${SEMANTIC.danger.dot}` : undefined,
              }}
            >
              <div style={{ display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar name={c.holderName} src={c.avatarUrl} />
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.ink }}>{c.holderName}</div>
                  <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3, lineHeight: 1.7 }}>
                    {c.studentId ? `${c.studentId} · ` : ''}
                    {c.faculty ? `${c.faculty} · ` : ''}
                    {`${t('ออกให้เมื่อ')} ${isEn ? c.issuedEn : c.issuedTh}`}
                  </div>
                  <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                    <Icon name="campaign" size={14} style={{ verticalAlign: -2, marginInlineEnd: 5, color: COLOR.hint }} />
                    {c.activityTitle}
                  </div>
                </div>
                <code
                  style={{
                    fontSize: 12,
                    letterSpacing: 0.5,
                    color: COLOR.body,
                    background: 'rgba(31,41,55,.06)',
                    padding: '6px 10px',
                    borderRadius: 9,
                  }}
                >
                  {c.ref}
                </code>
                <Badge tone={c.revoked ? 'danger' : 'info'} label={`${c.hours} ${t('ชม.')}`} />
              </div>

              {c.revoked ? (
                <div style={{ fontSize: 12, color: SEMANTIC.danger.color, lineHeight: 1.7 }}>
                  {`${t('เพิกถอนเมื่อ')} ${isEn ? c.revokedEn : c.revokedTh}`}
                  {c.revokeReason ? ` · ${c.revokeReason}` : ''}
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button variant="secondary" icon="visibility" onClick={() => setPreview(c)} style={SMALL_BTN}>
                  {t('ดูใบ')}
                </Button>
                <Link href={`/verify/${encodeURIComponent(c.ref)}`} target="_blank">
                  <Button variant="secondary" icon="open_in_new" style={SMALL_BTN}>
                    {t('หน้าตรวจสอบ')}
                  </Button>
                </Link>
                {c.revoked ? (
                  c.canReissue ? (
                    <Button
                      variant="primary"
                      icon="autorenew"
                      loading={busy === c.id}
                      disabled={busy !== null}
                      onClick={() => reissue(c)}
                      style={SMALL_BTN}
                    >
                      {t('ออกใบใหม่แทน')}
                    </Button>
                  ) : null
                ) : (
                  <Button
                    variant="danger"
                    icon="gpp_bad"
                    disabled={busy !== null}
                    onClick={() => {
                      setReason('');
                      setError(null);
                      setRevoking(c);
                    }}
                    style={SMALL_BTN}
                  >
                    {t('เพิกถอน')}
                  </Button>
                )}
              </div>
            </div>
          ))}
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

      {/* ── เพิกถอน ── */}
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
    </div>
  );
}

const SMALL_BTN: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5, borderRadius: 11 };
