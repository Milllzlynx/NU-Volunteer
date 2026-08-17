/**
 * เลขหน้าที่จะแสดง — ย่อด้วย … เมื่อมีหลายหน้า จะได้ไม่ยาวล้นแถบ
 * แสดงหน้าแรก หน้าสุดท้าย และหน้ารอบ ๆ หน้าปัจจุบันเสมอ
 */
export function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const out: (number | '…')[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);

  if (from > 2) out.push('…');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}
