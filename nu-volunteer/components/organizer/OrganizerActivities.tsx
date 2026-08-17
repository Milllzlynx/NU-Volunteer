'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, Tabs, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, SEMANTIC, glass } from '@/lib/design';
import type { SemanticTone } from '@/lib/design';

export type OrganizerActivityRow = {
  id: string;
  title: string;
  categoryLabel: string;
  categoryColor: string;
  status: string;
  dateTh: string;
  dateEn: string;
  time: string;
  location: string;
  hours: number;
  seatsTotal: number;
  seatsFilled: number;
  /** ใบที่ยังรออนุมัติ — ตัวเลขนี้คือสิ่งที่ผู้จัดต้องลงมือทำ */
  pending: number;
  /** true = กิจกรรมจบไปแล้ว ใช้แยกแท็บ "ผ่านมาแล้ว" ออกจากที่ยังไม่เกิด */
  past: boolean;
};

export const ACTIVITY_STATUS_META: Record<string, { label: string; tone: SemanticTone; icon: string }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral', icon: 'edit_note' },
  open: { label: 'เปิดรับสมัคร', tone: 'success', icon: 'how_to_reg' },
  closed: { label: 'ปิดรับสมัคร', tone: 'warning', icon: 'lock' },
  cancelled: { label: 'ยกเลิกแล้ว', tone: 'danger', icon: 'block' },
  done: { label: 'จบแล้ว', tone: 'purple', icon: 'verified' },
};

type TabKey = 'all' | 'draft' | 'open' | 'past';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'draft', label: 'ฉบับร่าง' },
  { key: 'open', label: 'เปิดรับสมัคร' },
  { key: 'past', label: 'ผ่านมาแล้ว' },
];

export function OrganizerActivities({ rows }: { rows: OrganizerActivityRow[] }) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((r) => r.status === 'draft').length,
      open: rows.filter((r) => r.status === 'open' && !r.past).length,
      past: rows.filter((r) => r.past).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'draft' && r.status !== 'draft') return false;
      if (tab === 'open' && !(r.status === 'open' && !r.past)) return false;
      if (tab === 'past' && !r.past) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
    });
  }, [rows, tab, query]);

  async function changeStatus(id: string, status: string) {
    setBusy(id);
    setError(null);
    try {
      await organizerApi.setActivityStatus(id, status);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await organizerApi.deleteActivity(id);
      setConfirmDelete(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <Link href="/organizer/activities/new">
          <Button variant="primary" icon="add">
            {t('สร้างกิจกรรม')}
          </Button>
        </Link>
      </div>

      <Tabs
        items={TABS.map((tb) => ({ key: tb.key, label: t(tb.label), count: counts[tb.key] }))}
        value={tab}
        onChange={setTab}
      />

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="campaign"
            title={t('ยังไม่มีกิจกรรมในหมวดนี้')}
            desc={t('สร้างกิจกรรมใหม่แล้วเผยแพร่ให้นิสิตเห็นบนหน้าแรกและหน้าค้นหา')}
            action={
              <Link href="/organizer/activities/new">
                <Button variant="primary" icon="add">
                  {t('สร้างกิจกรรม')}
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visible.map((r) => {
            const meta = ACTIVITY_STATUS_META[r.status] ?? ACTIVITY_STATUS_META.draft;
            const working = busy === r.id;

            return (
              <div key={r.id} style={{ ...glass(20), padding: 16, display: 'grid', gap: 11 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      width: 4,
                      alignSelf: 'stretch',
                      borderRadius: 4,
                      background: r.categoryColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                      {r.categoryLabel}
                      {r.location ? ` · ${r.location}` : ''}
                    </div>
                  </div>
                  <Badge tone={meta.tone} icon={meta.icon} label={t(meta.label)} />
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: COLOR.label }}>
                  <Stat icon="event" value={`${isEn ? r.dateEn : r.dateTh} · ${r.time}`} />
                  <Stat icon="schedule" value={`${r.hours} ${t('ชม.')}`} />
                  <Stat
                    icon="groups"
                    value={r.seatsTotal > 0 ? `${r.seatsFilled}/${r.seatsTotal} ${t('ที่นั่ง')}` : `${r.seatsFilled} ${t('คน')}`}
                  />
                  {r.pending > 0 ? (
                    <Link
                      href={`/organizer/registrations?activity=${r.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: SEMANTIC.warning.color,
                        fontWeight: 500,
                      }}
                    >
                      <Icon name="hourglass_top" size={15} />
                      {`${r.pending} ${t('ใบรออนุมัติ')}`}
                    </Link>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
                  <Link href={`/organizer/activities/${r.id}`}>
                    <Button variant="secondary" icon="edit" style={SMALL_BTN}>
                      {t('แก้ไข')}
                    </Button>
                  </Link>

                  <Link href={`/activities/${r.id}`}>
                    <Button variant="secondary" icon="visibility" style={SMALL_BTN}>
                      {t('ดูหน้ากิจกรรม')}
                    </Button>
                  </Link>

                  {r.status === 'draft' ? (
                    <Button
                      variant="primary"
                      icon="publish"
                      loading={working}
                      onClick={() => changeStatus(r.id, 'open')}
                      style={SMALL_BTN}
                    >
                      {t('เผยแพร่')}
                    </Button>
                  ) : null}

                  {r.status === 'open' ? (
                    <Button
                      variant="secondary"
                      icon="lock"
                      loading={working}
                      onClick={() => changeStatus(r.id, 'closed')}
                      style={SMALL_BTN}
                    >
                      {t('ปิดรับสมัคร')}
                    </Button>
                  ) : null}

                  {r.status === 'closed' ? (
                    <Button
                      variant="secondary"
                      icon="lock_open"
                      loading={working}
                      onClick={() => changeStatus(r.id, 'open')}
                      style={SMALL_BTN}
                    >
                      {t('เปิดรับสมัครอีกครั้ง')}
                    </Button>
                  ) : null}

                  {/* ลบได้เฉพาะฉบับร่าง — กิจกรรมที่เผยแพร่แล้วให้ยกเลิกเพื่อไม่ให้ข้อมูลนิสิตหายไปด้วย */}
                  {r.status === 'draft' ? (
                    confirmDelete === r.id ? (
                      <>
                        <Button
                          variant="danger"
                          icon="delete"
                          loading={working}
                          onClick={() => remove(r.id)}
                          style={SMALL_BTN}
                        >
                          {t('ยืนยันลบ')}
                        </Button>
                        <Button variant="secondary" onClick={() => setConfirmDelete(null)} style={SMALL_BTN}>
                          {t('ไม่ลบ')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        icon="delete"
                        onClick={() => setConfirmDelete(r.id)}
                        style={SMALL_BTN}
                      >
                        {t('ลบ')}
                      </Button>
                    )
                  ) : r.status !== 'cancelled' && r.status !== 'done' ? (
                    <Button
                      variant="danger"
                      icon="block"
                      loading={working}
                      onClick={() => changeStatus(r.id, 'cancelled')}
                      style={SMALL_BTN}
                    >
                      {t('ยกเลิกกิจกรรม')}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SMALL_BTN: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5, borderRadius: 11 };

function Stat({ icon, value }: { icon: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={15} style={{ color: COLOR.hint }} />
      {value}
    </span>
  );
}
