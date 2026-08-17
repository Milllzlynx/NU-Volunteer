'use client';

import { useApp } from '@/components/providers/AppProviders';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { COLOR } from '@/lib/design';

/**
 * ช่องภาพประกอบกิจกรรม — หลายช่องเรียงกัน เก็บลง Activity.gallery
 *
 * เก็บค่าเป็นอาร์เรย์ที่มีช่องว่างได้ (null) ไม่ใช่อาร์เรย์ที่อัดแน่น
 * เพื่อให้ตำแหน่งช่องคงที่ตอนผู้ใช้ลบภาพกลางออก — ลบภาพที่ 2 แล้วภาพที่ 3
 * ต้องไม่กระโดดมาแทนที่ ไม่งั้นคนที่กำลังไล่ใส่ภาพจะงงว่าอะไรย้ายไปไหน
 * ตอนบันทึกค่อยกรองช่องว่างทิ้งที่ ActivityForm
 */

export const GALLERY_SLOTS = 3;

/** เติมอาร์เรย์ให้ครบจำนวนช่อง — ใช้ตอนสร้างค่าเริ่มต้นจากรายการที่บันทึกไว้ */
export function toSlots(images: string[], slots = GALLERY_SLOTS): (string | null)[] {
  return Array.from({ length: slots }, (_, i) => images[i] ?? null);
}

export default function ActivityImageUploader({
  value,
  onChange,
  maxImages = GALLERY_SLOTS,
}: {
  value: (string | null)[];
  onChange: (next: (string | null)[]) => void;
  maxImages?: number;
}) {
  const { t } = useApp();

  // ผู้ใช้ลบภาพกลางออกแล้วช่องต้องไม่ขยับ จึงอ้างอิงอาร์เรย์ที่ส่งเข้ามาตรง ๆ
  const current = Array.from({ length: maxImages }, (_, i) => value[i] ?? null);
  const filled = current.filter(Boolean).length;

  const setAt = (index: number, next: string | null) =>
    onChange(current.map((v, i) => (i === index ? next : v)));

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        className="nuv-form-2col"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${maxImages}, 1fr)`, gap: 10 }}
      >
        {current.map((image, i) => (
          <ImageDropField
            key={i}
            value={image}
            onChange={(next) => setAt(i, next)}
            title={`${t('ภาพประกอบที่')} ${i + 1}`}
            height={150}
          />
        ))}
      </div>
      <span style={{ fontSize: 11.5, color: COLOR.hint }}>
        {`${filled}/${maxImages} · `}
        {t('รองรับ JPG, PNG, WebP ขนาดไม่เกิน 5MB ต่อภาพ')}
      </span>
    </div>
  );
}
