'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Icon, Tabs, Timestamp, inputStyle } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, glass } from '@/lib/design';

/**
 * บันทึกการทำงานของระบบ
 *
 * กรองฝั่งไคลเอนต์ทั้งหมดเหมือนหน้ากิจกรรมของแอดมิน เพราะหน้านี้อ่านอย่างเดียว
 * และผู้ดูแลมักสลับตัวกรองไปมาเพื่อไล่หาเหตุการณ์ — ยิงเซิร์ฟเวอร์ใหม่ทุกครั้งที่พิมพ์
 * จะช้ากว่าและไม่ได้ข้อมูลที่ถูกต้องกว่าเดิม จำนวนแถวถูกจำกัดมาแล้วจากฝั่งเซิร์ฟเวอร์
 */

export type SystemLogRow = {
  id: string;
  level: string;
  text: string;
  actor: string | null;
  /** ส่งเป็น epoch ให้ <Timestamp> จัดรูปแบบตามภาษาที่เลือก */
  atMs: number;
  /** คีย์วันที่ตามเวลาไทย (YYYY-MM-DD) — ใช้กรองช่วงวันโดยไม่ต้องคำนวณโซนเวลาซ้ำ */
  dayKey: string;
  /** meta ที่แปลงเป็นข้อความอ่านได้แล้ว — ว่างเมื่อไม่มีอะไรน่าสนใจ */
  meta: string;
};

const LEVEL_META: Record<string, { label: string; color: string; icon: string }> = {
  info: { label: 'ข้อมูล', color: '#7AB8FF', icon: 'info' },
  success: { label: 'สำเร็จ', color: '#63D2A1', icon: 'check_circle' },
  warning: { label: 'คำเตือน', color: '#F5A623', icon: 'warning' },
  error: { label: 'ข้อผิดพลาด', color: '#E4572E', icon: 'error' },
};

type TabKey = 'all' | 'info' | 'success' | 'warning' | 'error';

export function AdminLogs({ rows, cap }: { rows: SystemLogRow[]; cap: number }) {
  const { t } = useApp();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { info: 0, success: 0, warning: 0, error: 0 };
    for (const r of rows) c[r.level] = (c[r.level] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.level !== tab) return false;
      if (from && r.dayKey < from) return false;
      if (to && r.dayKey > to) return false;
      if (!q) return true;
      return (
        r.text.toLowerCase().includes(q) ||
        (r.actor ?? '').toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query, from, to]);

  const filtered = query.trim() || from || to || tab !== 'all';

  function exportCsv() {
    const head = ['เวลา', 'ระดับ', 'เหตุการณ์', 'ผู้ลงมือ', 'รายละเอียด'];
    const body = visible.map((r) => [
      new Date(r.atMs).toISOString(),
      r.level,
      r.text,
      r.actor ?? '',
      r.meta,
    ]);
    // ครอบทุกช่องด้วยเครื่องหมายคำพูดเสมอ — ข้อความบันทึกมีจุลภาคปนอยู่เป็นปกติ
    const csv = [head, ...body]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
          {t('System Log')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3 }}>
          {t('บันทึกเหตุการณ์ที่เกิดขึ้นในระบบ เรียงจากใหม่ไปเก่า')}
        </div>
      </div>

      <Tabs
        items={[
          { key: 'all' as TabKey, label: t('ทั้งหมด'), count: rows.length },
          { key: 'info' as TabKey, label: t('ข้อมูล'), count: counts.info },
          { key: 'success' as TabKey, label: t('สำเร็จ'), count: counts.success },
          { key: 'warning' as TabKey, label: t('คำเตือน'), count: counts.warning },
          { key: 'error' as TabKey, label: t('ข้อผิดพลาด'), count: counts.error },
        ]}
        value={tab}
        onChange={setTab}
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ค้นหาเหตุการณ์ ผู้ลงมือ หรือรายละเอียด...')}
        style={inputStyle(false)}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <LogDateField
          label={t('ตั้งแต่')}
          ariaLabel={t('กรองตั้งแต่วันที่ (วัน/เดือน/ปี)')}
          value={from}
          onChange={setFrom}
        />
        <LogDateField
          label={t('ถึง')}
          ariaLabel={t('กรองถึงวันที่ (วัน/เดือน/ปี)')}
          value={to}
          onChange={setTo}
        />
        {/* เยื้องปุ่มลงมาให้อยู่ระดับเดียวกับช่องกรอก ไม่ใช่ระดับชื่อช่อง */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, paddingTop: 22 }}>
          {filtered ? (
            <Button
              variant="secondary"
              icon="close"
              onClick={() => {
                setTab('all');
                setQuery('');
                setFrom('');
                setTo('');
              }}
              style={{ padding: '8px 13px', fontSize: 12.5 }}
            >
              {t('ล้างตัวกรอง')}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            icon="download"
            onClick={exportCsv}
            disabled={!visible.length}
            style={{ marginInlineStart: 'auto' }}
          >
            {t('ส่งออก CSV')}
          </Button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: COLOR.hint }}>
        {`${t('แสดง')} ${visible.length} ${t('จาก')} ${rows.length} ${t('รายการ')}`}
        {rows.length >= cap ? ` · ${t('แสดงเฉพาะรายการล่าสุด')} ${cap} ${t('รายการ')}` : ''}
      </div>

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="receipt_long"
            title={filtered ? t('ไม่พบรายการที่ตรงกับตัวกรอง') : t('ยังไม่มีบันทึกในระบบ')}
            desc={
              filtered
                ? t('ลองล้างตัวกรองหรือขยายช่วงวันที่')
                : t('เหตุการณ์ที่เกิดขึ้นในระบบจะถูกบันทึกไว้ที่นี่')
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {visible.map((r) => {
            const meta = LEVEL_META[r.level] ?? LEVEL_META.info;
            return (
              <div
                key={r.id}
                style={{
                  ...glass(16),
                  padding: 13,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  borderInlineStart: `3px solid ${meta.color}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${meta.color}26`,
                    color: meta.color,
                  }}
                >
                  <Icon name={meta.icon} size={18} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: COLOR.ink, lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {r.text}
                  </div>
                  {r.meta ? (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: COLOR.label,
                        marginTop: 4,
                        lineHeight: 1.7,
                        wordBreak: 'break-word',
                      }}
                    >
                      {r.meta}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
                    <Timestamp date={r.atMs} variant="full" style={{ fontSize: 11, color: COLOR.hint }} />
                    <span style={{ fontSize: 11, color: COLOR.hint }}>·</span>
                    <span style={{ fontSize: 11, color: COLOR.hint }}>
                      {r.actor ? `${t('โดย')} ${r.actor}` : t('ระบบ')}
                    </span>
                  </div>
                </div>

                <Badge tone="neutral" label={t(meta.label)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * ช่องวันที่หนึ่งข้างของตัวกรองช่วงวันที่
 *
 * ใช้ DateTimeField แทน <input type="date"> เพราะช่องของเบราว์เซอร์เรียงวัน-เดือน
 * ตามภาษาของเครื่องผู้ใช้ เครื่องที่ตั้งเป็น en-US จะเห็น mm/dd/yyyy
 */
function LogDateField({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 5, minWidth: 168 }}>
      <span style={{ fontSize: 12, color: COLOR.label }}>{label}</span>
      <DateTimeField value={value} onChange={onChange} ariaLabel={ariaLabel} />
    </div>
  );
}
