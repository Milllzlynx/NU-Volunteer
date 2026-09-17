'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { COLOR, glass } from '@/lib/design';

export type OrganizerCountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  total: number;
  /** จำนวนกิจกรรมตามสถานะ — สถานะที่ไม่มีกิจกรรมจะไม่มีคีย์ */
  byStatus: Record<string, number>;
  /** ชื่อหน่วยงานที่บัญชีนี้เคยใช้บนกิจกรรม */
  orgNames: string[];
};

/** ลำดับคอลัมน์สถานะ — ตรงกับลำดับแท็บใน /admin/activities */
const STATUSES = ['draft', 'open', 'closed', 'done', 'cancelled'] as const;

/**
 * ตารางจำนวนกิจกรรมต่อบัญชีผู้จัด
 *
 * ตัวเลขทุกช่องกดแล้วพาไปหน้ากิจกรรมทั้งหมดที่กรองตามบัญชีนั้น (และสถานะ ถ้ากดช่องสถานะ)
 * ไม่ทำรายการกิจกรรมซ้ำในหน้านี้ — หน้านั้นมีตัวกรอง การทำทีเดียวหลายรายการ และปุ่มแก้ไขครบอยู่แล้ว
 */
export function AdminOrganizers({ rows }: { rows: OrganizerCountRow[] }) {
  const { t } = useApp();
  const [query, setQuery] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (hideEmpty && r.total === 0) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.orgNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [rows, query, hideEmpty]);

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const r of visible) for (const s of STATUSES) byStatus[s] = (byStatus[s] ?? 0) + (r.byStatus[s] ?? 0);
    return { total: visible.reduce((s, r) => s + r.total, 0), byStatus };
  }, [visible]);

  const withActivities = rows.filter((r) => r.total > 0).length;

  const cell = { padding: '10px 9px', textAlign: 'end' as const, whiteSpace: 'nowrap' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{t('ผู้จัดกิจกรรม')}</div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('จำนวนกิจกรรมของบัญชีผู้จัดและผู้ดูแลระบบแต่ละคน แยกตามสถานะ')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ค้นหาชื่อ อีเมล หรือหน่วยงาน...')}
          aria-label={t('ค้นหาชื่อ อีเมล หรือหน่วยงาน...')}
          style={{ ...inputStyle(false), flex: 1, minWidth: 200 }}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: COLOR.body, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />
          {t('ซ่อนบัญชีที่ยังไม่มีกิจกรรม')}
        </label>
        <span style={{ marginInlineStart: 'auto', fontSize: 12, color: COLOR.hint }}>
          {`${withActivities} ${t('จาก')} ${rows.length} ${t('บัญชีมีกิจกรรม')}`}
        </span>
      </div>

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState icon="person_search" title={t('ไม่พบบัญชีที่ตรงกับคำค้น')} desc={t('ลองค้นด้วยชื่อ อีเมล หรือชื่อหน่วยงานอื่น')} />
        </div>
      ) : (
        <div className="nuv-tablewrap" style={{ ...glass(20), padding: '6px 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: COLOR.label, fontSize: 11 }}>
                <th style={{ padding: '8px 9px', textAlign: 'start', fontWeight: 500 }}>{t('ผู้จัด')}</th>
                <th style={{ ...cell, padding: '8px 9px', fontWeight: 600, color: COLOR.ink }}>{t('ทั้งหมด')}</th>
                {STATUSES.map((s) => (
                  <th key={s} style={{ ...cell, padding: '8px 9px', fontWeight: 500 }}>
                    {t(ACTIVITY_STATUS_META[s].label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(31,41,55,.08)' }}>
                  <td style={{ padding: '10px 9px', minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: COLOR.ink }}>{r.name || r.email}</span>
                      {r.role === 'admin' ? <Badge tone="purple" label={t('ผู้ดูแลระบบ')} /> : null}
                      {!r.active ? <Badge tone="danger" label={t('ระงับแล้ว')} /> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>{r.email}</div>
                    {r.orgNames.length ? (
                      <div style={{ fontSize: 11.5, color: COLOR.label, marginTop: 3, lineHeight: 1.7 }}>
                        {`${t('ในนาม')}: ${r.orgNames.join(' · ')}`}
                      </div>
                    ) : null}
                  </td>
                  <td style={cell}>
                    <CountLink organizer={r.id} n={r.total} strong />
                  </td>
                  {STATUSES.map((s) => (
                    <td key={s} style={cell}>
                      <CountLink organizer={r.id} status={s} n={r.byStatus[s] ?? 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(31,41,55,.14)', color: COLOR.ink, fontWeight: 600 }}>
                <td style={{ padding: '10px 9px' }}>{t('รวม')}</td>
                <td style={cell}>{totals.total}</td>
                {STATUSES.map((s) => (
                  <td key={s} style={cell}>
                    {totals.byStatus[s] || '–'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/** ตัวเลขที่กดไปดูกิจกรรมได้ — ศูนย์ไม่ต้องเป็นลิงก์เพราะพาไปหน้าว่างเปล่า */
function CountLink({ organizer, status, n, strong }: { organizer: string; status?: string; n: number; strong?: boolean }) {
  if (n === 0) return <span style={{ color: COLOR.hint }}>–</span>;
  const params = new URLSearchParams({ organizer });
  if (status) params.set('status', status);
  return (
    <Link
      href={`/admin/activities?${params}`}
      style={{
        color: strong ? COLOR.ink : '#7C2FD9',
        fontWeight: strong ? 700 : 600,
        fontSize: strong ? 14 : 12.5,
        textDecoration: 'underline',
        textUnderlineOffset: 3,
      }}
    >
      {n}
    </Link>
  );
}
