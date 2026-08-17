'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { COLOR, SEMANTIC } from '@/lib/design';
import { readImageAsDataUrl, type ImageReadError } from '@/lib/imageFile';

/**
 * ช่องใส่ภาพหนึ่งช่อง — ลากมาวาง หรือกดเพื่อเลือกไฟล์
 *
 * เป็นชิ้นส่วนร่วมของทั้งช่องภาพประกอบกิจกรรมและช่องภาพแผนที่
 * ทั้งสองที่ต่างกันแค่จำนวนช่องกับข้อความ ไม่ต่างกันที่พฤติกรรม จึงไม่แยกสองคอมโพเนนต์
 *
 * ค่าที่ส่งออกเป็น data URL ที่ย่อขนาดแล้ว (ดู lib/imageFile.ts) หรือ null เมื่อยังไม่มีภาพ
 * ค่าที่รับเข้ามาอาจเป็นลิงก์ http ธรรมดาได้ด้วย เพราะกิจกรรมเก่าเก็บภาพไว้เป็นลิงก์
 */

/**
 * ข้อความบอกสาเหตุที่ไฟล์ใช้ไม่ได้ — แยกจากตัวอ่านไฟล์ไว้ให้คำแปลอยู่ใกล้ที่ใช้
 *
 * เขียนตัวเลข 5 MB ลงในข้อความตรง ๆ แทนการต่อสตริงจาก MAX_UPLOAD_MB
 * เพราะคีย์ของพจนานุกรมคือข้อความไทยตัวเต็ม ถ้าประกอบขึ้นตอนรันจะหาคำแปลไม่เจอ
 * แก้ MAX_UPLOAD_MB เมื่อไรต้องแก้ข้อความนี้กับคำแปลใน lib/i18n/app-en.json ตามด้วย
 */
const ERROR_TEXT: Record<ImageReadError, string> = {
  type: 'ไฟล์นี้ไม่ใช่รูปภาพ',
  size: 'ไฟล์ใหญ่เกิน 5 MB กรุณาเลือกรูปที่เล็กกว่า',
  decode: 'เปิดไฟล์รูปนี้ไม่ได้ กรุณาลองไฟล์อื่น',
};

export function ImageDropField({
  value,
  onChange,
  title,
  hint,
  height = 168,
  icon = 'add_photo_alternate',
  maxEdge,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  /** ข้อความบนช่องว่าง เช่น "ภาพที่ 1" หรือ "แผนที่สถานที่จัดกิจกรรม" */
  title: string;
  hint?: string;
  height?: number;
  icon?: string;
  /** ด้านยาวสุดหลังย่อ — ส่งมาเมื่อภาพนี้มีงบขนาดต่างจากค่ามาตรฐาน เช่น ภาพหน้าปก */
  maxEdge?: number;
}) {
  const { t } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await readImageAsDataUrl(file, { maxEdge });
    setBusy(false);
    if (!result.ok) {
      setError(t(ERROR_TEXT[result.reason]));
      return;
    }
    setBroken(false);
    onChange(result.dataUrl);
  }

  function pick() {
    inputRef.current?.click();
  }

  function remove() {
    setError(null);
    setBroken(false);
    onChange(null);
    // ไม่ล้างค่าใน input ผู้ใช้จะเลือกไฟล์เดิมซ้ำไม่ได้ เพราะ onChange ไม่ยิงเมื่อค่าไม่เปลี่ยน
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {value && !broken ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(31,41,55,.12)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ภาพที่ผู้จัดเพิ่งเลือก ยังเป็น data URL ในหน่วยความจำ */}
          <img
            src={value}
            alt={title}
            onError={() => setBroken(true)}
            style={{ display: 'block', width: '100%', height, objectFit: 'cover' }}
          />
          {/* ปุ่มแสดงตลอด ไม่ซ่อนไว้ใต้ hover — บนมือถือไม่มี hover ให้ชี้ */}
          <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, display: 'flex', gap: 6 }}>
            <SlotButton icon="upload" label={t('เปลี่ยนรูป')} onClick={pick} />
            <SlotButton icon="close" label={t('ลบรูป')} onClick={remove} danger />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void accept(e.dataTransfer.files?.[0]);
          }}
          style={{
            height,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 12,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'center',
            border: `1.5px dashed ${dragOver ? '#A774F7' : 'rgba(31,41,55,.18)'}`,
            background: dragOver ? 'rgba(167,116,247,.09)' : 'rgba(255,255,255,.45)',
            transition: 'background .15s ease, border-color .15s ease',
          }}
        >
          <Icon
            name={busy ? 'hourglass_top' : icon}
            size={30}
            style={{ color: dragOver ? '#A774F7' : COLOR.hint }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: COLOR.ink }}>
            {busy ? t('กำลังเตรียมรูป…') : title}
          </span>
          <span style={{ fontSize: 11, color: COLOR.hint }}>
            {broken ? t('โหลดรูปเดิมไม่สำเร็จ — เลือกรูปใหม่ได้') : t('ลากรูปมาวาง หรือกดเพื่อเลือกไฟล์')}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          // ล้างค่าไว้เสมอ ไม่งั้นเลือกไฟล์ชื่อเดิมซ้ำแล้วไม่มีอะไรเกิดขึ้น
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      {error ? (
        <span style={{ fontSize: 11.5, color: SEMANTIC.danger.color }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 11, color: COLOR.hint }}>{hint}</span>
      ) : null}
    </div>
  );
}

function SlotButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 30,
        height: 30,
        borderRadius: 9,
        border: 'none',
        cursor: 'pointer',
        color: danger ? SEMANTIC.danger.color : COLOR.ink,
        background: 'rgba(255,255,255,.92)',
        boxShadow: '0 3px 10px rgba(31,41,55,.2)',
      }}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}
