'use client';

import { Badge, Button, IconButton, Timestamp } from '@/components/ui';
import { Avatar } from '@/components/activity/Avatar';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, EVIDENCE_STATUS, REG_STATUS } from '@/lib/design';
import type { ParticipantRow } from '@/components/organizer/OrganizerActivityParticipants';

const SMALL_BTN: React.CSSProperties = { padding: '7px 12px', fontSize: 12, borderRadius: 10 };

const TH: React.CSSProperties = { padding: '8px 9px', fontWeight: 500, textAlign: 'start', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '10px 9px', color: COLOR.body, whiteSpace: 'nowrap' };

/**
 * ตารางรายชื่อผู้เข้าร่วมหนึ่งกิจกรรม
 *
 * เลือกใช้ตารางแทนการ์ดเพราะผู้จัดต้องกวาดสายตาเทียบเวลาเช็กอิน–เช็กเอาต์และชั่วโมง
 * ของหลายคนพร้อมกัน ซึ่งการ์ดเรียงลงมาทำได้ยาก
 *
 * คอลัมน์ที่เป็นปุ่มคำสั่งติด .nuv-no-print ไว้ เวลาสั่งพิมพ์รายชื่อจะได้เหลือแต่ข้อมูล
 */
export function ParticipantsTable({
  rows,
  selected,
  selectableIds,
  onToggleRow,
  onToggleAll,
  busyId,
  onApprove,
  onReject,
  onCheckin,
  onDetails,
}: {
  rows: ParticipantRow[];
  selected: Set<string>;
  /** เฉพาะใบที่ยังรออนุมัติ — ใบที่พิจารณาไปแล้วเลือกไม่ได้ */
  selectableIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  /** รหัสแถวที่กำลังส่งคำสั่งอยู่ ทำให้ปุ่มของแถวนั้นหมุนรอ */
  busyId: string | null;
  onApprove: (row: ParticipantRow) => void;
  onReject: (row: ParticipantRow) => void;
  /** เช็กอิน/เช็กเอาต์แทนนิสิต เมื่อสแกน QR ไม่ได้ */
  onCheckin: (row: ParticipantRow, kind: 'in' | 'out') => void;
  onDetails: (row: ParticipantRow) => void;
}) {
  const { t } = useApp();

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  return (
    <div className="nuv-tablewrap">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ color: COLOR.label, fontSize: 11 }}>
            <th className="nuv-no-print" style={{ ...TH, width: 34 }}>
              <input
                /* สถานะกลาง (เลือกบางแถว) ตั้งผ่าน ref เพราะ HTML ไม่มี attribute นี้ให้เขียนใน JSX */
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                type="checkbox"
                checked={allSelected}
                disabled={selectableIds.length === 0}
                onChange={onToggleAll}
                aria-label={t('เลือกทุกใบที่รออนุมัติ')}
                style={{ width: 15, height: 15, accentColor: '#A774F7' }}
              />
            </th>
            <th style={{ ...TH, whiteSpace: 'normal', minWidth: 190 }}>{t('ชื่อผู้สมัคร')}</th>
            <th style={TH}>{t('สถานะ')}</th>
            <th style={TH}>{t('เช็กอิน')}</th>
            <th style={TH}>{t('เช็กเอาต์')}</th>
            <th style={{ ...TH, textAlign: 'end' }}>{t('ชม.')}</th>
            <th style={TH}>{t('หลักฐาน')}</th>
            <th style={{ ...TH, whiteSpace: 'normal', minWidth: 120 }}>{t('คณะ')}</th>
            <th className="nuv-no-print" style={{ ...TH, textAlign: 'end' }}>
              {t('จัดการ')}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const meta = REG_STATUS[r.status];
            const pending = r.status === 'pending';
            const on = selected.has(r.id);
            const working = busyId === r.id;

            return (
              <tr
                key={r.id}
                style={{
                  borderTop: '1px solid rgba(31,41,55,.08)',
                  background: on ? 'rgba(167,116,247,.10)' : undefined,
                }}
              >
                <td className="nuv-no-print" style={TD}>
                  {pending ? (
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleRow(r.id)}
                      aria-label={`${t('เลือก')} ${r.name}`}
                      style={{ width: 15, height: 15, accentColor: '#A774F7', cursor: 'pointer' }}
                    />
                  ) : null}
                </td>

                <td style={{ ...TD, whiteSpace: 'normal' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={r.name} src={r.avatarUrl} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: COLOR.ink }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: COLOR.hint, marginTop: 2 }}>
                        {r.studentId || t('ไม่มีรหัสนิสิต')}
                      </div>
                    </div>
                  </div>
                </td>

                <td style={TD}>{meta ? <Badge tone={meta.tone} icon={meta.icon} label={t(meta.label)} /> : r.status}</td>

                {/* เวลาเช็กอิน–เช็กเอาต์: ขีดกลางแปลว่ายังไม่มีเวลานั้น ไม่ใช่ข้อมูลหาย */}
                <td style={TD}>
                  {r.checkedInAtMs != null ? <Timestamp date={r.checkedInAtMs} variant="time" /> : '—'}
                </td>
                <td style={TD}>
                  {r.checkedOutAtMs != null ? <Timestamp date={r.checkedOutAtMs} variant="time" /> : '—'}
                </td>

                <td style={{ ...TD, textAlign: 'end', fontWeight: r.hoursAwarded > 0 ? 600 : 400 }}>
                  {r.hoursAwarded > 0 ? r.hoursAwarded : '—'}
                </td>

                {/* หลักฐาน: กดที่ป้ายเพื่อเปิดดูภาพและตรวจในกล่องรายละเอียด */}
                <td style={TD}>
                  {r.evidence ? (
                    <button
                      type="button"
                      onClick={() => onDetails(r)}
                      title={t('ดูและตรวจหลักฐาน')}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                    >
                      <Badge
                        tone={EVIDENCE_STATUS[r.evidence.status]?.tone ?? 'neutral'}
                        label={t(EVIDENCE_STATUS[r.evidence.status]?.label ?? r.evidence.status)}
                      />
                    </button>
                  ) : (
                    <span style={{ color: COLOR.hint }}>—</span>
                  )}
                </td>

                <td style={{ ...TD, whiteSpace: 'normal' }}>{r.faculty || '—'}</td>

                <td className="nuv-no-print" style={{ ...TD, padding: '6px 9px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {pending ? (
                      <>
                        <Button
                          variant="primary"
                          icon="check"
                          loading={working}
                          onClick={() => onApprove(r)}
                          style={SMALL_BTN}
                        >
                          {t('อนุมัติ')}
                        </Button>
                        <Button
                          variant="secondary"
                          icon="close"
                          disabled={working}
                          onClick={() => onReject(r)}
                          style={SMALL_BTN}
                        >
                          {t('ไม่อนุมัติ')}
                        </Button>
                      </>
                    ) : null}

                    {/* ทางสำรองของการสแกน QR — โผล่ทีละปุ่มตามสถานะ จะได้ไม่ต้องเดาว่าคนนี้ค้างอยู่ขั้นไหน */}
                    {r.status === 'approved' ? (
                      <Button
                        variant="primary"
                        icon="login"
                        loading={working}
                        onClick={() => onCheckin(r, 'in')}
                        style={SMALL_BTN}
                      >
                        {t('เช็กอิน')}
                      </Button>
                    ) : null}
                    {r.status === 'checked-in' ? (
                      <Button
                        variant="secondary"
                        icon="logout"
                        loading={working}
                        onClick={() => onCheckin(r, 'out')}
                        style={SMALL_BTN}
                      >
                        {t('เช็กเอาต์')}
                      </Button>
                    ) : null}
                    <IconButton
                      icon="visibility"
                      label={`${t('ดูรายละเอียดของ')} ${r.name}`}
                      onClick={() => onDetails(r)}
                      style={{ width: 34, height: 34 }}
                    />
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
