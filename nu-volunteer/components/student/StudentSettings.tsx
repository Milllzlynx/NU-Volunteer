'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MOOD_LABEL,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  useApp,
  type A11y,
} from '@/components/providers/AppProviders';
import { Choice, Fact, PasswordSection, Row, Section, Toggle } from '@/components/settings/SettingsKit';
import { Badge, Button, ErrorNote, Icon, SuccessNote, inputStyle } from '@/components/ui';
import { errorMessage, preferencesApi, profileApi, type NotifyPrefsDto } from '@/lib/api';
import { COLOR } from '@/lib/design';

const LEAD_MIN = 1;
const LEAD_MAX = 14;

/** เขตเวลาของระบบ — ตรึงไว้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ (ดู lib/activities.ts) */
const SYSTEM_TZ = 'Asia/Bangkok (UTC+7)';

type ToggleKey = 'activityReminder' | 'deadlineReminder' | 'systemNotice' | 'chatMessage' | 'emailEnabled';

const TOGGLES: { key: ToggleKey; label: string; desc: string; icon: string }[] = [
  { key: 'activityReminder', label: 'เตือนก่อนถึงวันกิจกรรม', desc: 'แจ้งเตือนกิจกรรมที่คุณลงทะเบียนไว้และกำลังจะถึง', icon: 'event_upcoming' },
  { key: 'deadlineReminder', label: 'เตือนก่อนปิดรับสมัคร', desc: 'แจ้งเตือนกิจกรรมที่คุณกดถูกใจไว้แต่ยังไม่ได้สมัคร', icon: 'hourglass_bottom' },
  { key: 'systemNotice', label: 'ประกาศจากระบบ', desc: 'ข่าวสารและประกาศปิดปรับปรุงจากผู้ดูแลระบบ', icon: 'campaign' },
  { key: 'chatMessage', label: 'ข้อความจากผู้จัดกิจกรรม', desc: 'แจ้งเตือนเมื่อมีข้อความใหม่ในห้องแชท', icon: 'forum' },
  { key: 'emailEnabled', label: 'ส่งอีเมลด้วย', desc: 'ยังไม่เปิดใช้งานจริง — เก็บค่าไว้รอระบบส่งอีเมล', icon: 'mail' },
];

export function StudentSettings({
  prefs,
  account,
  activeAlerts,
}: {
  prefs: NotifyPrefsDto;
  account: { name: string; email: string; shareContact: boolean };
  activeAlerts: { reminder: number; deadline: number };
}) {
  const { t, lang, setLang, theme, setTheme, mood, setMood, a11y, setA11y } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <AccountSection account={account} t={t} />
      <PrivacySection shareContact={account.shareContact} t={t} onSaved={refresh} />
      <NotificationSection prefs={prefs} activeAlerts={activeAlerts} t={t} onSaved={refresh} />

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
            {/* ชื่อสไตล์เป็นคำเดียวกันทั้งสองภาษา ส่วนคำอธิบายไทยอยู่ใน MOOD_LABEL */}
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
      </Section>

      <AccessibilitySection t={t} a11y={a11y} setA11y={setA11y} />

      {/* ── ภาษาและเขตเวลา ── */}
      <Section icon="language" title={t('ภาษาและเขตเวลา')}>
        <Row label={t('ภาษา')}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Choice active={lang === 'th'} icon="translate" label="ไทย" onClick={() => setLang('th')} />
            <Choice active={lang === 'en'} icon="translate" label="English" onClick={() => setLang('en')} />
          </div>
        </Row>

        <Row label={t('เขตเวลา')}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: COLOR.ink }}>
              <Icon name="schedule" size={17} style={{ color: COLOR.label }} />
              {SYSTEM_TZ}
              <Badge tone="neutral" label={t('กำหนดโดยระบบ')} />
            </div>
            <div style={{ fontSize: 12, color: COLOR.label, marginTop: 6, lineHeight: 1.7 }}>
              {t('เวลากิจกรรมทั้งหมดอ้างอิงเวลาประเทศไทยเสมอ เพื่อให้ทุกคนเห็นตรงกันไม่ว่าจะเปิดจากที่ใด')}
            </div>
          </div>
        </Row>
      </Section>

      <PasswordSection t={t} lang={lang} />
    </div>
  );
}

/* ───────────────── การเข้าถึง ───────────────── */

function AccessibilitySection({
  t,
  a11y,
  setA11y,
}: {
  t: (s: string) => string;
  a11y: A11y;
  setA11y: (p: Partial<A11y>) => void;
}) {
  return (
    <Section
      icon="accessibility_new"
      title={t('การเข้าถึง')}
      desc={t('มีผลทันทีกับทั้งเว็บ และจำไว้เฉพาะอุปกรณ์นี้')}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <Toggle
          icon="motion_photos_off"
          label={t('ลดการเคลื่อนไหว')}
          desc={t('ปิดแอนิเมชันและทรานซิชันทั้งหมด ช่วยผู้ที่เวียนศีรษะจากภาพเคลื่อนไหว')}
          checked={a11y.reduceMotion}
          onChange={(v) => setA11y({ reduceMotion: v })}
        />
        <Toggle
          icon="contrast"
          label={t('เพิ่มความคมชัด')}
          desc={t('ทำให้ตัวอักษรเข้มขึ้นและเส้นขอบชัดขึ้น อ่านง่ายในที่แสงจ้า')}
          checked={a11y.highContrast}
          onChange={(v) => setA11y({ highContrast: v })}
        />
        <Toggle
          icon="highlight_alt"
          label={t('แสดงกรอบโฟกัสเสมอ')}
          desc={t('เห็นตำแหน่งที่กำลังโฟกัสตลอดเวลา ไม่เฉพาะตอนใช้แป้นพิมพ์')}
          checked={a11y.alwaysFocusRing}
          onChange={(v) => setA11y({ alwaysFocusRing: v })}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: COLOR.ink, display: 'block', marginBottom: 4 }}>
          {t('ขนาดตัวอักษร')}
        </span>
        <span style={{ fontSize: 12, color: COLOR.label, display: 'block', marginBottom: 10 }}>
          {t('ขยายตัวอักษรทั้งเว็บพร้อมกัน')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="range"
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            step={5}
            value={a11y.textScale}
            onChange={(e) => setA11y({ textScale: Number(e.target.value) })}
            aria-label={t('ขนาดตัวอักษร')}
            style={{ flex: 1, maxWidth: 320, accentColor: '#A774F7' }}
          />
          <Badge tone="neutral" label={`${a11y.textScale}%`} />
          {a11y.textScale !== 100 ? (
            <Button variant="secondary" onClick={() => setA11y({ textScale: 100 })} style={{ padding: '8px 14px' }}>
              {t('กลับเป็นปกติ')}
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

/* ───────────────── บัญชี ───────────────── */

function AccountSection({ account, t }: { account: { name: string; email: string }; t: (s: string) => string }) {
  return (
    <Section icon="account_circle" title={t('บัญชีผู้ใช้')}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <Fact icon="person" label={t('ชื่อ')} value={account.name || '—'} />
        <Fact icon="mail" label={t('อีเมล')} value={account.email} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <Link href="/student/profile">
          <Button variant="secondary" icon="edit">
            {t('แก้ไขโปรไฟล์')}
          </Button>
        </Link>
      </div>
    </Section>
  );
}

/* ───────────────── ความเป็นส่วนตัว ───────────────── */

function PrivacySection({
  shareContact,
  t,
  onSaved,
}: {
  shareContact: boolean;
  t: (s: string) => string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(shareContact);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (next: boolean) => {
    setValue(next);
    setBusy(true);
    setError(null);
    try {
      await profileApi.update({ shareContact: next });
      onSaved();
    } catch (e) {
      setValue(!next); // ย้อนกลับถ้าบันทึกไม่สำเร็จ
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section icon="lock" title={t('ความเป็นส่วนตัว')}>
      <Toggle
        icon="contact_mail"
        label={t('ให้ผู้จัดกิจกรรมเห็นข้อมูลติดต่อ')}
        desc={t('ปิดไว้ ผู้จัดจะเห็นแค่ชื่อและรหัสนิสิต ไม่เห็นอีเมล — ผู้ดูแลระบบยังเห็นได้เพื่อการตรวจสอบ')}
        checked={value}
        disabled={busy}
        onChange={toggle}
      />
      <ErrorNote>{error}</ErrorNote>
      <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 10, lineHeight: 1.7 }}>
        {t('นิสิตคนอื่นค้นหาบัญชีของคุณไม่ได้อยู่แล้ว — ระบบเปิดการค้นหาผู้ใช้ให้เฉพาะเจ้าหน้าที่เท่านั้น')}
      </div>
    </Section>
  );
}

/* ───────────────── การแจ้งเตือน ───────────────── */

function NotificationSection({
  prefs,
  activeAlerts,
  t,
  onSaved,
}: {
  prefs: NotifyPrefsDto;
  activeAlerts: { reminder: number; deadline: number };
  t: (s: string) => string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<NotifyPrefsDto>(prefs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = TOGGLES.some((tg) => draft[tg.key] !== prefs[tg.key]) || draft.leadDays !== prefs.leadDays;

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await preferencesApi.update(draft);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof NotifyPrefsDto>(key: K, value: NotifyPrefsDto[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Section
      icon="notifications"
      title={t('ตั้งค่าการแจ้งเตือน')}
      desc={t('ปิดหัวข้อไหนไว้ หัวข้อนั้นจะไม่ถูกนำมาคำนวณเป็นการเตือนและไม่แสดงในกล่อง')}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <Badge
          tone={activeAlerts.reminder ? 'warning' : 'neutral'}
          icon="event_upcoming"
          label={`${t('กิจกรรมใกล้ถึง')} ${activeAlerts.reminder}`}
        />
        <Badge
          tone={activeAlerts.deadline ? 'warning' : 'neutral'}
          icon="hourglass_bottom"
          label={`${t('ใกล้ปิดรับสมัคร')} ${activeAlerts.deadline}`}
        />
        <Link href="/student/notifications" style={{ alignSelf: 'center', fontSize: 12.5, color: COLOR.link }}>
          {t('ดูในกล่องการแจ้งเตือน')}
        </Link>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {TOGGLES.map((tg) => (
          <Toggle
            key={tg.key}
            icon={tg.icon}
            label={t(tg.label)}
            desc={t(tg.desc)}
            checked={draft[tg.key]}
            onChange={(v) => set(tg.key, v)}
          />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: COLOR.ink, display: 'block', marginBottom: 4 }}>
          {t('เตือนล่วงหน้ากี่วัน')}
        </span>
        <span style={{ fontSize: 12, color: COLOR.label, display: 'block', marginBottom: 10 }}>
          {t('ใช้กับทั้งการเตือนกิจกรรมและการเตือนปิดรับสมัคร')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={LEAD_MIN}
            max={LEAD_MAX}
            value={draft.leadDays}
            onChange={(e) => set('leadDays', Number(e.target.value))}
            aria-label={t('เตือนล่วงหน้ากี่วัน')}
            style={{ flex: 1, maxWidth: 320, accentColor: '#A774F7' }}
          />
          <input
            type="number"
            min={LEAD_MIN}
            max={LEAD_MAX}
            value={draft.leadDays}
            onChange={(e) => set('leadDays', Number(e.target.value))}
            aria-label={t('เตือนล่วงหน้ากี่วัน')}
            style={{ ...inputStyle(false), width: 84 }}
          />
          <span style={{ fontSize: 13, color: COLOR.body }}>{t('วัน')}</span>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {saved && !dirty ? <SuccessNote>{t('บันทึกการตั้งค่าแล้ว')}</SuccessNote> : null}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <Button variant="secondary" disabled={!dirty || saving} onClick={() => setDraft(prefs)}>
          {t('ย้อนกลับ')}
        </Button>
        <Button variant="primary" icon="check" loading={saving} disabled={!dirty} onClick={save}>
          {t('บันทึกการตั้งค่า')}
        </Button>
      </div>
    </Section>
  );
}
