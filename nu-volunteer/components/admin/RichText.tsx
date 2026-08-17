'use client';

import { Fragment } from 'react';
import { COLOR } from '@/lib/design';
import { parseRichText, type Block, type Span } from '@/lib/richText';

/**
 * แสดงเนื้อหาข่าวที่เขียนด้วยเครื่องหมายอย่างมาร์กดาวน์
 *
 * สร้าง element ของ React จากโครงสร้างที่ parseRichText คืนมา ไม่ใช้ dangerouslySetInnerHTML
 * ข้อความของผู้เขียนจึงถูกใส่เป็น text node เสมอ ต่อให้พิมพ์ <script> ลงไปตรง ๆ ก็ได้แค่ตัวอักษร
 */
export function RichText({ source }: { source: string }) {
  const blocks = parseRichText(source);

  if (!blocks.length) {
    return <div style={{ fontSize: 12.5, color: COLOR.hint }}>—</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'heading') {
    const size = block.level === 2 ? 16 : 14;
    return (
      <div style={{ fontSize: size, fontWeight: 600, color: COLOR.ink, lineHeight: 1.55 }}>
        <Spans spans={block.spans} />
      </div>
    );
  }

  if (block.kind === 'quote') {
    return (
      <div
        style={{
          borderInlineStart: '3px solid rgba(167,116,247,.5)',
          paddingInlineStart: 12,
          fontSize: 13,
          color: COLOR.label,
          lineHeight: 1.9,
          fontStyle: 'italic',
        }}
      >
        <Spans spans={block.spans} />
      </div>
    );
  }

  if (block.kind === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag style={{ margin: 0, paddingInlineStart: 22, display: 'grid', gap: 5 }}>
        {block.items.map((spans, i) => (
          <li key={i} style={{ fontSize: 13, color: COLOR.body, lineHeight: 1.85 }}>
            <Spans spans={spans} />
          </li>
        ))}
      </Tag>
    );
  }

  return (
    <p style={{ margin: 0, fontSize: 13, color: COLOR.body, lineHeight: 1.9, textWrap: 'pretty' }}>
      <Spans spans={block.spans} />
    </p>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.kind === 'bold') return <strong key={i} style={{ fontWeight: 600, color: COLOR.ink }}>{s.text}</strong>;
        if (s.kind === 'italic') return <em key={i}>{s.text}</em>;
        if (s.kind === 'link') {
          const external = /^https?:\/\//i.test(s.href);
          return (
            <a
              key={i}
              href={s.href}
              // ลิงก์ออกนอกเว็บเปิดแท็บใหม่ และตัด window.opener ไม่ให้ปลายทางเข้าถึงหน้านี้
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              style={{ color: '#7C2FD9', textDecoration: 'underline' }}
            >
              {s.text}
            </a>
          );
        }
        return <Fragment key={i}>{s.text}</Fragment>;
      })}
    </>
  );
}
