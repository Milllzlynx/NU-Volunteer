'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, Icon, Timestamp, inputStyle } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { COLOR, SEMANTIC, glass } from '@/lib/design';

/**
 * หน้าเลือกกิจกรรมก่อนดูรายชื่อผู้เข้าร่วม
 *
 * จัดเป็นการ์ดต่อกิจกรรมแทนรายการใบลงทะเบียนยาว ๆ เพราะงานจริงของผู้จัดคือ
 * "กิจกรรมนี้มีใครรออนุมัติบ้าง" ไม่ใช่ "ใบไหนค้างอยู่บ้างทั้งระบบ"
 * ตัวเลขที่รออนุมัติจึงเป็นสิ่งที่เด่นที่สุดบนการ์ด
 */

export type ParticipantActivityCard = {
  id: string;
  title: string;
  photo: string | null;
  categoryColor: string;
  startAtMs: number;
  total: number;
  pending: number;
  approved: number;
  seatsTotal: number;
  /** ชื่อผู้เข้าร่วมทั้งหมด ใช้ให้ช่องค้นหาหาคนแล้วเจอกิจกรรมที่เขาอยู่ */
  names: string;
};

export function OrganizerParticipantActivities({ rows }: { rows: ParticipantActivityCard[] }) {
  const { t } = useApp();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.names.includes(q));
  }, [rows, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('เลือกกิจกรรมที่ต้องการดูรายชื่อ')}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: COLOR.label, lineHeight: 1.8 }}>
          {t('เลือกกิจกรรมเพื่อดูรายชื่อผู้เข้าร่วม อนุมัติการลงทะเบียน และส่งออกรายชื่อ')}
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <Icon
          name="search"
          size={18}
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLOR.hint,
            pointerEvents: 'none',
          }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ค้นหากิจกรรม หรือชื่อผู้เข้าร่วม...')}
          aria-label={t('ค้นหากิจกรรมหรือผู้เข้าร่วม')}
          style={{ ...inputStyle(), paddingLeft: 42 }}
        />
      </div>

      {visible.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="groups"
            title={query ? t('ไม่พบกิจกรรมที่ตรงกับคำค้น') : t('ยังไม่มีกิจกรรม')}
            desc={
              query
                ? t('ลองค้นด้วยชื่อกิจกรรมหรือชื่อนิสิตอีกครั้ง')
                : t('สร้างกิจกรรมก่อน แล้วรายชื่อผู้ลงทะเบียนจะมาแสดงที่นี่')
            }
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
            gap: 16,
          }}
        >
          {visible.map((r) => (
            <Link
              key={r.id}
              href={`/organizer/registrations/${r.id}`}
              className="nuv-card"
              style={{
                ...glass(20),
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                color: 'inherit',
              }}
            >
              {r.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
                <img
                  src={r.photo}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    height: 130,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(140deg, ${r.categoryColor}33, ${r.categoryColor}14)`,
                    color: r.categoryColor,
                  }}
                >
                  <Icon name="groups" size={38} fill />
                </div>
              )}

              <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
                  {r.title}
                </div>

                <Timestamp date={r.startAtMs} variant="date" showIcon style={{ fontSize: 12 }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: COLOR.label }}>
                  <Icon name="groups" size={15} style={{ color: COLOR.hint }} />
                  {r.seatsTotal > 0
                    ? `${t('ผู้เข้าร่วม')} ${r.total}/${r.seatsTotal} ${t('คน')}`
                    : `${t('ผู้เข้าร่วม')} ${r.total} ${t('คน')}`}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 'auto',
                    paddingTop: 6,
                  }}
                >
                  {r.pending > 0 ? (
                    <Badge tone="warning" icon="hourglass_top" label={`${t('รออนุมัติ')} ${r.pending}`} />
                  ) : r.total > 0 ? (
                    <Badge tone="success" icon="check_circle" label={t('อนุมัติครบแล้ว')} />
                  ) : (
                    <span style={{ fontSize: 12, color: COLOR.hint }}>{t('ยังไม่มีผู้ลงทะเบียน')}</span>
                  )}
                  <Icon
                    name="arrow_forward"
                    size={20}
                    style={{ marginInlineStart: 'auto', color: SEMANTIC.purple.dot, flexShrink: 0 }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
