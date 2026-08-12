import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Mitr, Noto_Sans_Thai, Inter } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import { LANG_COOKIE, normalizeLang } from '@/lib/i18n';
import './globals.css';

// Mitr เป็นฟอนต์หลัก (ออกแบบมาสำหรับไทย+ละติน) มี Noto Sans Thai เป็นสำรอง
const mitr = Mitr({
  weight: ['200', '300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-mitr',
});

const notoSansThai = Noto_Sans_Thai({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-noto-thai',
});

const inter = Inter({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NU Volunteer — ระบบบริหารจัดการกิจกรรมจิตอาสา มหาวิทยาลัยนเรศวร',
  description:
    'ระบบประกาศกิจกรรมจิตอาสา ลงทะเบียนเข้าร่วม เช็กอินด้วย QR บันทึกชั่วโมง และออกใบประกาศนียบัตร สำหรับนิสิตมหาวิทยาลัยนเรศวร',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E9ECF3',
};

/**
 * ตั้ง data-nuv-theme / data-nuv-mood ก่อน paint แรก
 * ไม่งั้นหน้าจะกระพริบสว่างก่อนสลับเป็นโหมดมืด
 */
const THEME_BOOTSTRAP = `
(function(){
  try{
    var d=document.documentElement;
    var t=localStorage.getItem('nuv-theme');
    if(t==='dark'||t==='light') d.setAttribute('data-nuv-theme',t);
    var m=localStorage.getItem('nuv-style-tweak');
    if(m==='pastel'||m==='candy'||m==='neon'||m==='minimal') d.setAttribute('data-nuv-mood',m);
  }catch(e){}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang = normalizeLang(jar.get(LANG_COOKIE)?.value);

  return (
    <html
      lang={lang}
      data-nuv-theme="light"
      data-nuv-mood="pastel"
      className={`${mitr.variable} ${notoSansThai.variable} ${inter.variable}`}
      style={{ ['--nuv-font' as string]: 'var(--font-mitr)' }}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <AppProviders initialLang={lang}>{children}</AppProviders>
      </body>
    </html>
  );
}
