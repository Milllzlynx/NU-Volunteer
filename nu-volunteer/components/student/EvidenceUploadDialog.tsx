'use client';

import { useState } from 'react';
import { Button, ErrorNote, Field, Icon, inputStyle } from '@/components/ui';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { ModalShell } from '@/components/activity/ModalShell';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, registrationApi } from '@/lib/api';
import { COLOR, SEMANTIC } from '@/lib/design';

/**
 * ส่งหลักฐานการเข้าร่วมให้ผู้จัดตรวจ
 *
 * ใช้ ImageDropField ตัวเดียวกับฟอร์มอื่นในระบบ จึงได้ทั้งลากวาง เลือกไฟล์ ย่อขนาด
 * และข้อความบอกเหตุผลตอนไฟล์ไม่ผ่าน มาเหมือนกันหมดโดยไม่ต้องเขียนใหม่
 *
 * รับเฉพาะรูปภาพ เพราะทั้งระบบเก็บไฟล์เป็น data URL ในฐานข้อมูล ไม่มีที่เก็บไฟล์แยก
 * — วิดีโอหรือ PDF จะทำให้แถวใหญ่เกินกว่าที่ตารางนี้รับไหว
 */
export function EvidenceUploadDialog({
  registrationId,
  activityTitle,
  /** true = เคยส่งแล้วแต่ผู้จัดตีกลับ ข้อความในกล่องจะพูดถึงการส่งใหม่แทน */
  resubmit,
  onClose,
  onDone,
}: {
  registrationId: string;
  activityTitle: string;
  resubmit: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useApp();
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!image) return;
    setSaving(true);
    setError(null);
    try {
      await registrationApi.submitEvidence(registrationId, { fileUrl: image, note: note.trim() });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <ModalShell
      icon="attach_file"
      title={resubmit ? t('ส่งหลักฐานใหม่') : t('ส่งหลักฐานการเข้าร่วม')}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('ยกเลิก')}
          </Button>
          <Button variant="primary" icon="send" loading={saving} disabled={!image} onClick={submit}>
            {t('ส่งหลักฐาน')}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div style={{ fontSize: 13, fontWeight: 500, color: COLOR.ink, lineHeight: 1.6 }}>
          {activityTitle}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 9,
            padding: '10px 12px',
            borderRadius: 13,
            background: SEMANTIC.warning.bg,
            color: SEMANTIC.warning.color,
          }}
        >
          <Icon name="info" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, lineHeight: 1.75 }}>
            {t('แนบรูปที่เห็นว่าคุณอยู่ในกิจกรรมจริง เช่น ภาพหมู่หน้างานหรือภาพขณะทำกิจกรรม ผู้จัดจะตรวจก่อนรับรองชั่วโมงให้')}
          </span>
        </div>

        <ImageDropField
          value={image}
          onChange={setImage}
          icon="add_a_photo"
          title={t('รูปหลักฐานการเข้าร่วม')}
          height={190}
        />

        <Field label={t('คำอธิบายเพิ่มเติม')} hint={t('ไม่บังคับ — เขียนได้ถ้าอยากอธิบายภาพให้ผู้จัดเข้าใจ')}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={t('เช่น ถ่ายตอนช่วงเก็บขยะริมหาด ช่วงบ่าย')}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
          />
        </Field>
      </div>
    </ModalShell>
  );
}
