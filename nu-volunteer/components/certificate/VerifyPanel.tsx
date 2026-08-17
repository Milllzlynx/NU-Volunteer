'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CertificateSheet } from '@/components/certificate/CertificateSheet';
import { BrandMark } from '@/components/layout/BrandMark';
import { useApp } from '@/components/providers/AppProviders';
import { Button, EmptyState, Icon, inputStyle } from '@/components/ui';
import { COLOR, SEMANTIC, glass } from '@/lib/design';
import type { CertificateView } from '@/lib/certificates';

/**
 * หน้าตรวจสอบใบประกาศสาธารณะ — เปิดได้โดยไม่ต้องเข้าสู่ระบบ
 *
 * แสดงเฉพาะชื่อผู้ถือ กิจกรรม ชั่วโมง และวันที่ออกใบ ตามที่ประกาศไว้ในนโยบาย
 * ความเป็นส่วนตัว (lib/legal.ts §p4) — ไม่มีอีเมล เบอร์โทร หรือรหัสนิสิต
 */
export function VerifyPanel({
  certificate,
  searchedRef,
  verifyBase,
}: {
  certificate: CertificateView | null;
  /** รหัสที่ผู้ใช้ค้นมา — ว่างได้เมื่อเปิดหน้านี้ตรง ๆ โดยยังไม่ได้กรอก */
  searchedRef: string;
  verifyBase: string;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [input, setInput] = useState(searchedRef);

  /** ส่งผู้ใช้ไปที่ URL ของรหัสนั้น เพื่อให้ผลการตรวจสอบมี URL ของตัวเองที่ส่งต่อได้ */
  const go = () => {
    const next = input.trim().toUpperCase();
    if (next) router.push(`/verify/${encodeURIComponent(next)}`);
  };

  const status = !searchedRef
    ? 'idle'
    : !certificate
      ? 'notfound'
      : certificate.revoked
        ? 'revoked'
        : 'valid';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 56px', display: 'grid', gap: 16 }}>
      <div className="nuv-no-print" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" aria-label="NU Volunteer">
            <BrandMark />
          </Link>
          <div style={{ marginInlineStart: 'auto' }}>
            <Link href="/">
              <Button variant="secondary" icon="home" style={{ padding: '9px 14px' }}>
                {t('กลับหน้าแรก')}
              </Button>
            </Link>
          </div>
        </div>

        <div style={{ ...glass(22), padding: 20, display: 'grid', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, margin: 0, color: COLOR.ink }}>{t('ตรวจสอบใบประกาศนียบัตร')}</h1>
            <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 6, lineHeight: 1.8 }}>
              {t('กรอกรหัสอ้างอิงที่ปรากฏบนใบประกาศเพื่อตรวจสอบว่าออกโดยระบบจริงและยังไม่ถูกเพิกถอน ไม่ต้องเข้าสู่ระบบ')}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'flex-end' }}
          >
            <label style={{ flex: 1, minWidth: 220 }}>
              <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label, marginBottom: 5 }}>
                {t('รหัสอ้างอิง')}
              </span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="NUV-2569-XXXXX"
                autoCapitalize="characters"
                spellCheck={false}
                style={{ ...inputStyle(), letterSpacing: 0.6 }}
              />
            </label>
            <Button variant="primary" icon="search" type="submit" disabled={!input.trim()} style={{ padding: '12px 18px' }}>
              {t('ตรวจสอบ')}
            </Button>
          </form>
        </div>

        {/* ผลการตรวจสอบ — บอกด้วยไอคอนและข้อความ ไม่พึ่งสีอย่างเดียว */}
        {status === 'valid' ? (
          <Result
            tone="success"
            icon="verified"
            title={t('ใบประกาศนี้ถูกต้อง')}
            desc={t('ออกโดยระบบ NU Volunteer มหาวิทยาลัยนเรศวร และยังไม่ถูกเพิกถอน')}
          />
        ) : status === 'revoked' ? (
          <Result
            tone="danger"
            icon="gpp_bad"
            title={t('ใบประกาศนี้ถูกเพิกถอนแล้ว')}
            desc={
              certificate?.revokeReason ||
              t('ใบนี้เคยออกโดยระบบจริง แต่ถูกเพิกถอนภายหลัง จึงใช้อ้างอิงไม่ได้')
            }
          />
        ) : status === 'notfound' ? (
          <Result
            tone="warning"
            icon="search_off"
            title={t('ไม่พบใบประกาศตามรหัสนี้')}
            desc={t('ตรวจสอบว่าพิมพ์รหัสครบถ้วนตามที่ปรากฏบนใบประกาศ รูปแบบคือ NUV-ปีการศึกษา-รหัส 5 หลัก')}
          />
        ) : null}
      </div>

      {certificate ? (
        <CertificateSheet certificate={certificate} verifyUrl={`${verifyBase}/verify/${encodeURIComponent(certificate.ref)}`} />
      ) : status === 'idle' ? (
        <div className="nuv-no-print" style={{ ...glass(22) }}>
          <EmptyState
            icon="workspace_premium"
            title={t('ยังไม่ได้กรอกรหัสอ้างอิง')}
            desc={t('รหัสอ้างอิงอยู่ด้านล่างของใบประกาศ ใกล้กับที่อยู่ของหน้านี้')}
          />
        </div>
      ) : null}

      {certificate ? (
        <div className="nuv-no-print" style={{ fontSize: 11.5, color: COLOR.hint, textAlign: 'center', lineHeight: 1.8 }}>
          {isEn
            ? 'This page shows only the holder name, activity, hours and issue date.'
            : t('หน้านี้แสดงเฉพาะชื่อผู้ถือ กิจกรรม ชั่วโมง และวันที่ออกใบ')}
        </div>
      ) : null}
    </div>
  );
}

function Result({
  tone,
  icon,
  title,
  desc,
}: {
  tone: 'success' | 'danger' | 'warning';
  icon: string;
  title: string;
  desc: string;
}) {
  const s = SEMANTIC[tone];
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: 13,
        padding: 17,
        borderRadius: 16,
        background: s.bg,
        borderInlineStart: `4px solid ${s.dot}`,
      }}
    >
      <Icon name={icon} size={22} style={{ color: s.color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: s.color }}>{title}</div>
        <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 5, lineHeight: 1.8 }}>{desc}</div>
      </div>
    </div>
  );
}
