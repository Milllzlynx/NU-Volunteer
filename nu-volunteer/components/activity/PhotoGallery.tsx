'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { COLOR, solidGlass } from '@/lib/design';

/**
 * แกลเลอรีภาพประกอบกิจกรรม — เลื่อนทีละภาพ พร้อมจุดนำทางและมุมมองขยาย
 *
 * ใช้การเลื่อนแบบทีละภาพแทนการเรียงกริดทั้งหมด เพราะภาพประกอบมักมีหลายใบ
 * และการเรียงกริดทำให้ส่วนที่อยู่ถัดลงไป (สิ่งที่ต้องเตรียม แผนที่) ถูกดันหายไปจากจอ
 */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const { t } = useApp();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = photos.length;
  const go = (next: number) => setIndex(((next % count) + count) % count);

  /* ปิดมุมมองขยายด้วย Esc และเลื่อนภาพด้วยปุ่มลูกศร */
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, count]);

  if (!count) return null;

  return (
    <>
      <div style={{ display: 'grid', gap: 10 }}>
        {/* ภาพหลัก */}
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'rgba(31,41,55,.06)' }}>
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label={`${t('ขยายภาพ')} ${index + 1}/${count}`}
            style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก */}
            <img
              src={photos[index]}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
            />
          </button>

          {count > 1 ? (
            <>
              <ArrowButton side="start" label={t('ภาพก่อนหน้า')} onClick={() => go(index - 1)} />
              <ArrowButton side="end" label={t('ภาพถัดไป')} onClick={() => go(index + 1)} />
              {/* ตัวนับกำกับไว้ด้วย เผื่อจุดเล็กเกินกว่าจะนับด้วยตา */}
              <span
                className="nuv-keep"
                style={{
                  position: 'absolute',
                  top: 10,
                  insetInlineEnd: 10,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(20,16,28,.62)',
                  color: '#fff',
                  fontSize: 11.5,
                }}
              >
                {`${index + 1}/${count}`}
              </span>
            </>
          ) : null}
        </div>

        {/* จุดนำทาง */}
        {count > 1 ? (
          <div role="tablist" aria-label={t('เลือกภาพ')} style={{ display: 'flex', justifyContent: 'center', gap: 7 }}>
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${t('ภาพที่')} ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  padding: 0,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === index ? '#A774F7' : 'rgba(31,41,55,.22)',
                  transition: 'width 220ms ease, background 220ms ease',
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* มุมมองขยาย */}
      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(16,12,22,.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...solidGlass(20), padding: 12, maxWidth: 'min(1000px,100%)', display: 'grid', gap: 10 }}>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'rgba(31,41,55,.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก */}
              <img
                src={photos[index]}
                alt=""
                style={{ width: '100%', maxHeight: '74vh', objectFit: 'contain', display: 'block' }}
              />
              {count > 1 ? (
                <>
                  <ArrowButton side="start" label={t('ภาพก่อนหน้า')} onClick={() => go(index - 1)} />
                  <ArrowButton side="end" label={t('ภาพถัดไป')} onClick={() => go(index + 1)} />
                </>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: COLOR.label }}>{`${index + 1}/${count}`}</span>
              <button
                type="button"
                onClick={() => setLightbox(false)}
                style={{
                  marginInlineStart: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 11,
                  border: '1px solid rgba(31,41,55,.12)',
                  background: 'rgba(255,255,255,.7)',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  color: COLOR.body,
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={17} />
                {t('ปิด')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ArrowButton({ side, label, onClick }: { side: 'start' | 'end'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: 10,
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,.92)',
        color: COLOR.ink,
        boxShadow: '0 4px 14px rgba(31,41,55,.24)',
        cursor: 'pointer',
      }}
    >
      <Icon name={side === 'start' ? 'chevron_left' : 'chevron_right'} size={22} />
    </button>
  );
}
