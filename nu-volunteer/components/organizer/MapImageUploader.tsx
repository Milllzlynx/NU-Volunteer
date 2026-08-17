'use client';

import { useApp } from '@/components/providers/AppProviders';
import { ImageDropField } from '@/components/ui/ImageDropField';

/**
 * ช่องภาพแผนที่ — ช่องเดียวเต็มความกว้าง เก็บลง Activity.mapImage
 *
 * หน้ารายละเอียดใช้ภาพนิ่งคู่กับลิงก์ออกไป Google Maps แทนการฝังแผนที่จริง
 * เพราะไม่ต้องใช้ API key และไม่ส่งผู้ใช้ไปให้บุคคลที่สามตั้งแต่ตอนโหลดหน้า
 * (ดูหมายเหตุเดียวกันที่ components/activity/ActivityDetail.tsx)
 */
export default function MapImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const { t } = useApp();

  return (
    <ImageDropField
      value={value}
      onChange={onChange}
      icon="map"
      title={t('แผนที่สถานที่จัดกิจกรรม')}
      height={220}
      hint={t('ภาพนิ่งของแผนที่ที่แสดงคู่กับปุ่มเปิดใน Google Maps — เว้นว่างได้')}
    />
  );
}
