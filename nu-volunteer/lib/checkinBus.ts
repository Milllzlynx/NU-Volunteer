/**
 * บัสเหตุการณ์เช็กอินในหน่วยความจำ — ป้อนหน้าจอผู้จัดแบบเรียลไทม์ผ่าน SSE
 *
 * ใช้กติกาเดียวกับ lib/chatBus.ts: เก็บในหน่วยความจำได้เพราะระบบรันโปรเซสเดียว
 * (SQLite เขียนได้ทีละ connection — ดู DEPLOYMENT.md §1) ถ้าย้ายไป Postgres แล้วรัน
 * หลาย instance ต้องเปลี่ยนไปใช้ Redis pub/sub ไม่งั้นจอที่ต่ออยู่คนละ instance จะไม่เห็นกัน
 *
 * ต่างจากบัสแชทตรงที่จัดกลุ่มด้วย activityId ไม่ใช่ userId เพราะผู้รับคือ "ใครก็ตามที่
 * กำลังเปิดหน้า QR ของกิจกรรมนี้อยู่" ซึ่งอาจเป็นเครื่องลงทะเบียนหลายเครื่องพร้อมกัน
 */

export type CheckinEvent =
  | {
      type: 'checkin';
      activityId: string;
      registrationId: string;
      kind: 'in' | 'out';
      studentName: string;
      studentId: string;
      avatarUrl: string | null;
      /** นอกรัศมีที่กิจกรรมกำหนด — ผู้จัดควรเห็นทันทีเพื่อทักถามหน้างาน */
      outOfRange: boolean;
      at: number;
    }
  /**
   * รหัสถูกบังคับเปลี่ยนจากจอใดจอหนึ่ง
   *
   * ต้องบอกจออื่นด้วย ไม่งั้นจอที่ตั้งโชว์อยู่จะยังขึ้น QR ที่ถูกยกเลิกไปแล้ว
   * จนกว่าตัวจับเวลาของมันเองจะครบรอบ ซึ่งอาจนานเกือบนาที และคนที่สแกนระหว่างนั้นจะถูกปฏิเสธ
   */
  | { type: 'token'; activityId: string; kind: 'in' | 'out' | 'auto'; at: number };

type Listener = (e: CheckinEvent) => void;

type Bus = {
  /** activityId → ชุดของ listener (ผู้จัดเปิดได้หลายจอ) */
  listeners: Map<string, Set<Listener>>;
};

const globalForBus = globalThis as unknown as { __nuvCheckinBus?: Bus };

const bus: Bus = globalForBus.__nuvCheckinBus ?? { listeners: new Map() };

if (!globalForBus.__nuvCheckinBus) globalForBus.__nuvCheckinBus = bus;

export function subscribeActivity(activityId: string, fn: Listener): () => void {
  let set = bus.listeners.get(activityId);
  if (!set) {
    set = new Set();
    bus.listeners.set(activityId, set);
  }
  set.add(fn);

  return () => {
    const s = bus.listeners.get(activityId);
    if (!s) return;
    s.delete(fn);
    if (!s.size) bus.listeners.delete(activityId);
  };
}

/** ส่งเหตุการณ์ให้ทุกจอที่เปิดกิจกรรมนี้อยู่ (เงียบถ้าไม่มีใครเปิด) */
export function publishCheckin(e: CheckinEvent) {
  const set = bus.listeners.get(e.activityId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(e);
    } catch {
      // จอเดียวพังต้องไม่ทำให้จออื่นไม่ได้รับเหตุการณ์
    }
  }
}
