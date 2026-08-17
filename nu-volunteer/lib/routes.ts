import { homeFor } from '@/lib/design';

/**
 * หน้าที่เปิดใช้งานแล้วจริงในแต่ละบทบาท (คีย์ตรงกับ ROLE_NAV ใน lib/design.ts)
 * แถบข้างยังแสดงเมนูครบตามที่ออกแบบไว้ แต่หน้าที่ยังไม่อยู่ในรายการนี้จะกดไม่ได้
 * — เพิ่มคีย์ที่นี่ทุกครั้งที่สร้างหน้าใหม่เสร็จ
 */
export const AVAILABLE_PAGES: Record<string, string[]> = {
  student: [
    'home',
    'discover',
    'registrations',
    'scan',
    'calendar',
    'hours',
    'certificates',
    'wishlist',
    'feed',
    'notifications',
    'chat',
    'profile',
    'settings',
    'guide',
  ],
  organizer: [
    'home',
    'activities',
    'calendar',
    'registrations',
    'cancellations',
    'qr',
    'hoursApproval',
    'stats',
    'feedback',
    'reports',
    'notifications',
    'chat',
    'profile',
    'settings',
    'guide',
  ],
  admin: [
    'home',
    'users',
    'activities',
    'calendar',
    'categories',
    'faculties',
    'newsBanners',
    'reports',
    'logs',
    'ops',
    'contact',
    'notifications',
    'profile',
    'guide',
    'settings',
  ],
};

/**
 * ปลายทางหลังเข้าสู่ระบบ — เข้าหน้าหลักของบทบาทถ้าสร้างแล้ว
 * บทบาทที่ยังไม่มีแดชบอร์ดให้กลับไปหน้าแรกแทน เพื่อไม่ให้เจอ 404
 */
export function landingFor(role: string): string {
  return AVAILABLE_PAGES[role]?.includes('home') ? homeFor(role) : '/';
}
