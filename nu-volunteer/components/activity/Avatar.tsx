'use client';

/**
 * รูปโปรไฟล์กลม — ไม่มีรูปก็ใช้อักษรแรกของชื่อ ไม่ปล่อยวงกลมว่าง
 *
 * อยู่แยกไฟล์เพราะใช้ร่วมกันหลายที่: หน้ารายชื่อผู้เข้าร่วม หน้ารีวิว
 * และหน้าจัดการของผู้จัดกิจกรรม (ใบลงทะเบียน คำขอยกเลิก การรับรองชั่วโมง)
 */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(167,116,247,.18)',
        color: '#7C2FD9',
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
