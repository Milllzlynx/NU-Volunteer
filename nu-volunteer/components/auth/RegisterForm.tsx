'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplit } from '@/components/auth/AuthSplit';
import {
  AuthInput,
  AuthSelect,
  CheckMark,
  FieldNote,
  FormError,
  FormNotice,
  PasswordStrength,
  SecondaryButton,
  SubmitButton,
} from '@/components/auth/fields';
import { Icon } from '@/components/ui';
import { useLegalModal } from '@/components/legal/LegalModal';
import { useT } from '@/components/providers/AppProviders';
import { authApi, errorMessage } from '@/lib/api';
import { BRAND_GRADIENT, COLOR } from '@/lib/design';
import { landingFor } from '@/lib/routes';

type Form = {
  name: string;
  studentId: string;
  faculty: string;
  email: string;
  password: string;
  confirm: string;
  loanStatus: '' | 'yes' | 'no';
};

const EMPTY: Form = {
  name: '',
  studentId: '',
  faculty: '',
  email: '',
  password: '',
  confirm: '',
  loanStatus: '',
};

const STEP_TITLES = [
  { title: 'ข้อมูลส่วนตัว', desc: 'บอกเราหน่อยว่าคุณคือใคร' },
  { title: 'ตั้งรหัสผ่าน', desc: 'เลือกรหัสผ่านที่คาดเดายาก' },
  { title: 'สถานะกู้ยืม กยศ.', desc: 'เพื่อให้ระบบติดตามชั่วโมงได้ถูกต้อง' },
];

const ASIDE_STEPS = [
  { icon: 'person', title: 'ข้อมูลส่วนตัว', desc: 'ชื่อ รหัสนิสิต คณะ และอีเมล' },
  { icon: 'lock', title: 'ตั้งรหัสผ่าน', desc: 'สำหรับเข้าสู่ระบบครั้งต่อไป' },
  { icon: 'account_balance', title: 'สถานะ กยศ.', desc: 'เพื่อติดตามเกณฑ์ชั่วโมงจิตอาสา' },
];

const LOAN_OPTIONS = [
  {
    id: 'yes' as const,
    icon: 'account_balance',
    color: '#A774F7',
    title: 'เป็นผู้กู้ยืม กยศ.',
    desc: 'ระบบจะติดตามชั่วโมงจิตอาสาเทียบเป้าหมาย 36 ชม./ปี',
  },
  {
    id: 'no' as const,
    icon: 'person',
    color: '#7AB8FF',
    title: 'ไม่ได้เป็นผู้กู้ยืม กยศ.',
    desc: 'เข้าร่วมกิจกรรมและสะสมชั่วโมงได้ตามปกติ',
  },
];

export function RegisterForm({
  faculties,
  emailDomain,
}: {
  faculties: { value: string; label: string }[];
  emailDomain: string;
}) {
  const t = useT();
  const router = useRouter();
  const legal = useLegalModal();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const email = form.email.trim();
  const domainOk = new RegExp(`@${emailDomain.replace(/\./g, '\\.')}$`, 'i').test(email);
  const domainBad = !!email && !domainOk;

  /** สถานะ "กำลังตรวจ" ตั้งจากเหตุการณ์พิมพ์ ไม่ใช่จาก effect (กันการเรนเดอร์ซ้อน) */
  function onEmailChange(v: string) {
    set('email', v);
    setEmailTaken(false);
    setChecking(new RegExp(`@${emailDomain.replace(/\./g, '\\.')}$`, 'i').test(v.trim()));
  }

  // ตรวจอีเมลซ้ำแบบหน่วงเวลา ทันทีที่พิมพ์ครบโดเมน
  useEffect(() => {
    abort.current?.abort();
    if (!domainOk) return;
    const ctrl = new AbortController();
    abort.current = ctrl;
    const id = setTimeout(async () => {
      try {
        const r = await authApi.checkEmail(email, ctrl.signal);
        setEmailTaken(r.exists);
      } catch {
        /* ตรวจไม่ได้ก็ปล่อยผ่าน — เซิร์ฟเวอร์จะตรวจซ้ำตอนสมัครอยู่แล้ว */
      } finally {
        if (!ctrl.signal.aborted) setChecking(false);
      }
    }, 450);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [email, domainOk]);

  const pwLongEnough = form.password.length >= 8;
  const pwHasBoth = /[A-Za-z]/.test(form.password) && /[0-9]/.test(form.password);
  const mismatch = !!form.confirm && form.password !== form.confirm;

  /** เหตุผลที่ยังไปขั้นต่อไป (หรือสมัคร) ไม่ได้ — คืน '' เมื่อผ่านทุกข้อ */
  function blockReason(): string {
    if (step === 1) {
      if (!form.name.trim()) return 'กรุณากรอกชื่อ-นามสกุล';
      if (!form.studentId.trim()) return 'กรุณากรอกรหัสนิสิต';
      if (!form.faculty) return 'กรุณาเลือกคณะของคุณ';
      if (!email || domainBad) return 'กรุณาใช้อีเมลมหาวิทยาลัย @nu.ac.th เท่านั้น';
      if (checking) return 'กำลังตรวจสอบอีเมล...';
      if (emailTaken) return 'อีเมลนี้มีบัญชีอยู่แล้ว';
      return '';
    }
    if (step === 2) {
      if (!pwLongEnough) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
      if (!pwHasBoth) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
      if (form.password !== form.confirm) return 'รหัสผ่านไม่ตรงกัน';
      return '';
    }
    if (!form.loanStatus) return 'กรุณาเลือกสถานะการกู้ยืม กยศ.';
    if (!consent) return 'กรุณายอมรับข้อกำหนดก่อนสมัคร';
    return '';
  }

  const blocked = blockReason();

  async function finish() {
    if (loading || blocked) return;
    setLoading(true);
    setError('');
    try {
      const { account } = await authApi.register({
        email,
        password: form.password,
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        faculty: form.faculty,
        loanStatus: form.loanStatus || undefined,
        acceptedTerms: consent,
      });
      // บทบาทที่ยังไม่มีแดชบอร์ดจะถูกส่งกลับหน้าแรกโดย landingFor()
      router.replace(landingFor(account.role));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <AuthSplit
      photo="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=75"
      overlay="linear-gradient(160deg,rgba(167,116,247,.88) 0%,rgba(233,113,113,.86) 100%)"
      asideMinHeight={560}
      headline="เริ่มต้นเส้นทาง"
      headlineSub="จิตอาสาของคุณ"
      lead="สมัครเพียงไม่กี่ขั้นตอน แล้วเข้าร่วมกิจกรรมได้ทันที"
      items={ASIDE_STEPS.map((a, i) => ({
        icon: i + 1 < step ? 'check' : a.icon,
        label: a.title,
      }))}
      footNote="ใช้อีเมล @nu.ac.th ของมหาวิทยาลัยในการสมัคร"
    >
      {legal.modal}

      <div style={{ fontSize: 23, fontWeight: 600, color: COLOR.ink, lineHeight: 1.4 }}>
        {t(STEP_TITLES[step - 1].title)}
      </div>
      <div style={{ fontSize: 13, color: COLOR.label, marginTop: 3 }}>
        {t(STEP_TITLES[step - 1].desc)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '20px 0 24px' }}>
        <div style={{ display: 'flex', gap: 5, flex: 1 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 4,
                transition: 'background 300ms ease',
                background: n <= step ? 'linear-gradient(90deg,#E97171,#A774F7)' : 'rgba(31,41,55,.1)',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: COLOR.hint, whiteSpace: 'nowrap' }}>
          {t('ขั้นที่')} {step} {t('จาก 3')}
        </div>
      </div>

      {step === 1 ? (
        <div
          key="step-1"
          style={{
            animation: 'nuFadeUp 320ms cubic-bezier(.22,.9,.32,1) both',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <AuthInput
            icon="person"
            label={t('ชื่อ-นามสกุล')}
            name="name"
            value={form.name}
            onChange={(v) => set('name', v)}
            placeholder={t('ณัฐชา วิริยะกุล')}
            autoComplete="name"
          />
          <AuthInput
            icon="badge"
            label={t('รหัสนิสิต')}
            name="studentId"
            value={form.studentId}
            onChange={(v) => set('studentId', v)}
            placeholder="6410XXXXX"
            inputMode="numeric"
          />
          <AuthSelect
            icon="school"
            label={t('คณะ')}
            value={form.faculty}
            onChange={(v) => set('faculty', v)}
            placeholder={t('เลือกคณะของคุณ')}
            options={faculties}
          />
          <div>
            <AuthInput
              icon="mail"
              label={t('อีเมลมหาวิทยาลัย')}
              name="email"
              value={form.email}
              onChange={onEmailChange}
              placeholder={`student@${emailDomain}`}
              type="email"
              inputMode="email"
              autoComplete="username"
              invalid={domainBad || emailTaken}
            />
            {domainBad ? (
              <FieldNote tone="danger" icon="error">
                {t('กรุณาใช้อีเมลมหาวิทยาลัย @nu.ac.th เท่านั้น')}
              </FieldNote>
            ) : null}
            {emailTaken ? (
              <FieldNote tone="danger" icon="person_off">
                {t('อีเมลนี้มีบัญชีอยู่แล้ว')}{' '}
                <Link href="/login" style={{ color: '#7C2FD9', textDecoration: 'underline' }}>
                  {t('เข้าสู่ระบบ')}
                </Link>
              </FieldNote>
            ) : null}
            {checking ? (
              <FieldNote tone="hint" spinner>
                {t('กำลังตรวจสอบอีเมล...')}
              </FieldNote>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div
          key="step-2"
          style={{
            animation: 'nuFadeUp 320ms cubic-bezier(.22,.9,.32,1) both',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <AuthInput
              icon="lock"
              label={t('รหัสผ่าน')}
              name="password"
              value={form.password}
              onChange={(v) => set('password', v)}
              placeholder={t('อย่างน้อย 8 ตัวอักษร')}
              password
              autoComplete="new-password"
            />
            <PasswordStrength password={form.password} />
          </div>
          <div>
            <AuthInput
              icon="lock_reset"
              label={t('ยืนยันรหัสผ่าน')}
              name="confirm"
              value={form.confirm}
              onChange={(v) => set('confirm', v)}
              placeholder={t('พิมพ์รหัสผ่านอีกครั้ง')}
              password
              autoComplete="new-password"
              invalid={mismatch}
            />
            {mismatch ? <FieldNote tone="danger">{t('รหัสผ่านไม่ตรงกัน')}</FieldNote> : null}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div
          key="step-3"
          style={{
            animation: 'nuFadeUp 320ms cubic-bezier(.22,.9,.32,1) both',
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          {LOAN_OPTIONS.map((k) => {
            const on = form.loanStatus === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => set('loanStatus', k.id)}
                aria-pressed={on}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 16,
                  borderRadius: 16,
                  fontFamily: 'inherit',
                  transition: 'all 220ms ease',
                  border: `1px solid ${on ? '#A774F7' : 'rgba(31,41,55,.1)'}`,
                  background: on ? 'rgba(167,116,247,.08)' : 'rgba(255,255,255,.7)',
                  boxShadow: on ? '0 8px 22px rgba(167,116,247,.16)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: k.color + '1f',
                  }}
                >
                  <Icon name={k.icon} size={21} fill style={{ color: k.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: COLOR.ink, lineHeight: 1.45 }}>
                    {t(k.title)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLOR.label,
                      lineHeight: 1.65,
                      marginTop: 2,
                      textWrap: 'pretty',
                    }}
                  >
                    {t(k.desc)}
                  </div>
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 220ms ease',
                    border: `1px solid ${on ? 'transparent' : 'rgba(31,41,55,.2)'}`,
                    background: on ? BRAND_GRADIENT : 'transparent',
                  }}
                >
                  <Icon name="check" size={15} style={{ color: '#fff', opacity: on ? 1 : 0 }} />
                </div>
              </button>
            );
          })}

          <div
            onClick={() => setConsent((c) => !c)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginTop: 11,
              padding: '13px 15px',
              borderRadius: 14,
              background: 'rgba(255,255,255,.66)',
              border: '1px solid rgba(31,41,55,.09)',
              cursor: 'pointer',
            }}
          >
            <CheckMark on={consent} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: COLOR.body, lineHeight: 1.75 }}>
              {t('ฉันได้อ่านและยอมรับ')}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  legal.openTerms();
                }}
                style={{ color: '#7C2FD9', textDecoration: 'underline' }}
              >
                {t('ข้อกำหนดการใช้งาน')}
              </a>{' '}
              {t('และ')}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  legal.openPrivacy();
                }}
                style={{ color: '#7C2FD9', textDecoration: 'underline' }}
              >
                {t('นโยบายความเป็นส่วนตัว')}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {error ? <FormError>{error}</FormError> : blocked ? <FormNotice>{t(blocked)}</FormNotice> : null}

        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 ? (
            <SecondaryButton
              onClick={() => setStep((s) => s - 1)}
              icon="arrow_back"
              label={t('ก่อนหน้า')}
              flex={1}
            />
          ) : null}

          {step < 3 ? (
            <SubmitButton
              onClick={() => setStep((s) => s + 1)}
              disabled={!!blocked}
              title={blocked ? t(blocked) : t('ถัดไป')}
              label={t('ถัดไป')}
              loadingLabel={t('ถัดไป')}
              iconAfter="arrow_forward"
              flex={2}
            />
          ) : (
            <SubmitButton
              onClick={finish}
              loading={loading}
              disabled={!!blocked}
              title={blocked ? t(blocked) : t('สมัครสมาชิก')}
              icon="how_to_reg"
              label={t('สมัครสมาชิก')}
              loadingLabel={t('กำลังสร้างบัญชี...')}
              flex={2}
            />
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 22, fontSize: 12.5, color: COLOR.label }}>
        {t('มีบัญชีอยู่แล้ว?')}{' '}
        <Link href="/login" style={{ color: '#A774F7', fontWeight: 500 }}>
          {t('เข้าสู่ระบบ')}
        </Link>
      </div>
    </AuthSplit>
  );
}
