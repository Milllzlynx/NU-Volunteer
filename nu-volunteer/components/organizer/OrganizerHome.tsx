'use client';

import Link from 'next/link';
import { Badge, Button, EmptyState, Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { COLOR, glass } from '@/lib/design';

export type OrganizerStats = {
  activities: number;
  open: number;
  pending: number;
  participants: number;
  hoursAwarded: number;
};

export type UpcomingRow = {
  id: string;
  title: string;
  status: string;
  dateTh: string;
  dateEn: string;
  time: string;
  seatsFilled: number;
  seatsTotal: number;
  pending: number;
};

export function OrganizerHome({
  name,
  stats,
  upcoming,
}: {
  name: string;
  stats: OrganizerStats;
  upcoming: UpcomingRow[];
}) {
  const { t, isEn } = useApp();

  const cards = [
    { label: 'กิจกรรมทั้งหมด', value: String(stats.activities), icon: 'campaign', color: '#A774F7' },
    { label: 'เปิดรับสมัครอยู่', value: String(stats.open), icon: 'how_to_reg', color: '#63D2A1' },
    { label: 'ใบรออนุมัติ', value: String(stats.pending), icon: 'hourglass_top', color: '#F5A623' },
    { label: 'ผู้เข้าร่วมสะสม', value: String(stats.participants), icon: 'groups', color: '#7AB8FF' },
    { label: 'ชั่วโมงที่รับรองแล้ว', value: `${stats.hoursAwarded}`, icon: 'schedule', color: '#E97171' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {`${t('สวัสดี')} ${name}`}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('ภาพรวมกิจกรรมที่คุณดูแลอยู่')}
        </div>
      </div>

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
        <Link href="/organizer/activities/new">
          <Button variant="primary" icon="add">
            {t('สร้างกิจกรรม')}
          </Button>
        </Link>
        <Link href="/organizer/activities">
          <Button variant="secondary" icon="campaign">
            {t('จัดการกิจกรรม')}
          </Button>
        </Link>
        <Link href="/organizer/registrations">
          <Button variant="secondary" icon="groups">
            {stats.pending > 0 ? `${t('อนุมัติผู้เข้าร่วม')} (${stats.pending})` : t('ผู้เข้าร่วมกิจกรรม')}
          </Button>
        </Link>
      </div>

      {/* ── กิจกรรมที่กำลังจะถึง ── */}
      <div style={{ ...glass(20), padding: upcoming.length ? 18 : 0 }}>
        {upcoming.length ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="upcoming" size={19} style={{ color: COLOR.hint }} />
              <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
                {t('กิจกรรมที่กำลังจะถึง')}
              </h2>
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              {upcoming.map((u) => {
                const meta = ACTIVITY_STATUS_META[u.status] ?? ACTIVITY_STATUS_META.draft;
                return (
                  <Link
                    key={u.id}
                    href={`/organizer/activities/${u.id}`}
                    className="nuv-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 10px',
                      borderRadius: 13,
                      color: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: COLOR.ink }}>{u.title}</div>
                      <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3 }}>
                        {`${isEn ? u.dateEn : u.dateTh} · ${u.time}`}
                        {u.seatsTotal > 0 ? ` · ${u.seatsFilled}/${u.seatsTotal} ${t('ที่นั่ง')}` : ''}
                      </div>
                    </div>
                    {u.pending > 0 ? (
                      <Badge tone="warning" icon="hourglass_top" label={`${u.pending}`} />
                    ) : null}
                    <Badge tone={meta.tone} label={t(meta.label)} />
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon="event_busy"
            title={t('ยังไม่มีกิจกรรมที่กำลังจะถึง')}
            desc={t('สร้างกิจกรรมใหม่แล้วเผยแพร่ให้นิสิตเห็น')}
            action={
              <Link href="/organizer/activities/new">
                <Button variant="primary" icon="add">
                  {t('สร้างกิจกรรม')}
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
