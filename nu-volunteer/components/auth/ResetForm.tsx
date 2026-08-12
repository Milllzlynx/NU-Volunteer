'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplit } from '@/components/auth/AuthSplit';
import {
  AuthInput,
  FieldNote,
  FormError,
  PasswordRules,
  PasswordStrength,
  SubmitButton,
} from '@/components/auth/fields';
import { Icon } from '@/components/ui';
import { useApp } from '@/components/providers/AppProviders';
import { authApi, errorCode, errorMessage } from '@/lib/api';
import { COLOR, SEMANTIC } from '@/lib/design';

export function ResetForm({ token }: { token: string }) {
  const { t, lang } = useApp();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [tokenBad, setTokenBad] = useState(!token);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = !!confirm && password !== confirm;

  async function submit() {
    if (loading) return;
    if (!token) {
      setTokenBad(true);
      setError(t('ไม่พบโทเคนรีเซ็ต กรุณาขอลิงก์ใหม่'));
      return;
    }
    if (!password) return setError(t('กรุณากรอกรหัสผ่านใหม่'));
    if (password.length < 8) return setError(t('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'));
    if (password !== confirm) return setError(t('รหัสผ่านทั้งสองช่องไม่ตรงกัน'));

    setLoading(true);
    setError('');
    try {
      await authApi.reset(token, password, lang);
      setDone(true);
    } catch (e) {
      // TOKEN_* = ลิงก์ใช้ไม่ได้แล้ว ต้องขอใหม่ ไม่ใช่แค่กรอกผิด
      setTokenBad(/^TOKEN_/.test(errorCode(e)));
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplit
      photo="https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1000&q=75"
      overlay="linear-gradient(160deg,rgba(167,116,247,.88) 0%,rgba(122,184,255,.86) 100%)"
      maxWidth={880}
      asideMinHeight={480}
      headline="ตั้งรหัสผ่านใหม่"
      headlineSub="ให้ปลอดภัยกว่าเดิม"
      lead="เลือกรหัสผ่านที่คาดเดายาก และไม่ซ้ำกับรหัสผ่านที่คุณใช้ในบริการอื่น"
      items={[
        { icon: 'lock', label: 'ใช้ตัวอักษรผสมตัวเลขและอักขระพิเศษ' },
        { icon: 'block', label: 'หลีกเลี่ยงวันเกิดหรือรหัสนิสิต' },
        { icon: 'devices', label: 'ระบบจะออกจากระบบทุกอุปกรณ์ที่ค้างอยู่' },
      ]}
      footNote="หลังตั้งรหัสผ่านใหม่ ระบบจะออกจากระบบทุกอุปกรณ์"
    >
      {done ? (
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
            <Icon name="task_alt" size={34} fill style={{ color: SEMANTIC.success.color }} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
            {t('ตั้งรหัสผ่านใหม่สำเร็จ')}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: COLOR.label, marginTop: 6 }}>
            {t('คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที')}
          </div>
          <div style={{ marginTop: 22 }}>
            <SubmitButton
              onClick={() => router.push('/login')}
              label={t('ไปหน้าเข้าสู่ระบบ')}
              loadingLabel={t('ไปหน้าเข้าสู่ระบบ')}
              iconAfter="arrow_forward"
            />
          </div>
        </div>
      ) : (
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
            {t('ตั้งรหัสผ่านใหม่')}
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
            {t('เลือกรหัสผ่านที่คาดเดายาก และไม่ซ้ำกับรหัสผ่านที่คุณใช้ในบริการอื่น')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <AuthInput
                icon="lock"
                label={t('รหัสผ่านใหม่')}
                name="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError('');
                }}
                onEnter={submit}
                placeholder={t('อย่างน้อย 8 ตัวอักษร')}
                password
                autoComplete="new-password"
              />
              <PasswordStrength password={password} />
              <PasswordRules password={password} />
            </div>

            <div>
              <AuthInput
                icon="lock_reset"
                label={t('ยืนยันรหัสผ่านใหม่')}
                name="confirm"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  setError('');
                }}
                onEnter={submit}
                placeholder={t('พิมพ์รหัสผ่านอีกครั้ง')}
                password
                autoComplete="new-password"
                invalid={mismatch}
              />
              {mismatch ? <FieldNote tone="danger">{t('รหัสผ่านไม่ตรงกัน')}</FieldNote> : null}
            </div>

            <FormError>{error}</FormError>

            {tokenBad ? (
              <Link
                href="/forgot"
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 11,
                  border: '1px solid rgba(233,113,113,.35)',
                  background: 'rgba(255,255,255,.8)',
                  fontSize: 12,
                  color: SEMANTIC.danger.color,
                }}
              >
                <Icon name="mail" size={15} />
                {t('ขอลิงก์รีเซ็ตใหม่')}
              </Link>
            ) : null}

            <SubmitButton
              onClick={submit}
              loading={loading}
              icon="check_circle"
              label={t('บันทึกรหัสผ่านใหม่')}
              loadingLabel={t('กำลังบันทึก...')}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: 22 }}>
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
        </div>
      )}
    </AuthSplit>
  );
}
