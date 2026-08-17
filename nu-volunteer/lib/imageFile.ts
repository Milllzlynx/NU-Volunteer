/**
 * อ่านไฟล์ภาพจากเครื่องผู้ใช้ให้กลายเป็น data URL ที่เก็บลงฐานข้อมูลได้
 *
 * ระบบนี้ยังไม่มีที่เก็บไฟล์แยก — ไม่มี object storage และโฟลเดอร์ของแอปตอน deploy
 * ก็เขียนไม่ได้ ภาพที่ผู้จัดอัปโหลดจึงถูกเก็บเป็น data URL ในคอลัมน์เดียวกับ
 * ที่เคยเก็บลิงก์ภาพ (Activity.gallery และ Activity.mapImage) วิธีนี้ไม่ต้องเพิ่ม
 * โครงสร้างพื้นฐานใหม่ แต่แลกมาด้วยข้อจำกัดที่ต้องระวัง: ขนาดภาพมีผลกับ
 * ขนาดแถวในฐานข้อมูลและขนาด HTML ของหน้ารายละเอียดโดยตรง
 *
 * จึงย่อภาพก่อนเก็บเสมอ ไม่ปล่อยไฟล์ 5MB จากกล้องมือถือลงฐานข้อมูลตรง ๆ
 */

/** ขนาดไฟล์ที่รับจากผู้ใช้ — ใหญ่กว่านี้ให้เลือกใหม่ ไม่ใช่ขนาดหลังย่อ */
export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** ด้านยาวสุดหลังย่อ — พอสำหรับแสดงเต็มความกว้างการ์ดบนจอความละเอียดสูง */
const MAX_EDGE_PX = 1400;
const QUALITY = 0.85;

/**
 * งบขนาดของภาพหน้าปก เล็กกว่าภาพอื่นโดยตั้งใจ
 *
 * ภาพหน้าปกไม่ได้อยู่แค่ในหน้ารายละเอียด แต่ถูกฝังลงการ์ดทุกใบบนหน้าแรก
 * หน้าค้นหา และหน้ารายการ ซึ่งแสดงพร้อมกันสิบกว่ากิจกรรม การ์ดสูงแค่ 170px
 * ภาพใหญ่กว่านี้จึงไม่ได้ทำให้คมขึ้นบนการ์ด แต่ทำให้ HTML ของทุกหน้ารายการหนักขึ้นทันที
 * (data URL ฝังอยู่ใน HTML ตั้งแต่ต้น loading="lazy" ช่วยอะไรไม่ได้)
 */
export const COVER_MAX_EDGE_PX = 1000;

/**
 * งบขนาดของรูปโปรไฟล์ เล็กที่สุดในระบบ
 *
 * รูปโปรไฟล์ไม่ได้แสดงใบเดียวต่อหนึ่งหน้า แต่ซ้ำอยู่ในทุกแถวของรายชื่อผู้เข้าร่วม
 * ห้องแชท และรายการรออนุมัติ ที่แสดงจริงก็แค่วงกลมขนาด 44px
 * ภาพใหญ่กว่านี้จึงเปลืองอย่างเดียว ไม่ได้ทำให้เห็นชัดขึ้น
 */
export const AVATAR_MAX_EDGE_PX = 256;

export type ImageReadOptions = {
  /** ด้านยาวสุดหลังย่อ — ไม่ส่งมาใช้ค่ามาตรฐาน */
  maxEdge?: number;
  quality?: number;
};

/**
 * ภาพที่เล็กกว่านี้และไม่เกินขนาดด้านอยู่แล้วจะถูกเก็บไฟล์เดิม
 * บีบอัดซ้ำมีแต่ทำให้ตัวหนังสือบนภาพแผนที่แตก โดยที่ไม่ได้ประหยัดพื้นที่จริง
 */
const KEEP_ORIGINAL_UNDER_BYTES = 400 * 1024;

export type ImageReadError = 'type' | 'size' | 'decode';
export type ImageReadResult = { ok: true; dataUrl: string } | { ok: false; reason: ImageReadError };

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/**
 * ถอดรหัสไฟล์ภาพให้วาดลงแคนวาสได้
 *
 * createImageBitmap เร็วกว่าและไม่ต้องรอ event loop แต่บางเบราว์เซอร์ยังถอดรหัส
 * บางฟอร์แมตผ่านมันไม่ได้ จึงมี <img> เป็นทางสำรองไว้
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // ตกไปใช้ทางสำรองด้านล่าง
    }
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

/**
 * เลือกฟอร์แมตผลลัพธ์ — WebP เล็กกว่า JPEG ที่คุณภาพเท่ากันอย่างชัดเจน
 * เบราว์เซอร์ที่ยังไม่รองรับจะคืน PNG กลับมาแทน ซึ่งใหญ่กว่าเดิม จึงเช็กแล้วถอยไป JPEG
 */
function encodeCanvas(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

export async function readImageAsDataUrl(
  file: File,
  opts: ImageReadOptions = {},
): Promise<ImageReadResult> {
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'type' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'size' };

  const maxEdge = opts.maxEdge ?? MAX_EDGE_PX;
  const quality = opts.quality ?? QUALITY;

  let decoded: DecodedImage | null = null;
  try {
    decoded = await decodeImage(file);
    const { width, height } = decoded;
    if (!width || !height) return { ok: false, reason: 'decode' };

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    if (scale === 1 && file.size <= KEEP_ORIGINAL_UNDER_BYTES) {
      return { ok: true, dataUrl: await fileToDataUrl(file) };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, reason: 'decode' };

    // JPEG ไม่มีช่องอัลฟา — ถ้าไม่รองพื้นขาวไว้ก่อน PNG โปร่งใสจะกลายเป็นพื้นดำ
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    return { ok: true, dataUrl: encodeCanvas(canvas, quality) };
  } catch {
    return { ok: false, reason: 'decode' };
  } finally {
    decoded?.release();
  }
}
