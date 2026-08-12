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
};

const AppContext = createContext<AppContextValue | null>(null);

const LS_THEME = 'nuv-theme';
const LS_MOOD = 'nuv-style-tweak';

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

  // อ่านค่าที่ผู้ใช้เลือกไว้ (สคริปต์ใน layout ตั้ง attribute ให้แล้วก่อน paint)
  useEffect(() => {
    // อ่านหลัง hydration — สคริปต์ใน layout ตั้ง attribute ให้แล้วก่อน paint จึงไม่มีจอกระพริบ
    const id = setTimeout(() => {
      try {
        const savedTheme = localStorage.getItem(LS_THEME);
        if (savedTheme === 'dark' || savedTheme === 'light') setThemeState(savedTheme);
        const savedMood = localStorage.getItem(LS_MOOD) as Mood | null;
        if (savedMood && savedMood in MOOD_LABEL) setMoodState(savedMood);
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
    }),
    [lang, theme, mood, setLang, setTheme, setMood],
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
