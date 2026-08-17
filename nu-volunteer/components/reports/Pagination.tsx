'use client';

import { IconButton, inputStyle } from '@/components/ui';
import { COLOR } from '@/lib/design';
import { pageList } from '@/lib/pagination';

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  page,
  totalPages,
  perPage,
  onPage,
  onPerPage,
  rangeFrom,
  rangeTo,
  total,
  t,
}: {
  page: number;
  totalPages: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  rangeFrom: number;
  rangeTo: number;
  total: number;
  t: (s: string) => string;
}) {
  return (
    <div
      className="nuv-no-print"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', paddingTop: 4 }}
    >
      <span style={{ fontSize: 12.5, color: COLOR.body }}>
        {`${t('แสดง')} ${rangeFrom}–${rangeTo} ${t('จาก')} ${total} ${t('รายการ')}`}
      </span>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: COLOR.label }}>
        {t('ต่อหน้า')}
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          style={{ ...inputStyle(false), width: 'auto', padding: '7px 10px', fontSize: 12.5 }}
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {totalPages > 1 ? (
        <nav
          aria-label={t('การแบ่งหน้า')}
          style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <IconButton
            icon="chevron_left"
            label={t('หน้าก่อนหน้า')}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          />

          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} style={{ padding: '0 4px', fontSize: 12, color: COLOR.hint }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
                style={{
                  minWidth: 34,
                  height: 34,
                  borderRadius: 11,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: `1px solid ${p === page ? 'rgba(167,116,247,.5)' : 'rgba(31,41,55,.12)'}`,
                  background: p === page ? 'rgba(167,116,247,.16)' : 'rgba(255,255,255,.6)',
                  color: COLOR.ink,
                  fontWeight: p === page ? 600 : 400,
                }}
              >
                {p}
              </button>
            ),
          )}

          <IconButton
            icon="chevron_right"
            label={t('หน้าถัดไป')}
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          />
        </nav>
      ) : null}
    </div>
  );
}
