'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, EmptyState, ErrorNote, Icon, Skeleton, inputStyle } from '@/components/ui';
import { errorMessage, organizerApi, type CheckinKindDto, type CheckinTokenDto } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

export type QrActivity = {
  id: string;
  title: string;
  status: string;
  location: string;
  dateTh: string;
  dateEn: string;
  startAtMs: number;
  endAtMs: number;
  categoryLabel: string;
  categoryLabelEn: string;
  categoryColor: string;
  registered: number;
};

type Kind = CheckinKindDto;

const KINDS: { key: Kind; label: string; icon: string }[] = [
  { key: 'in', label: 'เช็กอิน', icon: 'login' },
  { key: 'out', label: 'เช็กเอาต์', icon: 'logout' },
  { key: 'auto', label: 'เช็กอิน + เช็กเอาต์', icon: 'sync_alt' },
];

const KIND_HINT: Record<Kind, string> = {
  in: 'สแกนเพื่อบันทึกการเข้าร่วม ใช้ได้เฉพาะคนที่ผ่านการอนุมัติแล้ว',
  out: 'สแกนเพื่อบันทึกเวลาออก ต้องเช็กอินไว้ก่อนจึงจะใช้ได้',
  auto: 'ใบเดียวใช้ทั้งเข้าและออก — สแกนครั้งแรกคือเข้า ครั้งถัดไปคือออก ระวังคนสแกนซ้ำโดยไม่ตั้งใจ',
};

/** ป้ายบนหัวการ์ด QR */
const KIND_BADGE: Record<Kind, string> = {
  in: 'QR สำหรับเช็กอิน',
  out: 'QR สำหรับเช็กเอาต์',
  auto: 'QR สำหรับเช็กอินและเช็กเอาต์',
};

/** เหตุการณ์เช็กอินหนึ่งรายการที่ไหลมาทางสตรีม (รูปแบบเดียวกับ CheckinEvent ฝั่งเซิร์ฟเวอร์) */
type FeedItem = {
  registrationId: string;
  kind: Kind;
  studentName: string;
  studentId: string;
  avatarUrl: string | null;
  outOfRange: boolean;
  at: number;
};

type Counts = { approved: number; checkedIn: number; checkedOut: number };

const EMPTY_COUNTS: Counts = { approved: 0, checkedIn: 0, checkedOut: 0 };

/** เก็บรายการล่าสุดไว้เท่านี้ — จอหน้างานดูย้อนหลังไม่กี่คน ที่เหลือดูในหน้าผู้เข้าร่วม */
const FEED_LIMIT = 30;

/** ขอรหัสใหม่ก่อนของเดิมหมดอายุเท่านี้ — เผื่อเวลาเดินทางไป-กลับของคำขอ */
const RENEW_LEAD_MS = 2_000;
/** ขอรหัสถี่กว่านี้ไม่ได้ กันลูปรัวเมื่อเซิร์ฟเวอร์คืนรหัสที่ใกล้หมดอายุมาก */
const MIN_REFRESH_MS = 3_000;
/** ขอรหัสไม่สำเร็จแล้วรอเท่านี้ก่อนลองใหม่ */
const RETRY_MS = 10_000;

/** เวลาบนตารางการสแกน — ถึงระดับวินาที เพราะคนต่อแถวสแกนห่างกันไม่กี่วินาที */
const TIME_FMT = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Bangkok',
});

/** เวลาบนบรรทัดสถานะของรหัส — ไม่ต้องละเอียดถึงวินาที */
const CLOCK_FMT = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Bangkok',
});

/** จำนวนแถวที่เห็นก่อนกด "ดูเพิ่มเติม" */
const LOG_PREVIEW = 5;

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
      <Icon name="check" size={14} style={{ color: '#2FA37A', flexShrink: 0, marginTop: 2 }} />
      <span>{`${label}: ${value}`}</span>
    </div>
  );
}

export function OrganizerQr({ activities }: { activities: QrActivity[] }) {
  const { t, isEn } = useApp();

  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [kind, setKind] = useState<Kind>('in');
  /** เปลี่ยนค่าเพื่อบังคับให้ effect ไปขอรหัสใหม่ทันที (ปุ่มขอรหัสใหม่) */
  const [nonce, setNonce] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  /** แสดงรายการสแกนย้อนหลังทั้งหมดหรือเฉพาะห้ารายการล่าสุด */
  const [logExpanded, setLogExpanded] = useState(false);

  const [token, setToken] = useState<CheckinTokenDto | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  /** กิจกรรมที่สตรีมยืนยันกลับมาแล้ว — ตัวเลขด้านล่างเชื่อถือได้ก็ต่อเมื่อตรงกับที่เลือกอยู่ */
  const [liveFor, setLiveFor] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activity = useMemo(
    () => activities.find((a) => a.id === activityId) ?? null,
    [activities, activityId],
  );

  /* ── ขอรหัสแล้วตั้งเวลาขอรอบถัดไปเองก่อนของเดิมหมดอายุ ──
     ไม่ใช้ setInterval เพราะอายุรหัสมาจากเซิร์ฟเวอร์ ไม่ได้คงที่เท่ากันทุกรอบ
     (รอบแรกอาจได้รหัสที่ออกไปแล้วครึ่งทาง เพราะจอเครื่องอื่นขอไปก่อน) */
  useEffect(() => {
    if (!activityId) return;

    const ac = new AbortController();
    let alive = true;

    const load = async () => {
      try {
        const res = await organizerApi.checkinToken(activityId, kind, ac.signal);
        if (!alive) return;
        setToken(res.token);
        setImage(res.image);
        setError('');
        const wait = Math.max(MIN_REFRESH_MS, res.token.expiresAtMs - Date.now() - RENEW_LEAD_MS);
        timerRef.current = setTimeout(load, wait);
      } catch (e) {
        // ยกเลิกเองตอนออกจากหน้า ไม่ใช่ความผิดพลาดที่ต้องบอกผู้ใช้
        if (!alive) return;
        setError(errorMessage(e));
        timerRef.current = setTimeout(load, RETRY_MS);
      }
    };

    load();

    return () => {
      alive = false;
      ac.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activityId, kind, nonce]);

  /* นาฬิกาสำหรับแถบเวลาถอยหลัง — แยกจากรอบขอรหัส เพราะเดินคนละจังหวะกัน */
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  /* ── สายเหตุการณ์เช็กอินสดของกิจกรรมที่เลือกอยู่ ──
     เก็บ activityId ที่สตรีมตอบกลับมาไว้ด้วย แทนที่จะมีธง "ต่ออยู่ไหม" แยกต่างหาก
     จะได้ไม่มีจังหวะที่ตัวเลขของกิจกรรมก่อนหน้าค้างอยู่บนจอหลังสลับกิจกรรม */
  useEffect(() => {
    if (!activityId) return;

    const es = new EventSource(
      `/api/v1/organizer/checkin-stream?activityId=${encodeURIComponent(activityId)}`,
    );

    es.addEventListener('ready', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as {
        activityId: string;
        counts: Counts;
        recent: FeedItem[];
      };
      setCounts(data.counts);
      setFeed(data.recent);
      setLiveFor(data.activityId);
    });

    // จออื่นสั่งเปลี่ยนรหัส — รหัสที่จอนี้โชว์อยู่ถูกยกเลิกไปแล้ว ต้องไปเอาของใหม่ทันที
    es.addEventListener('token', () => setNonce((n) => n + 1));

    es.addEventListener('checkin', (ev) => {
      const e = JSON.parse((ev as MessageEvent).data) as FeedItem;
      // คนเดิมที่เช็กอินแล้วเช็กเอาต์ต้องขึ้นเป็นรายการใหม่ แต่ไม่ควรมีสองบรรทัดของทิศทางเดียวกัน
      setFeed((prev) =>
        [e, ...prev.filter((x) => !(x.registrationId === e.registrationId && x.kind === e.kind))].slice(
          0,
          FEED_LIMIT,
        ),
      );
      setCounts((c) =>
        e.kind === 'in'
          ? { ...c, approved: Math.max(0, c.approved - 1), checkedIn: c.checkedIn + 1 }
          : { ...c, checkedIn: Math.max(0, c.checkedIn - 1), checkedOut: c.checkedOut + 1 },
      );
    });

    return () => es.close();
  }, [activityId]);

  /**
   * ปุ่ม "ขอรหัสใหม่ทันที"
   *
   * ต้องยิง POST ให้เซิร์ฟเวอร์ยกเลิกรหัสเดิม ไม่ใช่แค่สั่ง effect ให้ไปขอใหม่
   * เพราะการขอเฉย ๆ จะได้รหัสเดิมกลับมา — ตัวออกรหัสตั้งใจใช้ใบเดิมซ้ำภายในอายุของมัน
   * เพื่อให้ทุกจอของกิจกรรมเดียวกันโชว์รหัสตรงกัน
   */
  const rotate = async () => {
    if (rotating || !activityId) return;
    setRotating(true);
    try {
      const res = await organizerApi.rotateCheckinToken(activityId, kind);
      setToken(res.token);
      setImage(res.image);
      setError('');
      // ให้รอบจับเวลาเริ่มนับจากรหัสใหม่ ไม่ใช่ค้างตามกำหนดเดิมของรหัสที่เพิ่งถูกทิ้ง
      setNonce((n) => n + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRotating(false);
    }
  };

  /**
   * บันทึกภาพ QR ที่เห็นอยู่เป็นไฟล์
   *
   * ได้เป็นภาพนิ่งของ "รหัสใบที่กำลังโชว์อยู่" ซึ่งมีอายุเท่าที่เหลือบนหน้าจอเท่านั้น
   * ไม่ใช่ QR ถาวรสำหรับติดโปสเตอร์ — ตัวรหัสหมุนทุกนาทีตามที่ออกแบบไว้
   */
  const download = () => {
    if (!image || !activity) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `nuv-qr-${activity.id}-${kind}-${token?.code ?? 'code'}.png`;
    a.click();
  };

  const copyCode = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // เบราว์เซอร์ไม่ให้สิทธิ์คลิปบอร์ด — รหัสยังอ่านได้จากบนจออยู่แล้ว ไม่ต้องแจ้งเป็นข้อผิดพลาด
    }
  };

  if (!activities.length) {
    return (
      <div style={{ ...glass(22) }}>
        <EmptyState
          icon="qr_code_2"
          title={t('ยังไม่มีกิจกรรมที่ออก QR ได้')}
          desc={t('กิจกรรมต้องเผยแพร่แล้วและยังไม่ถูกยกเลิก จึงจะเปิดให้เช็กอินหน้างานได้')}
          action={
            <Link href="/organizer/activities">
              <Button variant="primary" icon="campaign">
                {t('ไปที่กิจกรรมของฉัน')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const remainMs = token ? Math.max(0, token.expiresAtMs - nowMs) : 0;
  const remainSec = Math.ceil(remainMs / 1000);
  const ratio = token ? Math.min(1, remainMs / (token.ttlSec * 1000)) : 0;
  /** รหัสที่แสดงอยู่ตรงกับปุ่มที่เลือกไว้หรือยัง — ระหว่างสลับ in/out จะยังเป็นของเก่าอยู่ครู่หนึ่ง */
  const inSync = token?.kind === kind;
  /** ตัวเลขและรายการด้านล่างเป็นของกิจกรรมที่เลือกอยู่จริงหรือยัง */
  const liveNow = liveFor === activityId;
  const shownFeed = logExpanded ? feed : feed.slice(0, LOG_PREVIEW);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('QR Code')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('แสดง QR นี้ที่หน้างานให้นิสิตสแกนเพื่อเช็กอินและเช็กเอาต์')}
        </div>
      </div>

      {/* ── เลือกกิจกรรม ── */}
      <div className="nuv-no-print" style={{ ...glass(20), padding: 16, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name="event_note" size={18} style={{ color: COLOR.label }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('เลือกกิจกรรม')}</span>
        </div>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('กิจกรรม')}</span>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            style={inputStyle(false)}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {`${isEn ? a.dateEn : a.dateTh} · ${a.title}`}
              </option>
            ))}
          </select>
        </label>

        {activity ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center', fontSize: 12.5, color: COLOR.body }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 999,
                background: activity.categoryColor,
              }}
            />
            {isEn ? activity.categoryLabelEn : activity.categoryLabel}
            {activity.location ? (
              <>
                <Icon name="place" size={15} style={{ color: COLOR.label }} />
                {activity.location}
              </>
            ) : null}
            <Badge tone="neutral" label={`${activity.registered} ${t('ใบลงทะเบียน')}`} />
          </div>
        ) : null}

      </div>

      {/* ── ประเภท QR ── */}
      <div className="nuv-no-print" style={{ ...glass(20), padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name="tune" size={18} style={{ color: COLOR.label }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{t('ประเภท QR')}</span>
        </div>

        {/* เช็กอินกับเช็กเอาต์แยกรหัสกันเป็นค่าตั้งต้น ไม่งั้นคนที่สแกนซ้ำจะถูกนับว่าออกจากงานทันที
            โหมดรวมมีให้เลือกเมื่อผู้จัดยอมรับความเสี่ยงนั้นเพื่อแลกกับการไม่ต้องสลับจอ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((k) => (
            <Button
              key={k.key}
              variant={kind === k.key ? 'primary' : 'secondary'}
              icon={k.icon}
              onClick={() => setKind(k.key)}
            >
              {t(k.label)}
            </Button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            padding: '10px 12px',
            borderRadius: 12,
            fontSize: 12.5,
            color: COLOR.body,
            background: 'rgba(167,116,247,.09)',
          }}
        >
          <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1, color: COLOR.label }} />
          {t(KIND_HINT[kind])}
        </div>
      </div>

      {/* ── ตัว QR ──
          หัวการ์ดย้ำชื่อกิจกรรมและทิศทางไว้ติดกับ QR เสมอ
          ผู้จัดที่ดูแลหลายงานในวันเดียวจะได้ไม่เอาจอของงานหนึ่งไปตั้งให้อีกงานสแกน */}
      <div
        style={{
          ...glass(22),
          padding: 22,
          display: 'grid',
          gap: 16,
          justifyItems: 'center',
          borderTop: `4px solid ${activity?.categoryColor ?? COLOR.hint}`,
        }}
      >
        {activity ? (
          <div style={{ display: 'grid', gap: 5, justifyItems: 'center', textAlign: 'center' }}>
            <Badge
              tone={kind === 'in' ? 'success' : kind === 'out' ? 'purple' : 'info'}
              label={t(KIND_BADGE[kind])}
            />
            <span style={{ fontSize: 16, fontWeight: 600, color: COLOR.ink, lineHeight: 1.5 }}>
              {activity.title}
            </span>
            <span style={{ fontSize: 12, color: COLOR.label }}>
              {isEn ? activity.dateEn : activity.dateTh}
            </span>
          </div>
        ) : null}

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        {image && inSync ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL ที่เปลี่ยนทุกนาที ไม่มีอะไรให้ next/image ไปย่อ
          <img
            src={image}
            alt={t('QR Code')}
            width={280}
            height={280}
            style={{ width: 280, maxWidth: '100%', height: 'auto', borderRadius: 16, background: '#fff' }}
          />
        ) : (
          <Skeleton height={280} width={280} radius={16} />
        )}

        {/* รหัสตัวอักษรไว้ให้พิมพ์มือ เผื่อกล้องเครื่องไหนอ่าน QR ไม่ขึ้น */}
        <div style={{ display: 'grid', gap: 5, justifyItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: COLOR.label }}>{t('รหัสสำรองสำหรับกรอกเอง')}</span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '.16em',
              color: inSync ? COLOR.ink : COLOR.hint,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {inSync && token ? token.code : '••••••••••••'}
          </span>
        </div>

        {/* แถบเวลาถอยหลัง — บอกว่ารหัสนี้ยังใช้ได้อีกนานแค่ไหน */}
        <div style={{ width: '100%', maxWidth: 320, display: 'grid', gap: 7, justifyItems: 'center' }}>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={token?.ttlSec ?? 0}
            aria-valuenow={remainSec}
            aria-label={t('เวลาที่เหลือของรหัสนี้')}
            style={{ width: '100%', height: 6, borderRadius: 999, background: 'rgba(31,41,55,.08)', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${Math.round(ratio * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: remainSec <= 10 ? '#E4572E' : '#63D2A1',
                transition: 'width .25s linear',
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: COLOR.label }}>
            {inSync && token
              ? `${t('รหัสนี้หมดอายุใน')} ${remainSec} ${t('วินาที')}`
              : t('กำลังขอรหัส...')}
          </span>
        </div>

        <div className="nuv-no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <Button variant="secondary" icon="autorenew" onClick={rotate} disabled={rotating}>
            {rotating ? t('กำลังออกรหัสใหม่...') : t('ขอรหัสใหม่ทันที')}
          </Button>
          <Button variant="secondary" icon="print" onClick={() => window.print()} disabled={!inSync}>
            {t('พิมพ์')}
          </Button>
          <Button variant="secondary" icon="download" onClick={download} disabled={!inSync || !image}>
            {t('ดาวน์โหลด')}
          </Button>
          <Button variant="secondary" icon={copied ? 'check' : 'content_copy'} onClick={copyCode} disabled={!inSync}>
            {copied ? t('คัดลอกแล้ว') : t('คัดลอกรหัส')}
          </Button>
        </div>

        {/* ── สถานะของรหัสใบนี้ ── */}
        {inSync && token ? (
          <div
            style={{
              display: 'grid',
              gap: 4,
              width: '100%',
              maxWidth: 320,
              fontSize: 11.5,
              color: COLOR.label,
              paddingTop: 4,
              borderTop: '1px solid rgba(31,41,55,.08)',
            }}
          >
            <StatusLine label={t('ออกรหัสเมื่อ')} value={CLOCK_FMT.format(token.expiresAtMs - token.ttlSec * 1000)} />
            <StatusLine label={t('ใช้ได้ถึง')} value={CLOCK_FMT.format(token.expiresAtMs)} />
            <StatusLine label={t('สแกนได้')} value={t('ไม่จำกัดจำนวนคน จนกว่ารหัสจะหมดอายุ')} />
          </div>
        ) : null}
      </div>

      {/* ── การเช็กอินสด ── */}
      <div style={{ ...glass(22), padding: 18, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <Icon name="sensors" size={19} style={{ color: liveNow ? '#63D2A1' : COLOR.hint }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
            {t('การเช็กอินสด')}
          </span>
          <Badge
            tone={liveNow ? 'success' : 'neutral'}
            label={liveNow ? t('กำลังรับข้อมูล') : t('กำลังเชื่อมต่อ...')}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
          {[
            { label: 'รออยู่หน้างาน', value: counts.approved },
            { label: 'เช็กอินแล้ว', value: counts.checkedIn },
            { label: 'เช็กเอาต์แล้ว', value: counts.checkedOut },
          ].map((s) => (
            <div key={s.label} style={{ minWidth: 110 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.ink, lineHeight: 1.3 }}>
                {liveNow ? s.value : '—'}
              </div>
              <div style={{ fontSize: 11.5, color: COLOR.label }}>{t(s.label)}</div>
            </div>
          ))}
        </div>

        {!liveNow ? (
          <Skeleton height={54} radius={12} />
        ) : feed.length ? (
          <>
            <div className="nuv-tablewrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: COLOR.label, fontSize: 11.5, textAlign: 'start' }}>
                    <th style={{ textAlign: 'start', padding: '6px 9px', fontWeight: 500, width: 92 }}>
                      {t('เวลา')}
                    </th>
                    <th style={{ textAlign: 'start', padding: '6px 9px', fontWeight: 500 }}>{t('ชื่อ')}</th>
                    <th style={{ textAlign: 'start', padding: '6px 9px', fontWeight: 500, width: 108 }}>
                      {t('ประเภท')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shownFeed.map((f) => (
                    <tr key={`${f.registrationId}-${f.kind}`} style={{ borderTop: '1px solid rgba(31,41,55,.08)' }}>
                      <td
                        style={{
                          padding: '9px',
                          color: COLOR.label,
                          fontSize: 11.5,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {TIME_FMT.format(f.at)}
                      </td>
                      <td style={{ padding: '9px', color: COLOR.ink }}>
                        {f.studentName}
                        {f.studentId ? (
                          <span style={{ display: 'block', color: COLOR.label, fontSize: 11.5 }}>
                            {f.studentId}
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '9px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Badge
                            tone={f.kind === 'in' ? 'success' : 'purple'}
                            label={f.kind === 'in' ? t('เข้า') : t('ออก')}
                          />
                          {f.outOfRange ? <Badge tone="warning" label={t('นอกรัศมี')} /> : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {feed.length > LOG_PREVIEW ? (
              <Button
                variant="secondary"
                icon={logExpanded ? 'expand_less' : 'expand_more'}
                onClick={() => setLogExpanded((v) => !v)}
                full
              >
                {logExpanded
                  ? t('แสดงน้อยลง')
                  : `${t('ดูเพิ่มเติม')} (${feed.length - LOG_PREVIEW})`}
              </Button>
            ) : null}
          </>
        ) : (
          <span style={{ fontSize: 12.5, color: COLOR.hint }}>
            {t('ยังไม่มีใครสแกน — รายการจะขึ้นที่นี่ทันทีที่มีคนเช็กอิน')}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: COLOR.hint }}>
        <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        {t('รหัสจะเปลี่ยนเองทุกนาที ภาพถ่าย QR ที่ส่งต่อกันจึงใช้เช็กอินแทนกันไม่ได้')}
      </div>
    </div>
  );
}
