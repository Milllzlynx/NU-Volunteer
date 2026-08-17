'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoGallery } from '@/components/activity/PhotoGallery';
import { EvidenceUploadDialog } from '@/components/student/EvidenceUploadDialog';
import { useApp } from '@/components/providers/AppProviders';
import { Badge, Button, ErrorNote, Icon, SuccessNote } from '@/components/ui';
import { activityApi, errorMessage } from '@/lib/api';
import { COLOR, SEMANTIC, glass, regStatusMeta, seatStatus } from '@/lib/design';
import type { ActivityDetailView } from '@/lib/activityDetail';

/** ไอคอนของสิทธิประโยชน์ — ไล่ตามลำดับ ไม่ผูกกับข้อความ เพราะผู้จัดพิมพ์เองได้อิสระ */
const PERK_ICONS = ['workspace_premium', 'restaurant', 'card_giftcard', 'local_activity', 'emoji_events'];

export function ActivityDetail({
  activity,
  signedIn,
}: {
  activity: ActivityDetailView;
  signedIn: boolean;
}) {
  const { t, isEn } = useApp();
  const router = useRouter();
  const a = activity;

  const [status, setStatus] = useState(a.myRegistration?.status ?? null);
  /** สถานะหลักฐานใบล่าสุด — เก็บเป็น state เพื่อให้ปุ่มเปลี่ยนทันทีหลังส่ง ไม่ต้องรอโหลดหน้าใหม่ */
  const [evidenceStatus, setEvidenceStatus] = useState(a.myRegistration?.evidenceStatus ?? null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fav, setFav] = useState(a.favorited);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  /* ภาพแผนที่มาจากปลายทางภายนอก จึงต้องรับมือกรณีโหลดไม่ขึ้นด้วย */
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);

  /** คัดลอกที่อยู่ไว้วางในแอปแผนที่หรือส่งต่อให้คนที่เดินทางไปด้วยกัน */
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(a.location);
      setAddressCopied(true);
      window.setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      // เบราว์เซอร์ไม่ให้สิทธิ์คลิปบอร์ด — ที่อยู่ยังอ่านและเลือกคัดลอกเองได้จากข้างปุ่ม
    }
  };

  // ยังไม่เปิดรับสมัครไม่ใช่ "ปิดรับสมัคร" — ที่นั่งยังว่างอยู่ตามจริง ป้ายจึงไม่ควรขึ้นว่าปิด
  const seats = seatStatus(a.seatsFilled, a.seatsTotal, a.closed && !a.notOpenYet);
  const remaining = Math.max(0, a.seatsTotal - a.seatsFilled);
  const pct = a.seatsTotal > 0 ? Math.min(100, Math.round((a.seatsFilled / a.seatsTotal) * 100)) : 0;
  const reg = status ? regStatusMeta(status, evidenceStatus) : null;
  /** เตือนเมื่อเหลือเวลารับสมัครไม่ถึงสัปดาห์ — ตรงกับเกณฑ์ที่ใช้ในหน้าแจ้งเตือน */
  const closingSoon = a.daysLeft != null && a.daysLeft >= 0 && a.daysLeft <= 7;

  const register = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await activityApi.apply(a.id);
      setStatus(res.registration.status);
      setNotice(t('ลงทะเบียนเรียบร้อยแล้ว'));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFav((v) => !v);
    try {
      const res = await activityApi.toggleFavorite(a.id);
      setFav(res.favorited);
      router.refresh();
    } catch (e) {
      setFav((v) => !v);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /** แชร์ผ่านเมนูของระบบถ้ามี ไม่มีก็คัดลอกลิงก์ให้แทน */
  const share = async () => {
    const url = window.location.href;
    setError(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: a.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice(t('คัดลอกลิงก์กิจกรรมแล้ว'));
    } catch {
      // ผู้ใช้กดยกเลิกเมนูแชร์เอง ไม่ใช่ข้อผิดพลาดที่ต้องแจ้ง
    }
  };

  const canRegister = signedIn && !status && !a.closed && seats.key !== 'full';

  /**
   * ส่งหลักฐานได้ตอนเช็กเอาต์แล้วและยังไม่มีใบที่ผู้จัดผ่านให้ — เงื่อนไขเดียวกับ
   * หน้ารายการลงทะเบียนและกับที่ฝั่งเซิร์ฟเวอร์ตรวจ ปุ่มจึงไม่มีทางโผล่มาให้กดแล้วโดนปฏิเสธ
   */
  const canSubmitEvidence = status === 'checked-out' && evidenceStatus !== 'approved';
  const awaitingReview = status === 'checked-out' && evidenceStatus === 'pending';

  const info: { icon: string; label: string; value: string }[] = [
    { icon: 'calendar_today', label: t('วันที่จัดกิจกรรม'), value: isEn ? a.dateEn : a.dateTh },
    ...(a.days > 1
      ? [
          {
            icon: 'date_range',
            label: t('ระยะเวลา'),
            value: `${t('ถึง')} ${isEn ? a.endDateEn : a.endDateTh} · ${a.days} ${t('วัน')}`,
          },
        ]
      : []),
    { icon: 'schedule', label: t('เวลา'), value: `${a.time} ${t('น.')}` },
    // ชั่วโมงจิตอาสาและจำนวนที่รับเป็นข้อมูลของคนที่ลงทะเบียนได้จริง — ซ่อนจากผู้เยี่ยมชม
    // ให้ตรงกับการ์ดกิจกรรมที่ย่อรายละเอียดชุดเดียวกันนี้ออกไปแล้ว
    ...(signedIn
      ? [{ icon: 'hourglass_top', label: t('ชั่วโมงจิตอาสา'), value: `${a.hours} ${t('ชม.')}` }]
      : []),
    { icon: 'place', label: t('สถานที่'), value: a.location || '—' },
    { icon: 'apartment', label: t('ผู้จัดกิจกรรม'), value: a.orgName || a.organizerName },
    ...(signedIn
      ? [
          {
            icon: 'groups',
            label: t('จำนวนที่รับ'),
            value: a.seatsTotal > 0 ? `${a.seatsTotal} ${t('ที่นั่ง')}` : t('ไม่จำกัด'),
          },
        ]
      : []),
  ];

  if (a.regOpenTh || a.regCloseTh) {
    const from = isEn ? a.regOpenEn : a.regOpenTh;
    const to = isEn ? a.regCloseEn : a.regCloseTh;
    info.push({
      icon: 'event_available',
      label: t('ช่วงเปิดรับสมัคร'),
      value: from && to ? `${from} - ${to}` : (to ?? from ?? '—'),
    });
  }

  /** ลำดับเหตุการณ์ของกิจกรรม — ทำจากวันที่ที่มีอยู่แล้ว ไม่ต้องมีตารางกำหนดการแยก */
  const timeline = [
    a.regOpenTh ? { icon: 'lock_open', label: t('เปิดรับสมัคร'), value: isEn ? a.regOpenEn! : a.regOpenTh } : null,
    a.regCloseTh ? { icon: 'lock_clock', label: t('ปิดรับสมัคร'), value: isEn ? a.regCloseEn! : a.regCloseTh } : null,
    { icon: 'play_circle', label: t('วันจัดกิจกรรม'), value: `${isEn ? a.dateEn : a.dateTh} · ${a.time} ${t('น.')}` },
    signedIn ? { icon: 'verified', label: t('รับรองชั่วโมง'), value: `${a.hours} ${t('ชม.')}` } : null,
  ].filter((x): x is { icon: string; label: string; value: string } => x != null);

  return (
    <div className="nuv-print-root" style={{ display: 'grid', gap: 16 }}>
      {uploadOpen && a.myRegistration ? (
        <EvidenceUploadDialog
          registrationId={a.myRegistration.id}
          activityTitle={a.title}
          resubmit={evidenceStatus === 'rejected'}
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false);
            setEvidenceStatus('pending');
            setNotice(t('ส่งหลักฐานแล้ว รอผู้จัดตรวจ'));
            router.refresh();
          }}
        />
      ) : null}

      {/* ปุ่มย้อนกลับ — ใช้ประวัติเบราว์เซอร์ จะได้กลับไปหน้าที่มาจริง ๆ ไม่ใช่หน้าใดหน้าหนึ่งตายตัว */}
      <div className="nuv-no-print">
        <Button variant="secondary" icon="arrow_back" onClick={() => router.back()} style={{ padding: '9px 15px' }}>
          {t('กลับไปหน้าก่อนหน้า')}
        </Button>
      </div>

      {/* ── ภาพหัวเรื่อง ── */}
      <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', ...glass(22) }}>
        {a.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ภาพอัปโหลด/ปลายทางภายนอก
          <img src={a.photo} alt="" className="nuv-detail-hero" style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div
            className="nuv-detail-hero"
            style={{
              height: 420,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(140deg, ${a.category.color}33, ${a.category.color}14)`,
              color: a.category.color,
            }}
          >
            <Icon name="volunteer_activism" size={64} fill />
          </div>
        )}

        {/* ป้ายหมวดหมู่มุมซ้ายบน — กดแล้วไปดูกิจกรรมอื่นในหมวดเดียวกัน */}
        <Link
          href={`/activities/category/${a.category.id}`}
          className="nuv-keep"
          title={t('ดูกิจกรรมทั้งหมดในหมวดนี้')}
          style={{
            position: 'absolute',
            top: 16,
            insetInlineStart: 16,
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: a.category.color,
            color: '#fff',
            boxShadow: '0 5px 14px rgba(31,41,55,.25)',
          }}
        >
          {isEn && a.category.labelEn ? a.category.labelEn : a.category.label}
        </Link>

        {/* หัวใจรายการโปรดมุมขวาบนของภาพ */}
        {signedIn ? (
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={busy}
            aria-pressed={fav}
            title={fav ? t('นำออกจากรายการโปรด') : t('เพิ่มในรายการโปรด')}
            aria-label={fav ? t('นำออกจากรายการโปรด') : t('เพิ่มในรายการโปรด')}
            className="nuv-no-print"
            style={{
              position: 'absolute',
              top: 16,
              insetInlineEnd: 16,
              width: 42,
              height: 42,
              borderRadius: 14,
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,.92)',
              boxShadow: '0 5px 16px rgba(31,41,55,.22)',
              cursor: 'pointer',
            }}
          >
            <Icon name="favorite" size={21} fill={fav} style={{ color: fav ? '#E4572E' : COLOR.label }} />
          </button>
        ) : null}

        {/* ชื่อกิจกรรมทับบนภาพ — ไล่เฉดดำด้านล่างให้ตัวอักษรอ่านออกทุกภาพ */}
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 0,
            padding: '52px 20px 18px',
            background: 'linear-gradient(to top, rgba(20,16,28,.82), rgba(20,16,28,0))',
          }}
        >
          <h1 className="nuv-keep" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.4, textWrap: 'pretty' }}>
            {a.title}
          </h1>
          {a.orgName ? (
            <div className="nuv-keep" style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', marginTop: 5 }}>
              {a.orgName}
            </div>
          ) : null}
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>
      <SuccessNote>{notice}</SuccessNote>

      {/*
        ทางไปหน้ารายชื่อผู้เข้าร่วมและหน้ารีวิว — เป็นหน้าเต็มของตัวเอง ไม่ใช่ลิ้นชักคาหน้านี้
        ส่วนย่อของทั้งสองยังอยู่ด้านล่างของหน้านี้ ปุ่มนี้ไว้ให้คนที่อยากดูเต็ม ๆ ไม่ต้องเลื่อนหา
        ทั้งสองหน้าเปิดให้เฉพาะผู้ที่เข้าสู่ระบบเห็นเนื้อหาเต็ม ปุ่มจึงขึ้นเฉพาะตอนล็อกอินแล้ว
      */}
      {signedIn ? (
        <div className="nuv-no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={`/activities/${a.id}/participants`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon="groups" style={{ padding: '10px 16px' }}>
              {`${t('ดูรายชื่อผู้เข้าร่วม')} (${a.seatsFilled})`}
            </Button>
          </Link>
          <Link href={`/activities/${a.id}/reviews`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon="reviews" style={{ padding: '10px 16px' }}>
              {`${t('ดูรีวิวทั้งหมด')} (${a.reviews.length})`}
            </Button>
          </Link>
        </div>
      ) : null}

      {/* ── สองคอลัมน์: เนื้อหา + แถบข้าง ── */}
      <div
        className="nuv-detail-grid"
        style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: 16, alignItems: 'start' }}
      >
        {/* ═══ คอลัมน์ซ้าย ═══ */}
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Section icon="description" title={t('รายละเอียดกิจกรรม')}>
            {a.description ? (
              <p style={{ fontSize: 13.5, color: COLOR.body, lineHeight: 1.95, margin: 0, whiteSpace: 'pre-line', textWrap: 'pretty' }}>
                {a.description}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: COLOR.hint, margin: 0 }}>{t('ผู้จัดยังไม่ได้ระบุรายละเอียด')}</p>
            )}

            {a.location ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, fontSize: 13, color: COLOR.body }}>
                <Icon name="place" size={18} style={{ color: '#7C2FD9', flexShrink: 0 }} />
                <span>{a.location}</span>
              </div>
            ) : null}
          </Section>

          {/* สิทธิประโยชน์ */}
          {a.perks.length ? (
            <Section icon="redeem" title={t('สิทธิประโยชน์ที่ได้รับ')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                {a.perks.map((perk, i) => (
                  <div
                    key={perk}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: 13,
                      borderRadius: 14,
                      background: 'rgba(99,210,161,.14)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Icon name={PERK_ICONS[i % PERK_ICONS.length]} size={20} style={{ color: SEMANTIC.success.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.7 }}>{perk}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* สิ่งที่ต้องเตรียม */}
          {a.prep.length ? (
            <Section icon="checklist" title={t('สิ่งที่ต้องเตรียม')}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                {a.prep.map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(167,116,247,.18)',
                        color: '#7C2FD9',
                      }}
                    >
                      <Icon name="check" size={15} />
                    </span>
                    <span style={{ fontSize: 13, color: COLOR.body, lineHeight: 1.75 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* หมายเหตุพิเศษ — ข้อความอิสระจากผู้จัด แสดงตามบรรทัดที่พิมพ์มา */}
          {a.notes ? (
            <Section icon="sticky_note_2" title={t('หมายเหตุพิเศษ')}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: COLOR.body,
                  lineHeight: 1.9,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {a.notes}
              </p>
            </Section>
          ) : null}

          {/* ภาพประกอบ */}
          {a.gallery.length ? (
            <Section icon="photo_library" title={t('ภาพประกอบกิจกรรม')}>
              <PhotoGallery photos={a.gallery} title={a.title} />
            </Section>
          ) : null}

          {/* แผนที่ — ภาพนิ่งพร้อมลิงก์ออกไป Google Maps ไม่ต้องใช้ API key และไม่ส่งผู้ใช้ไปให้บุคคลที่สามตอนโหลดหน้า */}
          <Section icon="map" title={t('แผนที่สถานที่จัดกิจกรรม')}>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(31,41,55,.1)' }}>
              {/* กล่องข้อมูลมุมซ้ายบนของแผนที่ — ปุ่มเปิดแผนที่กับพิกัด อยู่ตรงที่ผู้ใช้มองหาก่อน */}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  insetInlineStart: 10,
                  zIndex: 1,
                  padding: 10,
                  borderRadius: 13,
                  background: 'rgba(255,255,255,.93)',
                  boxShadow: '0 6px 18px rgba(31,41,55,.18)',
                  display: 'grid',
                  gap: 6,
                  maxWidth: 'calc(100% - 20px)',
                }}
              >
                <a href={a.mapLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: '#7C2FD9' }}>
                  <Icon name="open_in_new" size={16} />
                  {t('เปิดใน Google Maps')}
                </a>
                {a.lat != null && a.lng != null ? (
                  <span style={{ fontSize: 11, color: COLOR.label, letterSpacing: 0.2 }}>
                    {`${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}`}
                  </span>
                ) : null}
              </div>

              {a.mapImage && !mapFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- ภาพแผนที่ที่ผู้จัดอัปโหลด
                <img
                  key={mapAttempt}
                  src={a.mapImage}
                  alt={t('แผนที่สถานที่จัดกิจกรรม')}
                  onError={() => setMapFailed(true)}
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
              ) : a.mapImage && mapFailed ? (
                /* โหลดภาพแผนที่ไม่สำเร็จ — บอกให้ชัดและให้ลองใหม่ได้ ปุ่มเปิดใน Google Maps ยังใช้ได้ตามปกติ */
                <div
                  role="status"
                  style={{
                    height: 220,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: SEMANTIC.warning.bg,
                    color: SEMANTIC.warning.color,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <Icon name="wrong_location" size={34} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t('ตอนนี้โหลดแผนที่ไม่ได้')}</span>
                  <span style={{ fontSize: 12, color: COLOR.body, lineHeight: 1.7, maxWidth: 320 }}>
                    {t('ยังเปิดดูตำแหน่งได้จากปุ่มด้านล่าง หรือกดโหลดแผนที่ใหม่อีกครั้ง')}
                  </span>
                  <Button
                    variant="secondary"
                    icon="refresh"
                    onClick={() => {
                      setMapFailed(false);
                      setMapAttempt((n) => n + 1);
                    }}
                    style={{ padding: '8px 14px' }}
                  >
                    {t('โหลดแผนที่ใหม่')}
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    height: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'rgba(31,41,55,.05)',
                    color: COLOR.hint,
                  }}
                >
                  <Icon name="map" size={34} />
                  <span style={{ fontSize: 12.5 }}>{t('ยังไม่มีภาพแผนที่')}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <a href={a.mapLink} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" icon="open_in_new" style={{ padding: '10px 15px' }}>
                  {t('เปิดใน Google Maps')}
                </Button>
              </a>
              {a.location ? (
                <Button
                  variant="secondary"
                  icon={addressCopied ? 'check' : 'content_copy'}
                  onClick={copyAddress}
                  style={{ padding: '10px 15px' }}
                >
                  {addressCopied ? t('คัดลอกที่อยู่แล้ว') : t('คัดลอกที่อยู่')}
                </Button>
              ) : null}
              {a.location ? (
                <span style={{ fontSize: 11.5, color: COLOR.hint, flex: 1, minWidth: 140 }}>{a.location}</span>
              ) : null}
            </div>
          </Section>

          {/* ลำดับเหตุการณ์ */}
          <Section icon="timeline" title={t('กำหนดการ')}>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 0 }}>
              {timeline.map((row, i) => (
                <li key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* เส้นเชื่อมจุด — จุดสุดท้ายไม่ต้องมีหางต่อ */}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(167,116,247,.16)',
                        color: '#7C2FD9',
                      }}
                    >
                      <Icon name={row.icon} size={16} />
                    </span>
                    {i < timeline.length - 1 ? (
                      <span aria-hidden="true" style={{ width: 2, flex: 1, minHeight: 18, background: 'rgba(167,116,247,.25)' }} />
                    ) : null}
                  </span>
                  <span style={{ minWidth: 0, paddingBottom: i < timeline.length - 1 ? 14 : 0 }}>
                    <span style={{ display: 'block', fontSize: 11.5, color: COLOR.hint }}>{row.label}</span>
                    <span style={{ display: 'block', fontSize: 13, color: COLOR.ink, marginTop: 2, lineHeight: 1.6 }}>
                      {row.value}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          {/* รีวิวจากผู้ที่เคยเข้าร่วม — เปิดให้เฉพาะผู้ที่เข้าสู่ระบบ ตรงกับปุ่มความเห็นบนการ์ด */}
          {signedIn && a.reviews.length ? (
            <Section icon="reviews" title={t('รีวิวจากผู้เข้าร่วม')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: COLOR.ink }}>{a.ratingAvg}</span>
                <Stars value={Math.round(a.ratingAvg ?? 0)} />
                <span style={{ fontSize: 12, color: COLOR.label }}>
                  {`${a.reviews.length} ${t('รีวิว')}`}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {a.reviews.map((r) => (
                  <div key={r.id} style={{ padding: 13, borderRadius: 14, background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.75)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink }}>{r.author}</span>
                      <Stars value={r.stars} />
                      <span style={{ fontSize: 11, color: COLOR.hint, marginInlineStart: 'auto' }}>
                        {isEn ? r.dateEn : r.dateTh}
                      </span>
                    </div>
                    {r.comment ? (
                      <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 7, lineHeight: 1.8 }}>{r.comment}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/*
            ผู้เข้าร่วม — ทั้งส่วนเปิดให้เฉพาะผู้ที่เข้าสู่ระบบ ตรงกับปุ่มรายชื่อบนการ์ด
            เดิมส่วนนี้แสดงจำนวนรวมให้ผู้เยี่ยมชมเห็นพร้อมข้อความชวนเข้าสู่ระบบ
          */}
          {signedIn ? (
          <div id="participants" style={{ scrollMarginTop: 90 }}>
            <Section icon="groups" title={t('ผู้เข้าร่วม')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: COLOR.ink }}>{a.seatsFilled}</span>
                <span style={{ fontSize: 13, color: COLOR.label }}>
                  {a.seatsTotal > 0 ? `${t('จาก')} ${a.seatsTotal} ${t('ที่นั่ง')}` : t('ที่นั่ง')}
                </span>
                <Badge tone={seats.key === 'full' ? 'danger' : 'success'} dot label={t(seats.label)} style={{ marginInlineStart: 'auto' }} />
              </div>
              {a.canSeeParticipants ? (
                a.participants.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {a.participants.map((p) => (
                      <span
                        key={p.id}
                        title={p.faculty ?? undefined}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '6px 12px 6px 6px',
                          borderRadius: 999,
                          background: 'rgba(255,255,255,.7)',
                          border: '1px solid rgba(31,41,55,.08)',
                          fontSize: 12.5,
                          color: COLOR.body,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(167,116,247,.18)',
                            color: '#7C2FD9',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {p.name.trim().charAt(0)}
                        </span>
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: COLOR.hint, marginTop: 12 }}>
                    {t('ยังไม่มีผู้เข้าร่วมกิจกรรมนี้')}
                  </div>
                )
              ) : (
                <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 12, lineHeight: 1.8 }}>
                  {t('เข้าสู่ระบบเพื่อดูรายชื่อผู้เข้าร่วม')}
                </div>
              )}

              {/* ไม่แสดงอีเมลหรือเบอร์โทร — ข้อมูลติดต่อยังเป็นของผู้จัดกิจกรรมเท่านั้น */}
              <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 12, lineHeight: 1.8 }}>
                {t('รายชื่อนี้คือผู้ที่จองที่นั่งไว้แล้ว จึงตรงกับจำนวนที่นั่งด้านบน และไม่แสดงอีเมลหรือเบอร์โทรของใคร')}
              </div>
            </Section>
          </div>
          ) : null}
        </div>

        {/* ═══ แถบข้าง ═══ */}
        <div style={{ display: 'grid', gap: 14, minWidth: 0, position: 'sticky', top: 16 }}>
          {/* ที่นั่งและกำหนดปิดรับ */}
          <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{t('การรับสมัคร')}</span>
              {closingSoon ? (
                <Badge
                  tone="warning"
                  icon="hourglass_bottom"
                  label={a.daysLeft === 0 ? t('ปิดรับวันนี้') : `${t('เหลืออีก')} ${a.daysLeft} ${t('วัน')}`}
                  style={{ marginInlineStart: 'auto' }}
                />
              ) : (
                <Badge tone={seats.key === 'full' ? 'danger' : 'success'} dot label={t(seats.label)} style={{ marginInlineStart: 'auto' }} />
              )}
            </div>

            {/*
              จำนวนที่นั่งคงเหลือและแถบความคืบหน้าเป็นข้อมูลของคนที่ลงทะเบียนได้จริง
              ผู้เยี่ยมชมยังเห็นป้ายสถานะ (เปิดรับสมัคร/ใกล้เต็ม/เต็ม) ด้านบนอยู่
              จึงยังรู้ว่าสมัครทันไหมโดยไม่ต้องเห็นตัวเลขจริง
            */}
            {signedIn ? (
              <div style={{ fontSize: 22, fontWeight: 700, color: COLOR.ink }}>
                {a.seatsTotal > 0 ? `${t('เหลือ')} ${remaining} ${t('ที่นั่ง')}` : t('ไม่จำกัดที่นั่ง')}
              </div>
            ) : null}

            {signedIn && a.seatsTotal > 0 ? (
              <>
                <div
                  role="progressbar"
                  aria-valuenow={a.seatsFilled}
                  aria-valuemin={0}
                  aria-valuemax={a.seatsTotal}
                  aria-label={t('ที่นั่งที่ลงทะเบียนแล้ว')}
                  style={{ height: 9, borderRadius: 999, background: 'rgba(31,41,55,.1)', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: pct >= 100 ? SEMANTIC.danger.dot : pct >= 80 ? SEMANTIC.warning.dot : SEMANTIC.success.dot,
                      transition: 'width 320ms ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: COLOR.hint }}>{`${a.seatsFilled}/${a.seatsTotal}`}</div>
              </>
            ) : null}
          </div>

          {/* ข้อมูลกิจกรรม */}
          <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 13 }}>
            {info.map((row) => (
              <div key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Icon name={row.icon} size={18} style={{ color: COLOR.hint, flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: COLOR.hint }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: COLOR.ink, marginTop: 2, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ปุ่มดำเนินการ */}
          <div id="contact" className="nuv-no-print" style={{ ...glass(20), padding: 18, display: 'grid', gap: 9, scrollMarginTop: 90 }}>
            {/*
              ส่งหลักฐานอยู่บนสุดของกลุ่มปุ่ม เพราะช่วงหลังเช็กเอาต์นี่คือสิ่งเดียวที่นิสิตต้องทำต่อ
              ปุ่มสถานะที่อยู่ถัดลงไปบอกว่า "รอหลักฐาน" อยู่แล้ว แต่บอกเฉย ๆ ไม่มีทางลงมือ
            */}
            {canSubmitEvidence ? (
              awaitingReview ? (
                <Button variant="secondary" icon="hourglass_top" disabled full>
                  {t('ส่งหลักฐานแล้ว · รอผู้จัดตรวจ')}
                </Button>
              ) : (
                <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)} full>
                  {evidenceStatus === 'rejected' ? t('ส่งหลักฐานใหม่') : t('ส่งรูปหลักฐาน')}
                </Button>
              )
            ) : null}

            {/*
              ช่วงที่มีปุ่มหลักฐานอยู่แล้ว ไม่ต้องมีปุ่มสถานะซ้ำอีกอัน
              ปุ่มหลักฐานบอกสถานะของขั้นนี้ครบแล้ว ("รอผู้จัดตรวจ") ส่วนปุ่มสถานะจะขึ้นว่า
              "รอหลักฐาน" ซึ่งอ่านขัดกันเอง
            */}
            {canSubmitEvidence ? null : canRegister ? (
              <Button variant="primary" icon="how_to_reg" loading={busy} onClick={register} full>
                {t('ลงทะเบียนเข้าร่วม')}
              </Button>
            ) : reg ? (
              <Button variant="secondary" icon={reg.icon} disabled full>
                {t(reg.label)}
              </Button>
            ) : !signedIn ? (
              <Link href="/login" style={{ display: 'block' }}>
                <Button variant="primary" icon="login" full>
                  {t('เข้าสู่ระบบเพื่อลงทะเบียน')}
                </Button>
              </Link>
            ) : a.notOpenYet ? (
              /* ยังไม่ถึงวันเปิดรับ — บอกวันที่ไปเลย ผู้ใช้จะได้รู้ว่าต้องกลับมาเมื่อไหร่
                 ไม่ใช่ขึ้นว่า "ปิดรับสมัคร" ซึ่งอ่านแล้วเข้าใจว่าพลาดไปแล้ว */
              <Button variant="secondary" icon="lock_clock" disabled full>
                {a.regOpenTh
                  ? `${t('เปิดรับสมัคร')} ${isEn ? a.regOpenEn : a.regOpenTh}`
                  : t('ยังไม่เปิดรับสมัคร')}
              </Button>
            ) : (
              <Button variant="secondary" icon="block" disabled full>
                {t(seats.label)}
              </Button>
            )}

            {signedIn ? (
              <Button
                variant="secondary"
                icon="favorite"
                iconFill={fav}
                disabled={busy}
                onClick={toggleFavorite}
                full
              >
                {fav ? t('นำออกจากรายการโปรด') : t('เพิ่มในรายการโปรด')}
              </Button>
            ) : null}

            <Button variant="secondary" icon="share" onClick={share} full>
              {t('แชร์กิจกรรมนี้')}
            </Button>

            <Button variant="secondary" icon="print" onClick={() => window.print()} full>
              {t('พิมพ์ / บันทึก PDF')}
            </Button>

            {/* บอกให้ชัดว่าลงทะเบียนแล้วยังไม่จบขั้นตอน ต้องรอผู้จัดอนุมัติก่อน */}
            <div style={{ fontSize: 11, color: COLOR.hint, lineHeight: 1.75, textAlign: 'center', marginTop: 2 }}>
              {t('การลงทะเบียนจะสมบูรณ์เมื่อผู้จัดกิจกรรมอนุมัติแล้ว ติดตามสถานะได้ที่หน้าการลงทะเบียน')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ดาวคะแนน — มีตัวเลขกำกับให้เครื่องอ่านหน้าจอด้วย ไม่สื่อด้วยรูปอย่างเดียว */
function Stars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value}/5`} style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={15}
          fill={n <= value}
          style={{ color: n <= value ? '#F5A623' : 'rgba(31,41,55,.2)' }}
        />
      ))}
    </span>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...glass(20), padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
        <Icon name={icon} size={19} style={{ color: '#7C2FD9' }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLOR.ink }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
