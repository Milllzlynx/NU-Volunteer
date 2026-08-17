'use client';

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { BRAND_GRADIENT, COLOR, SEMANTIC, glass, type SemanticTone } from '@/lib/design';

/* ───────────────── icon ───────────────── */

export function Icon({
  name,
  size = 20,
  fill = false,
  style,
  className = '',
}: {
  name: string;
  size?: number;
  fill?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={`msr${fill ? ' fill' : ''}${className ? ' ' + className : ''}`}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/* ───────────────── card ───────────────── */

export function Card({
  children,
  radius = 20,
  padding = 22,
  style,
  className = '',
  ...rest
}: {
  children: ReactNode;
  radius?: number;
  padding?: number | string;
  style?: CSSProperties;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} style={{ ...glass(radius), padding, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  icon,
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: desc ? 4 : 14 }}>
      {icon ? (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: BRAND_GRADIENT,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={24} />
        </div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16.5, fontWeight: 600, color: COLOR.ink, lineHeight: 1.45 }}>
          {title}
        </div>
        {desc ? (
          <div
            style={{
              fontSize: 12.5,
              color: COLOR.label,
              lineHeight: 1.7,
              marginTop: 3,
              textWrap: 'pretty',
            }}
          >
            {desc}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ───────────────── buttons ───────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<ButtonVariant, CSSProperties> = {
  primary: {
    border: 'none',
    background: BRAND_GRADIENT,
    color: '#fff',
    fontWeight: 500,
  },
  secondary: {
    border: '1px solid rgba(31,41,55,.12)',
    background: 'rgba(255,255,255,.55)',
    color: COLOR.body,
  },
  ghost: {
    border: 'none',
    background: 'transparent',
    color: COLOR.body,
  },
  danger: {
    border: '1px solid rgba(233,113,113,.4)',
    background: 'rgba(233,113,113,.12)',
    color: SEMANTIC.danger.color,
  },
};

export const Button = forwardRef<
  HTMLButtonElement,
  {
    variant?: ButtonVariant;
    icon?: string;
    iconFill?: boolean;
    children?: ReactNode;
    loading?: boolean;
    full?: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(
  { variant = 'secondary', icon, iconFill, children, loading, full, style, disabled, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '12px 20px',
        borderRadius: 13,
        fontSize: 13.5,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        width: full ? '100%' : undefined,
        transition: 'transform 160ms ease, box-shadow 200ms ease, background 200ms ease',
        ...VARIANT[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <Icon name="progress_activity" size={18} style={{ animation: 'nuSpin 1s linear infinite' }} />
      ) : icon ? (
        <Icon name={icon} size={18} fill={iconFill} />
      ) : null}
      {children}
    </button>
  );
});

/** ปุ่มไอคอนล้วน — ต้องมี aria-label เสมอ (พื้นที่กด 44×44 บนมือถือผ่าน .nuv-iconbtn) */
export function IconButton({
  icon,
  label,
  fill,
  style,
  ...rest
}: { icon: string; label: string; fill?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="nuv-iconbtn"
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 12,
        border: '1px solid rgba(31,41,55,.1)',
        background: 'rgba(255,255,255,.55)',
        color: COLOR.body,
        cursor: 'pointer',
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={19} fill={fill} />
    </button>
  );
}

/* ───────────────── badge ───────────────── */

export function Badge({
  tone = 'neutral',
  label,
  dot,
  icon,
  style,
}: {
  tone?: SemanticTone;
  label: string;
  dot?: boolean;
  icon?: string;
  style?: CSSProperties;
}) {
  const s = SEMANTIC[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color: s.color,
        background: s.bg,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot ? (
        <span
          style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }}
        />
      ) : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {/* ทุก badge มีข้อความกำกับเสมอ — ไม่พึ่งสีอย่างเดียว */}
      {label}
    </span>
  );
}

/** badge ที่ระบุสีเอง (ใช้กับหมวดหมู่ที่สีมาจากฐานข้อมูล) */
export function ColorBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 500,
        color,
        background: color + '22',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

/* ───────────────── tabs ───────────────── */

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="nuv-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            aria-pressed={active}
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              cursor: 'pointer',
              border: active ? 'none' : '1px solid rgba(31,41,55,.1)',
              background: active ? BRAND_GRADIENT : 'rgba(255,255,255,.6)',
              color: active ? '#fff' : COLOR.body,
              fontWeight: active ? 500 : 400,
            }}
          >
            {it.label}
            {it.count != null ? (
              <span style={{ opacity: 0.75, marginLeft: 6 }}>{it.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────── form ───────────────── */

export function Field({
  label,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          color: COLOR.label,
          marginBottom: 6,
        }}
      >
        {label}
        {required ? <span style={{ color: SEMANTIC.danger.color }}> *</span> : null}
      </span>
      {children}
      {error ? (
        <span
          style={{ display: 'block', fontSize: 12, color: SEMANTIC.danger.color, marginTop: 5 }}
        >
          {error}
        </span>
      ) : hint ? (
        <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint, marginTop: 5 }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputStyle = (invalid = false): CSSProperties => ({
  width: '100%',
  padding: '12px 14px',
  borderRadius: 13,
  border: `1px solid ${invalid ? 'rgba(233,113,113,.6)' : 'rgba(31,41,55,.12)'}`,
  background: 'rgba(255,255,255,.6)',
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: COLOR.ink,
  outlineOffset: 2,
});

/* ───────────────── feedback ───────────────── */

export function Skeleton({ height = 16, width = '100%', radius = 8 }: {
  height?: number | string;
  width?: number | string;
  radius?: number;
}) {
  return <div className="nuv-sk" style={{ height, width, borderRadius: radius }} />;
}

export function EmptyState({
  icon = 'inbox',
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ padding: '46px 22px', textAlign: 'center' }}>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 19,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(167,116,247,.14)',
          color: '#7C2FD9',
        }}
      >
        <Icon name={icon} size={30} />
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 600, color: COLOR.ink, marginTop: 16 }}>{title}</div>
      {desc ? (
        <div
          style={{
            fontSize: 12.5,
            color: COLOR.label,
            lineHeight: 1.8,
            marginTop: 6,
            textWrap: 'pretty',
            maxWidth: 420,
            marginInline: 'auto',
          }}
        >
          {desc}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
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
        background: SEMANTIC.danger.bg,
        border: '1px solid rgba(233,113,113,.3)',
        color: SEMANTIC.danger.color,
        fontSize: 12.5,
        lineHeight: 1.6,
      }}
    >
      <Icon name="error" size={18} />
      <span>{children}</span>
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 14px',
        borderRadius: 12,
        background: SEMANTIC.success.bg,
        border: '1px solid rgba(99,210,161,.3)',
        color: SEMANTIC.success.color,
        fontSize: 12.5,
        lineHeight: 1.6,
      }}
    >
      <Icon name="check_circle" size={18} fill />
      <span>{children}</span>
    </div>
  );
}

export { Timestamp } from '@/components/ui/Timestamp';
export type { TimestampProps, TimestampVariant } from '@/components/ui/Timestamp';
