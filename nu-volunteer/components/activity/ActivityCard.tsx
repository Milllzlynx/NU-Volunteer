'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProviders';
import { Icon } from '@/components/ui';
import { COLOR, SEMANTIC } from '@/lib/design';

/**
 * การ์ดกิจกรรม — คอมโพเนนต์ที่ใช้ซ้ำได้ทุกหน้าที่แสดงรายการกิจกรรม
 *
 * รับ prop เป็นค่าพื้นฐานทีละตัว ไม่ผูกกับรูปร่างข้อมูลของฝั่งเซิร์ฟเวอร์
 * หน้าไหนที่มี PublicActivity อยู่แล้วให้แปลงผ่าน toActivityCardProps() ใน lib/activityCard.ts
 *
 * สไตล์ใช้โทเคนใน lib/design.ts เป็น inline style ตามข้อกำหนดใน DESIGN-SYSTEM.md §1
 * ชั้นสไตล์ 4 แบบ (พาสเทล/แคนดี้/นีออน/มินิมอล) จับคู่ด้วย selector [style*="..."]
 * ถ้าเปลี่ยนไปใช้ utility class ทั้งการ์ดจะไม่ตอบสนองต่อการเปลี่ยนสไตล์อีกต่อไป
 */

/** สถานะของผู้ใช้ต่อกิจกรรมนี้ — null คือยังไม่ได้ลงทะเบียน */
export type ActivityCardStatus = 'pending' | 'registered' | 'completed';

export interface ActivityCardProps {
  id: string;
  /** ชื่อกิจกรรม */
  title: string;
  /** ชื่อหมวดหมู่ที่แสดงบนป้าย */
  category: string;
  /**
   * สีประจำหมวดหมู่ (hex) — ป้ายหมวดหมู่ใช้สีนี้แบบจาง
   * หมวดหมู่แต่ละหมวดมีสีของตัวเองในฐานข้อมูล จึงไม่ตรึงเป็นสีเดียว
   */
  categoryColor?: string;
  location: string;
  /** วันที่จัดกิจกรรมแบบจัดรูปแบบแล้ว เช่น "20 ส.ค. 2569" */
  date: string;
  /** ช่วงเวลาแบบจัดรูปแบบแล้ว เช่น "07:00 - 11:00" */
  time?: string;
  imageUrl?: string | null;

  registeredSlots: number;
  totalSlots: number;
  /**
   * ที่นั่งคงเหลือ — ไม่ส่งมาก็คำนวณจาก totalSlots - registeredSlots ให้
   * (รับค่าจากภายนอกได้เผื่อหน้าไหนนับด้วยกติกาต่างออกไป)
   */
  leftSlots?: number;

  /** ชั่วโมงจิตอาสาที่จะได้รับจากกิจกรรมนี้ */
  hoursReward: number;
  /** เพดานชั่วโมงของกิจกรรม — ใส่เมื่อได้ไม่เท่ากันทุกคน จะแสดงเป็นช่วง */
  maxHours?: number;

  /** ยังไม่ถึงวันเปิดรับสมัคร — ปุ่มต้องปิด เพราะเซิร์ฟเวอร์จะปฏิเสธการสมัครอยู่ดี */
  notOpenYet?: boolean;
  /** วันที่เปิดรับสมัคร จัดรูปแบบมาแล้ว — ใช้บอกผู้ใช้ว่ารออีกถึงเมื่อไหร่ */
  regOpenDate?: string | null;

  status?: ActivityCardStatus | null;
  /**
   * false = ผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบ — การ์ดจะย่อลงเหลือเฉพาะข้อมูลที่ตัดสินใจได้
   * (ซ่อนที่นั่ง ชั่วโมง และปุ่มรายชื่อ/ความเห็น) ค่าเริ่มต้นเป็น true เพราะหน้าของนิสิต
   * ทุกหน้าอยู่หลังการเข้าสู่ระบบอยู่แล้ว มีแต่หน้าแรกที่ต้องส่งค่าจริงเข้ามา
   */
  signedIn?: boolean;
  isFavorite?: boolean;
  /** true = แสดงโครงร่างระหว่างรอข้อมูล */
  loading?: boolean;
  /** ปลายทางเมื่อคลิกภาพหรือชื่อกิจกรรม */
  href?: string;

  onFavoriteClick?: () => void | Promise<void>;
  onRegister?: () => void | Promise<void>;
  onViewDetails?: () => void;
  onViewParticipants?: () => void;
  onMessage?: () => void;
}

const STATUS_META: Record<ActivityCardStatus, { label: string; tone: 'warning' | 'success' | 'purple'; icon: string }> = {
  pending: { label: 'รออนุมัติ', tone: 'warning', icon: 'hourglass_top' },
  registered: { label: 'ลงทะเบียนแล้ว', tone: 'success', icon: 'check_circle' },
  completed: { label: 'เสร็จสิ้น', tone: 'purple', icon: 'verified' },
};

export function ActivityCard(props: ActivityCardProps) {
  const { t } = useApp();
  const {
    id,
    title,
    category,
    categoryColor = '#63D2A1',
    location,
    date,
    time,
    imageUrl,
    registeredSlots,
    totalSlots,
    leftSlots,
    hoursReward,
    maxHours,
    notOpenYet = false,
    regOpenDate = null,
    status = null,
    signedIn = true,
    isFavorite = false,
    loading = false,
    href,
    onFavoriteClick,
    onRegister,
    onViewDetails,
    onViewParticipants,
    onMessage,
  } = props;

  const [favBusy, setFavBusy] = useState(false);
  const [regBusy, setRegBusy] = useState(false);

  if (loading) return <ActivityCardSkeleton />;

  const remaining = leftSlots ?? Math.max(0, totalSlots - registeredSlots);
  const pct = totalSlots > 0 ? Math.min(100, Math.round((registeredSlots / totalSlots) * 100)) : 0;
  const full = totalSlots > 0 && remaining <= 0;
  const meta = status ? STATUS_META[status] : null;

  /** สีแถบความคืบหน้า: เขียวปกติ ส้มเมื่อใกล้เต็ม แดงเมื่อเต็ม — ไม่ต้องอ่านตัวเลขก็รู้ */
  const barColor = pct >= 100 ? SEMANTIC.danger.dot : pct >= 80 ? SEMANTIC.warning.dot : SEMANTIC.success.dot;

  const run = async (fn: (() => void | Promise<void>) | undefined, setBusy: (v: boolean) => void) => {
    if (!fn) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const media = (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="nuv-card-photo"
          style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          className="nuv-card-photo"
          style={{
            width: '100%',
            height: 170,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(140deg, ${categoryColor}33, ${categoryColor}14)`,
            color: categoryColor,
          }}
        >
          <Icon name="volunteer_activism" size={40} fill />
        </div>
      )}
      {/* ไล่เฉดล่างภาพ ให้ป้ายและหัวใจอ่านออกบนภาพทุกโทน */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetInline: 0,
          bottom: 0,
          height: 64,
          background: 'linear-gradient(to top, rgba(20,16,28,.42), rgba(20,16,28,0))',
          pointerEvents: 'none',
        }}
      />
    </>
  );

  return (
    <article
      className="nuv-card"
      style={{
        background: 'rgba(255,255,255,.78)',
        backdropFilter: 'blur(26px) saturate(180%)',
        WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        border: '1px solid rgba(255,255,255,.85)',
        borderRadius: 20,
        boxShadow: '0 12px 34px rgba(31,41,55,.09)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── ภาพหัวการ์ด ── */}
      <div className="nuv-card-media" style={{ position: 'relative', overflow: 'hidden' }}>
        {href ? (
          <Link href={href} aria-label={title} style={{ display: 'block' }}>
            {media}
          </Link>
        ) : (
          <div style={{ display: 'block' }}>{media}</div>
        )}

        {/* ป้ายสถานะที่นั่งมุมซ้ายบน */}
        <div style={{ position: 'absolute', top: 10, insetInlineStart: 10, maxWidth: 'calc(60% - 12px)' }}>
          <Pill
            bg={
              notOpenYet
                ? SEMANTIC.neutral.dot
                : full
                  ? SEMANTIC.danger.dot
                  : pct >= 80
                    ? SEMANTIC.warning.dot
                    : SEMANTIC.success.dot
            }
            label={
              notOpenYet
                ? t('ยังไม่เปิดรับสมัคร')
                : full
                  ? t('ที่นั่งเต็ม')
                  : pct >= 80
                    ? t('ใกล้เต็ม')
                    : t('เปิดรับสมัคร')
            }
          />
        </div>

        {/*
          ป้ายสถานะการลงทะเบียนของผู้ใช้ ชิดขวา
          หัวใจรายการโปรดจองมุมขวาบนไว้ ป้ายจึงลงมาอยู่ใต้หัวใจเมื่อมีหัวใจแสดงอยู่
          ถ้าไม่มีหัวใจ (เช่น ผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบ) ป้ายขึ้นไปอยู่มุมบนแทน
          ป้ายอยู่คนละแถวกับป้ายที่นั่งมุมซ้ายแล้ว จึงกว้างได้มากกว่าเดิม
        */}
        {meta ? (
          <div
            style={{
              position: 'absolute',
              top: onFavoriteClick ? 52 : 10,
              insetInlineEnd: 10,
              maxWidth: onFavoriteClick ? 'calc(70% - 12px)' : 'calc(40% - 12px)',
            }}
          >
            <Pill bg={SEMANTIC[meta.tone].dot} label={t(meta.label)} icon={meta.icon} />
          </div>
        ) : null}

        {/* หัวใจรายการโปรด — วงกลมขาวมุมขวาบนของภาพ */}
        {onFavoriteClick ? (
          <button
            type="button"
            onClick={() => run(onFavoriteClick, setFavBusy)}
            disabled={favBusy}
            aria-pressed={isFavorite}
            title={isFavorite ? t('นำออกจากรายการโปรด') : t('เพิ่มในรายการโปรด')}
            aria-label={isFavorite ? t('นำออกจากรายการโปรด') : t('เพิ่มในรายการโปรด')}
            style={favButton}
          >
            <Icon
              name={favBusy ? 'progress_activity' : 'favorite'}
              size={19}
              fill={isFavorite}
              style={{
                color: isFavorite ? '#E4572E' : COLOR.label,
                animation: favBusy ? 'nuSpin 1s linear infinite' : undefined,
              }}
            />
          </button>
        ) : null}
      </div>

      {/* ── เนื้อหา ── */}
      <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <span
          style={{
            alignSelf: 'flex-start',
            padding: '5px 12px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 500,
            color: categoryColor,
            background: `${categoryColor}22`,
          }}
        >
          {category}
        </span>

        {href ? (
          <Link href={href} style={{ color: 'inherit' }}>
            <h3 style={titleStyle}>{title}</h3>
          </Link>
        ) : (
          <h3 style={titleStyle}>{title}</h3>
        )}

        {location ? (
          <div style={metaRow}>
            <Icon name="place" size={15} style={{ flexShrink: 0 }} />
            <span style={ellipsis}>{location}</span>
          </div>
        ) : null}

        <div style={metaRow}>
          <Icon name="calendar_today" size={15} style={{ flexShrink: 0 }} />
          <span style={ellipsis}>{time ? `${date} · ${time} ${t('น.')}` : date}</span>
        </div>

        {/*
          ชั่วโมงจิตอาสาและแถบที่นั่งเป็นข้อมูลของคนที่ลงทะเบียนได้จริง
          ผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบจึงเห็นแค่ว่ากิจกรรมคืออะไร ที่ไหน เมื่อไร
          แล้วค่อยไปดูรายละเอียดเต็มหรือเข้าสู่ระบบเอา
        */}
        {signedIn ? (
          <div style={metaRow}>
            <Icon name="schedule" size={15} style={{ flexShrink: 0 }} />
            <span>
              {maxHours && maxHours !== hoursReward
                ? `${hoursReward}-${maxHours} ${t('ชม.')}`
                : `${hoursReward} ${t('ชม.')}`}
            </span>
          </div>
        ) : null}

        {/* ── แถบที่นั่ง ── */}
        {signedIn && totalSlots > 0 ? (
          <div style={{ display: 'grid', gap: 6, marginTop: 2 }}>
            <div
              role="progressbar"
              aria-valuenow={registeredSlots}
              aria-valuemin={0}
              aria-valuemax={totalSlots}
              aria-label={t('ที่นั่งที่ลงทะเบียนแล้ว')}
              style={{ height: 7, borderRadius: 999, background: 'rgba(31,41,55,.1)', overflow: 'hidden' }}
            >
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: barColor, transition: 'width 320ms ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: COLOR.label }}>
              <span>{full ? t('ที่นั่งเต็ม') : `${t('เหลือ')} ${remaining} ${t('ที่นั่ง')}`}</span>
              <span style={{ color: COLOR.hint }}>{`${registeredSlots}/${totalSlots}`}</span>
            </div>
          </div>
        ) : null}

        {/* ── ปุ่มดำเนินการ ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
          {status ? (
            <span style={{ ...mainButton, background: SEMANTIC[STATUS_META[status].tone].bg, color: SEMANTIC[STATUS_META[status].tone].color, cursor: 'default' }}>
              <Icon name={STATUS_META[status].icon} size={17} />
              {t(STATUS_META[status].label)}
            </span>
          ) : onRegister ? (
            <button
              type="button"
              onClick={() => run(onRegister, setRegBusy)}
              disabled={regBusy || full || notOpenYet}
              title={notOpenYet && regOpenDate ? `${t('เปิดรับสมัคร')} ${regOpenDate}` : undefined}
              style={{
                ...mainButton,
                opacity: regBusy || full || notOpenYet ? 0.55 : 1,
                cursor: full || notOpenYet ? 'not-allowed' : 'pointer',
              }}
            >
              <Icon
                name={
                  regBusy
                    ? 'progress_activity'
                    : notOpenYet
                      ? 'lock_clock'
                      : full
                        ? 'block'
                        : 'how_to_reg'
                }
                size={17}
                style={regBusy ? { animation: 'nuSpin 1s linear infinite' } : undefined}
              />
              {notOpenYet
                ? regOpenDate
                  ? `${t('เปิดรับสมัคร')} ${regOpenDate}`
                  : t('ยังไม่เปิดรับสมัคร')
                : full
                  ? t('ที่นั่งเต็ม')
                  : t('ลงทะเบียน')}
            </button>
          ) : href ? (
            <Link href={href} style={{ ...mainButton, textDecoration: 'none' }}>
              <Icon name="arrow_forward" size={17} />
              {t('ดูรายละเอียด')}
            </Link>
          ) : null}

          {/*
            ทั้งสามปุ่มพาไปหน้าเต็มของตัวเอง — รายละเอียด รายชื่อผู้เข้าร่วม และรีวิว
            เดิมสองปุ่มหลังเปิดลิ้นชักคาหน้ารายการ ซึ่งบีบเนื้อหายาว ๆ ลงในคอลัมน์แคบ
            และไม่มีลิงก์ให้แชร์หรือกดถอยหลังกลับ พอเป็นหน้าจริงแล้วได้ทั้งสองอย่าง
            หน้าไหนอยากคุมเองก็ยังส่ง onViewParticipants / onMessage มาแทนที่พฤติกรรมนี้ได้
          */}
          <IconAction icon="visibility" label={t('ดูรายละเอียด')} onClick={onViewDetails} href={!onViewDetails ? href : undefined} />

          {/* รายชื่อผู้เข้าร่วมและความเห็นเปิดให้เฉพาะผู้ที่เข้าสู่ระบบ ปุ่มจึงไม่ต้องมีสำหรับผู้เยี่ยมชม */}
          {signedIn ? (
            <>
              <IconAction
                icon="groups"
                label={t('ผู้เข้าร่วม')}
                onClick={onViewParticipants}
                href={!onViewParticipants ? `/activities/${id}/participants` : undefined}
              />
              <IconAction
                icon="forum"
                label={t('ความเห็น')}
                onClick={onMessage}
                href={!onMessage ? `/activities/${id}/reviews` : undefined}
              />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ───────────────── สถานะรอข้อมูลและสถานะว่าง ───────────────── */

/** โครงร่างระหว่างรอข้อมูล — สูงเท่าการ์ดจริงเพื่อไม่ให้หน้ากระตุกตอนข้อมูลมาถึง */
export function ActivityCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'rgba(255,255,255,.6)',
        border: '1px solid rgba(255,255,255,.8)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <div className="nuv-sk" style={{ height: 170 }} />
      <div style={{ padding: 15, display: 'grid', gap: 10 }}>
        <div className="nuv-sk" style={{ height: 20, width: 110, borderRadius: 999 }} />
        <div className="nuv-sk" style={{ height: 17, width: '85%', borderRadius: 8 }} />
        <div className="nuv-sk" style={{ height: 13, width: '60%', borderRadius: 8 }} />
        <div className="nuv-sk" style={{ height: 7, width: '100%', borderRadius: 999 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="nuv-sk" style={{ height: 38, flex: 1, borderRadius: 12 }} />
          <div className="nuv-sk" style={{ height: 38, width: 38, borderRadius: 12 }} />
          <div className="nuv-sk" style={{ height: 38, width: 38, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

/** ใช้แทนกริดทั้งหมดเมื่อไม่มีกิจกรรมให้แสดง */
export function ActivityCardEmpty({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        padding: '48px 22px',
        textAlign: 'center',
        background: 'rgba(255,255,255,.6)',
        border: '1px solid rgba(255,255,255,.8)',
        borderRadius: 20,
      }}
    >
      <Icon name="event_busy" size={38} style={{ color: '#CBD5E1' }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.ink, marginTop: 12 }}>{title}</div>
      {desc ? (
        <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 6, lineHeight: 1.8, maxWidth: 420, marginInline: 'auto' }}>
          {desc}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

/* ───────────────── ชิ้นส่วนย่อย ───────────────── */

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: COLOR.ink,
  lineHeight: 1.5,
  margin: 0,
  textWrap: 'pretty',
};

const metaRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  color: COLOR.label,
  minWidth: 0,
};

const ellipsis: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const favButton: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  insetInlineEnd: 10,
  width: 36,
  height: 36,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'rgba(255,255,255,.9)',
  boxShadow: '0 4px 12px rgba(31,41,55,.18)',
  cursor: 'pointer',
};

const mainButton: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg,#E97171,#A774F7)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/** ป้ายบนภาพ — พื้นทึบเพื่อให้อ่านออกบนภาพทุกโทน */
function Pill({ bg, label, icon }: { bg: string; label: string; icon?: string }) {
  return (
    <span
      className="nuv-keep"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 11px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: '#fff',
        boxShadow: '0 4px 12px rgba(31,41,55,.22)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {label}
    </span>
  );
}

/** ปุ่มไอคอน — เป็นลิงก์เมื่อไม่ได้ส่ง onClick มา จะได้เปิดแท็บใหม่ได้ตามปกติ */
function IconAction({
  icon,
  label,
  onClick,
  href,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  if (!onClick && !href) return null;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 12,
    border: '1px solid rgba(31,41,55,.1)',
    background: 'rgba(255,255,255,.6)',
    color: COLOR.body,
    cursor: 'pointer',
  };

  if (onClick) {
    return (
      <button type="button" className="nuv-iconbtn" onClick={onClick} title={label} aria-label={label} style={style}>
        <Icon name={icon} size={19} />
      </button>
    );
  }

  return (
    <Link href={href!} className="nuv-iconbtn" title={label} aria-label={label} style={style}>
      <Icon name={icon} size={19} />
    </Link>
  );
}
