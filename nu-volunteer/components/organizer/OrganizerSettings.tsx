'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOOD_LABEL, TEXT_SCALE_MAX, TEXT_SCALE_MIN, useApp } from '@/components/providers/AppProviders';
import { Choice, Fact, PasswordSection, Row, Section, Toggle } from '@/components/settings/SettingsKit';
import { Badge, Button, ErrorNote, Icon, SuccessNote } from '@/components/ui';
import { errorMessage, preferencesApi, type NotifyPrefsDto } from '@/lib/api';
import { COLOR } from '@/lib/design';

/** เขตเวลาของระบบ — ตรึงไว้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ (ดู lib/activities.ts) */
const SYSTEM_TZ = 'Asia/Bangkok (UTC+7)';

type ToggleKey = 'systemNotice' | 'chatMessage' | 'emailEnabled';

/**
 * หัวข้อแจ้งเตือนที่ผู้จัดกิจกรรมตั้งค่าได้
 *
 * ไม่มี activityReminder/deadlineReminder เหมือนฝั่งนิสิต เพราะสองอย่างนั้นคำนวณจาก
 * ใบลงทะเบียนและรายการโปรดของนิสิต ส่วนงานค้างของผู้จัด (ใบรออนุมัติ คำขอยกเลิก
 * ชั่วโมงรอรับรอง) มาจาก deriveOrganizerAlerts ที่คิดสดจากสถานะจริงเสมอ จึงปิดไม่ได้
 * — ถ้าปิดได้ก็เท่ากับซ่อนงานที่ต้องทำ
 */
const TOGGLES: { key: ToggleKey; label: string; desc: string; icon: string }[] = [
  { key: 'systemNotice', label: 'ประกาศจากระบบ', desc: 'ข่าวสารและประกาศปิดปรับปรุงจากผู้ดูแลระบบ', icon: 'campaign' },
  { key: 'chatMessage', label: 'ข้อความจากนิสิต', desc: 'แจ้งเตือนเมื่อมีนิสิตทักเข้ามาในห้องแชท', icon: 'forum' },
  { key: 'emailEnabled', label: 'ส่งอีเมลด้วย', desc: 'ยังไม่เปิดใช้งานจริง — เก็บค่าไว้รอระบบส่งอีเมล', icon: 'mail' },
];

export function OrganizerSettings({
  prefs,
  account,
  pendingWork,
}: {
  prefs: NotifyPrefsDto;
  account: { name: string; email: string };
  /** งานค้างตอนนี้ — ให้เห็นว่ามีอะไรรออยู่โดยไม่ต้องกลับไปหน้าหลัก */
  pendingWork: { registrations: number; cancellations: number; hours: number };
}) {
  const { t, lang, setLang, theme, setTheme, mood, setMood, a11y, setA11y } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div style={{ display: 'grid', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {/* ── บัญชีผู้ใช้ ── */}
      <Section icon="account_circle" title={t('บัญชีผู้ใช้')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <Fact icon="person" label={t('ชื่อ')} value={account.name || '—'} />
          <Fact icon="mail" label={t('อีเมล')} value={account.email} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <Link href="/organizer/profile">
            <Button variant="secondary" icon="edit">
              {t('แก้ไขโปรไฟล์')}
            </Button>
          </Link>
        </div>
      </Section>

      {/* ── การแจ้งเตือน ── */}
      <NotificationSection
        prefs={prefs}
        pendingWork={pendingWork}
        t={t}
        onSaved={() => startTransition(() => router.refresh())}
      />

      {/* ── ธีมและการแสดงผล ── */}
      <Section icon="palette" title={t('ธีมและการแสดงผล')} desc={t('ตั้งค่าแยกในแต่ละอุปกรณ์ ไม่ผูกกับบัญชี')}>
        <Row label={t('โหมดสี')}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['light', 'dark'] as const).map((mode) => (
              <Choice
                key={mode}
                active={theme === mode}
                icon={mode === 'light' ? 'light_mode' : 'dark_mode'}
                label={t(mode === 'light' ? 'สว่าง' : 'มืด')}
                onClick={() => setTheme(mode)}
              />
            ))}
          </div>
        </Row>

        <Row label={t('สไตล์ภาพรวม')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(MOOD_LABEL) as (keyof typeof MOOD_LABEL)[]).map((m) => (
              <Choice
                key={m}
                active={mood === m}
                icon="brush"
                label={m.charAt(0).toUpperCase() + m.slice(1)}
                title={t(MOOD_LABEL[m])}
                onClick={() => setMood(m)}
              />
            ))}
          </div>
        </Row>

        <Row label={t('ภาษา')}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Choice active={lang === 'th'} icon="translate" label="ไทย" onClick={() => setLang('th')} />
            <Choice active={lang === 'en'} icon="translate" label="English" onClick={() => setLang('en')} />
          </div>
        </Row>
      </Section>

      {/* ── การเข้าถึง ── */}
      <Section
        icon="accessibility_new"
        title={t('การเข้าถึง')}
        desc={t('ตั้งค่าแยกในแต่ละอุปกรณ์ ไม่ผูกกับบัญชี')}
      >
        <Row label={`${t('ขนาดตัวอักษร')} · ${Math.round(a11y.textScale * 100)}%`}>
          <input
            type="range"
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            step={0.05}
            value={a11y.textScale}
            aria-label={t('ขนาดตัวอักษร')}
            onChange={(e) => setA11y({ textScale: Number(e.target.value) })}
            style={{ width: '100%', maxWidth: 320 }}
          />
        </Row>

        <div style={{ display: 'grid', gap: 10 }}>
          <Toggle
            icon="contrast"
            label={t('เพิ่มความต่างของสี')}
            desc={t('ทำให้ตัวอักษรและขอบชัดขึ้นสำหรับผู้ที่มองเห็นความต่างของสีได้ยาก')}
            checked={a11y.highContrast}
            onChange={(v) => setA11y({ highContrast: v })}
          />
          <Toggle
            icon="animation"
            label={t('ลดการเคลื่อนไหว')}
            desc={t('ปิดภาพเคลื่อนไหวและการเลื่อนแบบนุ่มนวลทั้งระบบ')}
            checked={a11y.reduceMotion}
            onChange={(v) => setA11y({ reduceMotion: v })}
          />
        </div>
      </Section>

      {/* ── เปลี่ยนรหัสผ่าน ── */}
      <PasswordSection t={t} lang={lang} />

      {/* ── ข้อมูลระบบ ── */}
      <Section icon="info" title={t('ข้อมูลระบบ')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <Fact icon="schedule" label={t('เขตเวลาของระบบ')} value={SYSTEM_TZ} />
          <Fact icon="shield" label={t('บทบาท')} value={t('ผู้จัดกิจกรรม')} />
        </div>
      </Section>
    </div>
  );
}

/* ───────────────── การแจ้งเตือน ───────────────── */

function NotificationSection({
  prefs,
  pendingWork,
  t,
  onSaved,
}: {
  prefs: NotifyPrefsDto;
  pendingWork: { registrations: number; cancellations: number; hours: number };
  t: (s: string) => string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<NotifyPrefsDto>(prefs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = TOGGLES.some((tg) => draft[tg.key] !== prefs[tg.key]);

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // ส่งเฉพาะคีย์ที่หน้านี้ดูแล ค่าที่เหลือของบัญชีจะได้ไม่ถูกเขียนทับด้วยค่าเริ่มต้น
      await preferencesApi.update({
        systemNotice: draft.systemNotice,
        chatMessage: draft.chatMessage,
        emailEnabled: draft.emailEnabled,
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const total = pendingWork.registrations + pendingWork.cancellations + pendingWork.hours;

  return (
    <Section
      icon="notifications"
      title={t('ตั้งค่าการแจ้งเตือน')}
      desc={t('ปิดหัวข้อไหนไว้ หัวข้อนั้นจะไม่ถูกนำมาคำนวณเป็นการเตือนและไม่แสดงในกล่อง')}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <Badge
          tone={pendingWork.registrations ? 'warning' : 'neutral'}
          icon="hourglass_top"
          label={`${t('ใบรออนุมัติ')} ${pendingWork.registrations}`}
        />
        <Badge
          tone={pendingWork.cancellations ? 'danger' : 'neutral'}
          icon="event_busy"
          label={`${t('คำขอยกเลิก')} ${pendingWork.cancellations}`}
        />
        <Badge
          tone={pendingWork.hours ? 'warning' : 'neutral'}
          icon="fact_check"
          label={`${t('รอรับรองชั่วโมง')} ${pendingWork.hours}`}
        />
        <Link href="/organizer/notifications" style={{ alignSelf: 'center', fontSize: 12.5, color: COLOR.link }}>
          {t('ดูในกล่องการแจ้งเตือน')}
        </Link>
      </div>

      {total > 0 ? (
        <div style={{ fontSize: 12, color: COLOR.hint, marginBottom: 14, lineHeight: 1.7, display: 'flex', gap: 7 }}>
          <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {t('งานค้างข้างบนคิดจากสถานะจริงตลอดเวลา จึงไม่มีสวิตช์ให้ปิด — เคลียร์งานแล้วตัวเลขจะลดลงเอง')}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        {TOGGLES.map((tg) => (
          <Toggle
            key={tg.key}
            icon={tg.icon}
            label={t(tg.label)}
            desc={t(tg.desc)}
            checked={draft[tg.key]}
            onChange={(v) => {
              setSaved(false);
              setDraft((d) => ({ ...d, [tg.key]: v }));
            }}
          />
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {saved ? <SuccessNote>{t('บันทึกเรียบร้อยแล้ว')}</SuccessNote> : null}

      <div style={{ marginTop: 14 }}>
        <Button variant="primary" icon="save" onClick={save} disabled={!dirty} loading={saving}>
          {t('บันทึก')}
        </Button>
      </div>
    </Section>
  );
}
