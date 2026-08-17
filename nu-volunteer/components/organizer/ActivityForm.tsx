'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorNote, Field, Icon, inputStyle } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { ImageDropField } from '@/components/ui/ImageDropField';
import ActivityImageUploader, { GALLERY_SLOTS, toSlots } from '@/components/organizer/ActivityImageUploader';
import MapImageUploader from '@/components/organizer/MapImageUploader';
import { COVER_MAX_EDGE_PX } from '@/lib/imageFile';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, organizerApi, type ActivityFormPayload } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';
import type { PublicCategory } from '@/components/landing/types';

/**
 * ฟอร์มสร้าง/แก้ไขกิจกรรม — ใช้ร่วมกันทั้งสองหน้า
 *
 * ต่างกันแค่มีค่าเริ่มต้นกับไม่มี จึงไม่แยกเป็นสองคอมโพเนนต์
 * การตรวจความถูกต้องจริงอยู่ที่ lib/organizer.ts ฝั่งเซิร์ฟเวอร์ ที่นี่ตรวจแค่พอให้ผู้ใช้รู้ตัวก่อนกดส่ง
 */

export type ActivityFormValues = ActivityFormPayload;

export const EMPTY_ACTIVITY: ActivityFormValues = {
  title: '',
  categoryId: '',
  orgName: '',
  description: '',
  location: '',
  startAt: '',
  endAt: '',
  regOpenAt: '',
  regCloseAt: '',
  seatsTotal: 0,
  hours: 0,
  status: 'draft',
  requiresApproval: true,
  photo: '',
  mapLink: '',
  mapImage: '',
  gallery: [],
  perks: '',
  prep: '',
  notes: '',
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'ฉบับร่าง', hint: 'ยังไม่แสดงให้นิสิตเห็น' },
  { value: 'open', label: 'เปิดรับสมัคร', hint: 'แสดงบนหน้าแรกและหน้าค้นหา' },
  { value: 'closed', label: 'ปิดรับสมัคร', hint: 'ยังเห็นได้แต่สมัครไม่ได้' },
  { value: 'cancelled', label: 'ยกเลิกกิจกรรม', hint: 'แจ้งว่ากิจกรรมถูกยกเลิก' },
];

export function ActivityForm({
  categories,
  initial,
  activityId,
}: {
  categories: PublicCategory[];
  initial?: ActivityFormValues;
  /** มีค่า = โหมดแก้ไข */
  activityId?: string;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();

  const [v, setV] = useState<ActivityFormValues>(initial ?? EMPTY_ACTIVITY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * ช่องภาพเก็บแยกจาก v.gallery เพราะช่องที่ยังว่างต้องคงตำแหน่งไว้ระหว่างกรอก
   * ส่วน v.gallery ที่ส่งขึ้นเซิร์ฟเวอร์เป็นรายการที่กรองช่องว่างออกแล้ว
   */
  const [gallerySlots, setGallerySlots] = useState<(string | null)[]>(() =>
    toSlots(initial?.gallery ?? []),
  );

  const set = <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    const payload: ActivityFormValues = {
      ...v,
      gallery: gallerySlots.filter((img): img is string => !!img),
    };
    try {
      if (activityId) await organizerApi.updateActivity(activityId, payload);
      else await organizerApi.createActivity(payload);
      router.push('/organizer/activities');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {/* ── ข้อมูลหลัก ── */}
      <FormSection step={1} icon="campaign" title={t('ข้อมูลกิจกรรม')}>
        <Field label={t('ชื่อกิจกรรม')} required>
          <input
            value={v.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={t('เช่น ปลูกป่าชายเลนฟื้นฟูชายฝั่ง')}
            style={inputStyle()}
          />
        </Field>

        <div className="nuv-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('หมวดหมู่')} required>
            <select value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)} style={inputStyle()}>
              <option value="">{t('— เลือกหมวดหมู่ —')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {isEn && c.labelEn ? c.labelEn : c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('หน่วยงาน / ชมรมที่จัด')}>
            <input
              value={v.orgName}
              onChange={(e) => set('orgName', e.target.value)}
              placeholder={t('เช่น ชมรมอนุรักษ์สิ่งแวดล้อม มน.')}
              style={inputStyle()}
            />
          </Field>
        </div>

        <Field label={t('รายละเอียดกิจกรรม')}>
          <textarea
            value={v.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            placeholder={t('อธิบายว่ากิจกรรมทำอะไร ที่ไหน และนิสิตจะได้อะไรกลับไป')}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.8, fontFamily: 'inherit' }}
          />
        </Field>

      </FormSection>

      {/* ── สถานที่ — ชื่อสถานที่ ลิงก์แผนที่ และภาพแผนที่ อยู่ด้วยกันทั้งหมด ── */}
      <FormSection step={2} icon="place" title={t('สถานที่')}>
        <Field label={t('สถานที่จัดกิจกรรม')}>
          <input
            value={v.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder={t('เช่น หาดบางแสน จ.ชลบุรี')}
            style={inputStyle()}
          />
        </Field>

        <Field
          label={t('ลิงก์แผนที่ (Google Maps)')}
          hint={t('เว้นว่างได้ ระบบจะสร้างลิงก์ค้นหาจากชื่อสถานที่ให้เอง')}
        >
          <input
            value={v.mapLink}
            onChange={(e) => set('mapLink', e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            style={inputStyle()}
          />
        </Field>

        <Field label={t('ภาพแผนที่')}>
          <MapImageUploader
            value={v.mapImage || null}
            onChange={(next) => set('mapImage', next ?? '')}
          />
        </Field>
      </FormSection>

      {/* ── เวลาและการรับสมัคร — เหลือเฉพาะวันเวลา ── */}
      <FormSection step={3} icon="event" title={t('เวลาและการรับสมัคร')}>
        <div className="nuv-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('เริ่มกิจกรรม')} required>
            <DateTimeField value={v.startAt} onChange={(next) => set('startAt', next)} withTime />
          </Field>
          <Field label={t('สิ้นสุดกิจกรรม')} required>
            <DateTimeField value={v.endAt} onChange={(next) => set('endAt', next)} withTime />
          </Field>
          <Field label={t('เปิดรับสมัคร')} hint={t('เว้นว่าง = รับตั้งแต่เผยแพร่')}>
            <DateTimeField value={v.regOpenAt} onChange={(next) => set('regOpenAt', next)} withTime />
          </Field>
          <Field label={t('ปิดรับสมัคร')} hint={t('เว้นว่าง = รับจนถึงวันจัดกิจกรรม')}>
            <DateTimeField value={v.regCloseAt} onChange={(next) => set('regCloseAt', next)} withTime />
          </Field>
        </div>
      </FormSection>

      {/* ── รายละเอียดเพิ่มเติม — ที่นั่ง ชั่วโมง และข้อความประกอบทั้งหมด ── */}
      <FormSection step={4} icon="checklist" title={t('รายละเอียดเพิ่มเติม')}>
        <div className="nuv-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('จำนวนที่นั่ง')} hint={t('0 = ไม่จำกัด')}>
            <input
              type="number"
              min={0}
              value={v.seatsTotal}
              onChange={(e) => set('seatsTotal', Number(e.target.value))}
              style={inputStyle()}
            />
          </Field>
          <Field label={t('ชั่วโมงจิตอาสาที่ได้รับ')}>
            <input
              type="number"
              min={0}
              step={0.5}
              value={v.hours}
              onChange={(e) => set('hours', Number(e.target.value))}
              style={inputStyle()}
            />
          </Field>
        </div>

        <Field label={t('สิทธิประโยชน์ที่ได้รับ')} hint={t('หนึ่งบรรทัดต่อหนึ่งรายการ')}>
          <textarea
            value={v.perks}
            onChange={(e) => set('perks', e.target.value)}
            rows={3}
            placeholder={t('เกียรติบัตรและชั่วโมงจิตอาสา\nอาหารกลางวันและเครื่องดื่มฟรี')}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.8, fontFamily: 'inherit' }}
          />
        </Field>
        <Field label={t('สิ่งที่ต้องเตรียมมา')} hint={t('หนึ่งบรรทัดต่อหนึ่งรายการ')}>
          <textarea
            value={v.prep}
            onChange={(e) => set('prep', e.target.value)}
            rows={3}
            placeholder={t('หมวกและครีมกันแดด\nรองเท้าที่เปียกน้ำได้')}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.8, fontFamily: 'inherit' }}
          />
        </Field>
        <Field label={t('หมายเหตุพิเศษ')} hint={t('ข้อความอิสระ แสดงต่อท้ายรายละเอียดในหน้ากิจกรรม')}>
          <textarea
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder={t('เช่น งดใช้รถส่วนตัว มีรถรับส่งจากหน้ามหาวิทยาลัย')}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.8, fontFamily: 'inherit' }}
          />
        </Field>
      </FormSection>

      {/* ── ภาพประกอบกิจกรรม — ภาพหน้าปกกับภาพประกอบอยู่ด้วยกัน ── */}
      <FormSection step={5} icon="photo_library" title={t('ภาพประกอบกิจกรรม')}>
        <Field
          label={t('ภาพหน้าปก')}
          hint={t('ใช้บนการ์ดกิจกรรมและหัวหน้ารายละเอียด — เว้นว่างได้ ระบบจะใช้พื้นหลังตามสีหมวดหมู่แทน')}
        >
          <ImageDropField
            value={v.photo || null}
            onChange={(next) => set('photo', next ?? '')}
            icon="wallpaper"
            title={t('ภาพหน้าปกกิจกรรม')}
            height={200}
            maxEdge={COVER_MAX_EDGE_PX}
          />
        </Field>
        <ActivityImageUploader
          value={gallerySlots}
          onChange={setGallerySlots}
          maxImages={GALLERY_SLOTS}
        />
      </FormSection>

      {/* ── ตั้งค่าและการเผยแพร่ — ตัวเลือกที่ควบคุมพฤติกรรมของกิจกรรมทั้งหมด ── */}
      <FormSection step={6} icon="settings" title={t('ตั้งค่าและการเผยแพร่')}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={v.requiresApproval}
            onChange={(e) => set('requiresApproval', e.target.checked)}
            style={{ width: 17, height: 17, accentColor: '#A774F7', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: COLOR.body }}>
            {t('ต้องอนุมัติผู้สมัครก่อนจึงจะได้ที่นั่ง')}
          </span>
        </label>

        <span style={{ fontSize: 12, color: COLOR.label }}>{t('สถานะกิจกรรม')}</span>
        <div style={{ display: 'grid', gap: 8 }}>
          {STATUS_OPTIONS.map((o) => (
            <label
              key={o.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                padding: '11px 13px',
                borderRadius: 13,
                cursor: 'pointer',
                border: `1px solid ${v.status === o.value ? '#A774F7' : 'rgba(31,41,55,.1)'}`,
                background: v.status === o.value ? 'rgba(167,116,247,.09)' : 'rgba(255,255,255,.5)',
              }}
            >
              <input
                type="radio"
                name="activity-status"
                checked={v.status === o.value}
                onChange={() => set('status', o.value)}
                style={{ marginTop: 3, accentColor: '#A774F7', cursor: 'pointer' }}
              />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLOR.ink }}>
                  {t(o.label)}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>
                  {t(o.hint)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </FormSection>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" icon="save" loading={saving} onClick={save}>
          {activityId ? t('บันทึกการแก้ไข') : t('สร้างกิจกรรม')}
        </Button>
        <Button variant="secondary" icon="close" onClick={() => router.push('/organizer/activities')}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </div>
  );
}

function FormSection({
  step,
  icon,
  title,
  children,
}: {
  /** ลำดับหัวข้อ แสดงเป็นป้าย 01, 02, … ให้ผู้จัดรู้ว่ากรอกถึงไหนแล้ว */
  step: number;
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...glass(20), padding: 18, display: 'grid', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.4,
            color: '#7C2FD9',
            background: 'rgba(167,116,247,.13)',
          }}
        >
          {String(step).padStart(2, '0')}
        </span>
        <Icon name={icon} size={19} style={{ color: COLOR.hint }} />
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
