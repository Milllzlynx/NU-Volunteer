'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useT } from '@/components/providers/AppProviders';
import { BRAND_GRADIENT, COLOR, SEMANTIC } from '@/lib/design';

/* ───────────────── input ───────────────── */

const INPUT_BASE: CSSProperties = {
  width: '100%',
  padding: '13px 14px 13px 44px',
  borderRadius: 13,
  background: 'rgba(31,41,55,.03)',
  fontFamily: 'inherit',
  fontSize: 14,
  color: COLOR.ink,
  outlineOffset: 2,
};

export function AuthLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: COLOR.label, display: 'block', marginBottom: 6 }}>
      {children}
    </span>
  );
}

/** ช่องกรอกที่มีไอคอนด้านซ้าย — รองรับปุ่มแสดง/ซ่อนรหัสผ่านในตัว */
export function AuthInput({
  icon,
  label,
  value,
  onChange,
  onEnter,
  placeholder,
  type = 'text',
  invalid = false,
  password = false,
  autoComplete,
  inputMode,
  name,
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  password?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric';
  name?: string;
}) {
  const t = useT();
  const [show, setShow] = useState(false);
  const toggleLabel = show ? t('ซ่อนรหัสผ่าน') : t('แสดงรหัสผ่าน');

  return (
    <label style={{ display: 'block' }}>
      <AuthLabel>{label}</AuthLabel>
      <div style={{ position: 'relative' }}>
        <Icon
          name={icon}
          size={19}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLOR.hint,
            pointerEvents: 'none',
          }}
        />
        <input
          name={name}
          value={value}
          type={password ? (show ? 'text' : 'password') : type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
          }}
          style={{
            ...INPUT_BASE,
            paddingRight: password ? 46 : 14,
            border: `1px solid ${invalid ? 'rgba(233,113,113,.5)' : 'rgba(31,41,55,.12)'}`,
          }}
        />
        {password ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            title={toggleLabel}
            aria-label={toggleLabel}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 9,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: COLOR.hint,
            }}
          >
            <Icon name={show ? 'visibility_off' : 'visibility'} size={19} />
          </button>
        ) : null}
      </div>
    </label>
  );
}

/** เลือกจากรายการ (คณะ) — หน้าตาเดียวกับ AuthInput */
export function AuthSelect({
  icon,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: 'block' }}>
      <AuthLabel>{label}</AuthLabel>
      <div style={{ position: 'relative' }}>
        <Icon
          name={icon}
          size={19}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLOR.hint,
            pointerEvents: 'none',
          }}
        />
        <Icon
          name="expand_more"
          size={20}
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLOR.hint,
            pointerEvents: 'none',
          }}
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...INPUT_BASE,
            padding: '13px 36px 13px 44px',
            fontSize: 13.5,
            border: '1px solid rgba(31,41,55,.12)',
            color: value ? COLOR.ink : COLOR.hint,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            textOverflow: 'ellipsis',
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

/* ───────────────── ข้อความใต้ช่องกรอก ───────────────── */

export function FieldNote({
  tone,
  icon,
  children,
  spinner = false,
}: {
  tone: 'danger' | 'hint';
  icon?: string;
  children: ReactNode;
  spinner?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 6,
        fontSize: 11.5,
        lineHeight: 1.6,
        color: tone === 'danger' ? SEMANTIC.danger.color : COLOR.hint,
      }}
    >
      {spinner ? (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid rgba(31,41,55,.15)',
            borderTopColor: '#A774F7',
            animation: 'nuSpin 700ms linear infinite',
            display: 'inline-block',
          }}
        />
      ) : icon ? (
        <Icon name={icon} size={15} />
      ) : null}
      {children}
    </div>
  );
}

/** กล่องแจ้งข้อผิดพลาดของฟอร์ม (มี role=alert เพื่อให้โปรแกรมอ่านหน้าจอประกาศ) */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 14px',
        borderRadius: 12,
        background: 'rgba(233,113,113,.1)',
        border: '1px solid rgba(233,113,113,.28)',
      }}
    >
      <Icon name="error" size={18} fill style={{ color: SEMANTIC.danger.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: SEMANTIC.danger.color, lineHeight: 1.6 }}>
        {children}
      </span>
    </div>
  );
}

/** กล่องบอกเหตุผลที่ยังกดต่อไม่ได้ (โทนเตือน ไม่ใช่ error) */
export function FormNotice({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 14px',
        borderRadius: 12,
        background: 'rgba(242,166,90,.12)',
        border: '1px solid rgba(242,166,90,.32)',
      }}
    >
      <Icon name="info" size={18} fill style={{ color: SEMANTIC.warning.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: SEMANTIC.warning.color, lineHeight: 1.6 }}>
        {children}
      </span>
    </div>
  );
}

/* ───────────────── ปุ่มส่งฟอร์ม ───────────────── */

export function SubmitButton({
  onClick,
  loading = false,
  disabled = false,
  icon,
  iconAfter,
  label,
  loadingLabel,
  title,
  flex,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconAfter?: string;
  label: string;
  loadingLabel: string;
  title?: string;
  flex?: number;
}) {
  const blocked = disabled && !loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className="nuv-keep"
      style={{
        flex,
        width: flex ? undefined : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 14,
        border: 'none',
        fontFamily: 'inherit',
        fontWeight: 500,
        fontSize: 14.5,
        transition: 'all 220ms ease',
        background: blocked ? 'rgba(31,41,55,.14)' : BRAND_GRADIENT,
        color: blocked ? COLOR.hint : '#fff',
        boxShadow: blocked ? 'none' : '0 8px 22px rgba(167,116,247,.34)',
        cursor: loading ? 'wait' : blocked ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.72 : 1,
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 17,
              height: 17,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.35)',
              borderTopColor: '#fff',
              animation: 'nuSpin 700ms linear infinite',
              display: 'inline-block',
            }}
          />
          {loadingLabel}
        </>
      ) : (
        <>
          {icon ? <Icon name={icon} size={19} /> : null}
          {label}
          {iconAfter ? <Icon name={iconAfter} size={19} /> : null}
        </>
      )}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  icon,
  label,
  flex,
}: {
  onClick: () => void;
  icon?: string;
  label: string;
  flex?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex,
        width: flex ? undefined : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 13,
        borderRadius: 14,
        border: '1px solid rgba(31,41,55,.12)',
        background: 'rgba(255,255,255,.7)',
        color: COLOR.ink,
        fontFamily: 'inherit',
        fontWeight: 500,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 220ms ease',
      }}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {label}
    </button>
  );
}

/* ───────────────── ช่องติ๊ก ───────────────── */

export function CheckMark({ on, size = 21 }: { on: boolean; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size >= 21 ? 7 : 6,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease',
        border: `1.5px solid ${on ? 'transparent' : 'rgba(31,41,55,.25)'}`,
        background: on ? BRAND_GRADIENT : 'transparent',
      }}
    >
      <Icon
        name="check"
        size={size - 6}
        style={{ color: '#fff', opacity: on ? 1 : 0, transition: 'opacity 200ms ease' }}
      />
    </div>
  );
}

/* ───────────────── ตัววัดความแข็งแรงรหัสผ่าน ───────────────── */

/** เกณฑ์เดียวกับหน้าต้นแบบ: ความยาว · ตัวพิมพ์ใหญ่/อักษรไทย · ตัวเลข · อักขระพิเศษ */
export function passwordChecks(pw: string) {
  return [
    { label: 'ยาวอย่างน้อย 8 ตัวอักษร', ok: pw.length >= 8 },
    { label: 'มีตัวพิมพ์ใหญ่หรือตัวอักษรไทย', ok: /[A-Z]/.test(pw) || /[ก-๙]/.test(pw) },
    { label: 'มีตัวเลขอย่างน้อย 1 ตัว', ok: /[0-9]/.test(pw) },
    { label: 'มีอักขระพิเศษ เช่น ! @ # $', ok: /[^A-Za-z0-9ก-๙]/.test(pw) },
  ];
}

const STRENGTH = [
  { label: '', color: COLOR.hint, fill: 'rgba(31,41,55,.1)' },
  { label: 'อ่อน — ควรยาวอย่างน้อย 8 ตัว', color: '#C2410C', fill: '#E97171' },
  { label: 'พอใช้ — เพิ่มตัวเลขหรือตัวพิมพ์ใหญ่', color: '#B45309', fill: '#F5A623' },
  { label: 'ดี — ปลอดภัยพอสมควร', color: '#1D4ED8', fill: '#7AB8FF' },
  { label: 'แข็งแรงมาก', color: '#0F8A63', fill: '#63D2A1' },
];

export function PasswordStrength({ password }: { password: string }) {
  const t = useT();
  const score = passwordChecks(password).filter((c) => c.ok).length;
  const sc = STRENGTH[password ? score : 0];

  return (
    <>
      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 4,
              transition: 'background 260ms ease',
              background: password && i < score ? sc.fill : 'rgba(31,41,55,.1)',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: sc.color, marginTop: 5 }}>{sc.label ? t(sc.label) : ''}</div>
    </>
  );
}

/** รายการเกณฑ์รหัสผ่านแบบติ๊กทีละข้อ (ใช้ในหน้าตั้งรหัสผ่านใหม่) */
export function PasswordRules({ password }: { password: string }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
      {passwordChecks(password).map((c) => (
        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon
            name={c.ok ? 'check_circle' : 'radio_button_unchecked'}
            size={17}
            fill={c.ok}
            style={{ color: c.ok ? SEMANTIC.success.color : '#CBD5E1', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, lineHeight: 1.6, color: c.ok ? COLOR.body : COLOR.hint }}>
            {t(c.label)}
          </span>
        </div>
      ))}
    </div>
  );
}
