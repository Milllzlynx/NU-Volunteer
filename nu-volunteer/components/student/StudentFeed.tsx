'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, EmptyState, Icon, Tabs } from '@/components/ui';
import { COLOR, SEMANTIC, glass, type SemanticTone } from '@/lib/design';
import type { TimelineEvent, TimelineKind } from '@/lib/timeline';

/** สีและป้ายของแต่ละกลุ่มเหตุการณ์ */
const KIND: Record<TimelineKind, { label: string; tone: SemanticTone }> = {
  registration: { label: 'การสมัคร', tone: 'info' },
  participation: { label: 'การเข้าร่วม', tone: 'purple' },
  achievement: { label: 'ผลสำเร็จ', tone: 'success' },
  personal: { label: 'ส่วนตัว', tone: 'neutral' },
};

type TabKey = 'all' | TimelineKind;

export function StudentFeed({ events }: { events: TimelineEvent[] }) {
  const { t, isEn } = useApp();
  const [tab, setTab] = useState<TabKey>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);

  const shown = useMemo(
    () => (tab === 'all' ? events : events.filter((e) => e.kind === tab)),
    [events, tab],
  );

  const tabs = [
    { key: 'all' as TabKey, label: t('ทั้งหมด'), count: events.length },
    ...(Object.keys(KIND) as TimelineKind[])
      .filter((k) => counts[k])
      .map((k) => ({ key: k as TabKey, label: t(KIND[k].label), count: counts[k] })),
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...glass(20), padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Icon name="history" size={20} style={{ color: '#A774F7' }} />
        <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
          {t('ความเคลื่อนไหวล่าสุด')}
        </span>
        <span style={{ fontSize: 12, color: COLOR.label }}>
          {`${events.length} ${t('รายการ')}`}
        </span>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {!shown.length ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon="history_toggle_off"
            title={t('ยังไม่มีความเคลื่อนไหว')}
            desc={t('เมื่อคุณสมัครกิจกรรม เช็กอิน หรือได้รับใบประกาศ รายการจะขึ้นที่นี่')}
          />
        </div>
      ) : (
        <div style={{ ...glass(22), padding: 18 }}>
          {/* เส้นไทม์ไลน์แนวตั้ง — จุดของแต่ละเหตุการณ์เกาะอยู่บนเส้นนี้ */}
          <div style={{ position: 'relative', display: 'grid', gap: 2 }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetInlineStart: 15,
                top: 6,
                bottom: 6,
                width: 2,
                background: 'rgba(31,41,55,.1)',
              }}
            />

            {shown.map((e) => {
              const meta = KIND[e.kind];
              const tone = SEMANTIC[meta.tone];
              return (
                <div key={e.key} style={{ display: 'flex', gap: 14, padding: '12px 0', position: 'relative' }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: tone.bg,
                      color: tone.color,
                      border: '2px solid rgba(255,255,255,.9)',
                      zIndex: 1,
                    }}
                  >
                    <Icon name={e.icon} size={17} />
                  </span>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>{t(e.title)}</span>
                      <Badge tone={meta.tone} label={t(meta.label)} />
                    </div>

                    {e.subject ? (
                      <div style={{ fontSize: 13, color: COLOR.body, marginTop: 3 }}>{e.subject}</div>
                    ) : null}

                    {e.detail ? (
                      <div style={{ fontSize: 12, color: COLOR.label, marginTop: 3 }}>{e.detail}</div>
                    ) : null}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 11.5, color: COLOR.hint }}>{isEn ? e.dateEn : e.dateTh}</span>
                      {e.link ? (
                        <Link
                          href={e.link}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: COLOR.link }}
                        >
                          <Icon name="arrow_forward" size={13} />
                          {t('เปิดดู')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
