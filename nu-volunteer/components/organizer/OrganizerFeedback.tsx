'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, EmptyState, Icon, Tabs, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, glass } from '@/lib/design';

export type ReviewRow = {
  id: string;
  stars: number;
  comment: string;
  authorName: string;
  authorFaculty: string;
  avatarUrl: string | null;
  activityId: string;
  activityTitle: string;
  categoryColor: string;
  dateTh: string;
  dateEn: string;
};

type StarFilter = 'all' | '5' | '4' | '3' | '2' | '1';

/** ดาวห้าดวงแบบอ่านอย่างเดียว — ตัวเลขกำกับไว้ให้โปรแกรมอ่านหน้าจอไม่ต้องนับไอคอน */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          fill={i <= value}
          style={{ color: i <= value ? '#F5A623' : 'rgba(31,41,55,.22)' }}
        />
      ))}
    </span>
  );
}

export function OrganizerFeedback({ rows }: { rows: ReviewRow[] }) {
  const { t, isEn } = useApp();

  const [activity, setActivity] = useState('');
  const [stars, setStars] = useState<StarFilter>('all');
  const [query, setQuery] = useState('');

  /** กิจกรรมที่มีรีวิวแล้วเท่านั้น — ตัวเลือกที่กรองแล้วไม่เหลืออะไรเลยไม่มีประโยชน์ */
  const activities = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.activityId, r.activityTitle);
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!activity || r.activityId === activity) &&
        (stars === 'all' || r.stars === Number(stars)) &&
        (!q || r.comment.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q)),
    );
  }, [rows, activity, stars, query]);

  /** ยอดรวมคิดจากรายการที่ผ่านตัวกรอง ตัวเลขสรุปจึงตรงกับรายการที่เห็นด้านล่างเสมอ */
  const summary = useMemo(() => {
    const total = filtered.length;
    const sum = filtered.reduce((s, r) => s + r.stars, 0);
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: filtered.filter((r) => r.stars === star).length,
    }));
    const withComment = filtered.filter((r) => r.comment.trim()).length;
    return {
      total,
      avg: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
      dist,
      withComment,
    };
  }, [filtered]);

  /** นับตามดาวจากชุดก่อนกรองดาว — ตัวเลขบนแท็บจึงไม่กลายเป็นศูนย์ทันทีที่เลือกแท็บอื่น */
  const starCounts = useMemo(() => {
    const base = rows.filter((r) => !activity || r.activityId === activity);
    return {
      all: base.length,
      5: base.filter((r) => r.stars === 5).length,
      4: base.filter((r) => r.stars === 4).length,
      3: base.filter((r) => r.stars === 3).length,
      2: base.filter((r) => r.stars === 2).length,
      1: base.filter((r) => r.stars === 1).length,
    };
  }, [rows, activity]);

  const active = Boolean(activity || query || stars !== 'all');

  if (!rows.length) {
    return (
      <div style={{ ...glass(22) }}>
        <EmptyState
          icon="reviews"
          title={t('ยังไม่มีรีวิว')}
          desc={t('นิสิตเขียนรีวิวได้หลังคุณรับรองชั่วโมงของกิจกรรมนั้นแล้ว')}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{t('รีวิว')}</div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('ความเห็นจากนิสิตที่เข้าร่วมกิจกรรมของคุณ')}
        </div>
      </div>

      {/* ── คะแนนเฉลี่ยและการกระจายดาว ── */}
      <div style={{ ...glass(22), padding: 18, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 22, alignItems: 'center' }}>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: COLOR.ink, lineHeight: 1.15 }}>
            {summary.avg != null ? summary.avg : '—'}
          </div>
          <Stars value={Math.round(summary.avg ?? 0)} size={18} />
          <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
            {`${summary.total} ${t('รีวิว')}`}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 7, minWidth: 0 }}>
          {summary.dist.map((d) => {
            const share = summary.total > 0 ? Math.round((d.count / summary.total) * 100) : 0;
            return (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11.5, color: COLOR.label, width: 30, flexShrink: 0 }}>
                  {`${d.star} ★`}
                </span>
                <div style={{ flex: 1, height: 9, borderRadius: 999, background: 'rgba(31,41,55,.08)', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ width: `${share}%`, height: '100%', background: '#F5A623', borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11.5, color: COLOR.body, width: 44, textAlign: 'end', flexShrink: 0 }}>
                  {d.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ตัวกรอง ── */}
      <div style={{ ...glass(20), padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 5, flex: 1, minWidth: 220 }}>
            <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('ค้นหาในความเห็น')}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('พิมพ์คำที่ต้องการค้นหา')}
              style={inputStyle(false)}
            />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('กิจกรรม')}</span>
            <select value={activity} onChange={(e) => setActivity(e.target.value)} style={{ ...inputStyle(false), width: 'auto', maxWidth: 280 }}>
              <option value="">{t('ทุกกิจกรรม')}</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          {active ? (
            <Button
              variant="secondary"
              icon="filter_alt_off"
              onClick={() => {
                setActivity('');
                setQuery('');
                setStars('all');
              }}
            >
              {t('ล้างตัวกรอง')}
            </Button>
          ) : null}
        </div>

        <Tabs
          value={stars}
          onChange={setStars}
          items={[
            { key: 'all', label: t('ทั้งหมด'), count: starCounts.all },
            { key: '5', label: '5 ★', count: starCounts[5] },
            { key: '4', label: '4 ★', count: starCounts[4] },
            { key: '3', label: '3 ★', count: starCounts[3] },
            { key: '2', label: '2 ★', count: starCounts[2] },
            { key: '1', label: '1 ★', count: starCounts[1] },
          ]}
        />
      </div>

      {/* ── รายการรีวิว ── */}
      {!filtered.length ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon="filter_alt_off"
            title={t('ไม่พบรีวิวที่ตรงกับตัวกรอง')}
            desc={t('ลองล้างตัวกรองหรือเลือกจำนวนดาวอื่น')}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ ...glass(18), padding: 16, display: 'flex', gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${r.categoryColor}, #A774F7)`,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  overflow: 'hidden',
                }}
              >
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt="" className="nuv-noinv" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  r.authorName.trim().charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>{r.authorName}</span>
                  <Stars value={r.stars} />
                  <span style={{ marginInlineStart: 'auto', fontSize: 11.5, color: COLOR.hint, whiteSpace: 'nowrap' }}>
                    {isEn ? r.dateEn : r.dateTh}
                  </span>
                </div>

                {r.authorFaculty ? (
                  <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>{r.authorFaculty}</div>
                ) : null}

                {r.comment.trim() ? (
                  <p style={{ margin: '9px 0 0', fontSize: 13, color: COLOR.body, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {r.comment}
                  </p>
                ) : (
                  <p style={{ margin: '9px 0 0', fontSize: 12.5, color: COLOR.hint, fontStyle: 'italic' }}>
                    {t('ให้ดาวโดยไม่ได้เขียนความเห็น')}
                  </p>
                )}

                <Link
                  href={`/organizer/activities/${r.activityId}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: COLOR.label }}
                >
                  <Icon name="campaign" size={15} />
                  {r.activityTitle}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {active ? (
        <div style={{ fontSize: 12.5, color: COLOR.body }}>
          {`${t('ผลตามตัวกรอง')}: ${filtered.length} ${t('รีวิว')} · ${summary.withComment} ${t('รายการมีความเห็น')}`}
        </div>
      ) : null}
    </div>
  );
}
