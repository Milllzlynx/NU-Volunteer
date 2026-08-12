// SQLite ไม่รองรับ scalar list — ฟิลด์ที่เป็นรายการเก็บเป็น JSON string
export function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyList(list: readonly unknown[] | null | undefined): string {
  return JSON.stringify((list ?? []).map(String));
}

export function parseObject<T = Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
