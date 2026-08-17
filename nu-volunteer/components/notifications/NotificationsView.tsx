'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, Tabs, IconButton, Timestamp } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, notificationApi } from '@/lib/api';
import { COLOR, SEMANTIC, glass } from '@/lib/design';

/**
 * กล่องการแจ้งเตือนของฝั่งเจ้าหน้าที่ — ใช้ร่วมกันระหว่างผู้จัดกิจกรรมกับผู้ดูแลระบบ
 *
 * สองบทบาทนี้เห็นหน้าเดียวกันทุกส่วน ต่างกันแค่ "งานค้าง" ที่ดึงมาคนละชุด
 * กับข้อความตอนไม่มีอะไรค้าง จึงรับสองอย่างนั้นเป็น prop แทนที่จะทำสองคอมโพเนนต์
 * (ฝั่งนิสิตยังแยกอยู่ เพราะมีตัวกรองตามชนิดและการตั้งค่าการแจ้งเตือนของตัวเอง)
 */

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  /** เวลาที่สร้าง ส่งเป็น epoch ให้ <Timestamp> จัดรูปแบบเอง จะได้เปลี่ยนตามภาษาที่เลือก */
  createdAtMs: number;
};

/** งานค้างหนึ่งรายการที่รอให้เจ้าของหน้าลงมือ */
export type ActionAlert = {
  key: string;
  icon: string;
  title: string;
  body: string;
  href: string;
  count: number;
  severity: 'info' | 'warning' | 'danger';
};

/** ไอคอนประจำชนิดการแจ้งเตือน — ตรงกับค่า type ที่ฝั่งเซิร์ฟเวอร์เขียนลง Notification */
const TYPE_ICON: Record<string, string> = {
  approval: 'how_to_reg',
  reminder: 'alarm',
  message: 'forum',
  certificate: 'workspace_premium',
  kyf: 'volunteer_activism',
  system: 'campaign',
};

type TabKey = 'all' | 'unread';

export function NotificationsView({
  notifications,
  alerts,
  clearTitle,
  clearBody,
  emptyDesc,
}: {
  notifications: NotificationRow[];
  alerts: ActionAlert[];
  /** ข้อความตอนไม่มีงานค้าง — ต่างกันตามบทบาท เพราะ "ค้าง" คนละเรื่องกัน */
  clearTitle: string;
  clearBody: string;
  emptyDesc: string;
}) {
  const { t } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const visible = useMemo(
    () => (tab === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, tab],
  );

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* ── งานค้างที่ต้องลงมือ ── */}
      {alerts.length ? (
        <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="assignment_late" size={19} style={{ color: COLOR.hint }} />
            <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
              {t('งานที่รอคุณดำเนินการ')}
            </h2>
            <Badge tone="warning" label={String(alerts.length)} />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {alerts.map((a) => {
              const tone = SEMANTIC[a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'];
              return (
                <Link
                  key={a.key}
                  href={a.href}
                  className="nuv-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    color: 'inherit',
                    background: tone.bg,
                  }}
                >
                  <Icon name={a.icon} size={20} style={{ color: tone.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>
                      {`${t(a.title)} (${a.count})`}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.label, marginTop: 3, lineHeight: 1.7 }}>
                      {t(a.body)}
                    </div>
                  </div>
                  <Icon name="chevron_right" size={20} style={{ color: COLOR.hint, flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ ...glass(20), padding: 18, display: 'flex', alignItems: 'center', gap: 11 }}>
          <Icon name="check_circle" size={22} style={{ color: SEMANTIC.success.dot }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>{clearTitle}</div>
            <div style={{ fontSize: 12, color: COLOR.label, marginTop: 3 }}>{clearBody}</div>
          </div>
        </div>
      )}

      {/* ── กล่องการแจ้งเตือน ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Tabs
          items={[
            { key: 'all' as TabKey, label: t('ทั้งหมด'), count: notifications.length },
            { key: 'unread' as TabKey, label: t('ยังไม่อ่าน'), count: unread },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="mark_email_read"
            disabled={unread === 0 || busy === 'all'}
            loading={busy === 'all'}
            onClick={() => run('all', () => notificationApi.setAllRead(true))}
            style={SMALL_BTN}
          >
            {t('อ่านทั้งหมด')}
          </Button>
          <Button
            variant="secondary"
            icon="delete_sweep"
            disabled={notifications.length === unread || busy === 'clear'}
            loading={busy === 'clear'}
            onClick={() => run('clear', () => notificationApi.clearRead())}
            style={SMALL_BTN}
          >
            {t('ลบที่อ่านแล้ว')}
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="notifications_off"
            title={tab === 'unread' ? t('อ่านครบทุกรายการแล้ว') : t('ยังไม่มีการแจ้งเตือน')}
            desc={emptyDesc}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {visible.map((n) => {
            const working = busy === n.id;
            const inner = (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: n.read ? 'rgba(31,41,55,.06)' : 'rgba(167,116,247,.16)',
                    color: n.read ? COLOR.hint : '#7C2FD9',
                  }}
                >
                  <Icon name={TYPE_ICON[n.type] ?? 'notifications'} size={19} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: n.read ? 500 : 600,
                      color: COLOR.ink,
                      lineHeight: 1.5,
                    }}
                  >
                    {n.title}
                  </div>
                  {n.body ? (
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 3, lineHeight: 1.7 }}>
                      {n.body}
                    </div>
                  ) : null}
                  <Timestamp
                    date={n.createdAtMs}
                    variant="relative"
                    style={{ fontSize: 11, color: COLOR.hint, marginTop: 4 }}
                  />
                </div>
              </>
            );

            return (
              <div
                key={n.id}
                style={{
                  ...glass(16),
                  padding: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  // แถบซ้ายบอกว่ายังไม่อ่าน โดยไม่ต้องพึ่งสีพื้นอย่างเดียว
                  borderInlineStart: n.read ? '3px solid transparent' : '3px solid #A774F7',
                }}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, color: 'inherit' }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>{inner}</div>
                )}

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <IconButton
                    icon={n.read ? 'mark_email_unread' : 'mark_email_read'}
                    label={n.read ? t('ทำเป็นยังไม่อ่าน') : t('ทำเป็นอ่านแล้ว')}
                    disabled={working}
                    onClick={() => run(n.id, () => notificationApi.setRead(n.id, !n.read))}
                  />
                  <IconButton
                    icon="close"
                    label={t('ลบการแจ้งเตือน')}
                    disabled={working}
                    onClick={() => run(n.id, () => notificationApi.remove(n.id))}
                  />
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
