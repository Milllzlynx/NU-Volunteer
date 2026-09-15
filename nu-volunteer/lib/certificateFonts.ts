import { IBM_Plex_Sans_Thai, Noto_Serif_Thai } from 'next/font/google';

/**
 * ฟอนต์ของใบประกาศนียบัตร — แยกจากฟอนต์หลักของแอป (Mitr) เพราะใบประกาศเป็นเอกสารทางการ
 *
 * โหลดเฉพาะหน้าที่ import ไฟล์นี้ ไม่ใส่ไว้ใน app/layout.tsx ให้ทุกหน้าต้องโหลดตาม
 * serif ใช้กับหัวเรื่อง ชื่อผู้รับ และตัวเลขชั่วโมง ส่วน sans ใช้กับเนื้อความทั่วไป
 */
export const certSerif = Noto_Serif_Thai({
  weight: ['400', '600', '800'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-cert-serif',
});

export const certSans = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-cert-sans',
});

export const certFontVars = `${certSerif.variable} ${certSans.variable}`;
