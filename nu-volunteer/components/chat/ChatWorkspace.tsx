'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, EmptyState, ErrorNote, Icon, IconButton, Tabs, inputStyle } from '@/components/ui';
import { chatApi, errorMessage, type ChatMessageDto, type ChatThreadDto } from '@/lib/api';
import { COLOR, SEMANTIC, glass } from '@/lib/design';

/**
 * คีย์จัดกลุ่มห้องตามกิจกรรม
 *
 * จัดกลุ่มด้วย id ไม่ใช่ชื่อ เพราะผู้จัดคนเดียวตั้งชื่อกิจกรรมซ้ำกันได้ (เช่น จัดรอบเดิมทุกปี)
 * ถ้าจัดด้วยชื่อ ห้องของสองกิจกรรมจะถูกยุบมากองรวมกัน
 * ห้องที่กิจกรรมถูกลบไปแล้วจะได้ activityId เป็น null จึงรวมไว้ในกลุ่มเดียวท้ายสุด
 */
const NO_ACTIVITY = '__none__';
const activityKeyOf = (t: { activityId: string | null }) => t.activityId ?? NO_ACTIVITY;

/** กิจกรรมที่นิสิตลงทะเบียนไว้ — ใช้เลือกผู้จัดที่จะเปิดห้องคุยด้วย */
export type ChatContact = {
  activityId: string;
  title: string;
  organizerName: string;
};

/*
 * จัดรูปแบบเวลาโดยตรึงเขตเวลาไว้ที่ไทย เพื่อให้ HTML ที่เรนเดอร์ฝั่งเซิร์ฟเวอร์
 * ตรงกับตอน hydrate เสมอ ไม่ว่าเครื่องผู้ใช้จะตั้งเขตเวลาไว้อย่างไร
 * (นิยามซ้ำที่นี่แทนการ import จาก lib/activities.ts เพราะไฟล์นั้นดึง prisma เข้ามาด้วย
 *  ซึ่งจะหลุดเข้าไปอยู่ในบันเดิลฝั่งเบราว์เซอร์)
 */
const TZ = 'Asia/Bangkok';
const TIME_HM = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TZ,
});
const DAY_TH = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: TZ });
const DAY_EN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});

const TEXT_MAX = 2000;
/** ไม่ยิงสัญญาณ "กำลังพิมพ์" ถี่กว่านี้ — พอให้อีกฝ่ายเห็นต่อเนื่องโดยไม่ถล่มเซิร์ฟเวอร์ */
const TYPING_THROTTLE_MS = 2500;
/** ซ่อนป้าย "กำลังพิมพ์" ถ้าเงียบไปนานกว่านี้ */
const TYPING_HIDE_MS = 4000;

type TabKey = 'all' | 'unread' | 'archived';

/**
 * หน้าจอแชทที่ใช้ร่วมกันทั้งสองฝั่ง
 *
 * นิสิตเป็นฝ่ายเปิดห้องเสมอ (POST /chat/threads บังคับ role=student ไว้) ฝั่งผู้จัดจึงมีแต่
 * ห้องที่ถูกเปิดมาแล้ว — ปุ่ม "เริ่มบทสนทนาใหม่" จะไม่ขึ้นเลยเมื่อ variant='staff'
 *
 * ปิดเสียง/เก็บเข้าคลังยังเป็นของฝั่งนิสิตอย่างเดียว เพราะ ChatThread มีแต่คอลัมน์
 * studentMuted/studentArchived — ถ้าโชว์ปุ่มให้ผู้จัดกดจะไปแก้ค่าของนิสิตแทน
 */
export function ChatWorkspace({
  initialThreads,
  contacts = [],
  meName,
  variant = 'student',
}: {
  initialThreads: ChatThreadDto[];
  contacts?: ChatContact[];
  meName: string;
  variant?: 'student' | 'staff';
}) {
  /** ฝั่งนิสิตเท่านั้นที่เปิดห้องใหม่และตั้งค่าปิดเสียง/คลังข้อความได้ */
  const isStudent = variant === 'student';
  const { t, isEn } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('all');
  /** '' = ทุกกิจกรรม — ใช้เฉพาะฝั่งผู้จัดที่มีห้องจากหลายกิจกรรมปนกัน */
  const [activityFilter, setActivityFilter] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [live, setLive] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* เก็บห้องที่เปิดอยู่ไว้ใน ref ด้วย เพราะ handler ของสตรีมถูกผูกครั้งเดียวตอน mount */
  const activeIdRef = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const typingSentAt = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const active = threads.find((x) => x.id === activeId) ?? null;

  const refreshThreads = useCallback(async () => {
    try {
      const res = await chatApi.threads();
      setThreads(res.threads);
      // ป้ายตัวเลขบนเมนูแถบข้างนับมาจากเลย์เอาต์ฝั่งเซิร์ฟเวอร์ — ต้องสั่งให้คำนวณใหม่เอง
      startTransition(() => router.refresh());
    } catch {
      // รายการห้องไม่สดชั่วคราวไม่ใช่เรื่องคอขาดบาดตาย — ปล่อยของเดิมไว้ ไม่ต้องขึ้น error
    }
  }, [router]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      const seq = ++loadSeq.current;
      setLoadingMessages(true);
      try {
        const res = await chatApi.messages(threadId);
        // ผู้ใช้อาจสลับห้องระหว่างที่คำขอยังค้างอยู่ — ทิ้งผลที่มาช้า
        if (seq !== loadSeq.current) return;
        setMessages(res.messages);
        setError(null);
        // การเปิดอ่านทำให้ตัวนับ "ยังไม่อ่าน" เปลี่ยน จึงต้องดึงรายการห้องใหม่
        void refreshThreads();
      } catch (e) {
        if (seq === loadSeq.current) setError(errorMessage(e));
      } finally {
        if (seq === loadSeq.current) setLoadingMessages(false);
      }
    },
    [refreshThreads],
  );

  /* ── สตรีมเหตุการณ์เรียลไทม์ ── */
  useEffect(() => {
    const es = new EventSource('/api/v1/chat/stream');

    const onReady = () => setLive(true);

    const onMessage = (ev: MessageEvent) => {
      const e = JSON.parse(ev.data) as { threadId: string };
      // ข้อความในห้องที่เปิดอยู่ต้องขึ้นทันที ห้องอื่นแค่ให้ตัวนับกับลำดับห้องขยับ
      if (e.threadId === activeIdRef.current) void loadMessages(e.threadId);
      else void refreshThreads();
    };

    const onTyping = (ev: MessageEvent) => {
      const e = JSON.parse(ev.data) as { threadId: string };
      if (e.threadId !== activeIdRef.current) return;
      setPeerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerTyping(false), TYPING_HIDE_MS);
    };

    const onRead = (ev: MessageEvent) => {
      const e = JSON.parse(ev.data) as { threadId: string; at: number };
      if (e.threadId !== activeIdRef.current) return;
      // อีกฝ่ายเพิ่งเปิดอ่าน — เลื่อนสถานะข้อความของเราเป็น "อ่านแล้ว" โดยไม่ต้องดึงใหม่
      setMessages((prev) =>
        prev.map((m) => (m.mine && m.readAt == null ? { ...m, readAt: e.at } : m)),
      );
    };

    const onPresence = (ev: MessageEvent) => {
      const e = JSON.parse(ev.data) as { userId: string; online: boolean };
      setThreads((prev) =>
        prev.map((x) => (x.otherId === e.userId ? { ...x, otherOnline: e.online } : x)),
      );
    };

    es.addEventListener('ready', onReady);
    es.addEventListener('message', onMessage);
    es.addEventListener('typing', onTyping);
    es.addEventListener('read', onRead);
    es.addEventListener('presence', onPresence);
    // EventSource ต่อกลับให้เองอยู่แล้ว — ที่นี่แค่บอกผู้ใช้ว่าตอนนี้ยังไม่สด
    es.onerror = () => setLive(false);

    return () => {
      es.close();
      clearTimeout(typingTimer.current);
    };
  }, [loadMessages, refreshThreads]);

  /* เปิดห้องใหม่ — ล้างสถานะของห้องเดิมทิ้งทั้งหมด */
  const openThread = (id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
    setMessages([]);
    setPeerTyping(false);
    setConfirmDelete(false);
    setDraft('');
    setError(null);
    void loadMessages(id);
  };

  const closeThread = () => {
    activeIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setPeerTyping(false);
    setConfirmDelete(false);
  };

  /* เลื่อนไปข้อความล่าสุดทุกครั้งที่รายการเปลี่ยน */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, peerTyping]);

  const onDraftChange = (value: string) => {
    setDraft(value.slice(0, TEXT_MAX));
    const id = activeIdRef.current;
    if (!id || !value.trim()) return;
    const now = Date.now();
    if (now - typingSentAt.current < TYPING_THROTTLE_MS) return;
    typingSentAt.current = now;
    // สัญญาณกำลังพิมพ์หายไปได้ ไม่ต้องแจ้งผู้ใช้ถ้าส่งไม่สำเร็จ
    void chatApi.typing(id).catch(() => {});
  };

  const send = async () => {
    const id = activeIdRef.current;
    const text = draft.trim();
    if (!id || !text || sending) return;

    setSending(true);
    setError(null);
    try {
      await chatApi.send(id, text);
      setDraft('');
      typingSentAt.current = 0;
      await loadMessages(id);
      composerRef.current?.focus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const patchThread = async (id: string, patch: { muted?: boolean; archived?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      await chatApi.setThread(id, patch);
      await refreshThreads();
      // ห้องที่เพิ่งเก็บเข้าคลังไม่ควรค้างเปิดอยู่ในแท็บที่มองไม่เห็นมันแล้ว
      if (patch.archived && tab !== 'archived') closeThread();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeThread = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await chatApi.removeThread(id);
      setMessages([]);
      setConfirmDelete(false);
      await refreshThreads();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const startWith = async (activityId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await chatApi.openThread(activityId);
      const list = await chatApi.threads();
      setThreads(list.threads);
      setShowNew(false);
      setTab('all');
      openThread(res.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const unreadTotal = threads.reduce((s, x) => s + (x.archived ? 0 : x.unread), 0);
  const archivedCount = threads.filter((x) => x.archived).length;

  const shown = useMemo(() => {
    const byActivity = activityFilter
      ? threads.filter((x) => activityKeyOf(x) === activityFilter)
      : threads;
    if (tab === 'archived') return byActivity.filter((x) => x.archived);
    const open = byActivity.filter((x) => !x.archived);
    return tab === 'unread' ? open.filter((x) => x.unread > 0) : open;
  }, [threads, tab, activityFilter]);

  /**
   * กิจกรรมที่มีห้องแชทอยู่จริง เรียงตามห้องที่เพิ่งมีข้อความล่าสุด
   * ผู้จัดที่ดูแลหลายงานพร้อมกันจะได้เห็นงานที่กำลังคุยกันอยู่ก่อน ไม่ใช่เรียงตามชื่อ
   */
  const activityOptions = useMemo(() => {
    const map = new Map<string, { key: string; title: string; count: number; unread: number; lastAtMs: number }>();
    for (const x of threads) {
      if (x.archived) continue;
      const key = activityKeyOf(x);
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
        cur.unread += x.unread;
        cur.lastAtMs = Math.max(cur.lastAtMs, x.lastAtMs);
      } else {
        map.set(key, {
          key,
          title: x.activityTitle ?? t('ไม่ผูกกับกิจกรรม'),
          count: 1,
          unread: x.unread,
          lastAtMs: x.lastAtMs,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.lastAtMs - a.lastAtMs);
  }, [threads, t]);

  /** รายการห้องที่จะแสดง แบ่งเป็นกลุ่มตามกิจกรรม — ใช้เฉพาะฝั่งผู้จัด */
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; unread: number; items: ChatThreadDto[] }>();
    for (const x of shown) {
      const key = activityKeyOf(x);
      const cur = map.get(key);
      if (cur) {
        cur.items.push(x);
        cur.unread += x.unread;
      } else {
        map.set(key, { key, title: x.activityTitle ?? t('ไม่ผูกกับกิจกรรม'), unread: x.unread, items: [x] });
      }
    }
    // shown เรียงตามเวลาล่าสุดอยู่แล้ว กลุ่มแรกจึงเป็นกลุ่มที่เพิ่งมีความเคลื่อนไหว
    return [...map.values()];
  }, [shown, t]);

  const tabs = [
    { key: 'all' as TabKey, label: t('ทั้งหมด'), count: threads.filter((x) => !x.archived).length },
    { key: 'unread' as TabKey, label: t('ยังไม่อ่าน'), count: unreadTotal },
    // คลังข้อความเป็นค่าของฝั่งนิสิต ฝั่งผู้จัดจึงไม่มีแท็บนี้ให้เลือก
    ...(isStudent
      ? [{ key: 'archived' as TabKey, label: t('คลังข้อความ'), count: archivedCount }]
      : []),
  ];

  /** แทรกป้ายคั่นวันเมื่อข้ามไปวันใหม่ — อ่านย้อนได้ว่าคุยกันวันไหน */
  const withDayMarks = useMemo(
    () =>
      messages.map((m, i) => {
        const day = DAY_KEY.format(m.atMs);
        const prevDay = i > 0 ? DAY_KEY.format(messages[i - 1].atMs) : null;
        return { message: m, dayMark: day === prevDay ? null : day };
      }),
    [messages],
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ErrorNote>{error}</ErrorNote>

      <div
        className={`nuv-chat-grid${activeId ? ' nuv-chat-open' : ''}`}
        style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, alignItems: 'start' }}
      >
        {/* ── รายการห้องแชท ── */}
        <div className="nuv-chat-list" style={{ ...glass(20), padding: 14, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="forum" size={20} style={{ color: '#7C2FD9' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ข้อความ')}</span>
            {/* จุดบอกสถานะสตรีม มีข้อความกำกับเสมอ ไม่พึ่งสีอย่างเดียว */}
            <Badge
              tone={live ? 'success' : 'neutral'}
              dot
              label={live ? t('เชื่อมต่ออยู่') : t('กำลังเชื่อมต่อ')}
              style={{ marginInlineStart: 'auto', fontSize: 11 }}
            />
          </div>

          {isStudent ? (
            <Button
              variant="secondary"
              icon="add_comment"
              disabled={!contacts.length || busy}
              onClick={() => setShowNew((v) => !v)}
              style={{ padding: '10px 14px' }}
            >
              {t('เริ่มบทสนทนาใหม่')}
            </Button>
          ) : null}

          {/* เลือกกิจกรรมเพื่อคุยกับผู้จัดของกิจกรรมนั้น */}
          {showNew ? (
            <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: 'rgba(167,116,247,.10)' }}>
              <div style={{ fontSize: 12, color: COLOR.label, lineHeight: 1.7 }}>
                {t('เลือกกิจกรรมที่คุณลงทะเบียนไว้ ระบบจะเปิดห้องคุยกับผู้จัดของกิจกรรมนั้น')}
              </div>
              {contacts.map((c) => (
                <button
                  key={c.activityId}
                  type="button"
                  disabled={busy}
                  onClick={() => startWith(c.activityId)}
                  style={{
                    textAlign: 'start',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,.75)',
                    background: 'rgba(255,255,255,.7)',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
                    {c.title}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: COLOR.label, marginTop: 3 }}>
                    {c.organizerName}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {/* เลือกดูเฉพาะกิจกรรมเดียว — ขึ้นเมื่อผู้จัดมีห้องจากกิจกรรมมากกว่าหนึ่งงานเท่านั้น */}
          {!isStudent && activityOptions.length > 1 ? (
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              aria-label={t('กรองตามกิจกรรม')}
              style={{ ...inputStyle(false), fontSize: 12.5 }}
            >
              <option value="">{`${t('ทุกกิจกรรม')} · ${activityOptions.reduce((s, a) => s + a.count, 0)}`}</option>
              {activityOptions.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.unread ? `${a.title} · ${a.count} (${a.unread} ${t('ใหม่')})` : `${a.title} · ${a.count}`}
                </option>
              ))}
            </select>
          ) : null}

          <Tabs items={tabs} value={tab} onChange={setTab} />

          {!shown.length ? (
            <EmptyState
              icon="forum"
              title={tab === 'archived' ? t('คลังข้อความว่างอยู่') : t('ยังไม่มีบทสนทนา')}
              desc={
                !isStudent
                  ? t('นิสิตเป็นฝ่ายเริ่มบทสนทนา ห้องจะขึ้นที่นี่เมื่อมีคนทักเข้ามา')
                  : contacts.length
                    ? t('เริ่มบทสนทนาใหม่เพื่อสอบถามผู้จัดกิจกรรมที่คุณลงทะเบียนไว้')
                    : t('เมื่อคุณลงทะเบียนกิจกรรมแล้ว จะติดต่อผู้จัดได้จากหน้านี้')
              }
            />
          ) : isStudent ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {shown.map((x) => (
                <ThreadRow key={x.id} thread={x} on={x.id === activeId} onOpen={openThread} t={t} isEn={isEn} />
              ))}
            </div>
          ) : (
            /* ฝั่งผู้จัด: แยกห้องเป็นกลุ่มตามกิจกรรม จะได้ไม่ต้องไล่อ่านชื่อกิจกรรมทีละบรรทัด
               ว่าข้อความนี้มาจากงานไหน กลุ่มที่เพิ่งมีความเคลื่อนไหวอยู่บนสุด */
            <div style={{ display: 'grid', gap: 16 }}>
              {groups.map((g) => (
                <div key={g.key} style={{ display: 'grid', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '0 2px 6px',
                      borderBottom: '1px solid rgba(31,41,55,.08)',
                    }}
                  >
                    <Icon
                      name={g.key === NO_ACTIVITY ? 'help' : 'campaign'}
                      size={15}
                      style={{ color: '#7C2FD9', flexShrink: 0 }}
                    />
                    <span
                      title={g.title}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLOR.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {g.title}
                    </span>
                    <span style={{ fontSize: 11, color: COLOR.hint, flexShrink: 0 }}>{g.items.length}</span>
                    {g.unread ? (
                      <Badge tone="danger" label={`${g.unread}`} style={{ padding: '2px 8px', fontSize: 10.5 }} />
                    ) : null}
                  </div>

                  {g.items.map((x) => (
                    <ThreadRow key={x.id} thread={x} on={x.id === activeId} onOpen={openThread} t={t} isEn={isEn} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── บทสนทนา ── */}
        <div className="nuv-chat-pane" style={{ ...glass(20), display: 'flex', flexDirection: 'column', minHeight: 520 }}>
          {!active ? (
            <EmptyState
              icon="chat_bubble"
              title={t('เลือกบทสนทนา')}
              desc={t('เลือกห้องจากรายการทางซ้ายเพื่ออ่านและตอบข้อความ')}
            />
          ) : (
            <>
              {/* หัวห้อง */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 14,
                  borderBottom: '1px solid rgba(31,41,55,.08)',
                }}
              >
                {/* ปุ่มย้อนกลับมีเฉพาะบนมือถือ ที่ซึ่งรายการห้องกับบทสนทนาแสดงทีละแผง */}
                <span className="nuv-chat-back">
                  <IconButton icon="arrow_back" label={t('กลับไปรายการบทสนทนา')} onClick={closeThread} />
                </span>
                <Avatar name={active.otherName} url={active.otherAvatar} online={active.otherOnline} onlineLabel={t('ออนไลน์')} />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{active.otherName}</div>
                  <div style={{ fontSize: 11.5, color: COLOR.label, marginTop: 2 }}>
                    {active.activityTitle ?? t('ข้อความทั่วไป')}
                    {' · '}
                    {active.otherOnline ? t('ออนไลน์') : t('ออฟไลน์')}
                  </div>
                </div>

                {isStudent ? (
                  <>
                    <IconButton
                      icon={active.muted ? 'notifications_off' : 'notifications_active'}
                      label={active.muted ? t('เปิดเสียงแจ้งเตือนห้องนี้') : t('ปิดเสียงแจ้งเตือนห้องนี้')}
                      disabled={busy}
                      onClick={() => patchThread(active.id, { muted: !active.muted })}
                    />
                    <IconButton
                      icon={active.archived ? 'unarchive' : 'archive'}
                      label={active.archived ? t('เอาออกจากคลังข้อความ') : t('เก็บเข้าคลังข้อความ')}
                      disabled={busy}
                      onClick={() => patchThread(active.id, { archived: !active.archived })}
                    />
                  </>
                ) : null}
                <IconButton
                  icon="delete"
                  label={t('ลบบทสนทนานี้สำหรับฉัน')}
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                />
              </div>

              {/* ยืนยันก่อนลบ — ลบแล้วกู้คืนไม่ได้ */}
              {confirmDelete ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 10,
                    padding: 14,
                    background: SEMANTIC.danger.bg,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: COLOR.body, lineHeight: 1.7 }}>
                    {t('ลบบทสนทนานี้ออกจากหน้าจอของคุณ อีกฝ่ายยังเห็นประวัติของเขาตามเดิม และกู้คืนไม่ได้')}
                  </span>
                  <Button
                    variant="danger"
                    icon="delete"
                    loading={busy}
                    onClick={() => removeThread(active.id)}
                    style={{ padding: '9px 15px' }}
                  >
                    {t('ยืนยันลบ')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    style={{ padding: '9px 15px' }}
                  >
                    {t('ไม่ลบ')}
                  </Button>
                </div>
              ) : null}

              {/* ข้อความ */}
              <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 10, alignContent: 'start', maxHeight: 460 }}
              >
                {loadingMessages && !messages.length ? (
                  <div style={{ fontSize: 12.5, color: COLOR.hint, textAlign: 'center', padding: 20 }}>
                    {t('กำลังโหลดข้อความ')}
                  </div>
                ) : !messages.length ? (
                  <EmptyState
                    icon="waving_hand"
                    title={t('ยังไม่มีข้อความในห้องนี้')}
                    desc={t(isStudent ? 'ทักทายผู้จัดกิจกรรมเพื่อเริ่มบทสนทนาได้เลย' : 'ตอบกลับนิสิตเพื่อเริ่มบทสนทนาได้เลย')}
                  />
                ) : (
                  withDayMarks.map(({ message: m, dayMark }) => (
                    <div key={m.id} style={{ display: 'grid', gap: 10 }}>
                      {dayMark ? (
                        <div style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: 999,
                              background: 'rgba(31,41,55,.07)',
                              fontSize: 11,
                              color: COLOR.label,
                            }}
                          >
                            {isEn ? DAY_EN.format(m.atMs) : DAY_TH.format(m.atMs)}
                          </span>
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '78%' }}>
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: 16,
                              borderEndEndRadius: m.mine ? 5 : 16,
                              borderEndStartRadius: m.mine ? 16 : 5,
                              background: m.mine ? 'rgba(167,116,247,.20)' : 'rgba(255,255,255,.78)',
                              border: '1px solid rgba(255,255,255,.8)',
                              fontSize: 13.5,
                              lineHeight: 1.75,
                              color: m.text ? COLOR.ink : COLOR.hint,
                              fontStyle: m.text ? undefined : 'italic',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {m.text ?? t('ข้อความนี้ถูกลบแล้ว')}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: 4,
                              fontSize: 11,
                              color: COLOR.hint,
                              justifyContent: m.mine ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <span>{m.mine ? t('คุณ') : m.senderName}</span>
                            <span>·</span>
                            <span>{TIME_HM.format(m.atMs)}</span>
                            {/* สถานะส่ง/อ่านของฝั่งเราเท่านั้น พร้อมข้อความกำกับให้เครื่องอ่านหน้าจอ */}
                            {m.mine ? (
                              <span
                                role="img"
                                aria-label={m.readAt ? t('อ่านแล้ว') : t('ส่งแล้ว')}
                                title={m.readAt ? t('อ่านแล้ว') : t('ส่งแล้ว')}
                                style={{ display: 'inline-flex' }}
                              >
                                <Icon
                                  name={m.readAt ? 'done_all' : 'done'}
                                  size={14}
                                  style={{ color: m.readAt ? SEMANTIC.info.color : COLOR.hint }}
                                />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* ป้ายกำลังพิมพ์ — ประกาศให้เครื่องอ่านหน้าจอทราบแบบไม่ขัดจังหวะ */}
                <div aria-live="polite" style={{ minHeight: 18 }}>
                  {peerTyping ? (
                    <span style={{ fontSize: 12, color: COLOR.label, fontStyle: 'italic' }}>
                      {`${active.otherName} ${t('กำลังพิมพ์')}`}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* กล่องพิมพ์ */}
              <div style={{ padding: 14, borderTop: '1px solid rgba(31,41,55,.08)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่ — ไม่ดักตอนที่ IME กำลังประกอบคำ
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    maxLength={TEXT_MAX}
                    placeholder={t(isStudent ? 'พิมพ์ข้อความถึงผู้จัดกิจกรรม' : 'พิมพ์ข้อความถึงนิสิต')}
                    aria-label={t('ข้อความใหม่')}
                    style={{ ...inputStyle(), flex: 1, resize: 'none', lineHeight: 1.7 }}
                  />
                  <Button
                    variant="primary"
                    icon="send"
                    loading={sending}
                    disabled={!draft.trim()}
                    onClick={send}
                    style={{ padding: '12px 18px' }}
                  >
                    {t('ส่ง')}
                  </Button>
                </div>

                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: COLOR.hint }}>
                  <span>{t('กด Enter เพื่อส่ง · Shift + Enter ขึ้นบรรทัดใหม่')}</span>
                  {/* เตือนเรื่องความยาวเฉพาะตอนที่ใกล้ชนเพดานจริง ๆ */}
                  {draft.length > TEXT_MAX - 200 ? (
                    <span style={{ marginInlineStart: 'auto' }}>{`${draft.length} / ${TEXT_MAX}`}</span>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: COLOR.hint, textAlign: 'center' }}>
        {`${t('เข้าสู่ระบบในชื่อ')} ${meName}`}
      </div>
    </div>
  );
}

/** รูปแทนตัวคู่สนทนา — ใช้อักษรแรกของชื่อถ้ายังไม่มีรูป */
function Avatar({
  name,
  url,
  online,
  onlineLabel,
}: {
  name: string;
  url: string | null;
  online: boolean;
  onlineLabel: string;
}) {
  return (
    <span style={{ position: 'relative', flexShrink: 0 }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 14,
          background: url ? `center/cover url(${JSON.stringify(url)})` : 'rgba(167,116,247,.20)',
          color: '#7C2FD9',
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {url ? '' : name.trim().charAt(0)}
      </span>
      {online ? (
        <span
          aria-label={onlineLabel}
          title={onlineLabel}
          style={{
            position: 'absolute',
            insetInlineEnd: -2,
            insetBlockEnd: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: SEMANTIC.success.dot,
            border: '2px solid #fff',
          }}
        />
      ) : null}
    </span>
  );
}

/**
 * หนึ่งบรรทัดในรายการห้องแชท
 *
 * แยกออกมาเป็นคอมโพเนนต์ตอนทำรายการแบบแบ่งกลุ่มตามกิจกรรมของฝั่งผู้จัด — รายการแบบเรียงเดี่ยว
 * (ฝั่งนิสิต) กับแบบแบ่งกลุ่ม (ฝั่งผู้จัด) ต้องใช้บรรทัดหน้าตาเดียวกันทุกจุด
 */
function ThreadRow({
  thread: x,
  on,
  onOpen,
  t,
  isEn,
}: {
  thread: ChatThreadDto;
  /** true = ห้องที่เปิดอ่านอยู่ */
  on: boolean;
  onOpen: (id: string) => void;
  t: (s: string) => string;
  isEn: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={on ? 'true' : undefined}
      onClick={() => onOpen(x.id)}
      style={{
        display: 'flex',
        gap: 10,
        textAlign: 'start',
        padding: 11,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,.75)',
        background: on ? 'rgba(167,116,247,.16)' : 'rgba(255,255,255,.6)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <Avatar name={x.otherName} url={x.otherAvatar} online={x.otherOnline} onlineLabel={t('ออนไลน์')} />

      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13.5,
              fontWeight: x.unread ? 700 : 600,
              color: COLOR.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {x.otherName}
          </span>
          {x.muted ? (
            <Icon name="notifications_off" size={15} style={{ color: COLOR.hint, flexShrink: 0 }} />
          ) : null}
        </span>

        {x.activityTitle ? (
          <span
            style={{
              display: 'block',
              fontSize: 11,
              color: '#7C2FD9',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {x.activityTitle}
          </span>
        ) : null}

        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: COLOR.body,
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {x.lastText ?? t('ยังไม่มีข้อความ')}
        </span>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 5,
            fontSize: 11,
            color: COLOR.hint,
          }}
        >
          {`${isEn ? DAY_EN.format(x.lastAtMs) : DAY_TH.format(x.lastAtMs)} ${TIME_HM.format(x.lastAtMs)}`}
          {x.unread ? (
            <Badge tone="danger" label={`${x.unread} ${t('ใหม่')}`} style={{ padding: '3px 9px', fontSize: 10.5 }} />
          ) : null}
        </span>
      </span>
    </button>
  );
}
