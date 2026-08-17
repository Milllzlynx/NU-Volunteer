'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, EmptyState, Icon, inputStyle } from '@/components/ui';
import { COLOR, SEMANTIC, glass } from '@/lib/design';
import type { GuideFaq, GuideItem, GuideSection } from '@/lib/guide';

/**
 * คู่มือการใช้งานในระบบ — เนื้อหามาจาก lib/guide.ts
 *
 * หัวข้อที่อ้างถึงหน้าซึ่งยังไม่เปิดใช้งานจะติดป้ายกำกับไว้ แทนที่จะซ่อนทิ้ง
 * เพราะผู้ใช้ควรรู้ว่าความสามารถนั้นมีอยู่ในแผน แต่ยังกดใช้ไม่ได้ตอนนี้
 */
export function GuideBook({
  sections,
  faqs,
  role,
  available,
  navHrefs,
  navLabels,
}: {
  sections: GuideSection[];
  faqs: GuideFaq[];
  role: string;
  /** คีย์หน้าที่บทบาทนี้เปิดใช้งานแล้ว */
  available: string[];
  /** คีย์หน้า → ที่อยู่ของหน้านั้น */
  navHrefs: Record<string, string>;
  /** คีย์หน้า → ชื่อเมนู (ไทย/อังกฤษ) */
  navLabels: Record<string, { th: string; en: string }>;
}) {
  const { t, isEn } = useApp();

  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  /** ค้นทั้งหัวข้อ คำอธิบาย และทุกบรรทัดในหัวข้อ ทั้งสองภาษา */
  const matchedSections = useMemo(() => {
    if (!q) return sections;
    return sections.filter((s) =>
      [s.title, s.titleEn, s.summary, s.summaryEn, ...s.items.flatMap((i) => [i.text, i.textEn])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [sections, q]);

  const matchedFaqs = useMemo(() => {
    if (!q) return faqs;
    return faqs.filter((f) =>
      [f.question, f.questionEn, f.answer, f.answerEn].join(' ').toLowerCase().includes(q),
    );
  }, [faqs, q]);

  const nothingFound = q.length > 0 && !matchedSections.length && !matchedFaqs.length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── หัวเรื่องและช่องค้นหา ── */}
      <div style={{ ...glass(22), padding: 20, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: SEMANTIC.purple.bg,
              color: SEMANTIC.purple.color,
            }}
          >
            <Icon name="help_center" size={24} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, color: COLOR.ink, lineHeight: 1.4 }}>
              {t('คู่มือผู้ใช้งาน')}
            </h1>
            <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 5, lineHeight: 1.8 }}>
              {t('รวมวิธีใช้งานทุกหน้าที่คุณเข้าถึงได้ พร้อมคำถามที่พบบ่อย')}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <Icon
            name="search"
            size={19}
            style={{
              position: 'absolute',
              insetInlineStart: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLOR.hint,
              pointerEvents: 'none',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ค้นหาในคู่มือ')}
            aria-label={t('ค้นหาในคู่มือ')}
            style={{ ...inputStyle(), paddingInlineStart: 40 }}
          />
        </div>

        {/* ลัดไปยังหัวข้อ — ซ่อนตอนกำลังค้นหา เพราะรายการด้านล่างถูกกรองอยู่แล้ว */}
        {!q ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenId(s.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: `1px solid ${openId === s.id ? '#A774F7' : 'rgba(31,41,55,.12)'}`,
                  background: openId === s.id ? 'rgba(167,116,247,.16)' : 'rgba(255,255,255,.6)',
                  color: openId === s.id ? '#7C2FD9' : COLOR.body,
                }}
              >
                <Icon name={s.icon} size={16} />
                {isEn ? s.titleEn : s.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {nothingFound ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon="search_off"
            title={t('ไม่พบหัวข้อที่ค้นหา')}
            desc={t('ลองใช้คำอื่น หรือดูคำถามที่พบบ่อยด้านล่าง')}
          />
        </div>
      ) : null}

      {/* ── หัวข้อคู่มือ ── */}
      {matchedSections.map((s) => {
        /* ค้นอยู่ให้กางทุกหัวข้อที่ตรงคำค้น ไม่ต้องกดเปิดทีละอัน */
        const expanded = q ? true : openId === s.id;
        const pageReady = !s.pageKey || available.includes(s.pageKey);
        const href = s.pageKey ? navHrefs[s.pageKey] : undefined;
        const label = s.pageKey ? navLabels[s.pageKey] : undefined;

        return (
          <section key={s.id} style={{ ...glass(20), padding: 18 }}>
            <button
              type="button"
              onClick={() => setOpenId((v) => (v === s.id ? null : s.id))}
              aria-expanded={expanded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'start',
              }}
            >
              <Icon name={s.icon} size={21} style={{ color: '#7C2FD9', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: COLOR.ink, lineHeight: 1.45 }}>
                  {isEn ? s.titleEn : s.title}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: COLOR.label, marginTop: 3, lineHeight: 1.65 }}>
                  {isEn ? s.summaryEn : s.summary}
                </span>
              </span>
              {!pageReady ? <Badge tone="neutral" label={t('ยังไม่เปิดใช้งาน')} /> : null}
              <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} style={{ color: COLOR.hint, flexShrink: 0 }} />
            </button>

            {expanded ? (
              <div style={{ marginTop: 15, display: 'grid', gap: 11 }}>
                <ItemList items={s.items} isEn={isEn} />

                {/* ปุ่มไปหน้าที่หัวข้อนี้พูดถึง — ขึ้นเฉพาะหน้าที่เปิดใช้งานแล้ว */}
                {pageReady && href && label ? (
                  <Link href={href} style={{ justifySelf: 'start', marginTop: 3 }}>
                    <Button variant="secondary" icon="arrow_forward" style={{ padding: '9px 15px' }}>
                      {`${t('ไปที่')} ${isEn ? label.en : label.th}`}
                    </Button>
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}

      {/* ── คำถามที่พบบ่อย ── */}
      {matchedFaqs.length ? (
        <section style={{ ...glass(20), padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
            <Icon name="quiz" size={20} style={{ color: '#7C2FD9' }} />
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: COLOR.ink }}>
              {t('คำถามที่พบบ่อย')}
            </h2>
            <Badge tone="purple" label={String(matchedFaqs.length)} style={{ marginInlineStart: 'auto' }} />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {matchedFaqs.map((f) => {
              const on = q ? true : openFaq === f.id;
              return (
                <div key={f.id} style={{ borderRadius: 14, background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.75)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq((v) => (v === f.id ? null : f.id))}
                    aria-expanded={on}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '13px 14px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'start',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: COLOR.ink, lineHeight: 1.6 }}>
                      {isEn ? f.questionEn : f.question}
                    </span>
                    <Icon name={on ? 'expand_less' : 'expand_more'} size={19} style={{ color: COLOR.hint, flexShrink: 0 }} />
                  </button>
                  {on ? (
                    <div style={{ padding: '0 14px 14px', fontSize: 12.5, color: COLOR.body, lineHeight: 1.9 }}>
                      {isEn ? f.answerEn : f.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── ติดต่อเมื่อคู่มือไม่ตอบ ── */}
      <div style={{ ...glass(20), padding: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Icon name="support_agent" size={22} style={{ color: SEMANTIC.info.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
          {t('ยังไม่พบคำตอบที่ต้องการ? สอบถามผู้จัดกิจกรรมได้โดยตรงจากหน้าแชท')}
        </div>
        {available.includes('chat') ? (
          <Link href={navHrefs.chat ?? `/${role}/chat`}>
            <Button variant="secondary" icon="forum" style={{ padding: '10px 15px' }}>
              {t('ไปที่หน้าแชท')}
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ItemList({ items, isEn }: { items: GuideItem[]; isEn: boolean }) {
  const out: React.ReactNode[] = [];
  let stepNo = 0;

  for (const [i, item] of items.entries()) {
    const text = isEn ? item.textEn : item.text;

    if (item.kind === 'step') {
      stepNo += 1;
      out.push(
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{
              width: 23,
              height: 23,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#A774F7',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {stepNo}
          </span>
          <span style={{ fontSize: 13, color: COLOR.body, lineHeight: 1.8 }}>{text}</span>
        </div>,
      );
      continue;
    }

    if (item.kind === 'note') {
      out.push(
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            padding: 13,
            borderRadius: 13,
            background: SEMANTIC.info.bg,
            borderInlineStart: `3px solid ${SEMANTIC.info.dot}`,
          }}
        >
          <Icon name="lightbulb" size={18} style={{ color: SEMANTIC.info.color, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>{text}</span>
        </div>,
      );
      continue;
    }

    out.push(
      <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <Icon name="check_circle" size={17} style={{ color: SEMANTIC.success.color, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 13, color: COLOR.body, lineHeight: 1.8 }}>{text}</span>
      </div>,
    );
  }

  return <>{out}</>;
}
