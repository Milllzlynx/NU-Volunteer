'use client';

import { useRef, useState } from 'react';
import { Button, Icon, inputStyle } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { useApp } from '@/components/providers/AppProviders';
import { RichText } from '@/components/admin/RichText';
import { COLOR, glass } from '@/lib/design';
import { COVER_MAX_EDGE_PX } from '@/lib/imageFile';
import type { AdminNewsRow, NewsInput } from '@/lib/api';

const MAX_BODY = 20_000;

/** ปุ่มจัดรูปแบบ — แต่ละปุ่มครอบข้อความที่เลือกไว้ หรือแทรกตัวอย่างถ้ายังไม่ได้เลือก */
const TOOLS: { icon: string; label: string; before: string; after: string; sample: string }[] = [
  { icon: 'format_bold', label: 'ตัวหนา', before: '**', after: '**', sample: 'ข้อความ' },
  { icon: 'format_italic', label: 'ตัวเอียง', before: '*', after: '*', sample: 'ข้อความ' },
  { icon: 'title', label: 'หัวข้อ', before: '## ', after: '', sample: 'หัวข้อ' },
  { icon: 'format_list_bulleted', label: 'รายการ', before: '- ', after: '', sample: 'รายการ' },
  { icon: 'format_quote', label: 'ยกคำพูด', before: '> ', after: '', sample: 'คำพูด' },
  { icon: 'link', label: 'ลิงก์', before: '[', after: '](https://)', sample: 'ข้อความลิงก์' },
];

/**
 * ฟอร์มเขียน/แก้ไขข่าว
 *
 * ช่องเนื้อหาเป็น textarea ธรรมดาที่ใส่เครื่องหมายอย่างมาร์กดาวน์ได้ ไม่ใช่ contentEditable
 * เพราะเนื้อหาถูกเก็บเป็นข้อความล้วน (ดูเหตุผลใน lib/richText.ts) ตัวอย่างด้านข้างแสดงผลจริง
 * ด้วยตัวเรนเดอร์ตัวเดียวกับที่ผู้อ่านจะเห็น ผู้เขียนจึงไม่ต้องเดาว่าเครื่องหมายจะออกมาเป็นอะไร
 */
export function NewsEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  /** null = เขียนใหม่ */
  initial: AdminNewsRow | null;
  busy: boolean;
  onSave: (payload: NewsInput) => void;
  onCancel: () => void;
}) {
  const { t } = useApp();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'draft');
  const [audience, setAudience] = useState(initial?.audience ?? 'public');
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [tagText, setTagText] = useState((initial?.tags ?? []).join(', '));
  const [preview, setPreview] = useState(true);

  /* ค่าใน <input type="datetime-local"> คือเวลาท้องถิ่นของเครื่อง ไม่มีโซนเวลาต่อท้าย
     จึงตัด ISO ให้เหลือ 16 ตัวแรกตอนเติมค่า และแปลงกลับเป็น ISO ตอนส่ง */
  const [publishAt, setPublishAt] = useState(
    initial?.publishedAt ? toLocalInput(initial.publishedAt) : '',
  );

  const over = body.length > MAX_BODY;

  /** ครอบข้อความที่เลือกอยู่ด้วยเครื่องหมาย แล้วคืนเคอร์เซอร์ให้อยู่ในที่ที่พิมพ์ต่อได้ทันที */
  function wrap(tool: (typeof TOOLS)[number]) {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const picked = body.slice(start, end) || t(tool.sample);
    const next = body.slice(0, start) + tool.before + picked + tool.after + body.slice(end);

    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tool.before.length, start + tool.before.length + picked.length);
    });
  }

  function submit() {
    onSave({
      title: title.trim(),
      body,
      image: image.trim(),
      status,
      audience,
      pinned,
      tags: tagText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      // ว่าง = ไม่กำหนดเวลา ปล่อยให้ฝั่งเซิร์ฟเวอร์ลงเวลาให้ตอนเผยแพร่
      publishedAt: publishAt ? new Date(publishAt).toISOString() : null,
    });
  }

  return (
    <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 13 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>
        {initial ? t('แก้ไขข่าว') : t('เขียนข่าวใหม่')}
      </div>

      <label style={labelStyle}>
        {t('หัวข้อข่าว')}
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(false)} />
      </label>

      <label style={labelStyle}>
        {t('ภาพประกอบข่าว')}
        {/* ตัวอย่างภาพอยู่ในตัว ImageDropField แล้ว จึงไม่ต้องมี <img> แสดงซ้ำข้างล่าง */}
        <ImageDropField
          value={image || null}
          onChange={(next) => setImage(next ?? '')}
          icon="newspaper"
          title={t('ภาพประกอบข่าว')}
          height={190}
          maxEdge={COVER_MAX_EDGE_PX}
        />
      </label>

      {/* ── แถบเครื่องมือจัดรูปแบบ ── */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => wrap(tool)}
            title={t(tool.label)}
            aria-label={t(tool.label)}
            className="nuv-iconbtn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(31,41,55,.1)',
              background: 'rgba(255,255,255,.6)',
              color: COLOR.body,
              cursor: 'pointer',
            }}
          >
            <Icon name={tool.icon} size={17} />
          </button>
        ))}
        <Button
          variant="secondary"
          icon={preview ? 'visibility_off' : 'visibility'}
          onClick={() => setPreview((v) => !v)}
          style={{ padding: '7px 13px', fontSize: 12, marginInlineStart: 'auto' }}
        >
          {preview ? t('ซ่อนตัวอย่าง') : t('ดูตัวอย่าง')}
        </Button>
      </div>

      {/* ── ช่องเขียน + ตัวอย่าง ── */}
      <div
        className="nuv-news-editor"
        style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap: 12, alignItems: 'start' }}
      >
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder={t('เขียนเนื้อหาที่นี่ · **ตัวหนา** *ตัวเอียง* ## หัวข้อ - รายการ [ลิงก์](https://...)')}
          aria-label={t('เนื้อหาข่าว')}
          style={{
            ...inputStyle(over),
            resize: 'vertical',
            lineHeight: 1.8,
            fontFamily: 'inherit',
            minHeight: 260,
          }}
        />
        {preview ? (
          <div
            style={{
              padding: 14,
              borderRadius: 13,
              background: 'rgba(255,255,255,.55)',
              border: '1px solid rgba(31,41,55,.08)',
              minHeight: 260,
              overflowX: 'auto',
            }}
          >
            <div style={{ fontSize: 10.5, color: COLOR.hint, marginBottom: 9, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {t('ตัวอย่างที่ผู้อ่านจะเห็น')}
            </div>
            <RichText source={body} />
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 11.5, color: over ? '#C2410C' : COLOR.hint }}>
        {`${body.length}/${MAX_BODY}`}
      </div>

      {/* ── ตัวเลือกการเผยแพร่ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
        <label style={labelStyle}>
          {t('สถานะ')}
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle(false)}>
            <option value="draft">{t('ฉบับร่าง')}</option>
            <option value="published">{t('เผยแพร่')}</option>
            <option value="archived">{t('เก็บเข้ากรุ')}</option>
          </select>
        </label>

        <label style={labelStyle}>
          {t('กลุ่มผู้อ่าน')}
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle(false)}>
            <option value="public">{t('ทุกคน')}</option>
            <option value="members">{t('เฉพาะผู้ที่เข้าสู่ระบบ')}</option>
          </select>
        </label>

        <div style={labelStyle}>
          {t('ตั้งเวลาเผยแพร่')}
          {/* ใช้ DateTimeField แทน <input type="datetime-local"> เพราะช่องของเบราว์เซอร์
              เรียงวัน-เดือนตามภาษาของเครื่องผู้ใช้ เครื่องที่ตั้งเป็น en-US จึงเห็น mm/dd/yyyy
              ช่องนี้บังคับลำดับเป็น วัน/เดือน/ปี เหมือนกันทุกเครื่อง (ดู components/ui/DateTimeField.tsx)
              รูปแบบค่าที่รับส่งเหมือนเดิมทุกประการ ตัวแปลงเป็น ISO ตอนบันทึกจึงไม่ต้องแก้ */}
          <DateTimeField value={publishAt} onChange={setPublishAt} withTime />
        </div>

        <label style={labelStyle}>
          {t('ป้ายกำกับ (คั่นด้วยจุลภาค)')}
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder={t('ประกาศ, ทุนการศึกษา')}
            style={inputStyle(false)}
          />
        </label>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: COLOR.body }}>
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          style={{ width: 15, height: 15, cursor: 'pointer' }}
        />
        {t('ปักหมุดให้อยู่บนสุด')}
      </label>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={busy} style={{ padding: '9px 15px', fontSize: 13 }}>
          {t('ยกเลิก')}
        </Button>
        <Button
          variant="primary"
          icon="save"
          loading={busy}
          disabled={!title.trim() || over}
          onClick={submit}
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          {t('บันทึก')}
        </Button>
      </div>
    </div>
  );
}

/** ISO → ค่าที่ <input type="datetime-local"> รับได้ (เวลาท้องถิ่นของเครื่อง ไม่มีโซนต่อท้าย) */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const labelStyle: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 12, color: COLOR.label };
