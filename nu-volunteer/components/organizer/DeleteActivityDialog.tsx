'use client';

import { useEffect, useState } from 'react';
import { Button, ErrorNote, Icon, inputStyle } from '@/components/ui';
import { ModalShell } from '@/components/activity/ModalShell';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, SEMANTIC } from '@/lib/design';

type Impact = {
  students: number;
  registrations: number;
  hours: number;
  certificates: number;
  activeCertificates: number;
  reviews: number;
};

/**
 * กล่องยืนยันการลบกิจกรรม — ใช้ร่วมกันทั้งฝั่งผู้ดูแลและฝั่งผู้จัด
 *
 * ต้องพิมพ์ชื่อกิจกรรมให้ตรงก่อนจึงกดลบได้ เพราะปุ่มลบอยู่ในแถวเดียวกับปุ่มอื่นที่กดบ่อย
 * และตอนนี้ลบกิจกรรมที่มีคนลงทะเบียนแล้วได้ด้วย การกดพลาดหนึ่งครั้งจึงกระทบนิสิตจริง
 *
 * ตัวเลขผลกระทบโหลดตอนเปิดกล่อง ไม่ได้มากับข้อมูลของแถว — ดูเหตุผลที่ปลายทาง impact
 */
export function DeleteActivityDialog({
  activityId,
  title,
  onCancel,
  onDeleted,
}: {
  activityId: string;
  title: string;
  onCancel: () => void;
  /** เรียกหลังลบสำเร็จ พร้อมจำนวนนิสิตที่ได้รับแจ้งเตือน */
  onDeleted: (affectedStudents: number) => void;
}) {
  const { t } = useApp();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    organizerApi
      .activityImpact(activityId)
      .then((res) => {
        if (alive) setImpact(res.impact);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [activityId]);

  /* เทียบแบบตัดช่องว่างหัวท้าย — ชื่อกิจกรรมไทยยาวและคัดลอกมาติดช่องว่างได้ง่าย
     แต่ไม่ลดรูปตัวพิมพ์ เพราะต้องการให้เป็นการยืนยันที่ตั้งใจจริง */
  const matches = typed.trim() === title.trim();

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await organizerApi.deleteActivity(activityId);
      onDeleted(res.affectedStudents);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const rows: { label: string; value: number; warn: boolean }[] = impact
    ? [
        { label: t('นิสิตที่ลงทะเบียนไว้'), value: impact.students, warn: impact.students > 0 },
        { label: t('ชั่วโมงที่รับรองแล้ว'), value: impact.hours, warn: impact.hours > 0 },
        { label: t('ใบประกาศที่ยังใช้งานได้'), value: impact.activeCertificates, warn: impact.activeCertificates > 0 },
        { label: t('รีวิว'), value: impact.reviews, warn: false },
      ]
    : [];

  return (
    <ModalShell icon="delete" title={t('ลบกิจกรรมนี้?')} onClose={onCancel} maxWidth={560}>
      <div style={{ display: 'grid', gap: 14 }}>
        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.ink, lineHeight: 1.7 }}>{title}</div>

        {impact === null && !error ? (
          <div style={{ fontSize: 12.5, color: COLOR.hint }}>{t('กำลังตรวจผลกระทบ...')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 8, padding: 14, borderRadius: 14, background: 'rgba(31,41,55,.04)' }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: COLOR.label, flex: 1 }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: r.warn ? SEMANTIC.danger.color : COLOR.body }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
          <Icon name="info" size={17} style={{ color: SEMANTIC.purple.color, flexShrink: 0, marginTop: 2 }} />
          <span>
            {t('กิจกรรมจะหายไปจากทุกหน้าที่ใช้เลือกดูกิจกรรม แต่ชั่วโมงที่รับรองแล้วและใบประกาศที่ออกไปแล้วของนิสิตยังอยู่ครบ และหน้าตรวจสอบใบประกาศยังใช้ได้ตามเดิม')}
          </span>
        </div>

        {impact && impact.students > 0 ? (
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: SEMANTIC.warning.color, lineHeight: 1.8 }}>
            <Icon name="notifications_active" size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {t('นิสิต {n} คนที่ลงทะเบียนไว้จะได้รับการแจ้งเตือน').replace('{n}', String(impact.students))}
            </span>
          </div>
        ) : null}

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: COLOR.label, lineHeight: 1.7 }}>
            {t('พิมพ์ชื่อกิจกรรมให้ตรงเพื่อยืนยัน')}
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            placeholder={title}
            aria-label={t('พิมพ์ชื่อกิจกรรมให้ตรงเพื่อยืนยัน')}
            style={inputStyle()}
          />
        </label>

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('ไม่ลบ')}
          </Button>
          <Button variant="danger" icon="delete" loading={busy} disabled={!matches} onClick={remove}>
            {t('ลบกิจกรรม')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
