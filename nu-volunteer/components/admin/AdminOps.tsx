'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, SuccessNote, Timestamp } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { adminOpsApi, errorMessage } from '@/lib/api';
import { COLOR, SEMANTIC, glass, type SemanticTone } from '@/lib/design';

/**
 * การเชื่อมต่อระบบ — สถานะจริงของบริการที่อยู่รอบ ๆ แอป
 *
 * ทุกตัวเลขบนหน้านี้อ่านจากตารางจริง (EmailLog, Backup, Session) ไม่ใช่ค่าที่เขียนตายไว้
 * หน้านี้จึงมีค่าตอนระบบมีปัญหา ไม่ใช่แค่ตอนทุกอย่างปกติ — ถ้าอีเมลส่งไม่ออก
 * ต้องเห็นที่นี่ก่อนจะมีคนมาแจ้ง
 */

export type EmailLogRow = {
  id: string;
  event: string;
  to: string;
  subject: string;
  status: string;
  attempts: number;
  error: string | null;
  atMs: number;
};

export type BackupRow = {
  id: string;
  trigger: string;
  status: string;
  sizeMb: number;
  atMs: number;
};

export type OpsData = {
  /** ค่าจาก MAIL_TRANSPORT — console = เขียนลง log ของเซิร์ฟเวอร์ ไม่ได้ส่งออกจริง */
  transport: string;
  mailFrom: string;
  emailCounts: { sent: number; failed: number; pending: number; total: number };
  recentEmails: EmailLogRow[];
  backups: BackupRow[];
  sessions: { active: number; users: number; expiringSoon: number };
};

const EMAIL_STATUS: Record<string, { label: string; tone: SemanticTone }> = {
  sent: { label: 'ส่งสำเร็จ', tone: 'success' },
  sending: { label: 'กำลังส่ง', tone: 'info' },
  retrying: { label: 'กำลังลองใหม่', tone: 'warning' },
  failed: { label: 'ล้มเหลว', tone: 'danger' },
};

export function AdminOps({ data }: { data: OpsData }) {
  const { t } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  /** console = อีเมลถูกเขียนลง log ของเซิร์ฟเวอร์เท่านั้น ต้องบอกให้ชัด ไม่งั้นเข้าใจว่าส่งจริง */
  const liveMail = data.transport !== 'console';

  async function sendTest() {
    setBusy(true);
    setError(null);
    setSent(null);
    try {
      const r = await adminOpsApi.sendTestEmail();
      setSent(r.to);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
          {t('การเชื่อมต่อระบบ')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3, lineHeight: 1.7 }}>
          {t('สถานะจริงของบริการอีเมล การสำรองข้อมูล และเซสชันผู้ใช้ — ทุกรายการดึงจากผลการเรียก API ไม่ใช่ค่าคงที่')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {sent ? <SuccessNote>{`${t('ส่งอีเมลทดสอบแล้ว')} · ${sent}`}</SuccessNote> : null}

      {/* ── บริการอีเมล ── */}
      <Panel icon="mail" title={t('บริการอีเมล')}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge tone={liveMail ? 'success' : 'warning'} label={liveMail ? t('เปิดใช้งาน') : t('โหมดทดสอบ')} />
          <span style={{ fontSize: 12.5, color: COLOR.body }}>
            {liveMail
              ? `${t('ช่องทางส่ง')}: ${data.transport}`
              : t('MAIL_TRANSPORT=console — อีเมลถูกเขียนลง log ของเซิร์ฟเวอร์เท่านั้น ยังไม่ได้ส่งออกจริง')}
          </span>
          <Button
            variant="secondary"
            icon="outgoing_mail"
            loading={busy}
            onClick={sendTest}
            style={{ marginInlineStart: 'auto', padding: '8px 14px', fontSize: 12.5 }}
          >
            {t('ส่งอีเมลทดสอบ')}
          </Button>
        </div>

        <div style={{ fontSize: 11.5, color: COLOR.hint, lineHeight: 1.7 }}>
          {`${t('ผู้ส่ง')}: ${data.mailFrom}`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
          <Stat label={t('ส่งสำเร็จ')} value={data.emailCounts.sent} color="#63D2A1" />
          <Stat label={t('ล้มเหลว')} value={data.emailCounts.failed} color="#E4572E" />
          <Stat label={t('กำลังส่ง')} value={data.emailCounts.pending} color="#7AB8FF" />
          <Stat label={t('ทั้งหมด')} value={data.emailCounts.total} color="#A774F7" />
        </div>
      </Panel>

      {/* ── บันทึกการส่งอีเมล ── */}
      <Panel icon="receipt_long" title={t('บันทึกการส่งอีเมล')}>
        {data.recentEmails.length === 0 ? (
          <EmptyState
            icon="mark_email_unread"
            title={t('ยังไม่มีอีเมลที่ส่งออก')}
            desc={t('ยังไม่มีอีเมลที่ส่งออก · เหตุการณ์ในระบบจะสร้างรายการที่นี่')}
          />
        ) : (
          <div style={{ display: 'grid', gap: 7 }}>
            {data.recentEmails.map((m) => {
              const meta = EMAIL_STATUS[m.status] ?? EMAIL_STATUS.sending;
              return (
                <div
                  key={m.id}
                  className="nuv-row"
                  style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '10px 12px', borderRadius: 13 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: COLOR.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.subject}
                    </div>
                    <div style={{ fontSize: 11, color: COLOR.hint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.to}
                      {' · '}
                      {m.event}
                      {m.attempts > 1 ? ` · ${t('พยายาม ')}${m.attempts}${t(' ครั้ง')}` : ''}
                    </div>
                    {m.error ? (
                      <div style={{ fontSize: 11, color: SEMANTIC.danger.color, marginTop: 2, wordBreak: 'break-word' }}>
                        {m.error}
                      </div>
                    ) : null}
                  </div>
                  <Timestamp date={m.atMs} variant="relative" style={{ fontSize: 11, color: COLOR.hint, flexShrink: 0 }} />
                  <Badge tone={meta.tone} label={t(meta.label)} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── การสำรองข้อมูล ── */}
      <Panel icon="backup" title={t('การสำรองข้อมูล')}>
        {data.backups.length === 0 ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={19} style={{ color: SEMANTIC.warning.color, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.8 }}>
              {t('ยังไม่เคยสำรอง')}
              {' — '}
              {t('ยังไม่ได้ตั้งค่างานสำรองข้อมูลในระบบนี้ ตารางบันทึกพร้อมแล้วแต่ยังไม่มีตัวสั่งงาน')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 7 }}>
            {data.backups.map((b) => (
              <div
                key={b.id}
                className="nuv-row"
                style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '10px 12px', borderRadius: 13 }}
              >
                <Icon
                  name={b.status === 'success' ? 'check_circle' : 'error'}
                  size={18}
                  style={{ color: b.status === 'success' ? SEMANTIC.success.dot : SEMANTIC.danger.color }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: COLOR.ink }}>
                    {b.trigger === 'scheduled' ? t('ตามรอบ') : t('สั่งเอง')}
                    {' · '}
                    {`${b.sizeMb.toFixed(1)} MB`}
                  </div>
                </div>
                <Timestamp date={b.atMs} variant="full" style={{ fontSize: 11, color: COLOR.hint }} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── เซสชัน ── */}
      <Panel icon="devices" title={t('เซสชันและความปลอดภัย')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
          <Stat label={t('เซสชันที่ยังใช้งานอยู่')} value={data.sessions.active} color="#A774F7" />
          <Stat label={t('ผู้ใช้ที่ยังล็อกอินอยู่')} value={data.sessions.users} color="#7AB8FF" />
          <Stat label={t('หมดอายุใน 7 วัน')} value={data.sessions.expiringSoon} color="#F5A623" />
        </div>
        <div style={{ fontSize: 11.5, color: COLOR.hint, lineHeight: 1.7 }}>
          {t('ปิดเซสชันของบัญชีอื่นทำได้จากหน้าจัดการผู้ใช้งาน ส่วนอุปกรณ์ของคุณเองอยู่ในหน้าตั้งค่า')}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name={icon} size={19} style={{ color: COLOR.hint }} />
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: `${color}14`, display: 'grid', gap: 3 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: COLOR.ink }}>{value}</span>
      <span style={{ fontSize: 11.5, color: COLOR.label }}>{label}</span>
    </div>
  );
}
