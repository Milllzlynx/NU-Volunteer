/**
 * บัสข้อความในหน่วยความจำ — ใช้ส่งเหตุการณ์แชทแบบเรียลไทม์ผ่าน SSE
 *
 * ทำไมเก็บในหน่วยความจำได้: ระบบนี้ต้องรันโปรเซสเดียวอยู่แล้วเพราะ SQLite เขียนได้ทีละ
 * connection (ดู DEPLOYMENT.md §1) ทุก connection ของ SSE จึงอยู่ในโปรเซสเดียวกันเสมอ
 * ถ้าวันหนึ่งย้ายไป Postgres แล้วรันหลาย instance ต้องเปลี่ยนมาใช้ Redis pub/sub หรือ
 * LISTEN/NOTIFY แทน ไม่อย่างนั้นผู้ใช้ที่ต่ออยู่คนละ instance จะไม่เห็นข้อความของกัน
 *
 * เก็บบน globalThis เพราะ hot reload ของ dev สร้างโมดูลใหม่ทุกครั้ง
 */

export type ChatEvent =
  | { type: 'message'; threadId: string; messageId: string; senderId: string; at: number }
  | { type: 'typing'; threadId: string; userId: string; at: number }
  | { type: 'read'; threadId: string; byUserId: string; at: number }
  | { type: 'presence'; userId: string; online: boolean; at: number };

type Listener = (e: ChatEvent) => void;

type Bus = {
  /** userId → ชุดของ listener (หนึ่งคนเปิดได้หลายแท็บ) */
  listeners: Map<string, Set<Listener>>;
  /** userId → เวลาที่เห็นล่าสุด ใช้บอกสถานะออนไลน์ */
  lastSeen: Map<string, number>;
};

const globalForBus = globalThis as unknown as { __nuvChatBus?: Bus };

const bus: Bus =
  globalForBus.__nuvChatBus ?? { listeners: new Map(), lastSeen: new Map() };

if (!globalForBus.__nuvChatBus) globalForBus.__nuvChatBus = bus;

/** ถือว่ายังออนไลน์ถ้าเห็นความเคลื่อนไหวภายในเวลานี้ */
export const ONLINE_WINDOW_MS = 45_000;

export function subscribe(userId: string, fn: Listener): () => void {
  let set = bus.listeners.get(userId);
  if (!set) {
    set = new Set();
    bus.listeners.set(userId, set);
  }
  set.add(fn);
  touch(userId);

  return () => {
    const s = bus.listeners.get(userId);
    if (!s) return;
    s.delete(fn);
    if (!s.size) bus.listeners.delete(userId);
  };
}

/** ส่งเหตุการณ์ให้ผู้ใช้ที่ระบุ (เงียบถ้าเขาไม่ได้เปิดหน้าแชทอยู่) */
export function publishTo(userIds: string[], e: ChatEvent) {
  for (const id of userIds) {
    const set = bus.listeners.get(id);
    if (!set) continue;
    for (const fn of set) {
      try {
        fn(e);
      } catch {
        // listener ตัวเดียวพังต้องไม่ทำให้คนอื่นไม่ได้รับข้อความ
      }
    }
  }
}

export function touch(userId: string) {
  bus.lastSeen.set(userId, Date.now());
}

export function isOnline(userId: string): boolean {
  const t = bus.lastSeen.get(userId);
  return t != null && Date.now() - t < ONLINE_WINDOW_MS;
}

/** ล้างรายการที่หมดอายุ เรียกเป็นครั้งคราวเพื่อไม่ให้ map โตไม่รู้จบ */
export function pruneLastSeen() {
  const cutoff = Date.now() - ONLINE_WINDOW_MS * 4;
  for (const [id, t] of bus.lastSeen) if (t < cutoff) bus.lastSeen.delete(id);
}
