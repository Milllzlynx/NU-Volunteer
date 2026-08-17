'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CertificateSheet } from '@/components/certificate/CertificateSheet';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, ColorBadge, EmptyState, Icon, IconButton, inputStyle } from '@/components/ui';
import { COLOR, SEMANTIC, glass, solidGlass } from '@/lib/design';
import type { CertificateView } from '@/lib/certificates';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function StudentCertificates({
  certificates,
  verifyBase,
}: {
  certificates: CertificateView[];
  /** โดเมนของหน้าตรวจสอบ เช่น http://localhost:3000 — คำนวณฝั่งเซิร์ฟเวอร์ให้ SSR ตรงกับ client */
  verifyBase: string;
}) {
  const { t, isEn } = useApp();

  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [preview, setPreview] = useState<CertificateView | null>(null);
  const [printing, setPrinting] = useState<CertificateView | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const urlOf = (ref: string) => `${verifyBase}/verify/${encodeURIComponent(ref)}`;

  /**
   * สั่งพิมพ์ใบที่เลือก — วาดใบลง DOM ก่อนหนึ่งเฟรม แล้วค่อยเปิดหน้าต่างพิมพ์
   * เก็บใบออกเมื่อได้รับ afterprint ไม่ใช่ทันทีหลัง print() เพราะบางเบราว์เซอร์
   * เตรียมหน้ากระดาษแบบไม่บล็อก ถ้าเก็บเร็วเกินไปจะได้กระดาษเปล่า
   */
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => {
      window.removeEventListener('afterprint', done);
      cancelAnimationFrame(frame);
    };
  }, [printing]);

  /* ปิดพรีวิวด้วย Esc และล็อกการเลื่อนหน้าหลังระหว่างเปิด */
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

  const copyRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(ref);
      window.setTimeout(() => setCopied((v) => (v === ref ? null : v)), 2000);
    } catch {
      // เบราว์เซอร์ที่ไม่ให้สิทธิ์คลิปบอร์ด — รหัสยังอ่านและเลือกคัดลอกเองได้จากบนการ์ด
    }
  };

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const c of certificates) if (c.academicYear) set.add(c.academicYear);
    return [...set].sort((a, b) => b - a);
  }, [certificates]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return certificates.filter((c) => {
      if (year && String(c.academicYear ?? '') !== year) return false;
      if (!q) return true;
      return (
        c.activityTitle.toLowerCase().includes(q) ||
        c.orgName.toLowerCase().includes(q) ||
        c.ref.toLowerCase().includes(q)
      );
    });
  }, [certificates, query, year]);

  const valid = certificates.filter((c) => !c.revoked);
  const totalHours = round1(valid.reduce((s, c) => s + c.hours, 0));
  const revokedCount = certificates.length - valid.length;
  const filtering = Boolean(query.trim() || year);

  return (
    <div className="nuv-print-root" style={{ display: 'grid', gap: 16 }}>
      <div className="nuv-no-print" style={{ display: 'grid', gap: 16 }}>
        {/* ── สรุป ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <Stat icon="workspace_premium" tone="purple" label={t('ใบประกาศทั้งหมด')} value={String(valid.length)} />
          <Stat icon="schedule" tone="info" label={t('ชั่วโมงที่รับรองแล้ว')} value={`${totalHours} ${t('ชม.')}`} />
          {revokedCount ? (
            <Stat icon="gpp_bad" tone="danger" label={t('ถูกเพิกถอน')} value={String(revokedCount)} />
          ) : null}
        </div>

        {/* ── คำอธิบายการตรวจสอบ ── */}
        <div style={{ ...glass(20), padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="verified_user" size={20} style={{ color: SEMANTIC.success.color, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
            {t('ใบประกาศทุกฉบับมีรหัสอ้างอิงเฉพาะ หน่วยงานภายนอกตรวจสอบความถูกต้องได้ที่หน้าตรวจสอบสาธารณะโดยไม่ต้องเข้าสู่ระบบ')}
          </div>
        </div>

        {/* ── ตัวกรอง ── */}
        {certificates.length ? (
          <div style={{ ...glass(20), padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ flex: 1, minWidth: 200 }}>
              <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label, marginBottom: 5 }}>
                {t('ค้นหา')}
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ชื่อกิจกรรม หน่วยงาน หรือรหัสอ้างอิง')}
                style={inputStyle()}
              />
            </label>

            {years.length > 1 ? (
              <label>
                <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label, marginBottom: 5 }}>
                  {t('ปีการศึกษา')}
                </span>
                <select value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle()}>
                  <option value="">{t('ทุกปีการศึกษา')}</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {filtering ? (
              <Button
                variant="secondary"
                icon="filter_alt_off"
                onClick={() => {
                  setQuery('');
                  setYear('');
                }}
                style={{ padding: '11px 15px' }}
              >
                {t('ล้างตัวกรอง')}
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* ── รายการใบประกาศ ── */}
        {!certificates.length ? (
          <div style={{ ...glass(22) }}>
            <EmptyState
              icon="workspace_premium"
              title={t('ยังไม่มีใบประกาศ')}
              desc={t('ใบประกาศจะออกให้อัตโนมัติเมื่อผู้จัดรับรองชั่วโมงของกิจกรรมที่คุณเข้าร่วมแล้ว')}
              action={
                <Link href="/student/discover">
                  <Button variant="primary" icon="travel_explore">
                    {t('ค้นหากิจกรรม')}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : !shown.length ? (
          <div style={{ ...glass(22) }}>
            <EmptyState
              icon="search_off"
              title={t('ไม่พบใบประกาศตามที่ค้นหา')}
              desc={t('ลองเปลี่ยนคำค้นหรือเลือกปีการศึกษาอื่น')}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
            {shown.map((c) => (
              <div
                key={c.id}
                style={{
                  ...glass(18),
                  padding: 16,
                  display: 'grid',
                  gap: 10,
                  alignContent: 'start',
                  // ใบที่ถูกเพิกถอนคาดแถบสีไว้ที่ขอบ พร้อมป้ายข้อความกำกับด้านล่าง
                  borderInlineStart: c.revoked ? `4px solid ${SEMANTIC.danger.dot}` : undefined,
                  opacity: c.revoked ? 0.9 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon
                    name="workspace_premium"
                    size={22}
                    style={{ color: c.revoked ? SEMANTIC.danger.color : '#7C2FD9', flexShrink: 0, marginTop: 1 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink, lineHeight: 1.55 }}>
                      {c.activityTitle}
                    </div>
                    {c.orgName ? (
                      <div style={{ fontSize: 12, color: COLOR.label, marginTop: 3 }}>{c.orgName}</div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <Badge tone="info" label={`${c.hours} ${t('ชม.')}`} />
                  <ColorBadge label={isEn ? c.categoryLabelEn : c.categoryLabel} color={c.categoryColor} />
                  {c.revoked ? <Badge tone="danger" dot label={t('ถูกเพิกถอน')} /> : null}
                </div>

                <div style={{ fontSize: 11.5, color: COLOR.hint }}>
                  {`${t('ออกให้เมื่อ')} ${isEn ? c.issuedEn : c.issuedTh}`}
                  {c.academicYear ? ` · ${t('ปีการศึกษา')} ${c.academicYear}` : ''}
                </div>

                {/* รหัสอ้างอิงเลือกคัดลอกเองได้ เผื่อเบราว์เซอร์ไม่อนุญาตให้เขียนคลิปบอร์ด */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <code
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12,
                      letterSpacing: 0.5,
                      color: COLOR.body,
                      background: 'rgba(31,41,55,.06)',
                      padding: '6px 10px',
                      borderRadius: 9,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.ref}
                  </code>
                  <IconButton
                    icon={copied === c.ref ? 'check' : 'content_copy'}
                    label={copied === c.ref ? t('คัดลอกรหัสแล้ว') : t('คัดลอกรหัสอ้างอิง')}
                    onClick={() => copyRef(c.ref)}
                    style={{ flexShrink: 0 }}
                  />
                </div>

                {c.revoked && c.revokeReason ? (
                  <div style={{ fontSize: 12, color: SEMANTIC.danger.color, lineHeight: 1.7 }}>
                    {c.revokeReason}
                  </div>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  <Button
                    variant="secondary"
                    icon="visibility"
                    onClick={() => setPreview(c)}
                    style={{ padding: '9px 14px' }}
                  >
                    {t('ดูตัวอย่าง')}
                  </Button>
                  {/* ใบที่ถูกเพิกถอนแล้วไม่ควรพิมพ์ออกไปใช้อ้างอิงต่อ */}
                  {!c.revoked ? (
                    <Button
                      variant="secondary"
                      icon="download"
                      onClick={() => setPrinting(c)}
                      style={{ padding: '9px 14px' }}
                    >
                      {t('ดาวน์โหลด')}
                    </Button>
                  ) : null}
                  <Link href={`/verify/${encodeURIComponent(c.ref)}`} target="_blank">
                    <Button variant="secondary" icon="open_in_new" style={{ padding: '9px 14px' }}>
                      {t('หน้าตรวจสอบ')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── พรีวิว ── */}
      {preview ? (
        <div
          className="nuv-no-print"
          role="dialog"
          aria-modal="true"
          aria-label={t('ตัวอย่างใบประกาศ')}
          onClick={() => setPreview(null)}
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
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ ...solidGlass(22), width: 'min(760px,100%)', padding: 18, display: 'grid', gap: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink }}>{t('ตัวอย่างใบประกาศ')}</span>
              <IconButton
                icon="close"
                label={t('ปิด')}
                onClick={() => setPreview(null)}
                style={{ marginInlineStart: 'auto' }}
              />
            </div>

            <CertificateSheet certificate={preview} verifyUrl={urlOf(preview.ref)} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              {!preview.revoked ? (
                <Button
                  variant="primary"
                  icon="download"
                  onClick={() => {
                    setPreview(null);
                    setPrinting(preview);
                  }}
                  style={{ padding: '10px 16px' }}
                >
                  {t('ดาวน์โหลด / พิมพ์')}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setPreview(null)} style={{ padding: '10px 16px' }}>
                {t('ปิด')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ใบที่กำลังสั่งพิมพ์ — ซ่อนบนจอ ปรากฏเฉพาะบนกระดาษ */}
      <div className="nuv-cert-print">
        {printing ? <CertificateSheet certificate={printing} verifyUrl={urlOf(printing.ref)} /> : null}
      </div>
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
}: {
  icon: string;
  tone: 'purple' | 'info' | 'danger';
  label: string;
  value: string;
}) {
  return (
    <div style={{ ...glass(20), padding: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: SEMANTIC[tone].bg,
          color: SEMANTIC[tone].color,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={22} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: COLOR.ink }}>{value}</span>
        <span style={{ display: 'block', fontSize: 12, color: COLOR.label }}>{label}</span>
      </span>
    </div>
  );
}
