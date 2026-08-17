/**
 * ตัวแยกข้อความแบบมาร์กดาวน์ชุดย่อ สำหรับเนื้อหาข่าวประชาสัมพันธ์
 *
 * ทำไมไม่เก็บเป็น HTML: เนื้อหาข่าวถูกนำไปแสดงให้นิสิตอ่าน ถ้าเก็บ HTML ดิบแล้วเรนเดอร์ด้วย
 * dangerouslySetInnerHTML ใครที่เข้าถึงบัญชีผู้ดูแลได้ (หรือช่องโหว่ใดก็ตามที่เขียนตาราง News ได้)
 * จะฝัง <script> ลงหน้าที่ผู้ใช้ทุกคนเปิดได้ทันที
 *
 * ทำไมไม่ลงไลบรารีมาร์กดาวน์: โปรเจกต์นี้ไม่มี dependency สำหรับเรื่องนี้อยู่แล้ว และมาร์กดาวน์
 * เต็มรูปแบบมาพร้อมสิ่งที่ไม่ต้องการ (HTML ฝังใน, ลิงก์ javascript:) ซึ่งต้องมาไล่ปิดทีหลัง
 *
 * ผลลัพธ์เป็นโครงสร้างข้อมูล ไม่ใช่สตริง HTML — ฝั่งเรนเดอร์สร้าง element ของ React เอง
 * เนื้อหาจึงกลายเป็นข้อความเสมอ ไม่มีทางกลายเป็นแท็ก
 */

/** ชิ้นส่วนภายในหนึ่งบรรทัด — ตัวหนา ตัวเอียง หรือลิงก์ */
export type Span =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; href: string };

export type Block =
  | { kind: 'heading'; level: 2 | 3; spans: Span[] }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'list'; ordered: boolean; items: Span[][] }
  | { kind: 'quote'; spans: Span[] };

/**
 * ยอมรับเฉพาะลิงก์ที่ปลอดภัย — http/https ลิงก์ภายในที่ขึ้นต้นด้วย / และ mailto
 * ตัด javascript: กับ data: ทิ้ง เพราะทั้งคู่รันโค้ดได้เมื่อผู้ใช้กด
 */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  if (href.startsWith('/')) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return href;
  return null;
}

/** ลำดับสำคัญ: ลิงก์มาก่อน ไม่งั้น **ตัวหนา** ในข้อความลิงก์จะถูกตัดก่อน */
const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/;

function parseSpans(line: string): Span[] {
  const out: Span[] = [];
  let rest = line;

  while (rest) {
    const m = INLINE.exec(rest);
    if (!m || m.index === undefined) break;

    if (m.index > 0) out.push({ kind: 'text', text: rest.slice(0, m.index) });

    if (m[1] != null) {
      const href = safeHref(m[2]);
      // ลิงก์ที่ไม่ผ่านการตรวจกลายเป็นข้อความธรรมดา ไม่ใช่หายไปเฉย ๆ
      out.push(href ? { kind: 'link', text: m[1], href } : { kind: 'text', text: m[1] });
    } else if (m[3] != null) {
      out.push({ kind: 'bold', text: m[3] });
    } else if (m[4] != null) {
      out.push({ kind: 'italic', text: m[4] });
    }

    rest = rest.slice(m.index + m[0].length);
  }

  if (rest) out.push({ kind: 'text', text: rest });
  return out.length ? out : [{ kind: 'text', text: '' }];
}

/**
 * แปลงข้อความดิบเป็นบล็อก
 *
 * รองรับ: ## หัวข้อ, ### หัวข้อย่อย, - รายการ, 1. รายการมีลำดับ, > ยกคำพูด
 * และในบรรทัด: **ตัวหนา**, *ตัวเอียง*, [ข้อความ](ลิงก์)
 * บรรทัดว่างคั่นย่อหน้า
 */
export function parseRichText(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = String(raw ?? '').replace(/\r\n/g, '\n').split('\n');

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: 'paragraph', spans: parseSpans(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: 'list', ordered: list.ordered, items: list.items.map(parseSpans) });
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: heading[1].length === 2 ? 2 : 3,
        spans: parseSpans(heading[2]),
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushAll();
      blocks.push({ kind: 'quote', spans: parseSpans(quote[1]) });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      // สลับชนิดรายการกลางคัน = ขึ้นรายการใหม่ ไม่ใช่ปนกันในก้อนเดียว
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  return blocks;
}

/** ตัดเครื่องหมายทั้งหมดออกให้เหลือข้อความล้วน — ใช้ทำข้อความย่อในรายการ */
export function richTextExcerpt(raw: string, max = 140): string {
  const flat = parseRichText(raw)
    .flatMap((b) => (b.kind === 'list' ? b.items.flat() : b.spans))
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}
