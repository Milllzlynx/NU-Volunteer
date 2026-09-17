'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { ACTIVITY_STATUS_META } from '@/components/organizer/OrganizerActivities';
import { errorMessage, organizerApi } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';
import type { DeletedActivityRow } from '@/lib/organizer';

/**
 * แท็บ "ลบแล้ว" — ใช้ทั้งหน้าผู้จัดและหน้าแอดมิน
 *
 * การ์ดบอกสถานะที่จะได้หลังกู้คืนไว้ก่อนกด เพราะกิจกรรมที่ยังไม่จบจะกลับมาเป็นฉบับร่าง
 * ไม่ใช่สถานะเดิม (ดู restoredStatus ใน lib/organizer.ts) กู้คืนไม่ทำลายอะไร จึงไม่มีกล่องยืนยัน
 */
export function DeletedActivities({
  rows,
  showOrganizer = false,
  onRestored,
}: {
  rows: DeletedActivityRow[];
  /** แอดมินเห็นกิจกรรมของทุกคน จึงต้องบอกว่าเป็นของผู้จัดคนไหน */
  showOrganizer?: boolean;
  onRestored: (message: string) => void;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(row: DeletedActivityRow) {
    setBusy(row.id);
    setError(null);
    try {
      const res = await organizerApi.restoreActivity(row.id);
      const statusLabel = t(ACTIVITY_STATUS_META[res.status]?.label ?? res.status);
      onRestored(
        [
          `${t('กู้คืนกิจกรรมแล้ว')}: ${row.title}`,
          `${t('สถานะ')} ${statusLabel}`,
          res.affectedStudents > 0
            ? t('แจ้งเตือนนิสิต {n} คนแล้ว').replace('{n}', String(res.affectedStudents))
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
      );
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div style={{ ...glass(20) }}>
        <EmptyState
          icon="delete_sweep"
          title={t('ไม่มีกิจกรรมที่ถูกลบ')}
          desc={t('กิจกรรมที่ลบจะมาอยู่ที่นี่ และกู้คืนกลับได้ทุกเมื่อ')}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <div style={{ fontSize: 12.5, color: COLOR.label, lineHeight: 1.7 }}>
        {t('กิจกรรมที่ลบแล้วไม่แสดงในหน้าใด ๆ แต่ชั่วโมงและใบประกาศของนิสิตยังอยู่ครบ กิจกรรมที่ยังไม่จบจะกลับมาเป็นฉบับร่างให้ตรวจก่อนเผยแพร่อีกครั้ง')}
      </div>

      {rows.map((r) => {
        const meta = ACTIVITY_STATUS_META[r.status] ?? ACTIVITY_STATUS_META.draft;
        const after = ACTIVITY_STATUS_META[r.restoreStatus] ?? ACTIVITY_STATUS_META.draft;
        return (
          <div key={r.id} style={{ ...glass(20), padding: 16, display: 'grid', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: r.categoryColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4 }}>
                  {isEn && r.categoryLabelEn ? r.categoryLabelEn : r.categoryLabel}
                  {showOrganizer ? ` · ${r.organizerName}` : ''}
                </div>
              </div>
              <Badge tone={meta.tone} icon={meta.icon} label={t(meta.label)} />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: COLOR.label }}>
              <Stat icon="event" value={`${isEn ? r.dateEn : r.dateTh} · ${r.time}`} />
              <Stat icon="delete" value={`${t('ลบเมื่อ')} ${isEn ? r.deletedEn : r.deletedTh}`} />
              <Stat icon="groups" value={`${r.students} ${t('คน')}`} />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 2 }}>
              <Button
                variant="primary"
                icon="restore_from_trash"
                loading={busy === r.id}
                disabled={busy !== null && busy !== r.id}
                onClick={() => restore(r)}
                style={{ padding: '8px 14px', fontSize: 12.5, borderRadius: 11 }}
              >
                {t('กู้คืน')}
              </Button>
              <span style={{ fontSize: 12, color: COLOR.hint }}>
                {`${t('กู้คืนแล้วจะเป็น')} ${t(after.label)}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ icon, value }: { icon: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={15} style={{ color: COLOR.hint }} />
      {value}
    </span>
  );
}
