'use client';

import Link from 'next/link';
import { Badge, Button, Icon } from '@/components/ui';
import { COLOR, SEMANTIC } from '@/lib/design';
import type { OrganizerCertificateView } from '@/lib/certificates';

/** ปุ่มคำสั่งในแถวตาราง — เตี้ยกว่าปุ่มปกติเพราะต้องอยู่ในความสูงแถวเดียว */
const ROW_BTN: React.CSSProperties = { padding: '6px 11px', fontSize: 12, borderRadius: 10 };

const TH: React.CSSProperties = { padding: '8px 9px', fontWeight: 500, textAlign: 'start' };
const TD: React.CSSProperties = { padding: '10px 9px', color: COLOR.body };

/**
 * ตารางใบประกาศแบบกะทัดรัด
 *
 * ใช้ได้ทั้งแท็บ "ออกแล้ว" และ "ถูกเพิกถอน" — ต่างกันแค่ปุ่มท้ายแถว จึงไม่แยกเป็นสองตาราง
 * แสดงทุกคอลัมน์เสมอ ไม่ซ่อนตามความกว้างจอ — จอแคบให้เลื่อนแนวนอนใน nuv-tablewrap แทน
 * เพราะหน้านี้ไม่มีมุมมองการ์ดสำรองแล้ว คอลัมน์ที่ซ่อนไปจะไม่มีที่อื่นให้อ่าน
 */
export function CertificatesTable({
  rows,
  selected,
  onToggleRow,
  onTogglePage,
  onPreview,
  onRevoke,
  onReissue,
  busy,
  isEn,
  t,
}: {
  rows: OrganizerCertificateView[];
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  onTogglePage: (ids: string[], select: boolean) => void;
  onPreview: (c: OrganizerCertificateView) => void;
  onRevoke: (c: OrganizerCertificateView) => void;
  onReissue: (c: OrganizerCertificateView) => void;
  busy: string | null;
  isEn: boolean;
  t: (s: string) => string;
}) {
  /* เลือกได้เฉพาะใบที่ยังไม่ถูกเพิกถอน — ช่องหัวตารางจึงนับเฉพาะใบเหล่านั้น
     ไม่อย่างนั้นบนแท็บ "ถูกเพิกถอน" จะมีช่องติ๊กที่กดแล้วไม่มีคำสั่งไหนทำอะไรได้ */
  const pageIds = rows.filter((c) => !c.revoked).map((c) => c.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));

  return (
    <div className="nuv-tablewrap">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ color: COLOR.label, fontSize: 11 }}>
            <th className="nuv-no-print" style={{ ...TH, width: 34 }}>
              <input
                /* สถานะกลาง (เลือกบางแถว) ตั้งผ่าน ref เพราะ HTML ไม่มี attribute นี้ให้เขียนใน JSX */
                ref={(el) => {
                  if (el) el.indeterminate = someOnPage && !allOnPage;
                }}
                type="checkbox"
                checked={allOnPage}
                disabled={pageIds.length === 0}
                onChange={(e) => onTogglePage(pageIds, e.target.checked)}
                aria-label={t('เลือกทุกแถวในหน้านี้')}
                style={{ width: 15, height: 15 }}
              />
            </th>
            <th style={TH}>{t('ชื่อนิสิต')}</th>
            <th style={TH}>{t('รหัสนิสิต')}</th>
            <th style={TH}>{t('คณะ')}</th>
            <th style={TH}>{t('กิจกรรม')}</th>
            <th style={TH}>{t('วันที่ออกใบ')}</th>
            <th style={TH}>{t('รหัสอ้างอิง')}</th>
            <th style={{ ...TH, textAlign: 'end' }}>{t('ชม.')}</th>
            <th className="nuv-no-print" style={{ ...TH, textAlign: 'end' }}>
              {/* หัวคอลัมน์ปุ่มคำสั่งไม่ต้องมีข้อความให้ตาเห็น แต่โปรแกรมอ่านหน้าจอต้องได้ยิน */}
              <span className="nuv-visually-hidden">{t('คำสั่งเพิ่มเติม')}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((c) => {
            const on = selected.has(c.id);
            return (
              <tr
                key={c.id}
                style={{
                  borderTop: '1px solid rgba(31,41,55,.08)',
                  background: on ? 'rgba(167,116,247,.10)' : undefined,
                  borderInlineStart: c.revoked ? `3px solid ${SEMANTIC.danger.dot}` : undefined,
                }}
              >
                <td className="nuv-no-print" style={TD}>
                  {/* ใบที่ถูกเพิกถอนแล้วเพิกถอนซ้ำไม่ได้ จึงไม่ให้เลือก */}
                  {c.revoked ? null : (
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleRow(c.id)}
                      aria-label={`${t('เลือก')} ${c.holderName} · ${c.ref}`}
                      style={{ width: 15, height: 15 }}
                    />
                  )}
                </td>

                <td style={{ ...TD, color: COLOR.ink, fontWeight: 500, minWidth: 130 }}>
                  {c.holderName}
                  {/* เหตุผลที่เพิกถอนอยู่ใต้ชื่อ ไม่แยกคอลัมน์ เพราะเป็นข้อความยาวที่มีเฉพาะบางแถว */}
                  {c.revoked ? (
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: SEMANTIC.danger.color,
                        fontWeight: 400,
                        lineHeight: 1.6,
                      }}
                    >
                      {`${t('เพิกถอนเมื่อ')} ${isEn ? c.revokedEn : c.revokedTh}`}
                      {c.revokeReason ? ` · ${c.revokeReason}` : ''}
                    </span>
                  ) : null}
                </td>

                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{c.studentId || '—'}</td>

                <td style={{ ...TD, maxWidth: 150 }}>{c.faculty || '—'}</td>

                <td style={{ ...TD, maxWidth: 200 }}>{c.activityTitle}</td>

                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{isEn ? c.issuedEn : c.issuedTh}</td>

                <td style={TD}>
                  <code
                    style={{
                      fontSize: 11.5,
                      letterSpacing: 0.5,
                      background: 'rgba(31,41,55,.06)',
                      padding: '4px 8px',
                      borderRadius: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.ref}
                  </code>
                </td>

                <td style={{ ...TD, textAlign: 'end', whiteSpace: 'nowrap' }}>{c.hours}</td>

                <td className="nuv-no-print" style={{ ...TD, padding: '6px 9px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Button variant="secondary" icon="visibility" onClick={() => onPreview(c)} style={ROW_BTN}>
                      {t('ดูใบ')}
                    </Button>
                    <Link href={`/verify/${encodeURIComponent(c.ref)}`} target="_blank">
                      <Button variant="secondary" icon="open_in_new" style={ROW_BTN}>
                        {t('หน้าตรวจสอบ')}
                      </Button>
                    </Link>
                    {c.revoked ? (
                      c.canReissue ? (
                        <Button
                          variant="primary"
                          icon="autorenew"
                          loading={busy === c.id}
                          disabled={busy !== null}
                          onClick={() => onReissue(c)}
                          style={ROW_BTN}
                        >
                          {t('ออกใบใหม่แทน')}
                        </Button>
                      ) : null
                    ) : (
                      <Button
                        variant="danger"
                        icon="gpp_bad"
                        disabled={busy !== null}
                        onClick={() => onRevoke(c)}
                        style={ROW_BTN}
                      >
                        {t('เพิกถอน')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** สรุปยอดของทุกแถวที่ผ่านตัวกรอง ไม่ใช่แค่หน้าที่เห็นอยู่ — เขียนกำกับไว้ให้ชัด */
export function CertificatesSummary({
  count,
  hours,
  t,
}: {
  count: number;
  hours: number;
  t: (s: string) => string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: 12,
        color: COLOR.label,
      }}
    >
      <Icon name="workspace_premium" size={15} style={{ color: COLOR.hint }} />
      <span>{`${t('รวมทุกหน้า')} ${count} ${t('ใบ')}`}</span>
      <Badge tone="info" label={`${hours} ${t('ชม.')}`} />
    </div>
  );
}
