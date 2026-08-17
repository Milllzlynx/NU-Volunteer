'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { searchApi, type SearchHitActivity } from '@/lib/api';
import { COLOR, solidGlass } from '@/lib/design';

/** รอให้พิมพ์หยุดก่อนค่อยยิงคำค้น — ไม่อย่างนั้นจะยิงทุกตัวอักษร */
const DEBOUNCE_MS = 260;
const MAX_HITS = 6;
/** ต่ำกว่านี้ผลลัพธ์กว้างเกินจนไม่ช่วยอะไร */
const MIN_CHARS = 2;

/**
 * ช่องค้นหาบนแถบหัวเรื่อง — ค้นกิจกรรมจากทุกหน้าโดยไม่ต้องกลับไปหน้าค้นหา
 * ใช้ /api/v1/search ตัวเดียวกับที่หน้าอื่นใช้ จึงได้ผลลัพธ์และสิทธิ์การเห็นข้อมูลตรงกัน
 *
 * variant='bar'    — อยู่กลางแถบหัวเรื่อง เห็นบนจอกว้าง
 * variant='mobile' — แถวของตัวเองใต้แถบควบคุม เห็นเฉพาะจอแคบที่แถบหลักไม่พอใส่
 * ทั้งสองแบบเรนเดอร์พร้อมกันแล้วให้ CSS เลือกว่าจะโชว์อันไหน — ตัวที่ถูกซ่อนยังไม่มีคำค้น
 * จึงไม่ยิงคำขอใด ๆ ออกไป (useEffect ด้านล่างออกก่อนถึง fetch เมื่อคำค้นสั้นกว่า MIN_CHARS)
 */
export function HeaderSearch({ variant = 'bar' }: { variant?: 'bar' | 'mobile' }) {
  const { t, isEn } = useApp();
  const listId = useId();

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHitActivity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const term = q.trim();
  /* คำค้นสั้นเกินไปถือว่าไม่มีผล — คำนวณตอนเรนเดอร์ ไม่เก็บเป็น state ซ้อน */
  const visible = term.length >= MIN_CHARS ? hits : [];

  useEffect(() => {
    if (term.length < MIN_CHARS) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.query({ q: term, scope: 'activities' }, controller.signal);
        setHits(res.activities.slice(0, MAX_HITS));
      } catch {
        // ยกเลิกคำขอเดิมหรือเครือข่ายสะดุด — ปล่อยผลเดิมไว้ ไม่ต้องขึ้น error บนแถบหัวเรื่อง
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  /* ปิดผลลัพธ์เมื่อคลิกนอกกล่อง */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const showPanel = open && term.length >= MIN_CHARS;

  return (
    <div
      ref={boxRef}
      className={variant === 'mobile' ? 'nuv-header-search-mobile' : 'nuv-header-search'}
      style={
        variant === 'mobile'
          ? { position: 'relative', width: '100%', flexBasis: '100%' }
          : { position: 'relative', flex: 1, minWidth: 0, maxWidth: 420 }
      }
    >
      <Icon
        name="search"
        size={19}
        style={{
          position: 'absolute',
          insetInlineStart: 13,
          top: '50%',
          transform: 'translateY(-50%)',
          color: COLOR.hint,
          pointerEvents: 'none',
        }}
      />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={t('ค้นหากิจกรรม, หมวดหมู่')}
        aria-label={t('ค้นหากิจกรรม, หมวดหมู่')}
        style={{
          width: '100%',
          padding: '10px 14px 10px 40px',
          borderRadius: 13,
          border: '1px solid rgba(31,41,55,.1)',
          background: 'rgba(255,255,255,.7)',
          fontFamily: 'inherit',
          fontSize: 13.5,
          color: COLOR.ink,
          outlineOffset: 2,
        }}
      />

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          style={{ ...solidGlass(16), position: 'absolute', top: 46, insetInline: 0, padding: 8, zIndex: 40, maxHeight: 340, overflowY: 'auto' }}
        >
          {loading && !visible.length ? (
            <div style={{ padding: '12px 10px', fontSize: 12.5, color: COLOR.hint }}>{t('กำลังค้นหา')}</div>
          ) : !visible.length ? (
            <div style={{ padding: '12px 10px', fontSize: 12.5, color: COLOR.hint }}>
              {t('ไม่พบกิจกรรมที่ตรงกับการค้นหา')}
            </div>
          ) : (
            visible.map((hit) => (
              <Link
                key={hit.id}
                href={`/activities/${hit.id}`}
                role="option"
                aria-selected={false}
                onClick={() => setOpen(false)}
                style={{ display: 'flex', gap: 10, padding: '9px 10px', borderRadius: 11, alignItems: 'flex-start', color: 'inherit' }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: hit.category.color, flexShrink: 0, marginTop: 6 }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLOR.ink, lineHeight: 1.5 }}>
                    {hit.title}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint, marginTop: 2 }}>
                    {`${isEn ? hit.dateEn : hit.dateTh} · ${isEn && hit.category.labelEn ? hit.category.labelEn : hit.category.label}`}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
