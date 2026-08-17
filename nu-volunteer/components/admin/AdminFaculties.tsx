'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, EmptyState, ErrorNote, Icon, Skeleton, SuccessNote, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  adminContentApi,
  errorMessage,
  type AdminFaculty,
  type FacultyOrphan,
} from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

const BLANK = { name: '', nameEn: '', abbr: '', email: '', phone: '', location: '' };
type Draft = typeof BLANK;

type SortKey = 'order' | 'name' | 'students';

/** คอลัมน์ของไฟล์ CSV — ลำดับนี้ใช้ทั้งตอนส่งออกและตอนนำเข้า */
const CSV_COLUMNS = ['name', 'nameEn', 'abbr', 'email', 'phone', 'location'] as const;
const CRLF = '\r\n';

/**
 * จัดการคณะ
 *
 * ตาราง Faculty เป็น "รายการกลาง" ของชื่อคณะ แต่ User.faculty เก็บเป็นข้อความ ไม่ใช่ FK
 * (นิสิตกรอกคณะตอนสมัครมาก่อนที่ตารางนี้จะมี) จึงมีความเป็นไปได้ที่ชื่อคณะในโปรไฟล์นิสิต
 * จะไม่ตรงกับรายการกลาง — หน้านี้แสดงชื่อพวกนั้นแยกไว้ให้เห็น ผู้ดูแลจะได้ตามไปเพิ่มหรือรวม
 */
export function AdminFaculties() {
  const { t, isEn } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<AdminFaculty[]>([]);
  const [orphans, setOrphans] = useState<FacultyOrphan[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('order');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminFaculty | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    adminContentApi
      .faculties(ac.signal)
      .then((res) => {
        setRows(res.faculties);
        setOrphans(res.orphans);
        setLoadedOnce(true);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(errorMessage(e));
        setLoadedOnce(true);
      });
    return () => ac.abort();
  }, []);

  async function refresh() {
    const res = await adminContentApi.faculties();
    setRows(res.faculties);
    setOrphans(res.orphans);
  }

  async function run(key: string, fn: () => Promise<void>, done?: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (done) setNotice(done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /* ── ส่งออก CSV ── */
  function exportCsv() {
    const head = CSV_COLUMNS.join(',');
    const lines = rows.map((f) =>
      CSV_COLUMNS.map((k) => `"${String(f[k] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง เหมือนการส่งออกที่อื่นในระบบ
    const csv = '﻿' + [head, ...lines].join(CRLF);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = 'nuv-faculties.csv';
    el.click();
    URL.revokeObjectURL(url);
  }

  /* ── นำเข้า CSV ── */
  async function importCsv(file: File) {
    const text = (await file.text()).replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) {
      setError(t('ไฟล์ว่างเปล่า'));
      return;
    }

    // แถวแรกเป็นหัวตารางเมื่อคอลัมน์แรกเขียนว่า name — ไม่งั้นถือว่าเป็นข้อมูลตั้งแต่แถวแรก
    const first = splitCsvLine(lines[0]);
    const hasHeader = first[0]?.trim().toLowerCase() === 'name';
    const header = hasHeader ? first.map((h) => h.trim()) : [...CSV_COLUMNS];
    const body = hasHeader ? lines.slice(1) : lines;

    const parsed = body.map((line) => {
      const cells = splitCsvLine(line);
      const row: Record<string, string> = {};
      header.forEach((key, i) => {
        if ((CSV_COLUMNS as readonly string[]).includes(key)) row[key] = (cells[i] ?? '').trim();
      });
      return row;
    });

    await run(
      'import',
      async () => {
        const res = await adminContentApi.importFaculties(parsed);
        await refresh();
        setNotice(
          `${t('นำเข้าแล้ว')} ${res.created} ${t('รายการ')}${
            res.skipped ? ` · ${t('ข้ามที่ซ้ำ')} ${res.skipped}` : ''
          }`,
        );
      },
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.abbr.toLowerCase().includes(q),
    );
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    if (sort === 'students') return [...filtered].sort((a, b) => b.students - a.students);
    return filtered;
  }, [rows, query, sort]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{t('คณะ')}</div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('รายการคณะกลางที่ใช้ในโปรไฟล์นิสิตและตัวกรองรายงาน')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      {/* ชื่อคณะที่นิสิตใช้อยู่แต่ไม่มีในรายการกลาง */}
      {orphans.length ? (
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '13px 16px',
            borderRadius: 15,
            background: 'rgba(245,166,35,.14)',
            color: '#A66112',
            fontSize: 12.5,
            lineHeight: 1.8,
          }}
        >
          <Icon name="warning" size={18} style={{ flexShrink: 0 }} />
          <span>
            {`${t('มีชื่อคณะในโปรไฟล์นิสิตที่ยังไม่อยู่ในรายการกลาง')}: `}
            {orphans.map((o) => `${o.name} (${o.students})`).join(' · ')}
          </span>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ค้นหาคณะ...')}
          aria-label={t('ค้นหาคณะ...')}
          style={{ ...inputStyle(false), flex: 1, minWidth: 180 }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label={t('เรียงตาม')}
          style={{ ...inputStyle(false), width: 'auto', minWidth: 150 }}
        >
          <option value="order">{t('ลำดับที่ตั้งไว้')}</option>
          <option value="name">{t('ชื่อคณะ')}</option>
          <option value="students">{t('จำนวนนิสิต')}</option>
        </select>
        <Button variant="primary" icon={adding ? 'close' : 'add'} onClick={() => setAdding((v) => !v)}>
          {adding ? t('ยกเลิก') : t('เพิ่มคณะ')}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!rows.length}>
          {t('ส่งออก CSV')}
        </Button>
        <Button
          variant="secondary"
          icon="upload"
          loading={busy === 'import'}
          onClick={() => fileRef.current?.click()}
        >
          {t('นำเข้า CSV')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            // ล้างค่าไว้ เผื่อผู้ใช้เลือกไฟล์เดิมซ้ำหลังแก้ไขแล้ว
            e.target.value = '';
            if (file) void importCsv(file);
          }}
        />
      </div>

      {adding ? (
        <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{t('คณะใหม่')}</div>
          <FacultyFields value={draft} onChange={setDraft} t={t} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              icon="save"
              loading={busy === 'new'}
              disabled={!draft.name.trim()}
              onClick={() =>
                run(
                  'new',
                  async () => {
                    await adminContentApi.createFaculty(draft);
                    await refresh();
                    setDraft(BLANK);
                    setAdding(false);
                  },
                  t('เพิ่มคณะแล้ว'),
                )
              }
            >
              {t('บันทึก')}
            </Button>
          </div>
        </div>
      ) : null}

      {!loadedOnce ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} radius={16} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="school"
            title={t('ไม่พบคณะ')}
            desc={query ? t('ลองเปลี่ยนคำค้น') : t('ยังไม่มีคณะในระบบ')}
          />
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {visible.map((f, i) => (
            <FacultyRow
              key={f.id}
              faculty={f}
              isEn={isEn}
              t={t}
              busy={busy === f.id}
              editing={editing === f.id}
              // ปุ่มเรียงลำดับใช้ได้เฉพาะตอนเรียงตามลำดับที่ตั้งไว้ ไม่งั้นทิศทางจะไม่ตรงกับที่เห็น
              canMove={sort === 'order' && !query}
              first={i === 0}
              last={i === visible.length - 1}
              onEdit={() => setEditing(editing === f.id ? null : f.id)}
              onSave={(patch) =>
                run(
                  f.id,
                  async () => {
                    await adminContentApi.updateFaculty(f.id, patch);
                    await refresh();
                    setEditing(null);
                  },
                  t('บันทึกแล้ว'),
                )
              }
              onToggle={() =>
                run(f.id, async () => {
                  await adminContentApi.updateFaculty(f.id, { active: !f.active });
                  await refresh();
                })
              }
              onMove={(dir) => run(f.id, async () => { await adminContentApi.updateFaculty(f.id, { move: dir }); await refresh(); })}
              onDelete={() => setConfirming(f)}
            />
          ))}
        </ul>
      )}

      {confirming ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบคณะนี้?')}
          body={`${confirming.name} — ${
            confirming.students > 0
              ? `${t('มีนิสิตสังกัดอยู่')} ${confirming.students} ${t('คน')}`
              : t('การลบย้อนกลับไม่ได้')
          }`}
          confirmLabel={t('ลบ')}
          busy={busy === confirming.id}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            run(
              confirming.id,
              async () => {
                await adminContentApi.deleteFaculty(confirming.id);
                await refresh();
                setConfirming(null);
              },
              t('ลบคณะแล้ว'),
            )
          }
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ชิ้นส่วนย่อย ───────────────── */

/** แยกบรรทัด CSV โดยเคารพเครื่องหมายคำพูดและ "" ที่หมายถึงอัญประกาศตัวจริง */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out;
}

function FacultyFields({
  value,
  onChange,
  t,
}: {
  value: Draft;
  onChange: (v: Draft) => void;
  t: (th: string) => string;
}) {
  const set = <K extends keyof Draft>(key: K, v: Draft[K]) => onChange({ ...value, [key]: v });

  const field = (key: keyof Draft, label: string, placeholder?: string, type = 'text') => (
    <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
      {t(label)}
      <input
        type={type}
        value={value[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        style={inputStyle(false)}
      />
    </label>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
      {field('name', 'ชื่อคณะ (ไทย)')}
      {field('nameEn', 'ชื่อคณะ (อังกฤษ)')}
      {field('abbr', 'ตัวย่อ', 'คณศ.')}
      {field('email', 'อีเมลติดต่อ', 'faculty@nu.ac.th', 'email')}
      {field('phone', 'เบอร์โทร', '055-000-000', 'tel')}
      {field('location', 'อาคาร/ที่ตั้ง')}
    </div>
  );
}

function FacultyRow({
  faculty: f,
  isEn,
  t,
  busy,
  editing,
  canMove,
  first,
  last,
  onEdit,
  onSave,
  onToggle,
  onMove,
  onDelete,
}: {
  faculty: AdminFaculty;
  isEn: boolean;
  t: (th: string) => string;
  busy: boolean;
  editing: boolean;
  canMove: boolean;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onSave: (patch: Partial<AdminFaculty>) => void;
  onToggle: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: f.name,
    nameEn: f.nameEn,
    abbr: f.abbr,
    email: f.email,
    phone: f.phone,
    location: f.location,
  });

  const contact = [f.email, f.phone, f.location].filter(Boolean).join(' · ');

  return (
    <li style={{ ...glass(18), padding: 16, display: 'grid', gap: 12, opacity: f.active ? 1 : 0.62 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${f.color}28`,
            color: f.color,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {f.abbr || <Icon name="school" size={20} />}
        </span>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
              {isEn && f.nameEn ? f.nameEn : f.name}
            </span>
            {!f.active ? <Badge tone="neutral" icon="visibility_off" label={t('ปิดใช้งาน')} /> : null}
          </div>
          {isEn && f.nameEn ? null : f.nameEn ? (
            <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 2 }}>{f.nameEn}</div>
          ) : null}
          {contact ? (
            <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 4, lineHeight: 1.75 }}>{contact}</div>
          ) : null}
          <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3 }}>
            {`${t('นิสิตสังกัด')} ${f.students} ${t('คน')}`}
          </div>
        </div>

        {canMove ? (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <MoveBtn icon="arrow_upward" label={t('เลื่อนขึ้น')} disabled={busy || first} onClick={() => onMove('up')} />
            <MoveBtn icon="arrow_downward" label={t('เลื่อนลง')} disabled={busy || last} onClick={() => onMove('down')} />
          </div>
        ) : null}
      </div>

      {editing ? (
        <>
          <FacultyFields value={draft} onChange={setDraft} t={t} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onEdit} style={{ padding: '8px 14px', fontSize: 12.5 }}>
              {t('ยกเลิก')}
            </Button>
            <Button
              variant="primary"
              icon="save"
              loading={busy}
              disabled={!draft.name.trim()}
              onClick={() => onSave(draft)}
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              {t('บันทึก')}
            </Button>
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            paddingTop: 11,
            borderTop: '1px solid rgba(31,41,55,.08)',
          }}
        >
          <Button variant="secondary" icon="edit" disabled={busy} onClick={onEdit} style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {t('แก้ไข')}
          </Button>
          <Button
            variant="secondary"
            icon={f.active ? 'visibility_off' : 'visibility'}
            disabled={busy}
            onClick={onToggle}
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            {f.active ? t('ปิดใช้งาน') : t('เปิดใช้งาน')}
          </Button>
          <Button
            variant="secondary"
            icon="delete"
            disabled={busy || f.students > 0}
            title={f.students > 0 ? t('ลบไม่ได้เพราะยังมีนิสิตสังกัดอยู่') : undefined}
            onClick={onDelete}
            style={{ padding: '8px 14px', fontSize: 12.5, marginInlineStart: 'auto' }}
          >
            {t('ลบ')}
          </Button>
        </div>
      )}
    </li>
  );
}

function MoveBtn({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="nuv-iconbtn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 11,
        border: '1px solid rgba(31,41,55,.1)',
        background: 'rgba(255,255,255,.6)',
        color: COLOR.body,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}
