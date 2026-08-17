'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { EvidenceUploadDialog } from '@/components/student/EvidenceUploadDialog';
import { Badge, Button, EmptyState, ErrorNote, Icon, SuccessNote, Tabs, inputStyle } from '@/components/ui';
import { errorMessage, registrationApi } from '@/lib/api';
import { COLOR, EVIDENCE_STATUS, REG_STATUS, regStatusMeta } from '@/lib/design';
import type { PublicActivity } from '@/components/landing/types';

export type RegistrationRow = {
  id: string;
  status: string;
  cancelRequested: boolean;
  cancelStatus: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
  hoursAwarded: number;
  reviewed: boolean;
  evidence: { status: string; fileUrl: string; uploadedTh: string; uploadedEn: string } | null;
  activity: PublicActivity;
  /** ใช้เรียงลำดับเท่านั้น — วันที่ที่แสดงผลถูกจัดรูปแบบมาจากเซิร์ฟเวอร์แล้ว */
  startAtMs: number;
  regAtMs: number;
};

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.62)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.75)',
  borderRadius: 22,
  boxShadow: '0 15px 45px rgba(31,41,55,.10), inset 0 1px 0 rgba(255,255,255,.6)',
};

type TabKey = 'all' | 'pending' | 'active' | 'done' | 'cancelled';

/** แต่ละแท็บครอบคลุมสถานะใดบ้าง (ตรงกับ regMatch ในต้นแบบ) */
const TAB_STATUS: Record<Exclude<TabKey, 'all'>, string[]> = {
  pending: ['pending'],
  active: ['approved', 'checked-in'],
  done: ['checked-out', 'completed'],
  cancelled: ['cancelled', 'rejected', 'no-show'],
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รออนุมัติ' },
  { key: 'active', label: 'เช็กอินแล้ว' },
  { key: 'done', label: 'เสร็จสิ้น' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

type SortKey = 'recent' | 'soonest' | 'latest' | 'title' | 'hours';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'ลงทะเบียนล่าสุด' },
  { key: 'soonest', label: 'วันจัดกิจกรรมใกล้ที่สุด' },
  { key: 'latest', label: 'วันจัดกิจกรรมไกลที่สุด' },
  { key: 'title', label: 'ชื่อกิจกรรม' },
  { key: 'hours', label: 'ชั่วโมงมาก→น้อย' },
];

export function StudentRegistrations({ rows }: { rows: RegistrationRow[] }) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [cancelling, setCancelling] = useState<RegistrationRow | null>(null);
  /** ใบที่กำลังเปิดกล่องส่งหลักฐานอยู่ */
  const [uploading, setUploading] = useState<RegistrationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: rows.length, pending: 0, active: 0, done: 0, cancelled: 0 };
    for (const r of rows) {
      for (const key of Object.keys(TAB_STATUS) as Exclude<TabKey, 'all'>[]) {
        if (TAB_STATUS[key].includes(r.status)) c[key] += 1;
      }
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (tab !== 'all' && !TAB_STATUS[tab].includes(r.status)) return false;
      if (!q) return true;
      return (
        r.activity.title.toLowerCase().includes(q) ||
        r.activity.orgName.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sort === 'soonest') return a.startAtMs - b.startAtMs;
      if (sort === 'latest') return b.startAtMs - a.startAtMs;
      if (sort === 'title') return a.activity.title.localeCompare(b.activity.title, 'th');
      if (sort === 'hours') return b.activity.hours - a.activity.hours;
      return b.regAtMs - a.regAtMs;
    });
  }, [rows, tab, query, sort]);

  function clearFilters() {
    setQuery('');
    setTab('all');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {cancelling ? (
        <CancelDialog
          row={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            startTransition(() => router.refresh());
          }}
        />
      ) : null}

      {uploading ? (
        <EvidenceUploadDialog
          registrationId={uploading.id}
          activityTitle={uploading.activity.title}
          resubmit={uploading.evidence?.status === 'rejected'}
          onClose={() => setUploading(null)}
          onDone={() => {
            setUploading(null);
            // ยืนยันให้เห็นด้วยว่าไฟล์ถึงระบบแล้ว ไม่ใช่แค่กล่องปิดไปเฉย ๆ
            setNote(t('ส่งหลักฐานแล้ว รอผู้จัดตรวจ'));
            startTransition(() => router.refresh());
          }}
        />
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {note ? <SuccessNote>{note}</SuccessNote> : null}

      <div className="nuv-regtools" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
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
            placeholder={t('ค้นหาชื่อกิจกรรม...')}
            aria-label={t('ค้นหาชื่อกิจกรรม...')}
            style={{ ...inputStyle(), paddingLeft: 42 }}
          />
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '11px 15px',
              borderRadius: 13,
              border: '1px solid rgba(30,37,48,.12)',
              background: 'rgba(255,255,255,.72)',
              fontFamily: 'inherit',
              fontSize: 12.5,
              color: COLOR.body,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="sort" size={17} style={{ color: COLOR.hint }} />
            {t(SORTS.find((s) => s.key === sort)!.label)}
            <Icon name="expand_more" size={17} style={{ color: COLOR.hint }} />
          </button>
          {sortOpen ? (
            <div
              style={{
                position: 'absolute',
                top: 48,
                right: 0,
                zIndex: 40,
                width: 240,
                padding: 7,
                borderRadius: 15,
                background: 'rgba(255,255,255,.97)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,.85)',
                boxShadow: '0 16px 40px rgba(31,41,55,.16)',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 500, color: COLOR.hint, padding: '5px 12px 6px' }}>
                {t('เรียงตาม')}
              </div>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setSort(s.key);
                    setSortOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'none',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    color: COLOR.body,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {t(s.label)}
                  {s.key === sort ? (
                    <Icon name="check_circle" size={16} fill style={{ color: '#7C2FD9' }} />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={tab}
        onChange={setTab}
      />

      {rows.length === 0 ? (
        <div style={CARD}>
          <EmptyState
            icon="assignment"
            title={t('ยังไม่มีการลงทะเบียน')}
            desc={t('เลือกกิจกรรมที่สนใจแล้วกดสมัคร รายการจะมาแสดงที่นี่')}
            action={
              <Link href="/student/discover">
                <Button variant="primary" icon="travel_explore">
                  {t('ค้นหากิจกรรม')}
                </Button>
              </Link>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div style={CARD}>
          <EmptyState
            icon="search_off"
            title={t('ไม่พบรายการที่ตรงกับเงื่อนไข')}
            desc={t('ลองเปลี่ยนคำค้นหรือล้างตัวกรอง')}
            action={
              <Button variant="secondary" icon="filter_alt_off" onClick={clearFilters}>
                {t('ล้างตัวกรอง')}
              </Button>
            }
          />
        </div>
      ) : (
        visible.map((r) => (
          <RegistrationCard
            key={r.id}
            row={r}
            isEn={isEn}
            onCancel={() => {
              setError(null);
              setCancelling(r);
            }}
            onSubmitEvidence={() => {
              setError(null);
              setUploading(r);
            }}
          />
        ))
      )}
    </div>
  );
}

function RegistrationCard({
  row,
  isEn,
  onCancel,
  onSubmitEvidence,
}: {
  row: RegistrationRow;
  isEn: boolean;
  onCancel: () => void;
  onSubmitEvidence: () => void;
}) {
  const { t } = useApp();
  const a = row.activity;
  const status = regStatusMeta(row.status, row.evidence?.status) ?? REG_STATUS.pending;
  // ยกเลิกได้จนกว่ากิจกรรมจะจบหรือถูกยกเลิกไปแล้ว — เซิร์ฟเวอร์ตรวจกติกา 3 วันซ้ำอีกชั้น
  const canCancel = !row.cancelRequested && !['completed', 'cancelled', 'no-show'].includes(row.status);

  /**
   * ส่งหลักฐานได้ตอนเช็กเอาต์แล้วแต่ยังไม่มีใบที่ผ่าน
   * ใบที่ถูกตีกลับก็เข้าเงื่อนไขนี้ — นิสิตต้องมีทางแก้ ไม่ใช่เห็นแค่คำว่าไม่ผ่าน
   */
  const needsEvidence =
    row.status === 'checked-out' && (row.evidence == null || row.evidence.status === 'rejected');

  const steps = [
    { label: 'อนุมัติ', icon: 'how_to_reg', done: !['pending', 'cancelled', 'rejected'].includes(row.status) },
    { label: 'เช็กอิน', icon: 'login', done: row.checkedIn },
    { label: 'เช็กเอาต์', icon: 'logout', done: row.checkedOut },
    { label: 'หลักฐาน', icon: 'attach_file', done: row.evidence != null },
    { label: 'รีวิว', icon: 'rate_review', done: row.reviewed },
  ];

  const meta = [
    { icon: 'event', label: isEn ? a.dateEn : a.dateTh },
    { icon: 'schedule', label: `${a.hours} ${t('ชม.')}` },
    { icon: 'place', label: a.location || '—' },
  ];

  return (
    <div style={{ ...CARD, padding: 18 }}>
      <div className="nuv-reg-head" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {a.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
          <img
            src={a.photo}
            alt=""
            style={{ width: 88, height: 66, borderRadius: 14, objectFit: 'cover', display: 'block', flexShrink: 0 }}
          />
        ) : null}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.5, color: COLOR.ink }}>
                {a.title}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: COLOR.label }}>{a.orgName}</div>
            </div>
            <Badge tone={status.tone} label={t(status.label)} icon={status.icon} />
          </div>

          <div
            className="nuv-reg-meta"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginTop: 8,
              fontSize: 11.5,
              color: COLOR.label,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                padding: '4px 11px',
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 500,
                background: a.category.color + '24',
                color: '#374151',
              }}
            >
              {isEn && a.category.labelEn ? a.category.labelEn : a.category.label}
            </span>
            {meta.map((m) => (
              <span key={m.icon} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name={m.icon} size={14} style={{ color: COLOR.hint }} />
                {m.label}
              </span>
            ))}
            {row.hoursAwarded > 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0d6e50' }}>
                <Icon name="verified" size={14} />
                {t('ได้รับ')} {row.hoursAwarded} {t('ชม.')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {row.cancelRequested ? (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.7,
            color: '#c2760f',
            background: 'rgba(245,166,35,.1)',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 10,
          }}
        >
          {row.cancelStatus === 'rejected'
            ? t('ผู้จัดไม่อนุมัติคำขอยกเลิก')
            : t('ส่งคำขอยกเลิกแล้ว รอผู้จัดพิจารณา')}
        </div>
      ) : null}

      <div
        className="nuv-reg-steps"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '14px 6px',
          borderRadius: 16,
          background: 'rgba(255,255,255,.45)',
          border: '1px solid rgba(31,41,55,.05)',
        }}
      >
        {steps.map((st, i) => (
          <div key={st.label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: st.done ? 'linear-gradient(135deg,#63D2A1,#7AB8FF)' : 'rgba(31,41,55,.06)',
                  color: st.done ? '#fff' : '#9CA3AF',
                  boxShadow: st.done ? '0 5px 14px rgba(99,210,161,.35)' : 'none',
                }}
              >
                <Icon name={st.done ? 'check' : st.icon} size={16} />
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  marginTop: 5,
                  whiteSpace: 'nowrap',
                  color: st.done ? '#0d6e50' : '#9CA3AF',
                  fontWeight: st.done ? 500 : 400,
                }}
              >
                {t(st.label)}
              </div>
            </div>
            {i < steps.length - 1 ? (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  minWidth: 14,
                  borderRadius: 2,
                  margin: '14px 2px 0',
                  background: st.done ? 'rgba(99,210,161,.55)' : 'rgba(31,41,55,.08)',
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {row.evidence ? <EvidencePanel evidence={row.evidence} isEn={isEn} /> : null}

      {/* รอหลักฐานอยู่ — บอกให้ชัดว่ายังขาดอะไร ไม่ใช่ปล่อยให้เห็นแค่สถานะ "รอหลักฐาน" ที่แถบบน */}
      {needsEvidence ? (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '11px 13px',
            borderRadius: 15,
            background: 'rgba(245,166,35,.1)',
            border: '1px solid rgba(245,166,35,.32)',
          }}
        >
          <Icon name="attach_file" size={20} style={{ color: '#c2760f', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#c2760f', lineHeight: 1.6 }}>
              {row.evidence ? t('ส่งหลักฐานใหม่อีกครั้ง') : t('รอหลักฐานการเข้าร่วม')}
            </div>
            <div style={{ fontSize: 11.5, color: COLOR.label, marginTop: 2, lineHeight: 1.7 }}>
              {t('แนบรูปที่แสดงว่าคุณเข้าร่วมจริง เพื่อให้ผู้จัดรับรองชั่วโมงให้')}
            </div>
          </div>
          <Button
            variant="primary"
            icon="upload"
            onClick={onSubmitEvidence}
            style={{ padding: '9px 16px', fontSize: 13, borderRadius: 11 }}
          >
            {row.evidence ? t('ส่งใหม่') : t('ส่งหลักฐาน')}
          </Button>
        </div>
      ) : null}

      <div className="nuv-reg-actions" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/activities/${a.id}`}>
          <Button variant="secondary" icon="visibility" style={{ padding: '9px 16px', fontSize: 13, borderRadius: 11 }}>
            {t('ดูรายละเอียด')}
          </Button>
        </Link>
        {canCancel ? (
          <Button variant="danger" icon="event_busy" onClick={onCancel} style={{ padding: '9px 16px', fontSize: 13, borderRadius: 11 }}>
            {t('ยกเลิกกิจกรรม')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EvidencePanel({
  evidence,
  isEn,
}: {
  evidence: NonNullable<RegistrationRow['evidence']>;
  isEn: boolean;
}) {
  const { t } = useApp();
  const state = EVIDENCE_STATUS[evidence.status] ?? EVIDENCE_STATUS.pending;
  const rejected = evidence.status === 'rejected';

  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 15,
        background: rejected ? 'rgba(233,113,113,.1)' : 'rgba(99,210,161,.1)',
        border: `1px solid ${rejected ? 'rgba(233,113,113,.32)' : 'rgba(99,210,161,.32)'}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์หลักฐานที่นิสิตอัปโหลด */}
      <img
        src={evidence.fileUrl}
        alt=""
        style={{ width: 56, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.5,
            color: rejected ? '#C2410C' : '#0F8A63',
          }}
        >
          <Icon name={rejected ? 'report' : 'verified'} size={16} />
          {t(state.label)}
        </div>
        <div style={{ fontSize: 11.5, color: COLOR.label, marginTop: 2 }}>
          {rejected
            ? t('ผู้จัดขอให้อัปโหลดหลักฐานใหม่ กรุณาแนบรูปที่ชัดเจนอีกครั้ง')
            : `${t('อัปโหลดเมื่อ')} ${isEn ? evidence.uploadedEn : evidence.uploadedTh}`}
        </div>
      </div>
    </div>
  );
}

/** ยืนยันการขอยกเลิก — ต้องระบุเหตุผลให้ผู้จัดพิจารณา */
function CancelDialog({
  row,
  onClose,
  onDone,
}: {
  row: RegistrationRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await registrationApi.cancel(row.id, reason.trim());
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('ยกเลิกกิจกรรม')}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(30,37,48,.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          borderRadius: 24,
          background: 'rgba(255,255,255,.96)',
          border: '1px solid rgba(255,255,255,.8)',
          boxShadow: '0 30px 80px rgba(24,20,34,.32)',
          animation: 'nuPop .22s ease',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: COLOR.ink }}>{t('ยกเลิกกิจกรรม')}</div>
        <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.7, marginTop: 6 }}>
          {row.activity.title}
        </div>
        <div style={{ fontSize: 12, color: COLOR.hint, lineHeight: 1.7, marginTop: 10 }}>
          {t('คำขอจะถูกส่งไปให้ผู้จัดพิจารณา และต้องยกเลิกก่อนวันงานอย่างน้อย 3 วัน')}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t('เหตุผลในการยกเลิก')}
          aria-label={t('เหตุผลในการยกเลิก')}
          style={{ ...inputStyle(), marginTop: 14, resize: 'vertical', lineHeight: 1.7 }}
        />

        {error ? (
          <div style={{ marginTop: 10 }}>
            <ErrorNote>{error}</ErrorNote>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('ปิด')}
          </Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!reason.trim()}>
            {t('ส่งคำขอยกเลิก')}
          </Button>
        </div>
      </div>
    </div>
  );
}
