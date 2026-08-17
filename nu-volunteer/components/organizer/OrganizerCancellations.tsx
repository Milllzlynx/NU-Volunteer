'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, Tabs, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { ModalShell } from '@/components/activity/ModalShell';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, REG_STATUS, SEMANTIC, glass } from '@/lib/design';

export type CancellationRow = {
  id: string;
  studentName: string;
  studentId: string;
  faculty: string;
  avatarUrl: string | null;
  activityId: string;
  activityTitle: string;
  /** สถานะใบลงทะเบียนขณะยื่นคำขอ */
  status: string;
  reason: string;
  cancelStatus: string;
  requestedTh: string;
  requestedEn: string;
  activityDateTh: string;
  activityDateEn: string;
  /**
   * จำนวนวันจากวันที่ยื่นถึงวันจัดกิจกรรม — ติดลบคือยื่นหลังกิจกรรมเริ่มไปแล้ว
   * ใช้บอกผู้จัดว่าคำขอนี้ยื่นทันกำหนด 3 วันหรือไม่
   */
  daysBefore: number;
  /** true = ยื่นช้ากว่ากติกา 3 วัน ผู้จัดควรพิจารณาเป็นกรณีพิเศษ */
  late: boolean;
};

type TabKey = 'pending' | 'approved' | 'rejected' | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'รอพิจารณา' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ไม่อนุมัติ' },
  { key: 'all', label: 'ทั้งหมด' },
];

const CANCEL_META: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'รอพิจารณา', tone: 'warning' },
  approved: { label: 'อนุมัติยกเลิกแล้ว', tone: 'success' },
  rejected: { label: 'ไม่อนุมัติให้ยกเลิก', tone: 'danger' },
};

export function OrganizerCancellations({ rows }: { rows: CancellationRow[] }) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('pending');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<{ row: CancellationRow; action: 'approve' | 'reject' } | null>(null);
  const [note, setNote] = useState('');

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.cancelStatus === 'pending').length,
      approved: rows.filter((r) => r.cancelStatus === 'approved').length,
      rejected: rows.filter((r) => r.cancelStatus === 'rejected').length,
      all: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.cancelStatus !== tab) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.activityTitle.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query]);

  async function confirm() {
    if (!deciding) return;
    setBusy(deciding.row.id);
    setError(null);
    try {
      await organizerApi.decideCancellation(deciding.row.id, deciding.action, note.trim());
      setDeciding(null);
      setNote('');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {error && !deciding ? <ErrorNote>{error}</ErrorNote> : null}

      {deciding ? (
        <DecisionModal
          row={deciding.row}
          action={deciding.action}
          note={note}
          setNote={setNote}
          error={error}
          busy={busy === deciding.row.id}
          onClose={() => {
            setDeciding(null);
            setNote('');
            setError(null);
          }}
          onConfirm={confirm}
        />
      ) : null}

      <div style={{ position: 'relative' }}>
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
          aria-label={t('ค้นหาคำขอยกเลิก')}
          style={{ ...inputStyle(), paddingLeft: 42 }}
        />
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={tab}
        onChange={setTab}
      />

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="event_busy"
            title={t('ไม่มีคำขอยกเลิกในหมวดนี้')}
            desc={t('เมื่อนิสิตขอยกเลิกการเข้าร่วมกิจกรรมของคุณ คำขอจะมารอพิจารณาที่นี่')}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {visible.map((r) => {
            const meta = CANCEL_META[r.cancelStatus] ?? CANCEL_META.pending;
            const regMeta = REG_STATUS[r.status];
            const working = busy === r.id;

            return (
              <div key={r.id} style={{ ...glass(18), padding: 15, display: 'grid', gap: 11 }}>
                <div style={{ display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Avatar name={r.studentName} src={r.avatarUrl} />

                  <div style={{ flex: 1, minWidth: 190 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.ink }}>{r.studentName}</div>
                    <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3, lineHeight: 1.7 }}>
                      {r.studentId ? `${r.studentId} · ` : ''}
                      {r.faculty ? `${r.faculty} · ` : ''}
                      {`${t('ยื่นเมื่อ')} ${isEn ? r.requestedEn : r.requestedTh}`}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                      <Icon name="campaign" size={14} style={{ verticalAlign: -2, marginInlineEnd: 5, color: COLOR.hint }} />
                      {`${r.activityTitle} · ${isEn ? r.activityDateEn : r.activityDateTh}`}
                    </div>
                  </div>

                  {regMeta ? <Badge tone={regMeta.tone} icon={regMeta.icon} label={t(regMeta.label)} /> : null}
                  <Badge tone={meta.tone} label={t(meta.label)} />
                </div>

                {/* เหตุผลของนิสิต — เป็นข้อมูลหลักที่ผู้จัดใช้ตัดสินใจ จึงเน้นให้อ่านง่าย */}
                <div
                  style={{
                    padding: '11px 14px',
                    borderRadius: 13,
                    background: 'rgba(31,41,55,.035)',
                    fontSize: 12.5,
                    color: COLOR.body,
                    lineHeight: 1.8,
                  }}
                >
                  <span style={{ color: COLOR.hint }}>{`${t('เหตุผลของนิสิต')}: `}</span>
                  {r.reason || t('ไม่ได้ระบุเหตุผล')}
                </div>

                {/*
                  กติกาในคู่มือคือต้องยื่นก่อนวันจัดกิจกรรมอย่างน้อย 3 วัน
                  ฝั่งนิสิตบล็อกไว้แล้ว แต่คำขอที่ยื่นทันแล้วค้างมานานอาจเลยกำหนดไปตอนพิจารณา
                  จึงเตือนให้ผู้จัดเห็นก่อนกด ไม่ได้บล็อกการตัดสินใจ
                */}
                {r.cancelStatus === 'pending' && r.late ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 13px',
                      borderRadius: 12,
                      background: SEMANTIC.warning.bg,
                      color: SEMANTIC.warning.color,
                      fontSize: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    <Icon name="warning" size={16} style={{ flexShrink: 0 }} />
                    {r.daysBefore >= 0
                      ? `${t('เหลืออีก')} ${r.daysBefore} ${t('วันก่อนกิจกรรม — น้อยกว่ากติกา 3 วัน')}`
                      : t('กิจกรรมเริ่มไปแล้ว')}
                  </div>
                ) : null}

                {r.cancelStatus === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      icon="check"
                      disabled={working}
                      onClick={() => setDeciding({ row: r, action: 'approve' })}
                      style={SMALL_BTN}
                    >
                      {t('อนุมัติให้ยกเลิก')}
                    </Button>
                    <Button
                      variant="secondary"
                      icon="close"
                      disabled={working}
                      onClick={() => setDeciding({ row: r, action: 'reject' })}
                      style={SMALL_BTN}
                    >
                      {t('ไม่อนุมัติ')}
                    </Button>
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

/**
 * กล่องยืนยัน — เหตุผลบังคับเฉพาะตอนไม่อนุมัติ
 * เพราะการปฏิเสธคำขอทำให้นิสิตยังต้องไปร่วมกิจกรรม จึงต้องอธิบายได้ว่าทำไม
 */
function DecisionModal({
  row,
  action,
  note,
  setNote,
  error,
  busy,
  onClose,
  onConfirm,
}: {
  row: CancellationRow;
  action: 'approve' | 'reject';
  note: string;
  setNote: (s: string) => void;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useApp();
  const rejecting = action === 'reject';

  return (
    <ModalShell
      icon={rejecting ? 'block' : 'event_busy'}
      title={rejecting ? t('ไม่อนุมัติคำขอยกเลิก') : t('อนุมัติให้ยกเลิก')}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('ย้อนกลับ')}
          </Button>
          <Button
            variant={rejecting ? 'danger' : 'primary'}
            icon={rejecting ? 'close' : 'check'}
            loading={busy}
            disabled={rejecting && !note.trim()}
            onClick={onConfirm}
          >
            {rejecting ? t('ยืนยันไม่อนุมัติ') : t('ยืนยันการยกเลิก')}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div style={{ fontSize: 13, color: COLOR.ink, fontWeight: 500 }}>{row.studentName}</div>
        <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.8 }}>{row.activityTitle}</div>

        {!rejecting ? (
          <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.8 }}>
            {t('ใบลงทะเบียนจะเปลี่ยนเป็นยกเลิก และที่นั่งจะถูกคืนให้ผู้อื่นสมัครแทนได้ทันที')}
          </div>
        ) : null}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={300}
          autoFocus
          placeholder={
            rejecting
              ? t('เหตุผลที่ไม่อนุมัติ เช่น เลยกำหนดยกเลิกแล้ว')
              : t('ข้อความถึงนิสิต (ไม่บังคับ)')
          }
          aria-label={t('ข้อความถึงนิสิต')}
          style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11.5, color: COLOR.hint }}>{t('นิสิตจะเห็นข้อความนี้ในการแจ้งเตือน')}</div>
      </div>
    </ModalShell>
  );
}
