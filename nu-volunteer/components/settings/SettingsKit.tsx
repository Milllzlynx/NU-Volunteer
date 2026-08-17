'use client';

/**
 * ชิ้นส่วนหน้าตั้งค่าที่ใช้ร่วมกันทุกบทบาท
 *
 * แยกออกมาจาก StudentSettings ตอนสร้างหน้าตั้งค่าของผู้จัดกิจกรรม — หน้าตั้งค่าของสองบทบาท
 * มีหัวข้อไม่เหมือนกัน (ผู้จัดไม่มีเรื่องเตือนก่อนถึงวันกิจกรรมหรือการเปิดเผยข้อมูลติดต่อ)
 * แต่กล่อง สวิตช์ และช่องเปลี่ยนรหัสผ่านต้องหน้าตาเดียวกัน ไม่งั้นสองหน้าจะค่อย ๆ เพี้ยนจากกัน
 */

import { useState, type ReactNode } from 'react';
import { Button, ErrorNote, Icon, SuccessNote, inputStyle } from '@/components/ui';
import { accountApi, errorMessage } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

/* ───────────────── ชิ้นส่วนที่ใช้ซ้ำ ───────────────── */

export function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ ...glass(22), padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name={icon} size={19} style={{ color: '#A774F7' }} />
        <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{title}</span>
      </div>
      {desc ? (
        <div style={{ fontSize: 12, color: COLOR.label, marginTop: 6, marginBottom: 14, lineHeight: 1.7 }}>{desc}</div>
      ) : (
        <div style={{ height: 14 }} />
      )}
      {children}
    </div>
  );
}

export function Toggle({
  icon,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: string;
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: 14,
        borderRadius: 15,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        background: checked ? 'rgba(167,116,247,.10)' : 'rgba(255,255,255,.5)',
        border: `1px solid ${checked ? 'rgba(167,116,247,.35)' : 'rgba(255,255,255,.75)'}`,
      }}
    >
      <Icon name={icon} size={20} style={{ color: checked ? '#7C2FD9' : COLOR.hint, flexShrink: 0 }} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: COLOR.ink }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: COLOR.label, marginTop: 3, lineHeight: 1.6 }}>{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, flexShrink: 0 }}
      />
    </label>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: COLOR.ink }}>{label}</span>
      {children}
    </div>
  );
}

export function Choice({
  active,
  icon,
  label,
  title,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 15px',
        borderRadius: 13,
        fontSize: 12.5,
        cursor: 'pointer',
        border: `1px solid ${active ? 'rgba(167,116,247,.5)' : 'rgba(31,41,55,.12)'}`,
        background: active ? 'rgba(167,116,247,.14)' : 'rgba(255,255,255,.55)',
        color: active ? COLOR.ink : COLOR.body,
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

export function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ padding: 13, borderRadius: 14, background: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.75)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: COLOR.label }}>
        <Icon name={icon} size={14} />
        {label}
      </span>
      <span style={{ display: 'block', fontSize: 13.5, color: COLOR.ink, marginTop: 5, wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

/* ───────────────── เปลี่ยนรหัสผ่าน ───────────────── */

export function PasswordSection({ t, lang }: { t: (s: string) => string; lang: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setDone(false);
    if (!current || !next) {
      setError(t('กรุณากรอกรหัสผ่านให้ครบ'));
      return;
    }
    if (next !== confirm) {
      setError(t('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'));
      return;
    }
    setBusy(true);
    try {
      await accountApi.changePassword(current, next, lang);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      icon="key"
      title={t('เปลี่ยนรหัสผ่าน')}
      desc={t('เมื่อเปลี่ยนสำเร็จ ระบบจะออกจากระบบบนอุปกรณ์อื่นทั้งหมดโดยอัตโนมัติ')}
    >
      <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder={t('รหัสผ่านปัจจุบัน')}
          aria-label={t('รหัสผ่านปัจจุบัน')}
          autoComplete="current-password"
          style={inputStyle(false)}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={t('รหัสผ่านใหม่')}
          aria-label={t('รหัสผ่านใหม่')}
          autoComplete="new-password"
          style={inputStyle(false)}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t('ยืนยันรหัสผ่านใหม่')}
          aria-label={t('ยืนยันรหัสผ่านใหม่')}
          autoComplete="new-password"
          style={inputStyle(false)}
        />
        <div style={{ fontSize: 11.5, color: COLOR.hint }}>{t('อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข')}</div>

        <ErrorNote>{error}</ErrorNote>
        {done ? <SuccessNote>{t('เปลี่ยนรหัสผ่านสำเร็จ')}</SuccessNote> : null}

        <div>
          <Button variant="primary" icon="check" loading={busy} onClick={submit}>
            {t('เปลี่ยนรหัสผ่าน')}
          </Button>
        </div>
      </div>
    </Section>
  );
}
