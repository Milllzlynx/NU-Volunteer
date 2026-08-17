'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { GuestNotice } from '@/components/activity/GuestNotice';
import { PageHead } from '@/components/activity/PageHead';
import { BRAND_GRADIENT, COLOR, REG_STATUS, SEMANTIC, glass } from '@/lib/design';
import type { ActivityDetailView } from '@/lib/activityDetail';

type Participant = ActivityDetailView['participants'][number];

/** ท้ายบรรทัดของไฟล์ CSV — Excel บนวินโดวส์คาดหวัง CRLF ไม่ใช่ LF เดี่ยว */
const CRLF = '\r\n';

/**
 * แท็บจัดกลุ่มตามสถานะใบลงทะเบียน
 *
 * จับหลายสถานะรวมเป็นแท็บเดียว เพราะผู้จัดคิดเป็น "เข้าร่วมแล้ว / ยังรอ / ไม่มา"
 * ไม่ได้คิดแยกละเอียดว่าเช็กอินแล้วหรือเช็กเอาต์แล้ว ซึ่งเป็นรายละเอียดของระบบ
 */
const TABS: { key: string; label: string; match: string[] }[] = [
  { key: 'joined', label: 'อนุมัติแล้ว', match: ['approved', 'checked-in', 'checked-out', 'completed'] },
  { key: 'pending', label: 'รออนุมัติ', match: ['pending'] },
  { key: 'out', label: 'ไม่มา/ยกเลิก', match: ['cancelled', 'rejected', 'no-show'] },
];

/**
 * รายชื่อผู้เข้าร่วมกิจกรรม — หน้าเต็มของตัวเอง (/activities/:id/participants)
 *
 * เดิมส่วนนี้เป็นลิ้นชักที่เปิดคาหน้ารายการ ซึ่งบีบรายชื่อยาว ๆ ลงในคอลัมน์แคบ ๆ
 * พอเป็นหน้าของตัวเองแล้ว รายชื่อกางเป็นการ์ดหลายคอลัมน์ตามความกว้างจอที่มีจริง
 * และมีลิงก์ของตัวเอง — ผู้จัดส่งลิงก์ "รายชื่อกิจกรรมนี้" ให้เพื่อนร่วมงานได้ตรง ๆ
 *
 * ข้อมูลมาจากเซิร์ฟเวอร์พร้อมหน้า ไม่ต้องยิง API ซ้ำฝั่งไคลเอนต์เหมือนที่ลิ้นชักเคยทำ
 * และกรองตามสิทธิ์ของผู้เปิดดูมาแล้ว — ผู้ที่ยังไม่เข้าสู่ระบบจะได้ participants ว่าง
 * พร้อม canSeeParticipants=false เสมอ หน้านี้จึงแค่เชื่อค่าที่ส่งมา
 */
export function ParticipantsView({ activity }: { activity: ActivityDetailView }) {
  const { t, isEn } = useApp();
  const a = activity;

  const [tab, setTab] = useState('joined');
  const [query, setQuery] = useState('');

  const rows: Participant[] = a.participants;

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const tabDef of TABS) out[tabDef.key] = rows.filter((r) => tabDef.match.includes(r.status)).length;
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    const active = TABS.find((x) => x.key === tab) ?? TABS[0];
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        active.match.includes(r.status) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.studentId ?? '').toLowerCase().includes(q) ||
          (r.faculty ?? '').toLowerCase().includes(q)),
    );
  }, [rows, tab, query]);

  /** ส่งออกเฉพาะแท็บที่เปิดอยู่ — ที่เห็นบนจอคือสิ่งที่จะได้ในไฟล์ ไม่มีอะไรแอบติดไปเกิน */
  const exportCsv = () => {
    const staff = rows.some((r) => r.studentId != null);
    const head = [
      t('ชื่อ'),
      ...(staff ? [t('รหัสนิสิต')] : []),
      t('คณะ'),
      t('สถานะ'),
      t('ชั่วโมงที่รับรอง'),
      t('วันที่ลงทะเบียน'),
    ];
    const lines = filtered.map((r) =>
      [
        r.name,
        ...(staff ? [r.studentId ?? ''] : []),
        r.faculty ?? '',
        t(REG_STATUS[r.status]?.label ?? r.status),
        r.hoursAwarded,
        isEn ? r.regAtEn : r.regAtTh,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง เหมือนการส่งออกในหน้ารายงาน
    const csv = '﻿' + [head.map((h) => `"${h}"`).join(','), ...lines].join(CRLF);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `nuv-participants-${a.id}-${tab}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHead
        activity={a}
        icon="groups"
        title={t('รายชื่อผู้เข้าร่วม')}
        countLabel={a.canSeeParticipants ? `${rows.length}` : undefined}
      />

      {/* ── สรุปที่นั่ง ── */}
      <div style={{ ...glass(20), padding: 18, display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: COLOR.ink }}>{a.seatsFilled}</span>
        <span style={{ fontSize: 13, color: COLOR.label }}>
          {a.seatsTotal > 0 ? `${t('จาก')} ${a.seatsTotal} ${t('ที่นั่ง')}` : t('ที่นั่ง')}
        </span>
        {/* ไม่แสดงอีเมลหรือเบอร์โทร — ข้อมูลติดต่อยังเป็นของผู้จัดกิจกรรมเท่านั้น */}
        <span style={{ fontSize: 11.5, color: COLOR.hint, marginInlineStart: 'auto', lineHeight: 1.8 }}>
          {t('รายชื่อนี้คือผู้ที่จองที่นั่งไว้แล้ว จึงตรงกับจำนวนที่นั่งด้านบน และไม่แสดงอีเมลหรือเบอร์โทรของใคร')}
        </span>
      </div>

      <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 14 }}>
        {!a.canSeeParticipants ? (
          <GuestNotice
            text={t('รายชื่อผู้เข้าร่วมเปิดให้เฉพาะผู้ที่เข้าสู่ระบบแล้ว')}
            cta={t('เข้าสู่ระบบ')}
          />
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '34px 12px', color: COLOR.label, fontSize: 13 }}>
            <Icon name="person_off" size={40} style={{ color: '#CBD5E1' }} />
            <div style={{ marginTop: 12 }}>{t('ยังไม่มีผู้ลงทะเบียนกิจกรรมนี้')}</div>
          </div>
        ) : (
          <>
            {/* ── แท็บตามสถานะ ── */}
            <div className="nuv-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {TABS.map((x) => {
                const on = x.key === tab;
                return (
                  <button
                    key={x.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTab(x.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 15px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      border: on ? 'none' : '1px solid rgba(31,41,55,.12)',
                      background: on ? BRAND_GRADIENT : 'rgba(255,255,255,.6)',
                      color: on ? '#fff' : COLOR.body,
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {t(x.label)}
                    <span style={{ opacity: 0.75 }}>{counts[x.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>

            {/* ── ค้นหาและส่งออก ── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ค้นหาชื่อ...')}
                aria-label={t('ค้นหาชื่อ...')}
                style={{ ...inputStyle(false), flex: 1, minWidth: 180 }}
              />
              <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!filtered.length}>
                {t('ส่งออก CSV')}
              </Button>
            </div>

            <div style={{ fontSize: 12, color: COLOR.hint }}>
              {`${t('แสดง')} ${filtered.length} ${t('จาก')} ${rows.length} ${t('คน')}`}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 12px', color: COLOR.label, fontSize: 13 }}>
                <Icon name="search_off" size={36} style={{ color: '#CBD5E1' }} />
                <div style={{ marginTop: 10 }}>{t('ไม่พบผู้สมัครที่ตรงกับเงื่อนไข')}</div>
              </div>
            ) : (
              /* auto-fill ปรับจำนวนคอลัมน์ตามความกว้างที่มีจริง — ไม่ต้องมี media query แยก */
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))',
                }}
              >
                {filtered.map((p) => (
                  <ParticipantCard key={p.id} participant={p} isEn={isEn} t={t} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** การ์ดผู้เข้าร่วมหนึ่งคน — ชื่อและสถานะอยู่บรรทัดบน รายละเอียดที่เหลือไล่ลงมา */
function ParticipantCard({
  participant: p,
  isEn,
  t,
}: {
  participant: Participant;
  isEn: boolean;
  t: (th: string) => string;
}) {
  const meta = REG_STATUS[p.status];

  return (
    <li
      className="nuv-row"
      style={{
        display: 'grid',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        background: 'rgba(255,255,255,.6)',
        border: '1px solid rgba(255,255,255,.75)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <Avatar name={p.name} src={p.avatarUrl} size={44} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLOR.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.name}
          </div>
          {/* รหัสนิสิตมาเฉพาะตอนที่ผู้เปิดดูเป็นผู้จัดกิจกรรมนี้หรือแอดมิน */}
          {p.studentId ? (
            <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>{p.studentId}</div>
          ) : null}
        </div>

        {meta ? (
          <span
            style={{
              flexShrink: 0,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: SEMANTIC[meta.tone].bg,
              color: SEMANTIC[meta.tone].color,
              whiteSpace: 'nowrap',
            }}
          >
            {t(meta.label)}
          </span>
        ) : null}
      </div>

      {p.faculty ? (
        <div style={{ fontSize: 12, color: COLOR.body, lineHeight: 1.7 }}>{p.faculty}</div>
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          paddingTop: 9,
          borderTop: '1px solid rgba(31,41,55,.08)',
          fontSize: 11.5,
          color: COLOR.hint,
        }}
      >
        <span>{`${t('ลงทะเบียน')} ${isEn ? p.regAtEn : p.regAtTh}`}</span>
        {/* ชั่วโมงที่รับรองแล้ว — ยังไม่รับรองก็ยังไม่ต้องขึ้นเลข 0 ให้รก */}
        {p.hoursAwarded > 0 ? (
          <span style={{ marginInlineStart: 'auto', fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>
            {`${p.hoursAwarded} ${t('ชม.')}`}
          </span>
        ) : null}
      </div>
    </li>
  );
}
