'use client';

import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';

/** ดาวแบบอ่านอย่างเดียว */
export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value}/5`} style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={size}
          fill={n <= value}
          style={{ color: n <= value ? '#F5A623' : '#D8DEE7' }}
        />
      ))}
    </span>
  );
}

/**
 * ตัวเลือกดาว — เป็น radiogroup จริงเพื่อให้เลื่อนด้วยแป้น Tab แล้วเลือกด้วย Space/Enter ได้
 * (ถ้าใช้ div ที่ผูก onClick อย่างเดียว ผู้ใช้คีย์บอร์ดจะให้คะแนนไม่ได้เลย)
 */
export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useApp();

  return (
    <div role="radiogroup" aria-label={t('ให้คะแนน')} style={{ display: 'inline-flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} ${t('ดาว')}`}
          onClick={() => onChange(n)}
          style={{
            border: 'none',
            background: 'none',
            padding: 2,
            cursor: 'pointer',
            lineHeight: 0,
            borderRadius: 6,
          }}
        >
          <Icon
            name="star"
            size={26}
            fill={n <= value}
            style={{ color: n <= value ? '#F5A623' : '#D8DEE7', transition: 'color 150ms ease' }}
          />
        </button>
      ))}
    </div>
  );
}
