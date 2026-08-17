'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorNote, Field, Icon, SuccessNote, inputStyle } from '@/components/ui';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { useApp } from '@/components/providers/AppProviders';
import { errorMessage, profileApi } from '@/lib/api';
import { COLOR, ROLE_ACCENT, glass } from '@/lib/design';
import { AVATAR_MAX_EDGE_PX } from '@/lib/imageFile';

/**
 * โปรไฟล์ของผู้ดูแลระบบ
 *
 * คู่ขนานกับ OrganizerProfile แต่ตัวเลขที่แสดงเป็นของทั้งระบบ ไม่ใช่ของกิจกรรมที่ตัวเองดูแล
 * เพราะแอดมินไม่ได้ "เป็นเจ้าของ" กิจกรรมไหนเป็นพิเศษ ตัวเลขรายบุคคลที่มีความหมายจริง
 * จึงมีอย่างเดียวคือจำนวนครั้งที่ลงมือทำอะไรในระบบ ซึ่งอ่านจาก SystemLog
 */

const BIO_MAX = 300;

export type AdminProfileData = {
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  joinedTh: string;
  joinedEn: string;
};

export type AdminProfileStats = {
  users: number;
  activities: number;
  hoursAwarded: number;
  /** จำนวนรายการใน SystemLog ที่แอดมินคนนี้เป็นผู้ลงมือ */
  myActions: number;
};

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Icon name={icon} size={19} style={{ color: COLOR.hint, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: COLOR.label }}>{label}</div>
        <div style={{ fontSize: 13.5, color: COLOR.ink, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

export function AdminProfile({
  profile,
  stats,
}: {
  profile: AdminProfileData;
  stats: AdminProfileStats;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const accent = ROLE_ACCENT[profile.role] ?? '#A774F7';

  const dirty =
    name !== profile.name ||
    phone !== (profile.phone ?? '') ||
    bio !== (profile.bio ?? '') ||
    avatarUrl !== (profile.avatarUrl ?? '');

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await profileApi.update({ name, phone, bio, avatarUrl });
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { icon: 'manage_accounts', color: '#A774F7', label: 'ผู้ใช้งานทั้งหมด', value: String(stats.users) },
    { icon: 'campaign', color: '#F5A623', label: 'กิจกรรมทั้งหมด', value: String(stats.activities) },
    { icon: 'schedule', color: '#E97171', label: 'ชั่วโมงที่รับรองแล้ว', value: String(stats.hoursAwarded) },
    { icon: 'history', color: '#7AB8FF', label: 'การกระทำของคุณในระบบ', value: String(stats.myActions) },
  ];

  return (
    <div style={{ display: 'grid', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {/* ── หัวโปรไฟล์ ── */}
      <div style={{ ...glass(22), padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            width: 74,
            height: 74,
            borderRadius: 22,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${accent}, #A774F7)`,
            color: '#fff',
            fontSize: 28,
            fontWeight: 700,
            overflow: 'hidden',
          }}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- รูปโปรไฟล์ที่ผู้ใช้อัปโหลดเอง
            <img src={profile.avatarUrl} alt="" className="nuv-noinv" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (profile.name || profile.email).trim().charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 21, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
            {profile.name || profile.email}
          </div>
          <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3 }}>
            {t('ผู้ดูแลระบบ')}
            {' · '}
            {`${t('เข้าร่วมเมื่อ')} ${isEn ? profile.joinedEn : profile.joinedTh}`}
          </div>
          {profile.bio ? (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: COLOR.body, lineHeight: 1.7 }}>{profile.bio}</p>
          ) : null}
        </div>
      </div>

      {/* ── ตัวเลขของระบบ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...glass(18), padding: 16, display: 'grid', gap: 7 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${c.color}28`,
                color: c.color,
              }}
            >
              <Icon name={c.icon} size={19} />
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: COLOR.ink }}>{c.value}</span>
            <span style={{ fontSize: 11.5, color: COLOR.label }}>{t(c.label)}</span>
          </div>
        ))}
      </div>

      {/* ── ข้อมูลบัญชี ── */}
      <div style={{ ...glass(22), padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="badge" size={19} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ข้อมูลบัญชี')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <Fact icon="mail" label={t('อีเมล')} value={profile.email} />
          <Fact icon="call" label={t('เบอร์โทร')} value={profile.phone || '—'} />
          <Fact icon="event_available" label={t('เข้าร่วมเมื่อ')} value={isEn ? profile.joinedEn : profile.joinedTh} />
        </div>
        <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 12, lineHeight: 1.7 }}>
          {t('อีเมลและบทบาทแก้ที่นี่ไม่ได้ — อีเมลใช้ยืนยันตัวตน ส่วนบทบาทผู้ดูแลระบบเปลี่ยนได้จากหน้าจัดการผู้ใช้งานเท่านั้น')}
        </div>
      </div>

      {/* ── แก้ไขข้อมูล ── */}
      <div style={{ ...glass(22), padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="edit" size={19} style={{ color: '#A774F7' }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('แก้ไขโปรไฟล์')}</span>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <Field label={t('ชื่อที่แสดง')}>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(false)} maxLength={80} />
          </Field>

          <Field label={t('เบอร์โทร')}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
              style={inputStyle(false)}
              maxLength={20}
            />
          </Field>

          <Field label={t('รูปโปรไฟล์')}>
            <ImageDropField
              value={avatarUrl || null}
              onChange={(next) => setAvatarUrl(next ?? '')}
              icon="account_circle"
              title={t('รูปโปรไฟล์')}
              height={170}
              maxEdge={AVATAR_MAX_EDGE_PX}
            />
          </Field>

          <Field label={t('แนะนำตัว')} hint={`${bio.length} / ${BIO_MAX}`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={4}
              style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <ErrorNote>{error}</ErrorNote>
          {saved ? <SuccessNote>{t('บันทึกเรียบร้อยแล้ว')}</SuccessNote> : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="primary" icon="save" loading={saving} disabled={!dirty} onClick={save}>
              {t('บันทึก')}
            </Button>
            <Button
              variant="secondary"
              icon="undo"
              disabled={!dirty || saving}
              onClick={() => {
                setName(profile.name);
                setPhone(profile.phone ?? '');
                setBio(profile.bio ?? '');
                setAvatarUrl(profile.avatarUrl ?? '');
                setError(null);
                setSaved(false);
              }}
            >
              {t('ยกเลิก')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
