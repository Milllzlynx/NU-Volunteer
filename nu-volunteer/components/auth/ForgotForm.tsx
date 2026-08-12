'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthSplit } from '@/components/auth/AuthSplit';
import { AuthInput, FieldNote, SubmitButton } from '@/components/auth/fields';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { authApi, errorMessage } from '@/lib/api';
import { COLOR, SEMANTIC } from '@/lib/design';

const RESEND_COOLDOWN = 30;

const NEXT_STEPS = [
  { icon: 'inbox', label: 'เปิดกล่องจดหมายและมองหาอีเมลจาก NU Volunteer' },
  { icon: 'folder_open', label: 'หากไม่พบ ลองตรวจในโฟลเดอร์จดหมายขยะ' },
  { icon: 'timer', label: 'ลิงก์จะหมดอายุภายใน 30 นาที' },
];

export function ForgotForm() {
  const { t, lang } = useApp();

  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function startCooldown() {
    if (timer.current) clearInterval(timer.current);
    setCooldown(RESEND_COOLDOWN);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  }

  async function send() {
    if (loading) return;
    const value = email.trim();
    if (!value) return setError(t('กรุณากรอกอีเมลของคุณ'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError(t('รูปแบบอีเมลไม่ถูกต้อง'));

    setLoading(true);
    setError('');
    try {
      // เซิร์ฟเวอร์ตอบเหมือนกันทุกกรณี ไม่เปิดเผยว่าอีเมลนี้มีบัญชีหรือไม่
      await authApi.forgot(value, lang);
      setSentEmail(value);
      setSent(true);
      startCooldown();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || !sentEmail) return;
    startCooldown();
    try {
      await authApi.forgot(sentEmail, lang);
    } catch {
      /* เงียบไว้ — ผู้ใช้เห็นหน้าเดิมเสมอเพื่อไม่ให้เดาได้ว่าอีเมลมีบัญชีหรือไม่ */
    }
  }

  return (
    <AuthSplit
      photo="https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=1000&q=75"
      overlay="linear-gradient(160deg,rgba(122,184,255,.86) 0%,rgba(167,116,247,.9) 100%)"
      maxWidth={880}
      asideMinHeight={480}
      headline="กู้คืนบัญชี"
      headlineSub="ของคุณได้ง่ายๆ"
      lead="เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลมหาวิทยาลัยที่ผูกกับบัญชีของคุณ"
      items={[
        { icon: 'mail', label: 'ลิงก์จะส่งไปที่อีเมล @nu.ac.th ของคุณ' },
        { icon: 'schedule', label: 'ลิงก์มีอายุ 30 นาทีนับจากเวลาที่ส่ง' },
        { icon: 'shield', label: 'หากไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใดๆ' },
      ]}
      footNote="ต้องการความช่วยเหลือ? ติดต่อกองกิจการนิสิต"
    >
      {!sent ? (
        <div style={{ animation: 'nuFadeUp 340ms cubic-bezier(.22,.9,.32,1) both' }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(167,116,247,.14)',
              marginBottom: 16,
            }}
          >
            <Icon name="lock_reset" size={24} fill style={{ color: '#A774F7' }} />
          </div>
          <div style={{ fontSize: 23, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
            {t('ลืมรหัสผ่าน?')}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              color: COLOR.label,
              marginTop: 4,
              marginBottom: 22,
              textWrap: 'pretty',
            }}
          >
            {t('กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้')}
          </div>

          <AuthInput
            icon="mail"
            label={t('อีเมลมหาวิทยาลัย')}
            name="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              setError('');
            }}
            onEnter={send}
            placeholder="you@nu.ac.th"
            type="email"
            inputMode="email"
            autoComplete="username"
            invalid={!!error}
          />
          {error ? (
            <FieldNote tone="danger" icon="error">
              {error}
            </FieldNote>
          ) : null}

          <div style={{ marginTop: 18 }}>
            <SubmitButton
              onClick={send}
              loading={loading}
              icon="send"
              label={t('ส่งลิงก์รีเซ็ต')}
              loadingLabel={t('กำลังส่ง...')}
            />
          </div>
        </div>
      ) : (
        <div
          style={{ animation: 'nuFadeUp 340ms cubic-bezier(.22,.9,.32,1) both', textAlign: 'center' }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(99,210,161,.16)',
              animation: 'nuPop 420ms cubic-bezier(.34,1.56,.64,1) both',
            }}
          >
            <Icon
              name="mark_email_read"
              size={34}
              fill
              style={{ color: SEMANTIC.success.color }}
            />
          </div>
          <div style={{ fontSize: 21, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
            {t('ส่งอีเมลเรียบร้อยแล้ว')}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: COLOR.label, marginTop: 6 }}>
            {t('เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่')}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: '#A774F7',
              marginTop: 2,
              wordBreak: 'break-all',
            }}
          >
            {sentEmail}
          </div>

          <div
            style={{
              textAlign: 'left',
              background: 'rgba(31,41,55,.035)',
              borderRadius: 16,
              padding: 16,
              marginTop: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {NEXT_STEPS.map((s) => (
              <div key={s.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <Icon
                  name={s.icon}
                  size={17}
                  style={{ color: COLOR.hint, flexShrink: 0, marginTop: 1 }}
                />
                <span style={{ fontSize: 12.5, color: COLOR.body, lineHeight: 1.7 }}>
                  {t(s.label)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12.5, color: COLOR.label, marginTop: 16 }}>
            {t('ไม่ได้รับอีเมล?')}{' '}
            {cooldown > 0 ? (
              <span style={{ color: COLOR.hint }}>
                {t('ส่งอีกครั้งใน')} {cooldown} {t('วินาที')}
              </span>
            ) : (
              <button
                type="button"
                onClick={resend}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: 12.5,
                  color: '#A774F7',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t('ส่งอีกครั้ง')}
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12.5,
            color: COLOR.hint,
          }}
        >
          <Icon name="arrow_back" size={16} />
          {t('ไปหน้าเข้าสู่ระบบ')}
        </Link>
      </div>
    </AuthSplit>
  );
}
