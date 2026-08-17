'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, ErrorNote, Icon, SuccessNote, inputStyle } from '@/components/ui';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { errorMessage, profileApi } from '@/lib/api';
import { BRAND_GRADIENT, COLOR, ROLE_LABEL, SEMANTIC, glass } from '@/lib/design';
import { AVATAR_MAX_EDGE_PX } from '@/lib/imageFile';
import type { TimelineEvent } from '@/lib/timeline';

export type ProfileView = {
  name: string;
  email: string;
  role: string;
  studentId: string | null;
  faculty: string | null;
  loanStatus: string | null;
  phone: string | null;
  bio: string;
  avatarUrl: string | null;
  joinedTh: string;
  joinedEn: string;
};

const BIO_MAX = 300;

export function StudentProfile({
  profile,
  faculties,
  stats,
  recent,
}: {
  profile: ProfileView;
  faculties: string[];
  stats: { joined: number; hours: number; certificates: number };
  recent: TimelineEvent[];
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: profile.name,
    bio: profile.bio,
    phone: profile.phone ?? '',
    faculty: profile.faculty ?? '',
    avatarUrl: profile.avatarUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await profileApi.update(draft);
      setSaved(true);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft({
      name: profile.name,
      bio: profile.bio,
      phone: profile.phone ?? '',
      faculty: profile.faculty ?? '',
      avatarUrl: profile.avatarUrl ?? '',
    });
    setEditing(false);
    setError(null);
  };

  const initials = (profile.name || profile.email).trim().slice(0, 1).toUpperCase();

  const facts = [
    { icon: 'mail', label: t('อีเมล'), value: profile.email },
    { icon: 'badge', label: t('รหัสนิสิต'), value: profile.studentId || '—' },
    { icon: 'school', label: t('คณะ'), value: profile.faculty || '—' },
    { icon: 'call', label: t('เบอร์โทร'), value: profile.phone || '—' },
    { icon: 'event_available', label: t('เข้าร่วมเมื่อ'), value: isEn ? profile.joinedEn : profile.joinedTh },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── หัวโปรไฟล์ ── */}
      <div style={{ ...glass(22), padding: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
          {profile.avatarUrl ? (
            // รูปจากลิงก์ที่ผู้ใช้ใส่เอง — ใช้ img ธรรมดาเพราะโดเมนปลายทางไม่แน่นอน
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: BRAND_GRADIENT,
                color: '#fff',
                fontSize: 34,
                fontWeight: 600,
              }}
            >
              {initials}
            </span>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.ink }}>{profile.name || '—'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <Badge tone="purple" icon="account_circle" label={t(ROLE_LABEL[profile.role] ?? profile.role)} />
              {profile.loanStatus === 'yes' ? <Badge tone="kyf" icon="school" label={t('ผู้กู้ยืม กยศ.')} /> : null}
            </div>
            {profile.bio ? (
              <div style={{ fontSize: 13, color: COLOR.body, marginTop: 10, lineHeight: 1.75, textWrap: 'pretty' }}>
                {profile.bio}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: COLOR.hint, marginTop: 10 }}>
                {t('ยังไม่มีคำแนะนำตัว — กดแก้ไขโปรไฟล์เพื่อเพิ่ม')}
              </div>
            )}
          </div>

          {!editing ? (
            <Button variant="primary" icon="edit" onClick={() => setEditing(true)}>
              {t('แก้ไขโปรไฟล์')}
            </Button>
          ) : null}
        </div>

        {saved && !editing ? <SuccessNote>{t('บันทึกโปรไฟล์แล้ว')}</SuccessNote> : null}
      </div>

      {/* ── สถิติ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
        {[
          { icon: 'groups', label: t('กิจกรรมที่เข้าร่วม'), value: stats.joined, tone: 'info' as const },
          { icon: 'schedule', label: t('ชั่วโมงสะสม'), value: stats.hours, tone: 'success' as const },
          { icon: 'workspace_premium', label: t('ใบประกาศ'), value: stats.certificates, tone: 'purple' as const },
        ].map((s) => (
          <div key={s.label} style={{ ...glass(18), padding: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: SEMANTIC[s.tone].bg,
                color: SEMANTIC[s.tone].color,
              }}
            >
              <Icon name={s.icon} size={21} />
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 22, fontWeight: 700, color: COLOR.ink }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: 12, color: COLOR.label }}>{s.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── แก้ไข / ข้อมูลโปรไฟล์ ── */}
      <div style={{ ...glass(22), padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <Icon name="person" size={19} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ข้อมูลโปรไฟล์')}</span>
        </div>

        {editing ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <Labelled label={t('ชื่อ-นามสกุล')}>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={80}
                style={inputStyle(false)}
              />
            </Labelled>

            <Labelled label={t('แนะนำตัว')} hint={`${draft.bio.length}/${BIO_MAX}`}>
              <textarea
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                maxLength={BIO_MAX}
                rows={3}
                placeholder={t('เช่น สนใจกิจกรรมด้านสิ่งแวดล้อมและการสอนน้อง')}
                style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Labelled>

            <Labelled label={t('คณะ')}>
              <select
                value={draft.faculty}
                onChange={(e) => setDraft((d) => ({ ...d, faculty: e.target.value }))}
                style={inputStyle(false)}
              >
                <option value="">{t('ไม่ระบุ')}</option>
                {faculties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Labelled>

            <Labelled label={t('เบอร์โทร')}>
              <input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                maxLength={20}
                placeholder="08X-XXX-XXXX"
                style={inputStyle(false)}
              />
            </Labelled>

            <Labelled label={t('รูปโปรไฟล์')}>
              <ImageDropField
                value={draft.avatarUrl || null}
                onChange={(next) => setDraft((d) => ({ ...d, avatarUrl: next ?? '' }))}
                icon="account_circle"
                title={t('รูปโปรไฟล์')}
                height={170}
                maxEdge={AVATAR_MAX_EDGE_PX}
              />
            </Labelled>

            <div style={{ fontSize: 12, color: COLOR.hint }}>
              {t('อีเมลและรหัสนิสิตแก้ไขเองไม่ได้ — ติดต่อผู้ดูแลระบบหากข้อมูลไม่ถูกต้อง')}
            </div>

            <ErrorNote>{error}</ErrorNote>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={cancel} disabled={saving}>
                {t('ยกเลิก')}
              </Button>
              <Button variant="primary" icon="check" loading={saving} onClick={save}>
                {t('บันทึก')}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
            {facts.map((f) => (
              <div
                key={f.label}
                style={{
                  padding: 13,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,.5)',
                  border: '1px solid rgba(255,255,255,.75)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: COLOR.label }}>
                  <Icon name={f.icon} size={14} />
                  {f.label}
                </span>
                <span style={{ display: 'block', fontSize: 13.5, color: COLOR.ink, marginTop: 5, wordBreak: 'break-word' }}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ประวัติล่าสุด ── */}
      <div style={{ ...glass(22), padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="history" size={19} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ประวัติการเข้าร่วมล่าสุด')}</span>
          <Link href="/student/feed" style={{ marginInlineStart: 'auto', fontSize: 12.5, color: COLOR.link }}>
            {t('ดูทั้งหมด')}
          </Link>
        </div>

        {!recent.length ? (
          <div style={{ fontSize: 12.5, color: COLOR.hint }}>{t('ยังไม่มีความเคลื่อนไหว')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 9 }}>
            {recent.map((e) => (
              <div key={e.key} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <Icon name={e.icon} size={17} style={{ color: '#A774F7', flexShrink: 0, marginTop: 2 }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, color: COLOR.ink }}>
                    {t(e.title)}
                    {e.subject ? <span style={{ color: COLOR.body }}> · {e.subject}</span> : null}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>
                    {isEn ? e.dateEn : e.dateTh}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: COLOR.label }}>{label}</span>
        {hint ? <span style={{ fontSize: 11, color: COLOR.hint, marginInlineStart: 'auto' }}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
