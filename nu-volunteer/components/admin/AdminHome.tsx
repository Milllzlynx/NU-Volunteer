'use client';

import Link from 'next/link';
import { Button, EmptyState, Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, glass } from '@/lib/design';

export type AdminStats = {
  users: number;
  students: number;
  organizers: number;
  suspended: number;
  activities: number;
  openActivities: number;
  hoursAwarded: number;
  deletionRequests: number;
  unreadContact: number;
};

export type LogRow = {
  id: string;
  level: string;
  text: string;
  actor: string | null;
  atTh: string;
  atEn: string;
};

/** สีของระดับความรุนแรงใน System Log — ตรงกับชุดสีที่ใช้ทั้งระบบ */
const LEVEL_COLOR: Record<string, string> = {
  info: '#7AB8FF',
  success: '#63D2A1',
  warning: '#F5A623',
  error: '#E4572E',
};

/**
 * แดชบอร์ดผู้ดูแลระบบ — ภาพรวมทั้งระบบ ไม่ใช่ของกิจกรรมใดกิจกรรมหนึ่ง
 *
 * เลือกตัวเลขที่ "ต้องมีคนทำอะไรสักอย่าง" ขึ้นก่อน (คำขอลบบัญชี ข้อความที่ยังไม่อ่าน
 * บัญชีที่ถูกระงับ) เพราะตัวเลขรวมอย่างจำนวนผู้ใช้ดูสวยแต่ไม่ได้บอกว่าวันนี้ต้องทำอะไร
 */
export function AdminHome({
  name,
  stats,
  logs,
}: {
  name: string;
  stats: AdminStats;
  logs: LogRow[];
}) {
  const { t, isEn } = useApp();

  const cards = [
    { label: 'ผู้ใช้งานทั้งหมด', value: String(stats.users), icon: 'manage_accounts', color: '#A774F7' },
    { label: 'นิสิต', value: String(stats.students), icon: 'school', color: '#7AB8FF' },
    { label: 'ผู้จัดกิจกรรม', value: String(stats.organizers), icon: 'campaign', color: '#63D2A1' },
    { label: 'บัญชีที่ถูกระงับ', value: String(stats.suspended), icon: 'block', color: '#E4572E' },
    { label: 'กิจกรรมทั้งหมด', value: String(stats.activities), icon: 'event', color: '#F5A623' },
    { label: 'เปิดรับสมัครอยู่', value: String(stats.openActivities), icon: 'how_to_reg', color: '#63D2A1' },
    { label: 'ชั่วโมงที่รับรองแล้ว', value: String(stats.hoursAwarded), icon: 'schedule', color: '#E97171' },
  ];

  /** งานค้างที่ต้องมีคนตัดสินใจ — ไม่มีค้างก็ไม่ต้องขึ้นแถบให้รก */
  const queue = [
    stats.deletionRequests > 0
      ? {
          key: 'deletion',
          icon: 'person_remove',
          text: `${t('คำขอลบบัญชีรอพิจารณา')} ${stats.deletionRequests} ${t('รายการ')}`,
          href: '/admin/users?filter=deletion',
        }
      : null,
    stats.unreadContact > 0
      ? {
          key: 'contact',
          icon: 'mail',
          text: `${t('ข้อความที่ยังไม่ได้อ่าน')} ${stats.unreadContact} ${t('รายการ')}`,
          href: '/admin/contact',
        }
      : null,
  ].filter((x): x is { key: string; icon: string; text: string; href: string } => x != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {`${t('สวัสดี')} ${name}`}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('ภาพรวมทั้งระบบ NU Volunteer')}
        </div>
      </div>

      {/* ── งานค้าง ── */}
      {queue.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {queue.map((q) => (
            <Link
              key={q.key}
              href={q.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 16px',
                borderRadius: 15,
                background: 'rgba(245,166,35,.14)',
                color: '#A66112',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              <Icon name={q.icon} size={18} style={{ flexShrink: 0 }} />
              {q.text}
              <Icon name="chevron_right" size={18} style={{ marginInlineStart: 'auto' }} />
            </Link>
          ))}
        </div>
      ) : null}

      {/* ── ตัวเลขสรุป ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...glass(18), padding: 16, display: 'grid', gap: 8 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${c.color}28`,
                color: c.color,
              }}
            >
              <Icon name={c.icon} size={20} />
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: COLOR.ink }}>{c.value}</span>
            <span style={{ fontSize: 12, color: COLOR.label }}>{t(c.label)}</span>
          </div>
        ))}
      </div>

      {/* ── ทางลัด ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/admin/users">
          <Button variant="primary" icon="manage_accounts">
            {t('จัดการผู้ใช้งาน')}
          </Button>
        </Link>
        {/* /admin/activities คือหน้ารายการกิจกรรมของผู้ดูแล ตรงกับเมนู "กิจกรรม" ในแถบข้าง
            ไม่ใช่ /activities ซึ่งมีแต่ /activities/[id] จึงไม่มีหน้ารายการให้เปิด */}
        <Link href="/admin/activities">
          <Button variant="secondary" icon="campaign">
            {t('ดูกิจกรรมทั้งหมด')}
          </Button>
        </Link>
      </div>

      {/* ── ความเคลื่อนไหวล่าสุดของระบบ ── */}
      <div style={{ ...glass(20), padding: logs.length ? 18 : 0 }}>
        {logs.length ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="receipt_long" size={19} style={{ color: COLOR.hint }} />
              <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
                {t('ความเคลื่อนไหวล่าสุดของระบบ')}
              </h2>
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="nuv-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, borderRadius: 13 }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: LEVEL_COLOR[l.level] ?? LEVEL_COLOR.info,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: COLOR.body, lineHeight: 1.7 }}>
                    {l.text}
                    {l.actor ? (
                      <span style={{ color: COLOR.hint }}>{` · ${l.actor}`}</span>
                    ) : null}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: COLOR.hint, whiteSpace: 'nowrap' }}>
                    {isEn ? l.atEn : l.atTh}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon="receipt_long"
            title={t('ยังไม่มีบันทึกของระบบ')}
            desc={t('เหตุการณ์ที่ระบบบันทึกไว้จะขึ้นที่นี่')}
          />
        )}
      </div>
    </div>
  );
}
