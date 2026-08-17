'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, ErrorNote, Icon, IconButton, Skeleton, Tabs, Timestamp, inputStyle } from '@/components/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useApp } from '@/components/providers/AppProviders';
import { adminContactApi, errorMessage, type AdminContactRow } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

/**
 * กล่องข้อความถึงผู้ดูแลระบบ
 *
 * รายการอยู่ซ้าย เนื้อหาอยู่ขวา — รูปแบบเดียวกับกล่องอีเมลทั่วไป เพราะงานจริงคือ
 * กวาดสายตาดูว่ามีอะไรเข้ามา แล้วเปิดอ่านทีละฉบับ ไม่ใช่อ่านทุกฉบับเรียงกันลงมา
 *
 * ตาราง ContactMessage ไม่มีที่เก็บคำตอบ การตอบกลับจึงเปิดโปรแกรมอีเมลของผู้ดูแลเอง
 * ผ่าน mailto: แทนที่จะทำกล่องพิมพ์ตอบที่ส่งแล้วไม่มีใครเห็นว่าเคยตอบไปหรือยัง
 */

export function AdminContact() {
  const { t } = useApp();
  const router = useRouter();

  const [rows, setRows] = useState<AdminContactRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminContactRow | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    adminContactApi
      .list(ac.signal)
      .then((r) => setRows(r.messages))
      .catch((e) => {
        if (!ac.signal.aborted) setError(errorMessage(e));
      });
    return () => ac.abort();
  }, []);

  const unread = useMemo(() => (rows ?? []).filter((m) => !m.read).length, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((m) => {
      if (tab === 'unread' && m.read) return false;
      if (!q) return true;
      return (
        m.fromName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.text.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query]);

  const open = useMemo(() => (rows ?? []).find((m) => m.id === openId) ?? null, [rows, openId]);

  /** เปิดอ่าน = ทำเครื่องหมายอ่านแล้วให้อัตโนมัติ ไม่ต้องกดซ้ำอีกปุ่ม */
  async function openMessage(m: AdminContactRow) {
    setOpenId(m.id);
    if (m.read) return;
    setRows((prev) => (prev ?? []).map((x) => (x.id === m.id ? { ...x, read: true } : x)));
    try {
      await adminContactApi.setRead(m.id, true);
      router.refresh(); // ตัวเลขข้างเมนูมาจากฝั่งเซิร์ฟเวอร์ ต้องให้มันคำนวณใหม่
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function run(key: string, fn: () => Promise<unknown>, after: () => void) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      after();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (error && rows === null) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
          {t('กล่องข้อความ')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3 }}>
          {t('ข้อความที่ผู้ใช้ส่งถึงผู้ดูแลระบบ')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Tabs
          items={[
            { key: 'all' as const, label: t('ทั้งหมด'), count: rows?.length ?? 0 },
            { key: 'unread' as const, label: t('ยังไม่อ่าน'), count: unread },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Button
          variant="secondary"
          icon="mark_email_read"
          disabled={!unread || busy === 'readAll'}
          loading={busy === 'readAll'}
          onClick={() =>
            run('readAll', () => adminContactApi.readAll(), () =>
              setRows((prev) => (prev ?? []).map((m) => ({ ...m, read: true }))),
            )
          }
          style={{ marginInlineStart: 'auto', padding: '8px 14px', fontSize: 12.5 }}
        >
          {t('อ่านทั้งหมด')}
        </Button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ค้นหาผู้ส่งหรือข้อความ...')}
        style={inputStyle(false)}
      />

      {rows === null ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={16} />
          ))}
        </div>
      ) : (
        <div className="nuv-inbox" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 12, alignItems: 'start' }}>
          {/* ── รายการ ── */}
          <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
            {visible.length === 0 ? (
              <div style={{ ...glass(20) }}>
                <EmptyState
                  icon="mail"
                  title={tab === 'unread' ? t('อ่านครบทุกฉบับแล้ว') : t('ยังไม่มีข้อความ')}
                  desc={t('ข้อความที่ผู้ใช้ส่งถึงผู้ดูแลจะมาแสดงที่นี่')}
                />
              </div>
            ) : (
              visible.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void openMessage(m)}
                  style={{
                    ...glass(16),
                    padding: 13,
                    display: 'grid',
                    gap: 4,
                    textAlign: 'start',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderInlineStart: m.read ? '3px solid transparent' : '3px solid #A774F7',
                    outline: openId === m.id ? '2px solid #A774F7' : 'none',
                    outlineOffset: -1,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: m.read ? 500 : 600, color: COLOR.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.fromName || m.email || t('ไม่ระบุชื่อ')}
                    </span>
                    {!m.read ? <Badge tone="info" label={t('ใหม่')} /> : null}
                    <Timestamp date={m.atMs} variant="relative" style={{ fontSize: 11, color: COLOR.hint, marginInlineStart: 'auto', flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: COLOR.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.subject || t('(ไม่มีหัวข้อ)')}
                  </div>
                  <div style={{ fontSize: 11.5, color: COLOR.hint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.text}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ── เนื้อหาที่เลือก ── */}
          <div style={{ ...glass(20), padding: 18, minWidth: 0, position: 'sticky', top: 12 }}>
            {!open ? (
              <EmptyState
                icon="drafts"
                title={t('เลือกข้อความเพื่ออ่านและตอบกลับ')}
                desc={t('กดข้อความทางซ้ายเพื่อเปิดอ่านฉบับเต็ม')}
              />
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {open.subject || t('(ไม่มีหัวข้อ)')}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.label, marginTop: 4, wordBreak: 'break-word' }}>
                      {open.fromName || t('ไม่ระบุชื่อ')}
                      {open.email ? ` · ${open.email}` : ''}
                    </div>
                    <Timestamp date={open.atMs} variant="full" style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <IconButton
                      icon={open.read ? 'mark_email_unread' : 'mark_email_read'}
                      label={open.read ? t('ทำเป็นยังไม่อ่าน') : t('ทำเป็นอ่านแล้ว')}
                      disabled={busy === open.id}
                      onClick={() =>
                        run(open.id, () => adminContactApi.setRead(open.id, !open.read), () =>
                          setRows((prev) => (prev ?? []).map((x) => (x.id === open.id ? { ...x, read: !open.read } : x))),
                        )
                      }
                    />
                    <IconButton
                      icon="delete"
                      label={t('ลบข้อความ')}
                      disabled={busy === open.id}
                      onClick={() => setConfirmDelete(open)}
                    />
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 13.5, color: COLOR.body, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {open.text}
                </p>

                {open.email ? (
                  <a
                    href={`mailto:${encodeURIComponent(open.email)}?subject=${encodeURIComponent(
                      `Re: ${open.subject || 'NU Volunteer'}`,
                    )}`}
                    style={{ justifySelf: 'start' }}
                  >
                    <Button variant="primary" icon="reply">
                      {t('ตอบกลับทางอีเมล')}
                    </Button>
                  </a>
                ) : (
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, color: COLOR.hint }}>
                    <Icon name="info" size={16} />
                    {t('ผู้ส่งไม่ได้ทิ้งอีเมลไว้ จึงตอบกลับจากที่นี่ไม่ได้')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบข้อความนี้?')}
          body={`${confirmDelete.subject || confirmDelete.fromName} — ${t('การลบย้อนกลับไม่ได้')}`}
          confirmLabel={t('ลบ')}
          busy={busy === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() =>
            run(confirmDelete.id, () => adminContactApi.remove(confirmDelete.id), () => {
              setRows((prev) => (prev ?? []).filter((x) => x.id !== confirmDelete.id));
              if (openId === confirmDelete.id) setOpenId(null);
              setConfirmDelete(null);
            })
          }
        />
      ) : null}
    </div>
  );
}
