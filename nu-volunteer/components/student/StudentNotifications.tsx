'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, EmptyState, ErrorNote, Icon, Tabs, Timestamp } from '@/components/ui';
import { errorMessage, notificationApi } from '@/lib/api';
import { COLOR, NOTIF_TYPE, SEMANTIC, glass } from '@/lib/design';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAtMs: number;
};

export type AlertRow = {
  key: string;
  kind: 'activity-reminder' | 'deadline';
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: 'info' | 'warning' | 'danger';
  daysLeft: number;
};

type TabKey = 'all' | 'unread' | string;

export function StudentNotifications({
  notifications,
  alerts,
}: {
  notifications: NotificationRow[];
  alerts: AlertRow[];
}) {
  const { t } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('all');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** ลบทีเดียวหลายใบเป็นการกระทำที่ย้อนกลับไม่ได้ — ถามยืนยันเหมือนปุ่มลบรายใบ */
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  const run = async (id: string | null, fn: () => Promise<unknown>) => {
    setBusyId(id ?? '*');
    setError(null);
    try {
      await fn();
      setConfirmId(null);
      setConfirmClear(false);
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

  /** ชนิดที่มีอยู่จริงเท่านั้น — ไม่ขึ้นแท็บว่างให้กดแล้วไม่เจออะไร */
  const presentTypes = useMemo(() => {
    const seen = new Set(notifications.map((n) => n.type));
    return Object.keys(NOTIF_TYPE).filter((k) => seen.has(k));
  }, [notifications]);

  const shown = useMemo(() => {
    if (tab === 'all') return notifications;
    if (tab === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  const tabs = [
    { key: 'all' as TabKey, label: t('ทั้งหมด'), count: notifications.length },
    { key: 'unread' as TabKey, label: t('ยังไม่อ่าน'), count: unreadCount },
    ...presentTypes.map((k) => ({
      key: k as TabKey,
      label: t(NOTIF_TYPE[k].label),
      count: notifications.filter((n) => n.type === k).length,
    })),
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── การเตือนอัตโนมัติ (คำนวณสดจากกิจกรรมและกำหนดปิดรับสมัคร) ── */}
      {alerts.length ? (
        <div style={{ ...glass(22), padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Icon name="notifications_active" size={20} style={{ color: '#B45309' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink }}>{t('เตือนอัตโนมัติ')}</span>
            <Badge tone="warning" label={String(alerts.length)} />
          </div>
          <div style={{ fontSize: 12, color: COLOR.label, marginBottom: 14 }}>
            {t('คำนวณสดจากกิจกรรมที่คุณลงทะเบียนและกำหนดปิดรับสมัคร ไม่ต้องกดอ่าน')}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {alerts.map((a) => {
              const tone = SEMANTIC[a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'];
              return (
                <div
                  key={a.key}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 14,
                    borderRadius: 15,
                    background: tone.bg,
                    borderInlineStart: `4px solid ${tone.dot}`,
                  }}
                >
                  <Icon
                    name={a.kind === 'deadline' ? 'hourglass_bottom' : 'event_upcoming'}
                    size={20}
                    style={{ color: tone.color, flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 4, lineHeight: 1.7 }}>{a.body}</div>
                  </div>
                  {a.link ? (
                    <Link href={a.link} style={{ alignSelf: 'center', flexShrink: 0 }}>
                      <Button variant="secondary" icon="arrow_forward" style={{ padding: '8px 14px' }}>
                        {t('ไปดู')}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── แถบเครื่องมือ ── */}
      <div style={{ ...glass(20), padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Icon name="inbox" size={20} style={{ color: '#A774F7' }} />
        <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
          {t('กล่องการแจ้งเตือน')}
        </span>
        {unreadCount ? <Badge tone="danger" dot label={`${unreadCount} ${t('ยังไม่อ่าน')}`} /> : null}

        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="mark_email_read"
            disabled={!unreadCount || busyId === '*'}
            onClick={() => run(null, () => notificationApi.setAllRead(true))}
            style={{ padding: '9px 15px' }}
          >
            {t('อ่านทั้งหมด')}
          </Button>
          {/* ถ้าจำนวนที่อ่านแล้วกลายเป็น 0 ระหว่างเปิดคำถามยืนยัน ให้ยุบกลับเป็นปุ่มปกติเอง */}
          {confirmClear && readCount ? (
            <>
              <Button
                variant="danger"
                icon="delete_sweep"
                loading={busyId === '*'}
                onClick={() => run(null, () => notificationApi.clearRead())}
                style={{ padding: '9px 15px' }}
              >
                {`${t('ยืนยันลบ')} ${readCount} ${t('รายการ')}`}
              </Button>
              <Button
                variant="secondary"
                disabled={busyId === '*'}
                onClick={() => setConfirmClear(false)}
                style={{ padding: '9px 15px' }}
              >
                {t('ไม่ลบ')}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              icon="delete_sweep"
              disabled={!readCount || busyId === '*'}
              onClick={() => setConfirmClear(true)}
              style={{ padding: '9px 15px' }}
            >
              {t('ลบที่อ่านแล้ว')}
            </Button>
          )}
          <Link href="/student/settings">
            <Button variant="secondary" icon="tune" style={{ padding: '9px 15px' }}>
              {t('ตั้งค่าการแจ้งเตือน')}
            </Button>
          </Link>
        </div>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} />

      <ErrorNote>{error}</ErrorNote>

      {/* ── รายการ ── */}
      <div style={{ ...glass(22), padding: shown.length ? 14 : 0 }}>
        {!shown.length ? (
          <EmptyState
            icon="notifications_off"
            title={t('ไม่มีการแจ้งเตือนในหมวดนี้')}
            desc={t('เมื่อมีการอนุมัติ ใบประกาศ หรือประกาศจากระบบ จะขึ้นที่นี่')}
          />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {shown.map((n) => {
              const meta = NOTIF_TYPE[n.type] ?? NOTIF_TYPE.system;
              const busy = busyId === n.id;
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 14,
                    borderRadius: 15,
                    background: n.read ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.72)',
                    border: '1px solid rgba(255,255,255,.75)',
                    borderInlineStart: `4px solid ${n.read ? 'rgba(31,41,55,.14)' : SEMANTIC[meta.tone].dot}`,
                    opacity: n.read ? 0.82 : 1,
                  }}
                >
                  <Icon
                    name={meta.icon}
                    size={20}
                    style={{ color: SEMANTIC[meta.tone].color, flexShrink: 0, marginTop: 2 }}
                  />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      {/* จุดแดงบอกยังไม่อ่าน แต่ยังมีข้อความ "ยังไม่อ่าน" กำกับ ไม่พึ่งสีอย่างเดียว */}
                      {!n.read ? (
                        <span
                          aria-label={t('ยังไม่อ่าน')}
                          style={{ width: 7, height: 7, borderRadius: '50%', background: '#E97171' }}
                        />
                      ) : null}
                      <span style={{ fontSize: 14, fontWeight: n.read ? 500 : 600, color: COLOR.ink }}>
                        {n.title}
                      </span>
                      <Badge tone={meta.tone} label={t(meta.label)} />
                    </div>

                    {n.body ? (
                      <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 6, lineHeight: 1.7 }}>{n.body}</div>
                    ) : null}

                    {/* เวลาสัมพัทธ์อ่านง่ายกว่าในกล่องแจ้งเตือน — เกิน 7 วันจะกลับไปแสดงวันที่จริงเอง */}
                    <Timestamp
                      date={n.createdAtMs}
                      variant="relative"
                      style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 8 }}
                    />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {n.link ? (
                        <Link href={n.link}>
                          <Button variant="secondary" icon="arrow_forward" style={{ padding: '8px 14px' }}>
                            {t('เปิดดู')}
                          </Button>
                        </Link>
                      ) : null}

                      <Button
                        variant="secondary"
                        icon={n.read ? 'mark_email_unread' : 'mark_email_read'}
                        loading={busy}
                        onClick={() => run(n.id, () => notificationApi.setRead(n.id, !n.read))}
                        style={{ padding: '8px 14px' }}
                      >
                        {n.read ? t('ทำเป็นยังไม่อ่าน') : t('ทำเป็นอ่านแล้ว')}
                      </Button>

                      {confirmId === n.id ? (
                        <>
                          <Button
                            variant="danger"
                            icon="delete"
                            loading={busy}
                            onClick={() => run(n.id, () => notificationApi.remove(n.id))}
                            style={{ padding: '8px 14px' }}
                          >
                            {t('ยืนยันลบ')}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmId(null)}
                            style={{ padding: '8px 14px' }}
                          >
                            {t('ไม่ลบ')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          icon="delete"
                          onClick={() => setConfirmId(n.id)}
                          style={{ padding: '8px 14px' }}
                        >
                          {t('ลบ')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
