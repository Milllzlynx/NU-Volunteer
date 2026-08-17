'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, ErrorNote, Icon, Skeleton, SuccessNote, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { adminContentApi, errorMessage, type AdminCategory } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

/** ค่าตั้งต้นของฟอร์มเพิ่มหมวดใหม่ */
const BLANK = { id: '', label: '', labelEn: '', desc: '', icon: '', color: '#A774F7' };

/**
 * จัดการหมวดหมู่กิจกรรม
 *
 * หมวดหมู่มีไม่กี่รายการและแทบไม่เปลี่ยน จึงโหลดมาทั้งชุดแล้วจัดการในหน่วยความจำ
 * ไม่ต้องมีค้นหาฝั่งเซิร์ฟเวอร์หรือแบ่งหน้าเหมือนหน้าผู้ใช้งาน
 *
 * การเรียงลำดับใช้ปุ่มขึ้น/ลง ไม่ใช่ลากวาง — ลากวางต้องพึ่งเมาส์และเขียนให้ใช้กับ
 * คีย์บอร์ดหรือหน้าจอสัมผัสได้ยาก ในขณะที่ของแบบนี้เรียงกันครั้งเดียวแล้วแทบไม่แตะอีก
 */
export function AdminCategories() {
  const { t, isEn } = useApp();

  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminCategory | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    adminContentApi
      .categories(ac.signal)
      .then((res) => {
        setRows(res.categories);
        setLoadedOnce(true);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(errorMessage(e));
        setLoadedOnce(true);
      });
    return () => ac.abort();
  }, []);

  /** โหลดใหม่ทั้งชุดหลังทำอะไรที่กระทบลำดับหรือจำนวน */
  async function refresh() {
    const res = await adminContentApi.categories();
    setRows(res.categories);
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

  const create = () =>
    run(
      'new',
      async () => {
        await adminContentApi.createCategory(draft);
        await refresh();
        setDraft(BLANK);
        setAdding(false);
      },
      t('เพิ่มหมวดหมู่แล้ว'),
    );

  const visible = rows.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      c.labelEn.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('หมวดหมู่กิจกรรม')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('หมวดหมู่ที่ผู้จัดเลือกได้ตอนสร้างกิจกรรม และที่นิสิตใช้กรองในหน้าค้นหา')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ค้นหาหมวดหมู่...')}
          aria-label={t('ค้นหาหมวดหมู่...')}
          style={{ ...inputStyle(false), flex: 1, minWidth: 180 }}
        />
        <Button variant="primary" icon={adding ? 'close' : 'add'} onClick={() => setAdding((v) => !v)}>
          {adding ? t('ยกเลิก') : t('เพิ่มหมวดหมู่')}
        </Button>
      </div>

      {/* ── ฟอร์มเพิ่มหมวดใหม่ ── */}
      {adding ? (
        <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{t('หมวดหมู่ใหม่')}</div>
          <CategoryFields value={draft} onChange={setDraft} showId t={t} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              icon="save"
              loading={busy === 'new'}
              disabled={!draft.id.trim() || !draft.label.trim()}
              onClick={create}
            >
              {t('บันทึก')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── รายการ ── */}
      {!loadedOnce ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={16} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="category"
            title={t('ไม่พบหมวดหมู่')}
            desc={query ? t('ลองเปลี่ยนคำค้น') : t('ยังไม่มีหมวดหมู่ในระบบ')}
          />
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {visible.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              isEn={isEn}
              t={t}
              busy={busy === c.id}
              editing={editing === c.id}
              first={i === 0 && !query}
              last={i === visible.length - 1 && !query}
              onEdit={() => setEditing(editing === c.id ? null : c.id)}
              onSave={(patch) =>
                run(
                  c.id,
                  async () => {
                    const res = await adminContentApi.updateCategory(c.id, patch);
                    if (res.category) {
                      setRows((prev) => prev.map((x) => (x.id === c.id ? res.category! : x)));
                    }
                    setEditing(null);
                  },
                  t('บันทึกแล้ว'),
                )
              }
              onToggle={() =>
                run(c.id, async () => {
                  const res = await adminContentApi.updateCategory(c.id, { active: !c.active });
                  if (res.category) {
                    setRows((prev) => prev.map((x) => (x.id === c.id ? res.category! : x)));
                  }
                })
              }
              onMove={(dir) => run(c.id, async () => { await adminContentApi.updateCategory(c.id, { move: dir }); await refresh(); })}
              onDelete={() => setConfirming(c)}
            />
          ))}
        </ul>
      )}

      {confirming ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบหมวดหมู่นี้?')}
          body={`${confirming.label} — ${
            confirming.activities > 0
              ? `${t('มีกิจกรรมใช้อยู่')} ${confirming.activities} ${t('รายการ')}`
              : t('การลบย้อนกลับไม่ได้')
          }`}
          confirmLabel={t('ลบ')}
          busy={busy === confirming.id}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            run(
              confirming.id,
              async () => {
                await adminContentApi.deleteCategory(confirming.id);
                setRows((prev) => prev.filter((x) => x.id !== confirming.id));
                setConfirming(null);
              },
              t('ลบหมวดหมู่แล้ว'),
            )
          }
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ชิ้นส่วนย่อย ───────────────── */

type Draft = typeof BLANK;

/** ช่องกรอกที่ใช้ร่วมกันระหว่างฟอร์มเพิ่มใหม่กับฟอร์มแก้ไขในแถว */
function CategoryFields({
  value,
  onChange,
  showId = false,
  t,
}: {
  value: Draft;
  onChange: (v: Draft) => void;
  showId?: boolean;
  t: (th: string) => string;
}) {
  const set = <K extends keyof Draft>(key: K, v: Draft[K]) => onChange({ ...value, [key]: v });

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
        {showId ? (
          <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
            {t('รหัส (ใช้ใน URL)')}
            <input
              value={value.id}
              onChange={(e) => set('id', e.target.value.toLowerCase())}
              placeholder="volunteer-abroad"
              style={inputStyle(false)}
            />
          </label>
        ) : null}
        <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
          {t('ชื่อหมวดหมู่')}
          <input value={value.label} onChange={(e) => set('label', e.target.value)} style={inputStyle(false)} />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
          {t('ชื่อภาษาอังกฤษ')}
          <input value={value.labelEn} onChange={(e) => set('labelEn', e.target.value)} style={inputStyle(false)} />
        </label>
      </div>

      <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
        {t('คำอธิบาย')}
        <input value={value.desc} onChange={(e) => set('desc', e.target.value)} style={inputStyle(false)} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
        <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
          {t('ไอคอน (Material Symbols)')}
          <input
            value={value.icon}
            onChange={(e) => set('icon', e.target.value.trim())}
            placeholder="volunteer_activism"
            style={inputStyle(false)}
          />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12, color: COLOR.label }}>
          {t('สีประจำหมวด')}
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* ช่องสีของเบราว์เซอร์คู่กับช่องข้อความ — เลือกจากจานสีหรือวางรหัส hex ก็ได้ */}
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : '#A774F7'}
              onChange={(e) => set('color', e.target.value)}
              aria-label={t('สีประจำหมวด')}
              style={{ width: 46, height: 40, padding: 2, borderRadius: 10, border: '1px solid rgba(31,41,55,.12)', background: 'transparent', cursor: 'pointer' }}
            />
            <input
              value={value.color}
              onChange={(e) => set('color', e.target.value)}
              style={{ ...inputStyle(false), flex: 1, fontFamily: 'monospace' }}
            />
          </span>
        </label>
      </div>
    </div>
  );
}

function CategoryRow({
  category: c,
  isEn,
  t,
  busy,
  editing,
  first,
  last,
  onEdit,
  onSave,
  onToggle,
  onMove,
  onDelete,
}: {
  category: AdminCategory;
  isEn: boolean;
  t: (th: string) => string;
  busy: boolean;
  editing: boolean;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onSave: (patch: Partial<AdminCategory>) => void;
  onToggle: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    id: c.id,
    label: c.label,
    labelEn: c.labelEn,
    desc: c.desc,
    icon: c.icon,
    color: c.color,
  });

  return (
    <li style={{ ...glass(18), padding: 16, display: 'grid', gap: 12, opacity: c.active ? 1 : 0.62 }}>
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
            background: `${c.color}28`,
            color: c.color,
          }}
        >
          <Icon name={c.icon || 'category'} size={21} />
        </span>

        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
              {isEn && c.labelEn ? c.labelEn : c.label}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: COLOR.hint }}>{c.id}</span>
            {!c.active ? <Badge tone="neutral" icon="visibility_off" label={t('ปิดใช้งาน')} /> : null}
          </div>
          {c.desc ? (
            <div style={{ fontSize: 12, color: COLOR.body, marginTop: 4, lineHeight: 1.75 }}>{c.desc}</div>
          ) : null}
          <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3 }}>
            {`${t('มีกิจกรรม')} ${c.activities} ${t('รายการ')}`}
          </div>
        </div>

        {/* ปุ่มเรียงลำดับ — ปิดที่หัวและท้ายแถว ไม่ต้องเดาว่ากดแล้วจะเกิดอะไร */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <IconBtn icon="arrow_upward" label={t('เลื่อนขึ้น')} disabled={busy || first} onClick={() => onMove('up')} />
          <IconBtn icon="arrow_downward" label={t('เลื่อนลง')} disabled={busy || last} onClick={() => onMove('down')} />
        </div>
      </div>

      {editing ? (
        <>
          <CategoryFields value={draft} onChange={setDraft} t={t} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onEdit} style={{ padding: '8px 14px', fontSize: 12.5 }}>
              {t('ยกเลิก')}
            </Button>
            <Button
              variant="primary"
              icon="save"
              loading={busy}
              disabled={!draft.label.trim()}
              onClick={() =>
                onSave({
                  label: draft.label,
                  labelEn: draft.labelEn,
                  desc: draft.desc,
                  icon: draft.icon,
                  color: draft.color,
                })
              }
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
            icon={c.active ? 'visibility_off' : 'visibility'}
            disabled={busy}
            onClick={onToggle}
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            {c.active ? t('ปิดใช้งาน') : t('เปิดใช้งาน')}
          </Button>
          <Button
            variant="secondary"
            icon="delete"
            disabled={busy || c.activities > 0}
            title={c.activities > 0 ? t('ลบไม่ได้เพราะยังมีกิจกรรมใช้หมวดนี้อยู่') : undefined}
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

/** ปุ่มไอคอนเล็กสำหรับเรียงลำดับ */
function IconBtn({
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
