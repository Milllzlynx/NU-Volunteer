'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { useLegalModal } from '@/components/legal/LegalModal';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSlider } from '@/components/landing/HeroSlider';
import { ActivityGrid } from '@/components/landing/ActivityGrid';
import { BRAND_GRADIENT, COLOR } from '@/lib/design';
import type {
  LandingStats,
  PublicActivity,
  PublicCategory,
  SessionAccount,
} from '@/components/landing/types';

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.72)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.85)',
  borderRadius: 24,
  boxShadow: '0 12px 34px rgba(31,41,55,.09), inset 0 1px 0 rgba(255,255,255,.7)',
};

const FEATURES = [
  {
    title: 'ค้นหาง่าย',
    desc: 'กรองตามหมวดหมู่ 7 ด้าน วันที่ และสถานะเปิดรับ',
    icon: 'travel_explore',
    color: '#E97171',
    offset: 0,
  },
  {
    title: 'เช็กอินด้วย QR',
    desc: 'สแกนหน้างานได้ทันที ไม่ต้องเซ็นชื่อในกระดาษ',
    icon: 'qr_code_2',
    color: '#A774F7',
    offset: 22,
  },
  {
    title: 'ติดตามชั่วโมง',
    desc: 'ดูความคืบหน้าเทียบเกณฑ์ กยศ. 36 ชั่วโมงแบบเรียลไทม์',
    icon: 'insights',
    color: '#7AB8FF',
    offset: 0,
  },
  {
    title: 'ใบประกาศอัตโนมัติ',
    desc: 'ดาวน์โหลดได้ทันทีเมื่อผู้จัดอนุมัติชั่วโมง',
    icon: 'workspace_premium',
    color: '#63D2A1',
    offset: 22,
  },
];

const BENEFITS = [
  'ลงทะเบียนกิจกรรมได้ในคลิกเดียว',
  'แจ้งเตือนก่อนถึงวันจัดกิจกรรม',
  'สะสมชั่วโมงครบตามเกณฑ์ กยศ.',
  'พูดคุยกับผู้จัดกิจกรรมได้โดยตรง',
];

export function Landing({
  account,
  stats,
  categories,
  activities,
}: {
  account: SessionAccount | null;
  stats: LandingStats;
  categories: PublicCategory[];
  activities: PublicActivity[];
}) {
  const { t } = useApp();
  const legal = useLegalModal();

  const fmt = (n: number) => n.toLocaleString('en-US');
  const statCards = [
    {
      label: 'กิจกรรมทั้งหมด',
      value: fmt(stats.activities),
      icon: 'campaign',
      color: '#E97171',
      iconBg: 'rgba(233,113,113,.16)',
    },
    {
      label: 'นิสิตผู้เข้าร่วม',
      value: fmt(stats.participants),
      icon: 'groups',
      color: '#A774F7',
      iconBg: 'rgba(167,116,247,.16)',
    },
    {
      label: 'ชั่วโมงจิตอาสาสะสม',
      value: fmt(stats.hours),
      icon: 'schedule',
      color: '#63D2A1',
      iconBg: 'rgba(99,210,161,.16)',
    },
  ];

  return (
    <div>
      {legal.modal}
      <LandingNav account={account} />

      <div
        className="nuv-land-hero"
        style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 40px 26px' }}
      >
        <HeroSlider />

        <div
          className="nuv-land-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 16,
            marginTop: 26,
          }}
        >
          {statCards.map((s) => (
            <div key={s.label} style={{ ...GLASS_CARD, padding: 22, textAlign: 'center' }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: s.iconBg,
                }}
              >
                <Icon name={s.icon} size={23} fill style={{ color: s.color }} />
              </div>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 600,
                  color: COLOR.ink,
                  marginTop: 11,
                  lineHeight: 1.3,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 2 }}>{t(s.label)}</div>
            </div>
          ))}
        </div>
      </div>

      <ActivityGrid activities={activities} categories={categories} signedIn={!!account} />

      <div
        id="nuv-about"
        className="nuv-land-cta"
        style={{ maxWidth: 1180, margin: '0 auto', padding: '46px 40px 60px', scrollMarginTop: 90 }}
      >
        <div
          className="nuv-why-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <div
            className="nuv-why-cards"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} style={{ ...GLASS_CARD, padding: 20, marginTop: f.offset }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: f.color + '29',
                  }}
                >
                  <Icon name={f.icon} size={21} fill style={{ color: f.color }} />
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    color: COLOR.ink,
                    marginTop: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {t(f.title)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: COLOR.label,
                    marginTop: 4,
                    textWrap: 'pretty',
                  }}
                >
                  {t(f.desc)}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: COLOR.ink,
                lineHeight: 1.4,
                marginBottom: 10,
              }}
            >
              {t('ทำไมต้องเป็น')}
              <br />
              NU Volunteer?
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.85,
                color: COLOR.label,
                marginBottom: 20,
                textWrap: 'pretty',
              }}
            >
              {t(
                'ระบบเดียวที่รวมทุกอย่างสำหรับนิสิตจิตอาสา ตั้งแต่ค้นหากิจกรรม เช็กอินด้วย QR ไปจนถึงรับใบประกาศอัตโนมัติ',
              )}
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 24 }}
            >
              {BENEFITS.map((b) => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon
                    name="check_circle"
                    size={20}
                    fill
                    style={{ color: '#63D2A1', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{t(b)}</span>
                </div>
              ))}
            </div>
            {account ? null : (
              <Link
                href="/register"
                className="nuv-keep"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: BRAND_GRADIENT,
                  color: '#fff',
                  padding: '13px 28px',
                  borderRadius: 14,
                  fontWeight: 500,
                  fontSize: 14,
                  boxShadow: '0 8px 22px rgba(167,116,247,.34)',
                  transition: 'all 220ms ease',
                }}
              >
                <Icon name="how_to_reg" size={19} />
                {t('สมัครเป็นจิตอาสาวันนี้')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <footer
        style={{
          borderTop: '1px solid rgba(31,41,55,.07)',
          background: 'rgba(255,255,255,.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="nuv-foot"
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '34px 40px',
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr',
            gap: 32,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <BrandMark size={34} radius={11} />
              <div style={{ fontWeight: 600, fontSize: 15.5, color: COLOR.ink }}>NU Volunteer</div>
            </div>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.85,
                color: COLOR.label,
                maxWidth: 320,
                textWrap: 'pretty',
              }}
            >
              {t(
                'ระบบรวบรวมกิจกรรมจิตอาสาสำหรับนิสิตมหาวิทยาลัยนเรศวร ดูแลโดยกองกิจการนิสิต',
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: COLOR.hint,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 11,
              }}
            >
              {t('ข้อมูลทางกฎหมาย')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={legal.openTerms}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  color: COLOR.label,
                  cursor: 'pointer',
                }}
              >
                {t('ข้อกำหนดการใช้งาน')}
              </button>
              <button
                type="button"
                onClick={legal.openPrivacy}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  color: COLOR.label,
                  cursor: 'pointer',
                }}
              >
                {t('นโยบายความเป็นส่วนตัว')}
              </button>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: COLOR.hint,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                marginBottom: 11,
              }}
            >
              {t('แพลตฟอร์ม')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#nuv-activities" style={{ fontSize: 12.5, color: COLOR.label }}>
                {t('ค้นหากิจกรรม')}
              </a>
              <a href="#nuv-cats" style={{ fontSize: 12.5, color: COLOR.label }}>
                {t('หมวดหมู่กิจกรรม')}
              </a>
              <a href="#nuv-about" style={{ fontSize: 12.5, color: COLOR.label }}>
                {t('เกี่ยวกับเรา')}
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(31,41,55,.06)',
            padding: '14px 40px',
            textAlign: 'center',
            fontSize: 11.5,
            color: COLOR.hint,
          }}
        >
          {t('© 2569 มหาวิทยาลัยนเรศวร · สงวนลิขสิทธิ์')}
        </div>
      </footer>
    </div>
  );
}
