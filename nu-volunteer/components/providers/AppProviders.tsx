'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LANG_COOKIE, translate, type Lang } from '@/lib/i18n';

export type Mood = 'pastel' | 'candy' | 'neon' | 'minimal';
export type Theme = 'light' | 'dark';

export const MOOD_LABEL: Record<Mood, string> = {
  pastel: 'พาสเทล',
  candy: 'แคนดี้',
  neon: 'นีออน',
  minimal: 'มินิมอล',
};
export const MOOD_LABEL_EN: Record<Mood, string> = {
  pastel: 'Pastel',
  candy: 'Candy',
  neon: 'Neon',
  minimal: 'Minimal',
};
export const MOOD_DESC: Record<Mood, string> = {
  pastel: 'สีอ่อนนุ่มนวล มุมโค้งกว้าง เงาบางเบา',
  candy: 'สีสดใส เงามีสี มุมโค้งกว้างขึ้น',
  neon: 'พื้นหลังเข้ม ขอบเรืองแสง เหมาะกับโหมดมืด',
  minimal: 'ลดสี เน้นเส้นขอบ มุมแคบ ไม่มีเงา',
};

type AppContextValue = {
  lang: Lang;
  isEn: boolean;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** แปลข้อความไทยเป็นภาษาปัจจุบัน */
  t: (th: string) => string;

  theme: Theme;
  darkMode: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  mood: Mood;
  setMood: (m: Mood) => void;

  /** ตัวเลือกการเข้าถึง — เก็บในเครื่อง ไม่ผูกกับบัญชี (ตั้งแยกได้ต่ออุปกรณ์) */
  a11y: A11y;
  setA11y: (patch: Partial<A11y>) => void;
};

export type A11y = {
  /** ลดการเคลื่อนไหว: ปิดทรานซิชันและแอนิเมชันทั้งหมด */
  reduceMotion: boolean;
  /** ขนาดตัวอักษรฐาน (%) 100–140 */
  textScale: number;
  /** เพิ่มความคมชัดของตัวอักษรและเส้นขอบ */
  highContrast: boolean;
  /** แสดงกรอบโฟกัสชัดเจนเสมอ ไม่เฉพาะตอนใช้คีย์บอร์ด */
  alwaysFocusRing: boolean;
};

export const A11Y_DEFAULT: A11y = {
  reduceMotion: false,
  textScale: 100,
  highContrast: false,
  alwaysFocusRing: false,
};

export const TEXT_SCALE_MIN = 100;
export const TEXT_SCALE_MAX = 140;

const AppContext = createContext<AppContextValue | null>(null);

const LS_THEME = 'nuv-theme';
const LS_MOOD = 'nuv-style-tweak';
const LS_A11Y = 'nuv-a11y';

/** เขียนค่าการเข้าถึงลง <html> ให้ CSS ใน globals.css จับได้ */
function applyA11y(a: A11y) {
  const el = document.documentElement;
  el.setAttribute('data-nuv-motion', a.reduceMotion ? 'reduced' : 'full');
  el.setAttribute('data-nuv-contrast', a.highContrast ? 'high' : 'normal');
  el.setAttribute('data-nuv-focus', a.alwaysFocusRing ? 'always' : 'auto');
  // ปรับที่ font-size ของ root — ทุกหน่วย rem ในหน้าจะขยายตาม
  el.style.fontSize = a.textScale === 100 ? '' : `${a.textScale}%`;
}

function writeLangCookie(lang: Lang) {
  // เก็บเป็น cookie ด้วย เพื่อให้ server component เรนเดอร์ภาษาถูกตั้งแต่ครั้งแรก
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function AppProviders({
  children,
  initialLang = 'th',
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [theme, setThemeState] = useState<Theme>('light');
  const [mood, setMoodState] = useState<Mood>('pastel');
  const [a11y, setA11yState] = useState<A11y>(A11Y_DEFAULT);

  // อ่านค่าที่ผู้ใช้เลือกไว้ (สคริปต์ใน layout ตั้ง attribute ให้แล้วก่อน paint)
  useEffect(() => {
    // อ่านหลัง hydration — สคริปต์ใน layout ตั้ง attribute ให้แล้วก่อน paint จึงไม่มีจอกระพริบ
    const id = setTimeout(() => {
      try {
        const savedTheme = localStorage.getItem(LS_THEME);
        if (savedTheme === 'dark' || savedTheme === 'light') setThemeState(savedTheme);
        const savedMood = localStorage.getItem(LS_MOOD) as Mood | null;
        if (savedMood && savedMood in MOOD_LABEL) setMoodState(savedMood);

        const savedA11y = localStorage.getItem(LS_A11Y);
        if (savedA11y) {
          // รวมกับค่าเริ่มต้นเสมอ เผื่อเพิ่มตัวเลือกใหม่ทีหลังแล้วค่าเก่าไม่มีคีย์นั้น
          const merged = { ...A11Y_DEFAULT, ...(JSON.parse(savedA11y) as Partial<A11y>) };
          setA11yState(merged);
          applyA11y(merged);
        }
      } catch {
        /* localStorage ปิดอยู่ — ใช้ค่าเริ่มต้น */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-nuv-theme', next);
    try {
      localStorage.setItem(LS_THEME, next);
    } catch {
      /* ไม่เป็นไร */
    }
  }, []);

  const setMood = useCallback(
    (next: Mood) => {
      setMoodState(next);
      document.documentElement.setAttribute('data-nuv-mood', next);
      try {
        localStorage.setItem(LS_MOOD, next);
      } catch {
        /* ไม่เป็นไร */
      }
      // สไตล์นีออนออกแบบมาให้ใช้คู่โหมดมืด จึงเปิดให้อัตโนมัติ
      if (next === 'neon') setTheme('dark');
    },
    [setTheme],
  );

  const setA11y = useCallback((patch: Partial<A11y>) => {
    setA11yState((prev) => {
      const next = { ...prev, ...patch };
      next.textScale = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(next.textScale)));
      applyA11y(next);
      try {
        localStorage.setItem(LS_A11Y, JSON.stringify(next));
      } catch {
        /* ไม่เป็นไร */
      }
      return next;
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.setAttribute('lang', next === 'en' ? 'en' : 'th');
    try {
      localStorage.setItem('nuv-lang', next);
    } catch {
      /* ไม่เป็นไร */
    }
    writeLangCookie(next);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      isEn: lang === 'en',
      setLang,
      toggleLang: () => setLang(lang === 'en' ? 'th' : 'en'),
      t: (th: string) => translate(th, lang),

      theme,
      darkMode: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),

      mood,
      setMood,

      a11y,
      setA11y,
    }),
    [lang, theme, mood, a11y, setLang, setTheme, setMood, setA11y],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProviders>');
  return ctx;
}

/** ใช้เมื่อต้องการเฉพาะฟังก์ชันแปล */
export function useT() {
  return useApp().t;
}
