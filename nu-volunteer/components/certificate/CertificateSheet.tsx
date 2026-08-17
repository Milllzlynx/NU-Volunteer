'use client';

import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { BRAND_GRADIENT, COLOR, SEMANTIC } from '@/lib/design';
import type { CertificateView } from '@/lib/certificates';

/**
 * ตัวใบประกาศนียบัตร — ใช้ทั้งบนหน้าจอ (พรีวิว/หน้าตรวจสอบ) และตอนสั่งพิมพ์
 *
 * เป็นคอมโพเนนต์เดียวทั้งสองทาง เพื่อให้ใบที่นิสิตพิมพ์ออกไปเหมือนกับใบที่
 * หน่วยงานภายนอกเห็นบนหน้าตรวจสอบทุกประการ
 */
export function CertificateSheet({
  certificate,
  verifyUrl,
}: {
  certificate: CertificateView;
  verifyUrl: string;
}) {
  const { t, isEn } = useApp();
  const c = certificate;

  return (
    <div
      className="nuv-cert-sheet"
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid rgba(31,41,55,.14)',
        borderRadius: 18,
        padding: 0,
        overflow: 'hidden',
        // ใบประกาศต้องอ่านออกเสมอ ไม่ผูกกับสีพื้นหลังของธีมที่ผู้ใช้เลือก
        color: COLOR.ink,
      }}
    >
      {/* แถบสีหัวกระดาษ */}
      <div style={{ height: 10, background: BRAND_GRADIENT }} />

      <div style={{ padding: '30px 38px 34px', textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, letterSpacing: 1.4, color: COLOR.label, textTransform: 'uppercase' }}>
          {t('มหาวิทยาลัยนเรศวร')}
        </div>
        <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 3 }}>
          {t('ระบบบริหารจัดการกิจกรรมจิตอาสา')}
        </div>

        <h1 style={{ fontSize: 27, fontWeight: 700, margin: '18px 0 0', lineHeight: 1.3 }}>
          {t('ใบประกาศนียบัตร')}
        </h1>
        <div style={{ fontSize: 13, color: COLOR.body, marginTop: 5 }}>
          {t('เพื่อแสดงว่าได้เข้าร่วมกิจกรรมจิตอาสาและได้รับการรับรองชั่วโมงแล้ว')}
        </div>

        {/* เส้นคั่นสั้น ๆ ใต้หัวเรื่อง */}
        <div
          aria-hidden="true"
          style={{ width: 76, height: 3, borderRadius: 999, background: BRAND_GRADIENT, margin: '18px auto 0' }}
        />

        <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 24 }}>{t('ขอมอบให้แก่')}</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 8, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
          {c.holderName}
        </div>

        {/* รหัสนิสิตมีเฉพาะบนใบของเจ้าของ หน้าตรวจสอบสาธารณะจะไม่ส่งค่านี้มา */}
        {c.studentId || c.faculty ? (
          <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 7 }}>
            {[c.studentId, c.faculty].filter(Boolean).join(' · ')}
          </div>
        ) : null}

        <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 24 }}>
          {t('ผู้เข้าร่วมกิจกรรม')}
        </div>
        <div style={{ fontSize: 19, fontWeight: 600, marginTop: 7, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          {c.activityTitle}
        </div>
        {c.orgName ? (
          <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 5 }}>{c.orgName}</div>
        ) : null}

        {/* ชั่วโมงกับวันที่ออกใบ — ข้อมูลที่หน่วยงานภายนอกดูเป็นอันดับแรก */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 34,
            marginTop: 26,
            paddingTop: 22,
            borderTop: '1px solid rgba(31,41,55,.1)',
          }}
        >
          <Fact label={t('ชั่วโมงจิตอาสา')} value={`${c.hours} ${t('ชม.')}`} />
          <Fact label={t('ประเภทกิจกรรม')} value={isEn ? c.categoryLabelEn : c.categoryLabel} />
          <Fact label={t('วันที่ออกใบ')} value={isEn ? c.issuedEn : c.issuedTh} />
          {c.academicYear ? (
            <Fact label={t('ปีการศึกษา')} value={String(c.academicYear)} />
          ) : null}
        </div>

        {/* รหัสอ้างอิงและที่อยู่หน้าตรวจสอบ — บนกระดาษคลิกไม่ได้ ต้องพิมพ์ตามได้ */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px dashed rgba(31,41,55,.16)',
            fontSize: 11.5,
            color: COLOR.label,
            lineHeight: 1.9,
          }}
        >
          <div>
            <span style={{ color: COLOR.hint }}>{t('รหัสอ้างอิง')}</span>{' '}
            <strong style={{ fontSize: 13, letterSpacing: 0.6, color: COLOR.ink }}>{c.ref}</strong>
          </div>
          <div style={{ overflowWrap: 'anywhere' }}>
            <span style={{ color: COLOR.hint }}>{t('ตรวจสอบความถูกต้องได้ที่')}</span> {verifyUrl}
          </div>
        </div>
      </div>

      {/* ใบที่ถูกเพิกถอนต้องดูออกทันทีแม้พิมพ์ออกมาเป็นขาวดำ จึงมีทั้งกรอบ ไอคอน และข้อความ */}
      {c.revoked ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            padding: '13px 20px',
            background: SEMANTIC.danger.bg,
            borderTop: `2px solid ${SEMANTIC.danger.dot}`,
            color: SEMANTIC.danger.color,
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          <Icon name="gpp_bad" size={19} />
          <span>
            {t('ใบประกาศนี้ถูกเพิกถอนแล้ว')}
            {c.revokedTh ? ` · ${isEn ? c.revokedEn : c.revokedTh}` : ''}
            {c.revokeReason ? ` · ${c.revokeReason}` : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ fontSize: 11, color: COLOR.hint }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: COLOR.ink }}>{value}</div>
    </div>
  );
}
