'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorNote, Icon, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { GuestNotice } from '@/components/activity/GuestNotice';
import { Stars, StarPicker } from '@/components/activity/Stars';
import { PageHead } from '@/components/activity/PageHead';
import { activityApi, errorMessage } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';
import type { ActivityDetailView } from '@/lib/activityDetail';

type Review = ActivityDetailView['reviews'][number];

const MAX_COMMENT = 500;

/**
 * ความเห็นและคะแนนของกิจกรรม — หน้าเต็มของตัวเอง (/activities/:id/reviews)
 *
 * สิทธิ์การเขียนไม่ได้ผูกกับ "เข้าสู่ระบบแล้ว" แต่ผูกกับ "เข้าร่วมจนจบแล้ว" (canReview)
 * ตามกติกาเดิมของระบบ — เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นเสมอ ค่าที่ส่งมาที่นี่ใช้แค่ตัดสินใจว่าจะโชว์ฟอร์มไหม
 */
export function ReviewsView({ activity }: { activity: ActivityDetailView }) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const a = activity;

  const [rows, setRows] = useState<Review[]>(a.reviews);
  const [error, setError] = useState<string | null>(null);

  // ฟอร์ม — เติมค่ารีวิวเดิมของผู้ใช้ไว้ เพราะการส่งซ้ำคือการแก้ของเดิม
  const [stars, setStars] = useState(a.myReview?.stars ?? 5);
  const [comment, setComment] = useState(a.myReview?.comment ?? '');
  const [editing, setEditing] = useState(a.myReview != null);
  const [saving, setSaving] = useState(false);

  // canSeeParticipants เป็น true ก็ต่อเมื่อเข้าสู่ระบบแล้ว ใช้แยกผู้เยี่ยมชมออกจากนิสิตที่ยังรีวิวไม่ได้
  const signedIn = a.canSeeParticipants;

  /** คะแนนเฉลี่ยคำนวณจากรายการที่ถืออยู่ เพื่อให้ขยับตามทันทีที่ผู้ใช้ส่งรีวิวของตัวเอง */
  const avg = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + r.stars, 0) / rows.length) * 10) / 10
    : null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await activityApi.review(a.id, { stars, comment: comment.trim() });
      // แทนที่รีวิวเดิมของตัวเองถ้ามี ไม่งั้นวางไว้บนสุดตามลำดับใหม่สุดก่อน
      setRows((prev) => [res.review, ...prev.filter((r) => r.id !== res.review.id)]);
      setEditing(true);
      // ให้ฝั่งเซิร์ฟเวอร์เรนเดอร์ค่าที่บันทึกจริงกลับมาทับ เผื่อมีการปรับข้อความหรือสิทธิ์
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const over = comment.length > MAX_COMMENT;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHead activity={a} icon="reviews" title={t('รีวิวจากผู้เข้าร่วม')} countLabel={`${rows.length}`} />

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* ── คะแนนเฉลี่ย ── */}
      <div style={{ ...glass(20), padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {avg != null ? (
          <>
            <span style={{ fontSize: 34, fontWeight: 700, color: COLOR.ink, lineHeight: 1.2 }}>
              {avg.toFixed(1)}
            </span>
            <div style={{ display: 'grid', gap: 4 }}>
              <Stars value={Math.round(avg)} size={19} />
              <span style={{ fontSize: 12, color: COLOR.hint }}>{`${rows.length} ${t('รีวิว')}`}</span>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 13, color: COLOR.label }}>{t('ยังไม่มีรีวิวสำหรับกิจกรรมนี้')}</span>
        )}
      </div>

      {/* ── ฟอร์มเขียนรีวิว ── */}
      {a.canReview ? (
        <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 11 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>
            {editing ? t('แก้ไขรีวิวของคุณ') : t('เขียนรีวิวของคุณ')}
          </div>

          <StarPicker value={stars} onChange={setStars} />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={MAX_COMMENT}
            placeholder={t('เล่าประสบการณ์ของคุณให้เพื่อนนิสิตฟัง (ไม่บังคับ)')}
            aria-label={t('ความเห็นของคุณ')}
            style={{ ...inputStyle(over), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11.5, color: over ? '#C2410C' : COLOR.hint }}>
              {`${comment.length}/${MAX_COMMENT}`}
            </span>
            <Button
              variant="primary"
              icon="send"
              loading={saving}
              disabled={over}
              onClick={submit}
              style={{ marginInlineStart: 'auto', padding: '9px 16px', fontSize: 13 }}
            >
              {editing ? t('บันทึกการแก้ไข') : t('ส่งรีวิว')}
            </Button>
          </div>
        </div>
      ) : !signedIn ? (
        <div style={{ ...glass(20), padding: 18 }}>
          <GuestNotice
            text={t('เข้าสู่ระบบเพื่อดูชื่อผู้รีวิวแบบเต็มและเขียนรีวิวของคุณเอง')}
            cta={t('เข้าสู่ระบบ')}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 16px',
            borderRadius: 15,
            background: 'rgba(122,184,255,.14)',
            color: '#2E7BC4',
            fontSize: 12.5,
            lineHeight: 1.7,
          }}
        >
          <Icon name="info" size={17} style={{ flexShrink: 0 }} />
          {t('เขียนรีวิวได้หลังเข้าร่วมกิจกรรมนี้จนจบแล้ว')}
        </div>
      )}

      {/* ── รายการรีวิว ── */}
      {rows.length === 0 ? (
        <div style={{ ...glass(20), padding: 18, textAlign: 'center', color: COLOR.label, fontSize: 13 }}>
          <Icon name="reviews" size={40} style={{ color: '#CBD5E1' }} />
          <div style={{ marginTop: 12, paddingBottom: 12 }}>{t('ยังไม่มีใครเขียนรีวิว')}</div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ ...glass(18), padding: 16, display: 'flex', gap: 13 }}>
              <Avatar name={r.author} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink }}>{r.author}</span>
                  <Stars value={r.stars} />
                  <span style={{ fontSize: 11.5, color: COLOR.hint, marginInlineStart: 'auto' }}>
                    {isEn ? r.dateEn : r.dateTh}
                  </span>
                </div>
                {r.comment ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: COLOR.body,
                      lineHeight: 1.85,
                      marginTop: 7,
                      textWrap: 'pretty',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {r.comment}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
