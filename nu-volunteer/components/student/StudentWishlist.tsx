'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, ColorBadge, EmptyState, ErrorNote, Icon } from '@/components/ui';
import { activityApi, errorMessage } from '@/lib/api';
import { COLOR, REG_STATUS, glass, seatStatus } from '@/lib/design';
import type { PublicActivity } from '@/components/landing/types';

export type SavedRegistration = {
  id: string;
  status: string;
  hoursAwarded: number;
  title: string;
  orgName: string;
  location: string;
  color: string;
  dateTh: string;
  dateEn: string;
};

export function StudentWishlist({
  activities,
  savedRegistrations,
  deadlineCount,
}: {
  activities: PublicActivity[];
  savedRegistrations: SavedRegistration[];
  deadlineCount: number;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const removeFavorite = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      // เส้นเดียวกับปุ่มหัวใจบนการ์ด — เรียกซ้ำคือสลับสถานะ จึงเป็นการเอาออก
      await activityApi.toggleFavorite(id);
      setConfirmId(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* เตือนกิจกรรมที่ถูกใจใกล้ปิดรับสมัคร — เกี่ยวกับรายการโปรดโดยตรง จึงยังอยู่หน้านี้ */}
      {deadlineCount ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 16px',
            borderRadius: 15,
            background: 'rgba(245,166,35,.16)',
            color: '#B45309',
            fontSize: 12.5,
          }}
        >
          <Icon name="hourglass_bottom" size={17} />
          {`${t('มีกิจกรรมที่ถูกใจใกล้ปิดรับสมัคร')} ${deadlineCount} ${t('รายการ')}`}
          <Link href="/student/notifications" style={{ marginInlineStart: 'auto', color: COLOR.link }}>
            {t('ดูการเตือน')}
          </Link>
        </div>
      ) : null}

      <ErrorNote>{error}</ErrorNote>

      {/* ── กิจกรรมที่กดถูกใจ ── */}
      <div style={{ ...glass(22), padding: activities.length ? 18 : 0 }}>
        {activities.length ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <Icon name="favorite" size={19} fill style={{ color: '#E97171' }} />
              <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('กิจกรรมที่ถูกใจ')}</span>
              <Badge tone="neutral" label={String(activities.length)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {activities.map((a) => {
                const seats = seatStatus(a.seatsFilled, a.seatsTotal);
                const busy = busyId === a.id;
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: 15,
                      borderRadius: 16,
                      background: 'rgba(255,255,255,.55)',
                      border: '1px solid rgba(255,255,255,.75)',
                      borderInlineStart: `4px solid ${a.category.color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                    }}
                  >
                    <ColorBadge
                      label={isEn ? a.category.labelEn || a.category.label : a.category.label}
                      color={a.category.color}
                    />
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{a.title}</div>

                    <div style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="calendar_today" size={14} />
                        {isEn ? a.dateEn : a.dateTh}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="place" size={14} />
                        {a.location || '—'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="groups" size={14} />
                        {`${a.seatsFilled}/${a.seatsTotal || '—'} ${t('ที่นั่ง')}`}
                      </span>
                    </div>

                    <Badge tone={seats.key === 'full' ? 'danger' : seats.key === 'almost' ? 'warning' : 'success'} dot label={t(seats.label)} />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                      <Link href={`/activities/${a.id}`}>
                        <Button variant="secondary" icon="visibility" style={{ padding: '8px 14px' }}>
                          {t('ดูรายละเอียด')}
                        </Button>
                      </Link>

                      {confirmId === a.id ? (
                        <>
                          <Button
                            variant="danger"
                            icon="heart_broken"
                            loading={busy}
                            onClick={() => removeFavorite(a.id)}
                            style={{ padding: '8px 14px' }}
                          >
                            {t('ยืนยันเอาออก')}
                          </Button>
                          <Button variant="secondary" onClick={() => setConfirmId(null)} style={{ padding: '8px 14px' }}>
                            {t('ไม่เอาออก')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          icon="favorite"
                          iconFill
                          onClick={() => setConfirmId(a.id)}
                          style={{ padding: '8px 14px' }}
                        >
                          {t('เอาออกจากรายการโปรด')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon="favorite_border"
            title={t('ยังไม่มีกิจกรรมที่ถูกใจ')}
            desc={t('กดรูปหัวใจบนการ์ดกิจกรรมเพื่อเก็บไว้ดูภายหลัง')}
            action={
              <Link href="/student/discover">
                <Button variant="primary" icon="travel_explore">
                  {t('ไปค้นหากิจกรรม')}
                </Button>
              </Link>
            }
          />
        )}
      </div>

      {/* ── การลงทะเบียนที่บันทึกไว้ ── */}
      {savedRegistrations.length ? (
        <div style={{ ...glass(22), padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Icon name="bookmark" size={19} style={{ color: '#63D2A1' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
              {t('การลงทะเบียนที่บันทึกไว้')}
            </span>
            <Badge tone="neutral" label={String(savedRegistrations.length)} />
          </div>
          <div style={{ fontSize: 12, color: COLOR.label, marginBottom: 14 }}>
            {t('ใบลงทะเบียนของกิจกรรมที่คุณกดถูกใจไว้')}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {savedRegistrations.map((r) => {
              const st = REG_STATUS[r.status];
              return (
                <div
                  key={r.id}
                  style={{
                    padding: 14,
                    borderRadius: 15,
                    background: 'rgba(255,255,255,.55)',
                    border: '1px solid rgba(255,255,255,.75)',
                    borderInlineStart: `4px solid ${r.color}`,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{r.title}</span>
                    {st ? <Badge tone={st.tone} icon={st.icon} label={t(st.label)} /> : null}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 7, fontSize: 12, color: COLOR.label }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="calendar_today" size={14} />
                      {isEn ? r.dateEn : r.dateTh}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="place" size={14} />
                      {r.location || '—'}
                    </span>
                    {r.hoursAwarded ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="verified" size={14} />
                        {`${r.hoursAwarded} ${t('ชั่วโมง')}`}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href="/student/registrations"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: COLOR.link, marginTop: 10 }}
                  >
                    <Icon name="arrow_forward" size={14} />
                    {t('ดูในหน้าการลงทะเบียน')}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

    </div>
  );
}
