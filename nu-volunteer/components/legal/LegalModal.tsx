'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { legalSections, type LegalTab } from '@/lib/legal';
import { BRAND_GRADIENT, COLOR } from '@/lib/design';

/** โมดัลข้อกำหนด/ความเป็นส่วนตัว — ใช้ร่วมกันระหว่างหน้าแรกและหน้าสมัครสมาชิก */
export function LegalModal({
  open,
  tab,
  onTab,
  onClose,
}: {
  open: boolean;
  tab: LegalTab;
  onTab: (t: LegalTab) => void;
  onClose: () => void;
}) {
  const { t, isEn } = useApp();

  // ปิดด้วย Esc และล็อกการเลื่อนหน้าหลังระหว่างเปิดโมดัล
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sections = legalSections(tab);
  const closeLabel = t('ปิด');
  const title = tab === 'privacy' ? t('นโยบายความเป็นส่วนตัว') : t('ข้อกำหนดการใช้งาน');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(24,20,34,.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 760,
          background: 'rgba(255,255,255,.94)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.8)',
          borderRadius: 28,
          padding: 30,
          boxShadow: '0 30px 80px rgba(24,20,34,.32)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'nuPop .22s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 19,
              fontWeight: 600,
              color: COLOR.ink,
              lineHeight: 1.4,
            }}
          >
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              border: '1px solid rgba(31,41,55,.1)',
              background: 'rgba(255,255,255,.75)',
              color: COLOR.body,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="nuv-tabs" style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {(['terms', 'privacy'] as LegalTab[]).map((id) => {
            const active = id === tab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                aria-pressed={active}
                style={{
                  padding: '9px 16px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: active ? 'none' : '1px solid rgba(31,41,55,.1)',
                  background: active ? BRAND_GRADIENT : 'rgba(255,255,255,.6)',
                  color: active ? '#fff' : COLOR.body,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {id === 'privacy' ? t('นโยบายความเป็นส่วนตัว') : t('ข้อกำหนดการใช้งาน')}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18, flex: 1, minHeight: 0, overflow: 'auto', paddingRight: 6 }}>
          {sections.map((s) => (
            <div key={s.id} style={{ marginBottom: 20 }}>
              <div
                style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink, lineHeight: 1.55 }}
              >
                {isEn ? s.titleEn : s.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: COLOR.body,
                  lineHeight: 1.95,
                  marginTop: 7,
                  textWrap: 'pretty',
                  whiteSpace: 'pre-line',
                }}
              >
                {isEn ? s.bodyEn : s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** ตัวช่วยจัดการสถานะโมดัล — ผู้เรียกเพียงวาง <modal/> และผูกปุ่มเปิด */
export function useLegalModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LegalTab>('terms');

  return {
    openTerms: () => {
      setTab('terms');
      setOpen(true);
    },
    openPrivacy: () => {
      setTab('privacy');
      setOpen(true);
    },
    modal: <LegalModal open={open} tab={tab} onTab={setTab} onClose={() => setOpen(false)} />,
  };
}
