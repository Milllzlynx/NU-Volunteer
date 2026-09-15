'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { certFontVars } from '@/lib/certificateFonts';
import type { CertificateView } from '@/lib/certificates';

/**
 * ใบประกาศนียบัตรกิจกรรมจิตอาสา — ตัวเอกสาร
 *
 * ออกแบบให้อ่านเป็นเอกสารราชการ ไม่ใช่การ์ดเว็บ: กระดาษ A4 แนวนอน จัดชิดซ้าย
 * ตราประทับชั่วโมงอยู่คอลัมน์ขวา และ QR แทน URL ยาว
 * ใช้ตัวเดียวกันทั้งพรีวิว หน้าตรวจสอบสาธารณะ และตอนพิมพ์ ใบที่พิมพ์ออกไปจึงตรงกับที่หน่วยงานภายนอกเห็น
 *
 * สไตล์อยู่ใน app/globals.css กลุ่ม .nuv-cd- เพราะต้องใช้ container query, @page,
 * keyframes และ prefers-reduced-motion ซึ่ง inline style ทำไม่ได้
 * ขนาดทุกอย่างเป็น cqw ของความกว้างกระดาษ — กระดาษจะย่อขยายทั้งแผ่นเหมือนภาพเดียว
 */

export type CertificateDocumentProps = {
  studentName: string;
  /** หน้าตรวจสอบสาธารณะไม่ส่งรหัสนิสิตมา — ว่างแล้วไม่แสดงบรรทัดนี้ */
  studentId?: string | null;
  faculty?: string | null;
  activityName: string;
  organizer?: string | null;
  activityType: string;
  hours: number;
  academicYear?: number | null;
  /** วันที่ออกใบแบบเดือนเต็ม เช่น 17 สิงหาคม 2569 */
  issuedDate: string;
  refCode: string;
  verifyUrl: string;
  /** ใบที่ถูกเพิกถอน — ตราเปลี่ยนเป็นสีเทาและมีหมายเหตุบนตัวเอกสาร */
  revoked?: { date: string | null; reason: string | null } | null;
};

/** แปลงข้อมูลใบประกาศจากเซิร์ฟเวอร์เป็น props ของเอกสารตามภาษาที่เลือก */
export function documentPropsOf(
  c: CertificateView,
  verifyUrl: string,
  isEn: boolean,
): CertificateDocumentProps {
  return {
    studentName: c.holderName,
    studentId: c.studentId,
    faculty: c.faculty,
    activityName: c.activityTitle,
    organizer: c.orgName,
    activityType: isEn ? c.categoryLabelEn : c.categoryLabel,
    hours: c.hours,
    academicYear: c.academicYear,
    issuedDate: isEn ? c.issuedLongEn : c.issuedLongTh,
    refCode: c.ref,
    verifyUrl,
    revoked: c.revoked
      ? { date: isEn ? c.revokedLongEn : c.revokedLongTh, reason: c.revokeReason }
      : null,
  };
}

/** เอกสารพร้อมแถบเครื่องมือ — ใช้บนหน้าจอ */
export function CertificateDocument(props: CertificateDocumentProps) {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    if (await copyText(props.verifyUrl)) setCopied(true);
  };

  return (
    <div className={`nuv-cd ${certFontVars}`}>
      <div className="nuv-cd-toolbar nuv-no-print">
        <button type="button" className="nuv-cd-btn" onClick={copyLink} aria-live="polite">
          <Icon name={copied ? 'check' : 'link'} size={18} />
          {copied ? t('คัดลอกแล้ว') : t('คัดลอกลิงก์ตรวจสอบ')}
        </button>
        {/* ใบที่ถูกเพิกถอนแล้วไม่ควรพิมพ์ออกไปใช้อ้างอิงต่อ */}
        {!props.revoked ? (
          <button
            type="button"
            className="nuv-cd-btn nuv-cd-btn-primary"
            onClick={() => setPrinting(true)}
          >
            <Icon name="print" size={18} />
            {t('พิมพ์ / บันทึก PDF')}
          </button>
        ) : null}
      </div>

      {/* โต๊ะสีเทาอ่อนที่วางกระดาษ — ให้ขอบกระดาษขาวมองเห็นเป็นแผ่นเอกสาร */}
      <div className="nuv-cd-desk">
        <Paper {...props} />
      </div>

      {printing ? <CertificatePrint {...props} onDone={() => setPrinting(false)} /> : null}
    </div>
  );
}

/**
 * สั่งพิมพ์เอกสารหนึ่งใบ — วาดสำเนาไว้ใต้ <body> โดยตรงแล้วซ่อนส่วนอื่นของหน้าตอนพิมพ์
 *
 * ไม่พิมพ์จากตำแหน่งเดิมในหน้า เพราะเอกสารอาจอยู่ในโมดัลที่ถูกซ่อนตอนพิมพ์
 * หรืออยู่ในกล่องที่มีระยะขอบ ซึ่งทำให้กระดาษ 297×210 มม. ล้นไปหน้าที่สอง
 * เอาสำเนาออกเมื่อได้ afterprint ไม่ใช่ทันทีหลัง print() เพราะบางเบราว์เซอร์เตรียมหน้าแบบไม่บล็อก
 */
export function CertificatePrint({
  onDone,
  ...props
}: CertificateDocumentProps & { onDone: () => void }) {
  // เก็บ callback ไว้ใน ref — ผู้เรียกมักส่งฟังก์ชันใหม่ทุกครั้งที่ render
  // ถ้าใส่ไว้ใน dependency ตรง ๆ หน้าต่างพิมพ์จะเด้งซ้ำทุกครั้งที่หน้าแม่ render ใหม่
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('nuv-cd-printing');

    const done = () => onDoneRef.current();
    window.addEventListener('afterprint', done);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', done);
      root.classList.remove('nuv-cd-printing');
    };
  }, []);

  // แสดงหลังผู้ใช้กดพิมพ์เท่านั้น จึงไม่เคยถูก render ฝั่งเซิร์ฟเวอร์ — กันไว้เผื่อถูกเรียกผิดที่
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`nuv-cd-print ${certFontVars}`}>
      {/* @page ของรายงานทั่วไปมีขอบ 12 มม. — ใบประกาศต้องเต็มแผ่น จึงประกาศทับไว้เฉพาะช่วงที่กำลังพิมพ์ */}
      <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
      <Paper {...props} />
    </div>,
    document.body,
  );
}

/* ───────────────────────── ตัวกระดาษ ───────────────────────── */

function Paper(p: CertificateDocumentProps) {
  const { t, isEn } = useApp();
  const revoked = p.revoked ?? null;

  return (
    // .nuv-keep กันไม่ให้โหมดมืดกลับสีกระดาษ — เอกสารต้องเป็นพื้นขาวเสมอ
    <div className="nuv-cd-sizer nuv-keep">
      <article className="nuv-cd-paper" lang={isEn ? 'en' : 'th'} aria-label={t('ใบประกาศนียบัตรกิจกรรมจิตอาสา')}>
        <div className="nuv-cd-band" aria-hidden="true" />
        <div className="nuv-cd-watermark" aria-hidden="true" />

        {/* ไม่ใช้ <header> — CSS ตอนพิมพ์ของแอปซ่อนทุก header ซึ่งจะพาหัวเอกสารหายไปด้วย */}
        <div className="nuv-cd-head">
          <div className="nuv-cd-brand">
            <Seal />
            <div>
              <div className="nuv-cd-uni">{t('มหาวิทยาลัยนเรศวร')}</div>
              <div className="nuv-cd-system">{t('ระบบบริหารจัดการกิจกรรมจิตอาสา')}</div>
            </div>
          </div>
          <div className="nuv-cd-ref">
            <div className="nuv-cd-label">{t('เลขที่อ้างอิง')}</div>
            <div className="nuv-cd-refcode">{p.refCode}</div>
          </div>
        </div>

        <section className="nuv-cd-body">
          <h1 className="nuv-cd-title">{t('ใบประกาศนียบัตรกิจกรรมจิตอาสา')}</h1>
          <p className="nuv-cd-lead">{t('ขอมอบให้ไว้เพื่อแสดงว่า')}</p>
          <p className="nuv-cd-name">{p.studentName}</p>

          {p.studentId || p.faculty ? (
            <div className="nuv-cd-idrow">
              {p.studentId ? (
                <span>
                  {t('รหัสนิสิต')} <strong>{p.studentId}</strong>
                </span>
              ) : null}
              {p.faculty ? <span>{p.faculty}</span> : null}
            </div>
          ) : null}

          <p className="nuv-cd-statement">
            {isEn ? (
              <>
                has taken part in <strong>{p.activityName}</strong>
                {p.organizer ? `, organised by ${p.organizer},` : ''} and the volunteer hours have been
                certified.
              </>
            ) : (
              <>
                ได้เข้าร่วมกิจกรรม <strong>{p.activityName}</strong>
                {p.organizer ? ` จัดโดย${p.organizer}` : ''} และได้รับการรับรองชั่วโมงจิตอาสาเรียบร้อยแล้ว
              </>
            )}
          </p>
        </section>

        <div className="nuv-cd-stampcell">
          <div
            className={`nuv-cd-stamp${revoked ? ' is-revoked' : ''}`}
            role="img"
            aria-label={
              revoked
                ? `${t('ใบประกาศนี้ถูกเพิกถอนแล้ว')} ${p.hours} ${t('ชั่วโมงจิตอาสา')}`
                : `${t('รับรองแล้ว')} ${p.hours} ${t('ชั่วโมงจิตอาสา')}`
            }
          >
            <span className="nuv-cd-stamp-hours" aria-hidden="true">
              {p.hours}
            </span>
            <span className="nuv-cd-stamp-unit" aria-hidden="true">
              {t('ชั่วโมงจิตอาสา')}
            </span>
            <span className="nuv-cd-stamp-status" aria-hidden="true">
              {revoked ? t('เพิกถอนแล้ว') : t('รับรองแล้ว')}
            </span>
          </div>
        </div>

        {revoked ? (
          <p className="nuv-cd-revoked" role="note">
            <strong>{t('เอกสารนี้ถูกเพิกถอนแล้ว ใช้อ้างอิงไม่ได้')}</strong>
            {revoked.date ? ` ${t('เมื่อ')} ${revoked.date}` : ''}
            {revoked.reason ? ` ${t('เหตุผล')}: ${revoked.reason}` : ''}
          </p>
        ) : null}

        <footer className="nuv-cd-foot">
          <dl className="nuv-cd-facts">
            <div>
              <dt>{t('ประเภทกิจกรรม')}</dt>
              <dd>{p.activityType}</dd>
            </div>
            <div>
              <dt>{t('ปีการศึกษา')}</dt>
              <dd>{p.academicYear ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('ออกให้ ณ วันที่')}</dt>
              <dd>{p.issuedDate}</dd>
            </div>
          </dl>

          <div className="nuv-cd-sign">
            <div className="nuv-cd-signline" aria-hidden="true" />
            <div className="nuv-cd-signrole">{t('ผู้อำนวยการกองกิจการนิสิต')}</div>
          </div>

          <div className="nuv-cd-qr">
            <span className="nuv-cd-qrcap">{t('สแกนเพื่อตรวจสอบความถูกต้องของเอกสาร')}</span>
            <QrCode value={p.verifyUrl} label={`${t('QR code สำหรับตรวจสอบเอกสาร')} ${p.refCode}`} />
          </div>
        </footer>
      </article>
    </div>
  );
}

/**
 * QR เป็น SVG ที่สร้างจากเมทริกซ์โดยตรง — ไม่ต้องรอ canvas หรือ data URL
 * จึงวาดได้ตั้งแต่ SSR และคมชัดทุกขนาดตอนพิมพ์
 */
function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) {
        if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: modules.size, path: d };
  }, [value]);

  // ขอบว่างรอบ QR 2 ช่อง — น้อยกว่ามาตรฐานเล็กน้อยแต่กระดาษรอบ ๆ เป็นสีขาวอยู่แล้ว
  const quiet = 2;
  return (
    <svg
      className="nuv-cd-qrsvg"
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} fill="#fff" />
      <path d={path} fill="#262A30" />
    </svg>
  );
}

/** ตราวงกลมของระบบ — สัญลักษณ์มือประคองหัวใจชุดเดียวกับ BrandMark ไม่ใช่ตราของมหาวิทยาลัย */
function Seal() {
  return (
    <svg className="nuv-cd-seal" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" fill="#fff" stroke="#E0620D" strokeWidth="2" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="#E0620D" strokeWidth="0.8" strokeDasharray="1.6 1.6" />
      <path
        d="M24 21.2c-1.6-3.3-6.6-2.9-6.6 1.2 0 2.9 3.8 5.4 6.6 7.3 2.8-1.9 6.6-4.4 6.6-7.3 0-4.1-5-4.5-6.6-1.2Z"
        fill="#E0620D"
      />
      <path d="M13.2 28.6c0 5.3 5 8.2 10.8 8.2s10.8-2.9 10.8-8.2" fill="none" stroke="#4A4F57" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** คัดลอกข้อความ — ตกไปใช้ execCommand เมื่อเบราว์เซอร์ไม่ให้สิทธิ์ Clipboard API (เช่นหน้าที่ไม่ใช่ https) */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
