'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthSplit } from '@/components/auth/AuthSplit';
import { AuthInput, CheckMark, FormError, SubmitButton } from '@/components/auth/fields';
import { Icon } from '@/components/ui';
import { useT } from '@/components/providers/AppProviders';
import { authApi, errorMessage } from '@/lib/api';
import { COLOR } from '@/lib/design';

const LS_LAST_EMAIL = 'nuv-last-email';

export function LoginForm() {
  const t = useT();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // เติมอีเมลที่เคยเข้าสู่ระบบไว้ให้อัตโนมัติ (ผู้ใช้ติ๊ก "จดจำฉันไว้" ไว้ครั้งก่อน)
  // อ่านหลัง hydration เสมอ — ค่าฝั่งเซิร์ฟเวอร์ไม่รู้จัก localStorage
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem(LS_LAST_EMAIL);
        if (saved) setEmail(saved);
        else setRemember(false);
      } catch {
        /* localStorage ปิดอยู่ */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  async function submit() {
    if (loading) return;
    if (!email.trim() || !password) {
      setError(t('อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.login(email.trim(), password);
      try {
        if (remember) localStorage.setItem(LS_LAST_EMAIL, email.trim());
        else localStorage.removeItem(LS_LAST_EMAIL);
      } catch {
        /* ไม่เป็นไร */
      }
      // TODO: เปลี่ยนเป็น homeFor(account.role) เมื่อหน้าแดชบอร์ดของแต่ละบทบาทพร้อมใช้งาน
      router.replace('/');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <AuthSplit
      photo="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1000&q=75"
      overlay="linear-gradient(160deg,rgba(233,113,113,.86) 0%,rgba(167,116,247,.88) 100%)"
      headline="ยินดีต้อนรับ"
      headlineSub="สู่ชุมชนจิตอาสา"
      lead="เข้าสู่ระบบเพื่อดูกิจกรรมที่เปิดรับ ติดตามชั่วโมงสะสม และรับใบประกาศของคุณ"
      items={[
        { icon: 'travel_explore', label: 'ค้นหากิจกรรมจิตอาสาที่เปิดรับ' },
        { icon: 'schedule', label: 'ติดตามชั่วโมงสะสมแบบเรียลไทม์' },
        { icon: 'workspace_premium', label: 'รับใบประกาศอัตโนมัติเมื่อครบเกณฑ์' },
      ]}
      stats={[
        { value: '2,400+', label: 'นิสิตเข้าร่วม' },
        { value: '120+', label: 'กิจกรรมต่อปี' },
      ]}
    >
      <div style={{ fontSize: 23, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
        {t('เข้าสู่ระบบ')}
      </div>
      <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3, marginBottom: 24 }}>
        {t('ใช้บัญชีอีเมลมหาวิทยาลัยของคุณ')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AuthInput
          icon="mail"
          label={t('อีเมล')}
          name="email"
          value={email}
          onChange={setEmail}
          onEnter={submit}
          placeholder="student@nu.ac.th"
          type="email"
          inputMode="email"
          autoComplete="username"
        />

        <AuthInput
          icon="lock"
          label={t('รหัสผ่าน')}
          name="password"
          value={password}
          onChange={setPassword}
          onEnter={submit}
          placeholder="••••••••"
          password
          autoComplete="current-password"
        />

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <button
            type="button"
            onClick={() => setRemember((r) => !r)}
            aria-pressed={remember}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <CheckMark on={remember} size={19} />
            <span style={{ fontSize: 12.5, color: COLOR.body }}>{t('จดจำฉันไว้')}</span>
          </button>
          <Link href="/forgot" style={{ fontSize: 12.5, color: '#A774F7' }}>
            {t('ลืมรหัสผ่าน?')}
          </Link>
        </div>

        <FormError>{error}</FormError>

        <SubmitButton
          onClick={submit}
          loading={loading}
          label={t('เข้าสู่ระบบ')}
          loadingLabel={t('กำลังเข้าสู่ระบบ...')}
          iconAfter="arrow_forward"
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginTop: 24,
          fontSize: 12.5,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          style={{ color: COLOR.hint, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="arrow_back" size={16} />
          {t('กลับหน้าแรก')}
        </Link>
        <div style={{ color: COLOR.label }}>
          {t('ยังไม่มีบัญชี?')}{' '}
          <Link href="/register" style={{ color: '#A774F7', fontWeight: 500 }}>
            {t('สมัครสมาชิก')}
          </Link>
        </div>
      </div>
    </AuthSplit>
  );
}
