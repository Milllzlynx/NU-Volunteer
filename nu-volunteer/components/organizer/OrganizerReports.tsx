'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CategoryFilter, type CategoryOption } from '@/components/reports/CategoryFilter';
import { ColumnCustomizer, readSavedColumns } from '@/components/reports/ColumnCustomizer';
import { Pagination } from '@/components/reports/Pagination';
import { ReportsCards } from '@/components/reports/ReportsCards';
import { ReportsTable, nextSort, type SortState } from '@/components/reports/ReportsTable';
import { EMPTY_FILTERS, ReportsFilters, type FilterState } from '@/components/reports/ReportsFilters';
import { COLUMNS, DEFAULT_VISIBLE, type ColumnKey } from '@/components/reports/columns';
import { Badge, Button, EmptyState, Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, glass, withAlpha } from '@/lib/design';
import { summarize, type ActivityReportRow } from '@/lib/organizerStats';

/** ตรงกับเบรกพอยต์การ์ดในไฟล์ globals.css — จอแคบกว่านี้ตารางอ่านไม่ไหว ต้องใช้การ์ด */
const NARROW_QUERY = '(max-width: 720px)';

const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
/** ฝั่งเซิร์ฟเวอร์ไม่รู้ความกว้างจอ — เดาเป็นจอกว้างไว้ก่อน แล้ว React จะเรนเดอร์ใหม่หลัง hydrate */
const getNarrowServer = () => false;

/** ต้นเดือนและต้นปีปัจจุบันเป็นคีย์ YYYY-MM-DD ตามเวลาเครื่องผู้ใช้ */
function rangeOf(quick: FilterState['quick']): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (quick === 'month') return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-31` };
  if (quick === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: '', to: '' };
}

/**
 * @param lockedCategory เมื่อส่งมา หน้านี้จะเป็นรายงานของหมวดเดียว
 *
 * ใช้ซ้ำทั้งหน้าแทนที่จะเขียนหน้ารายงานใหม่อีกชุด เพราะตัวกรอง ตาราง มุมมองการ์ด
 * การส่งออก CSV และการพิมพ์ ต้องทำงานเหมือนกันทุกอย่าง ต่างแค่ขอบเขตข้อมูล
 * ถ้าแยกไฟล์กัน วันหนึ่งจะมีคอลัมน์ที่แก้ที่เดียวแล้วอีกหน้าไม่ตาม
 */
export function OrganizerReports({
  rows,
  allCategories,
  lockedCategory,
}: {
  rows: ActivityReportRow[];
  /**
   * หมวดหมู่ทั้งหมดที่เปิดใช้งาน อ่านจากตาราง Category ไม่ใช่จากแถวในรายงาน
   *
   * ต้องส่งมาจากฝั่งเซิร์ฟเวอร์ เพราะแถบหมวดเป็นคำอธิบายสีด้วย ไม่ใช่แค่ปุ่มกรอง
   * ถ้าแสดงเฉพาะหมวดที่บังเอิญมีกิจกรรมอยู่ ผู้จัดที่ยังไม่เคยจัดกิจกรรมสาย
   * "ด้านส่งเสริมวิชาการ" จะไม่เห็นหมวดนั้นเลย ทั้งที่มันมีอยู่จริงในระบบ
   * — ไม่ส่งมาก็ยังทำงานได้ แต่จะกลับไปเดาจากแถวเหมือนเดิม (หน้ารายงานรายหมวดไม่ต้องใช้แถบนี้)
   */
  allCategories?: CategoryOption[];
  lockedCategory?: CategoryOption;
}) {
  const { t, isEn } = useApp();

  const [filters, setFilters] = useState<FilterState>(
    lockedCategory ? { ...EMPTY_FILTERS, category: lockedCategory.id } : EMPTY_FILTERS,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [visible, setVisible] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  /** null = ตามความกว้างจอ, ที่เหลือคือผู้ใช้เลือกเอง */
  const [viewOverride, setViewOverride] = useState<'table' | 'card' | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowServer);
  const view = viewOverride ?? (isNarrow ? 'card' : 'table');

  /* คอลัมน์ที่ผู้ใช้เคยตั้งไว้ อ่านหลัง hydrate เสร็จเพื่อไม่ให้ HTML สองฝั่งต่างกัน */
  useEffect(() => {
    const id = setTimeout(() => {
      const saved = readSavedColumns();
      if (saved?.length) setVisible(saved);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /* กด / เพื่อไปที่ช่องค้นหา — ไม่ไปทับคีย์ลัดของเบราว์เซอร์อย่าง Ctrl+F */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setAdvancedOpen(true);
      // รอให้แผงตัวกรองถูกเรนเดอร์ก่อนค่อยโฟกัส
      setTimeout(() => searchRef.current?.focus(), 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* หมวดที่จะโชว์บนแถบ — ใช้รายการจากฐานข้อมูลก่อนเสมอ เรียงตามลำดับที่แอดมินตั้งไว้แล้ว
     ที่เดาจากแถวเป็นทางสำรองสำหรับผู้เรียกที่ไม่ได้ส่งรายการมา */
  const categories = useMemo(() => {
    if (allCategories?.length) return allCategories;

    const map = new Map<string, CategoryOption>();
    for (const r of rows) {
      if (!map.has(r.categoryId)) {
        map.set(r.categoryId, {
          id: r.categoryId,
          label: r.categoryLabel,
          labelEn: r.categoryLabelEn,
          color: r.categoryColor,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [rows, allCategories]);

  /* กรองทุกอย่าง "ยกเว้น" หมวดหมู่ไว้ก่อน เพื่อเอาไปนับจำนวนต่อหมวดบนแถบด้านบน
     ถ้านับจากชุดที่กรองหมวดแล้ว ทุกหมวดที่ไม่ได้เลือกจะขึ้นเลขศูนย์หมด */
  const beforeCategory = useMemo(() => {
    const quick = rangeOf(filters.quick);
    const from = filters.from || quick.from;
    const to = filters.to || quick.to;
    const q = filters.query.trim().toLowerCase();

    return rows.filter(
      (r) =>
        (!from || r.dayKey >= from) &&
        (!to || r.dayKey <= to) &&
        (!filters.statuses.length || filters.statuses.includes(r.status)) &&
        (!q || r.title.toLowerCase().includes(q) || r.orgName.toLowerCase().includes(q)),
    );
  }, [rows, filters]);

  const categoryCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of beforeCategory) out[r.categoryId] = (out[r.categoryId] ?? 0) + 1;
    return out;
  }, [beforeCategory]);

  const filtered = useMemo(
    () =>
      filters.category ? beforeCategory.filter((r) => r.categoryId === filters.category) : beforeCategory,
    [beforeCategory, filters.category],
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = COLUMNS.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), isEn ? 'en' : 'th') * dir;
    });
  }, [filtered, sort, isEn]);

  const totals = useMemo(() => summarize(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  // หนีบหน้าปัจจุบันตอนเรนเดอร์แทนการ setState ใน effect — ตัวกรองที่แคบลงจะไม่ทำให้ค้างหน้าว่าง
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const paged = sorted.slice(start, start + perPage);

  /** แถวที่คำสั่งส่งออก/พิมพ์จะทำงานด้วย — เลือกไว้ก็ใช้เฉพาะที่เลือก ไม่เลือกก็ใช้ทั้งชุดที่กรองแล้ว */
  const target = selected.size ? sorted.filter((r) => selected.has(r.id)) : sorted;

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = (ids: string[], select: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const exportCsv = () => {
    const cols = COLUMNS.filter((c) => visible.includes(c.key));
    const head = cols.map((c) => c.csvHeader);
    const lines = target.map((r) =>
      cols.map((c) => `"${String(c.csvValue(r)).replace(/"/g, '""')}"`).join(','),
    );
    // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง — ชื่อกิจกรรมเป็นภาษาไทยเกือบทั้งหมด
    const csv = '﻿' + [head.join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuv-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const range = useMemo(() => {
    if (!filtered.length) return '';
    const keys = filtered.map((r) => r.dayKey).sort();
    return `${keys[0]} — ${keys[keys.length - 1]}`;
  }, [filtered]);

  if (!rows.length) {
    // หน้ารายงานรายหมวดต้องมีทางกลับเสมอ ไม่งั้นหมวดที่ยังไม่มีกิจกรรมจะกลายเป็นทางตัน
    return (
      <div style={{ ...glass(22) }}>
        <EmptyState
          icon="summarize"
          title={
            lockedCategory
              ? `${t('ยังไม่มีกิจกรรมในหมวด')} ${isEn && lockedCategory.labelEn ? lockedCategory.labelEn : lockedCategory.label}`
              : t('ยังไม่มีข้อมูลสำหรับออกรายงาน')
          }
          desc={t('รายงานจะสรุปจากกิจกรรมที่คุณดูแลและผู้เข้าร่วมของแต่ละกิจกรรม')}
          action={
            <Link href={lockedCategory ? '/organizer/reports' : '/organizer/activities/new'}>
              <Button variant="primary" icon={lockedCategory ? 'arrow_back' : 'add'}>
                {lockedCategory ? t('รายงานทุกหมวด') : t('สร้างกิจกรรม')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="nuv-print-root" style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      {lockedCategory ? (
        /* หัวหน้าเพจของรายงานรายหมวด — สีมาจาก category.color ในฐานข้อมูล ไม่ได้ฝังไว้ในโค้ด */
        <div
          className="nuv-no-print"
          style={{
            ...glass(20),
            padding: 18,
            borderTop: `4px solid ${lockedCategory.color}`,
            background: `linear-gradient(135deg, ${withAlpha(lockedCategory.color, '1f')}, rgba(255,255,255,.72))`,
          }}
        >
          <Link
            href="/organizer/reports"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: COLOR.label }}
          >
            <Icon name="arrow_back" size={16} />
            {t('รายงานทุกหมวด')}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <span
              aria-hidden="true"
              style={{ width: 14, height: 14, borderRadius: 999, background: lockedCategory.color, flexShrink: 0 }}
            />
            <h1 style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5, margin: 0 }}>
              {`${t('รายงาน')} · ${isEn && lockedCategory.labelEn ? lockedCategory.labelEn : lockedCategory.label}`}
            </h1>
          </div>
          <div style={{ fontSize: 13, color: COLOR.label, marginTop: 6 }}>
            {t('สรุปเฉพาะกิจกรรมในหมวดนี้ ส่งออกและพิมพ์ได้เหมือนรายงานปกติ')}
          </div>
        </div>
      ) : (
        <div className="nuv-no-print">
          <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>{t('รายงาน')}</div>
          <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
            {t('สรุปรายกิจกรรมสำหรับส่งต่อหรือเก็บเป็นหลักฐาน')}
          </div>
        </div>
      )}

      {/* หัวกระดาษ — เห็นเฉพาะตอนพิมพ์ */}
      <div className="nuv-print-only" style={{ display: 'none' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{t('รายงานสรุปกิจกรรม')}</h1>
        <div style={{ fontSize: 13, marginTop: 4 }}>NU Volunteer{range ? ` · ${range}` : ''}</div>
      </div>

      <ReportsFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
        searchRef={searchRef}
        resultCount={filtered.length}
        t={t}
      />

      {/* หน้ารายงานรายหมวดไม่ต้องมีแถบเลือกหมวด — ขอบเขตถูกกำหนดมาจาก URL แล้ว */}
      {lockedCategory ? null : (
        <CategoryFilter
          categories={categories}
          value={filters.category}
          onChange={(category) => {
            setFilters({ ...filters, category });
            setPage(1);
          }}
          counts={categoryCounts}
          isEn={isEn}
          t={t}
        />
      )}

      {/* เลือกหมวดไว้แล้ว = มีโอกาสอยากได้รายงานเฉพาะหมวดนั้นไปส่งต่อ ให้ทางลัดไปหน้าของมันเลย */}
      {!lockedCategory && filters.category ? (
        <Link
          className="nuv-no-print"
          href={`/organizer/reports/category/${filters.category}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#7C2FD9' }}
        >
          <Icon name="open_in_new" size={16} />
          {t('เปิดเป็นรายงานเฉพาะหมวดนี้')}
        </Link>
      ) : null}

      {/* ── ตัวเลขสรุป ── */}
      <div style={{ ...glass(20), padding: 16, display: 'flex', flexWrap: 'wrap', gap: 22 }}>
        {[
          { label: 'กิจกรรม', value: String(totals.activities) },
          { label: 'ใบลงทะเบียน', value: String(totals.registered) },
          { label: 'เช็กอินจริง', value: String(totals.attended) },
          { label: 'รับรองแล้ว', value: String(totals.completed) },
          { label: 'ชั่วโมงที่รับรอง', value: String(totals.hoursAwarded) },
          { label: 'คะแนนเฉลี่ย', value: totals.ratingAvg != null ? String(totals.ratingAvg) : '—' },
        ].map((s) => (
          <div key={s.label} style={{ minWidth: 110 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.ink, lineHeight: 1.3 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: COLOR.label }}>{t(s.label)}</div>
          </div>
        ))}
      </div>

      {/* ── แถบเครื่องมือ ──
          glass() ตั้ง backdrop-filter ไว้ ซึ่งสร้าง stacking context ใหม่ทุกครั้ง
          แผงปรับแต่งคอลัมน์ที่ลอยอยู่ข้างในจึงยกตัวเองข้ามการ์ดใบถัดไปไม่ได้
          ไม่ว่าจะตั้ง z-index สูงแค่ไหน — ต้องยกทั้งการ์ดขึ้นมาแทน */}
      <div
        className="nuv-no-print"
        style={{
          ...glass(20),
          padding: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant={view === 'table' ? 'primary' : 'secondary'}
            icon="table_rows"
            onClick={() => setViewOverride('table')}
          >
            {t('ตาราง')}
          </Button>
          <Button
            variant={view === 'card' ? 'primary' : 'secondary'}
            icon="grid_view"
            onClick={() => setViewOverride('card')}
          >
            {t('การ์ด')}
          </Button>
        </div>

        {view === 'table' ? <ColumnCustomizer visible={visible} onChange={setVisible} t={t} /> : null}

        <div style={{ marginInlineStart: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {selected.size ? (
            <>
              <Badge tone="purple" label={`${t('เลือกไว้')} ${selected.size}`} />
              <Button variant="secondary" icon="deselect" onClick={() => setSelected(new Set())}>
                {t('ล้างที่เลือก')}
              </Button>
            </>
          ) : null}
          <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!target.length}>
            {selected.size ? `${t('ส่งออก CSV')} (${selected.size})` : t('ส่งออก CSV')}
          </Button>
          <Button variant="secondary" icon="print" onClick={() => window.print()} disabled={!filtered.length}>
            {t('พิมพ์ / บันทึก PDF')}
          </Button>
        </div>
      </div>

      {selected.size ? (
        <div className="nuv-no-print" style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, color: COLOR.hint }}>
          <Icon name="info" size={16} />
          {t('การส่งออกจะใช้เฉพาะแถวที่เลือกไว้ ส่วนการพิมพ์ยังใช้ทุกแถวที่ผ่านตัวกรอง')}
        </div>
      ) : null}

      {/* ── ตาราง / การ์ด ── */}
      {!filtered.length ? (
        <div style={{ ...glass(22) }}>
          <EmptyState
            icon="filter_alt_off"
            title={t('ไม่มีกิจกรรมที่ตรงกับตัวกรอง')}
            desc={t('ลองขยายช่วงวันหรือเลือกสถานะอื่น')}
          />
        </div>
      ) : (
        <div style={{ ...glass(22), padding: 18, display: 'grid', gap: 14 }}>
          {view === 'table' ? (
            <ReportsTable
              rows={paged}
              visible={visible}
              sort={sort}
              onSort={(key) => {
                setSort((cur) => nextSort(cur, key));
                setPage(1);
              }}
              selected={selected}
              onToggleRow={toggleRow}
              onTogglePage={togglePage}
              totals={totals}
              isEn={isEn}
              t={t}
            />
          ) : (
            <ReportsCards
              rows={paged}
              visible={visible}
              selected={selected}
              onToggleRow={toggleRow}
              isEn={isEn}
              t={t}
            />
          )}

          <Pagination
            page={safePage}
            totalPages={totalPages}
            perPage={perPage}
            onPage={setPage}
            onPerPage={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            rangeFrom={start + 1}
            rangeTo={Math.min(start + perPage, sorted.length)}
            total={sorted.length}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
