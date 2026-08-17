import { Shell } from '@/components/layout/Shell';

/**
 * โครงร่างระหว่างรอข้อมูลของหน้ารายละเอียดกิจกรรม
 *
 * วางบล็อกให้สูงใกล้เคียงหน้าจริง เพื่อไม่ให้เนื้อหากระโดดตอนข้อมูลมาถึง
 * ใช้ Shell เปล่าเพราะตอนนี้ยังไม่รู้ว่าผู้เปิดเข้าสู่ระบบแล้วหรือไม่
 */
export default function Loading() {
  return (
    <Shell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 18px 56px', display: 'grid', gap: 16 }}>
        <div className="nuv-sk" style={{ height: 38, width: 130, borderRadius: 13 }} />
        <div className="nuv-sk nuv-detail-hero" style={{ height: 420, borderRadius: 22 }} />

        <div
          className="nuv-detail-grid"
          style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: 16, alignItems: 'start' }}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            {[190, 150, 210].map((h, i) => (
              <div key={i} className="nuv-sk" style={{ height: h, borderRadius: 20 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {[150, 240, 170].map((h, i) => (
              <div key={i} className="nuv-sk" style={{ height: h, borderRadius: 20 }} />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
