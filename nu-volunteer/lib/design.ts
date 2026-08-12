/**
 * โทเคนการออกแบบ — ดึงค่าจาก DESIGN-SYSTEM.md
 * ทุกค่าที่นี่ถูกเขียนลง inline style ขององค์ประกอบ (ไม่ใช้ CSS variable เป็นตัวหลัก)
 * เพื่อให้ชั้นสไตล์ Tweak ที่ match กับ [style*="..."] ทำงานได้
 */

export const BRAND_GRADIENT = 'linear-gradient(135deg,#E97171,#A774F7)';

export const COLOR = {
  ink: '#1F2937', // หัวข้อ/ตัวอักษรหลัก
  body: '#4B5563', // คำอธิบาย
  label: '#6B7280', // ป้ายกำกับ
  hint: '#9CA3AF', // hint/placeholder — ห้ามใช้กับข้อความสำคัญ
  link: '#B37CF6',
  linkHover: '#8b2fe0',
  pageBg: '#E9ECF3',
} as const;

export const SEMANTIC = {
  success: { color: '#0F8A63', bg: 'rgba(99,210,161,.18)', dot: '#63D2A1' },
  warning: { color: '#B45309', bg: 'rgba(245,166,35,.18)', dot: '#F5A623' },
  danger: { color: '#C2410C', bg: 'rgba(233,113,113,.18)', dot: '#E97171' },
  info: { color: '#2E7BC4', bg: 'rgba(122,184,255,.14)', dot: '#7AB8FF' },
  purple: { color: '#7C2FD9', bg: 'rgba(167,116,247,.18)', dot: '#A774F7' },
  neutral: { color: '#57534E', bg: 'rgba(31,41,55,.12)', dot: '#9CA3AF' },
  kyf: { color: '#E4572E', bg: 'rgba(228,87,46,.13)', dot: '#E4572E' },
} as const;

export type SemanticTone = keyof typeof SEMANTIC;

/** พื้นหลังไล่เฉดตามสไตล์ */
export const MOOD_BG: Record<string, string> = {
  pastel: 'linear-gradient(140deg,#FDF8F8 0%,#F3F8FF 48%,#F8F5FF 100%)',
  candy: 'linear-gradient(140deg,#FFF3F1 0%,#EEF5FF 46%,#F7EEFF 100%)',
  minimal: 'linear-gradient(140deg,#FCFCFD 0%,#FAFAFB 52%,#FBFBFC 100%)',
  neon: 'linear-gradient(140deg,#F4EEFF 0%,#EAF2FF 48%,#FFF0F4 100%)',
};

/** การ์ดกระจกมาตรฐาน (§1) — ต้องมี backdrop-filter เพื่อให้ชั้นสไตล์จับได้ */
export const glass = (radius = 20): React.CSSProperties => ({
  background: 'rgba(255,255,255,.62)',
  backdropFilter: 'blur(26px) saturate(180%)',
  WebkitBackdropFilter: 'blur(26px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.75)',
  borderRadius: radius,
  boxShadow: '0 10px 30px rgba(31,41,55,.08)',
});

/** การ์ดทึบกว่า ใช้กับโมดัลและแผงลอย */
export const solidGlass = (radius = 26): React.CSSProperties => ({
  background: 'rgba(255,255,255,.94)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.8)',
  borderRadius: radius,
  boxShadow: '0 30px 70px rgba(31,41,55,.18)',
});

export const ROLE_LABEL: Record<string, string> = {
  student: 'นิสิต',
  organizer: 'ผู้จัดกิจกรรม',
  admin: 'ผู้ดูแลระบบ',
};

export const ROLE_LABEL_EN: Record<string, string> = {
  student: 'Student',
  organizer: 'Organizer',
  admin: 'Administrator',
};

/** เมนูของแต่ละบทบาท — [key, ป้ายไทย, ไอคอน, path] */
export type NavItem = { key: string; label: string; labelEn: string; icon: string; href: string };

export const ROLE_NAV: Record<string, NavItem[]> = {
  student: [
    { key: 'home', label: 'หน้าหลัก', labelEn: 'Home', icon: 'home', href: '/student' },
    { key: 'discover', label: 'ค้นหากิจกรรม', labelEn: 'Find Activities', icon: 'travel_explore', href: '/student/discover' },
    { key: 'registrations', label: 'การลงทะเบียน', labelEn: 'My Registrations', icon: 'groups', href: '/student/registrations' },
    { key: 'calendar', label: 'ปฏิทิน', labelEn: 'Calendar', icon: 'calendar_month', href: '/student/calendar' },
    { key: 'hours', label: 'ชั่วโมงสะสม', labelEn: 'Volunteer Hours', icon: 'schedule', href: '/student/hours' },
    { key: 'certificates', label: 'ใบประกาศ', labelEn: 'Certificates', icon: 'workspace_premium', href: '/student/certificates' },
    { key: 'wishlist', label: 'รายการโปรด', labelEn: 'Favorites', icon: 'favorite', href: '/student/wishlist' },
    { key: 'notifications', label: 'การแจ้งเตือน', labelEn: 'Notifications', icon: 'notifications', href: '/student/notifications' },
    { key: 'chat', label: 'แชท', labelEn: 'Messages', icon: 'forum', href: '/student/chat' },
    { key: 'profile', label: 'โปรไฟล์', labelEn: 'Profile', icon: 'account_circle', href: '/student/profile' },
    { key: 'settings', label: 'ตั้งค่า', labelEn: 'Settings', icon: 'settings', href: '/student/settings' },
    { key: 'guide', label: 'คู่มือผู้ใช้งาน', labelEn: 'User Guide', icon: 'help_center', href: '/student/guide' },
  ],
  organizer: [
    { key: 'home', label: 'หน้าหลัก', labelEn: 'Home', icon: 'home', href: '/organizer' },
    { key: 'activities', label: 'กิจกรรม', labelEn: 'My Activities', icon: 'campaign', href: '/organizer/activities' },
    { key: 'calendar', label: 'ปฏิทินกิจกรรม', labelEn: 'Activity Calendar', icon: 'calendar_month', href: '/organizer/calendar' },
    { key: 'registrations', label: 'ผู้เข้าร่วมกิจกรรม', labelEn: 'Participants', icon: 'groups', href: '/organizer/registrations' },
    { key: 'cancellations', label: 'คำขอยกเลิก', labelEn: 'Cancellation Requests', icon: 'event_busy', href: '/organizer/cancellations' },
    { key: 'qr', label: 'QR Code', labelEn: 'QR Code', icon: 'qr_code_2', href: '/organizer/qr' },
    { key: 'hoursApproval', label: 'อนุมัติชั่วโมง', labelEn: 'Approve Hours', icon: 'fact_check', href: '/organizer/hours-approval' },
    { key: 'stats', label: 'สถิติ', labelEn: 'Statistics', icon: 'insights', href: '/organizer/stats' },
    { key: 'feedback', label: 'รีวิว', labelEn: 'Reviews', icon: 'reviews', href: '/organizer/feedback' },
    { key: 'reports', label: 'รายงาน', labelEn: 'Reports', icon: 'summarize', href: '/organizer/reports' },
    { key: 'notifications', label: 'การแจ้งเตือน', labelEn: 'Notifications', icon: 'notifications', href: '/organizer/notifications' },
    { key: 'chat', label: 'แชท', labelEn: 'Messages', icon: 'forum', href: '/organizer/chat' },
    { key: 'profile', label: 'โปรไฟล์', labelEn: 'Profile', icon: 'account_circle', href: '/organizer/profile' },
    { key: 'settings', label: 'ตั้งค่า', labelEn: 'Settings', icon: 'settings', href: '/organizer/settings' },
    { key: 'guide', label: 'คู่มือผู้ใช้งาน', labelEn: 'User Guide', icon: 'help_center', href: '/organizer/guide' },
  ],
  admin: [
    { key: 'home', label: 'หน้าหลัก', labelEn: 'Home', icon: 'home', href: '/admin' },
    { key: 'users', label: 'ผู้ใช้งาน', labelEn: 'Users', icon: 'manage_accounts', href: '/admin/users' },
    { key: 'activities', label: 'กิจกรรม', labelEn: 'All Activities', icon: 'campaign', href: '/admin/activities' },
    { key: 'calendar', label: 'ปฏิทินกิจกรรม', labelEn: 'Activity Calendar', icon: 'calendar_month', href: '/admin/calendar' },
    { key: 'categories', label: 'หมวดหมู่', labelEn: 'Categories', icon: 'category', href: '/admin/categories' },
    { key: 'faculties', label: 'คณะ', labelEn: 'Faculties', icon: 'school', href: '/admin/faculties' },
    { key: 'newsBanners', label: 'ข่าวสารประชาสัมพันธ์', labelEn: 'Announcements', icon: 'newspaper', href: '/admin/news' },
    { key: 'reports', label: 'รายงาน', labelEn: 'Reports', icon: 'summarize', href: '/admin/reports' },
    { key: 'logs', label: 'System Log', labelEn: 'System Log', icon: 'receipt_long', href: '/admin/logs' },
    { key: 'ops', label: 'การเชื่อมต่อระบบ', labelEn: 'System Integrations', icon: 'hub', href: '/admin/ops' },
    { key: 'contact', label: 'ข้อความ', labelEn: 'Inbox', icon: 'mail', href: '/admin/contact' },
    { key: 'notifications', label: 'การแจ้งเตือน', labelEn: 'Notifications', icon: 'notifications', href: '/admin/notifications' },
    { key: 'profile', label: 'โปรไฟล์', labelEn: 'Profile', icon: 'account_circle', href: '/admin/profile' },
    { key: 'guide', label: 'คู่มือผู้ใช้งาน', labelEn: 'User Guide', icon: 'help_center', href: '/admin/guide' },
    { key: 'settings', label: 'ตั้งค่า', labelEn: 'Settings', icon: 'settings', href: '/admin/settings' },
  ],
};

export function homeFor(role: string): string {
  return ROLE_NAV[role]?.[0]?.href ?? '/student';
}

/** การจัดกลุ่มเมนูในแถบข้าง */
export const NAV_GROUPS: Record<string, { label: string; labelEn: string; keys: string[] }[]> = {
  student: [
    { label: 'กิจกรรมของฉัน', labelEn: 'My Activities', keys: ['home', 'discover', 'registrations', 'calendar', 'hours', 'certificates'] },
    { label: 'ทั่วไป', labelEn: 'General', keys: ['wishlist', 'notifications', 'chat', 'profile', 'settings', 'guide'] },
  ],
  organizer: [
    { label: 'จัดการกิจกรรม', labelEn: 'Manage Activities', keys: ['home', 'activities', 'calendar', 'registrations', 'cancellations', 'qr', 'hoursApproval'] },
    { label: 'ข้อมูลเชิงลึก', labelEn: 'Insights', keys: ['stats', 'feedback', 'reports'] },
    { label: 'ทั่วไป', labelEn: 'General', keys: ['notifications', 'chat', 'profile', 'settings', 'guide'] },
  ],
  admin: [
    { label: 'จัดการระบบ', labelEn: 'System', keys: ['home', 'users', 'activities', 'calendar', 'categories', 'faculties'] },
    { label: 'สื่อสารและตรวจสอบ', labelEn: 'Communication & Audit', keys: ['newsBanners', 'reports', 'logs', 'ops', 'contact'] },
    { label: 'ทั่วไป', labelEn: 'General', keys: ['notifications', 'profile', 'guide', 'settings'] },
  ],
};

export const ROLE_ACCENT: Record<string, string> = {
  student: '#E97171',
  organizer: '#A774F7',
  admin: '#1F2937',
};

/** สถานะที่นั่ง — ใช้ทั้งการ์ดกิจกรรมและหน้ารายละเอียด */
export function seatStatus(filled: number, total: number, closed = false) {
  if (closed) return { key: 'closed', label: 'ปิดรับสมัคร', ...SEMANTIC.neutral };
  if (total > 0 && filled >= total) return { key: 'full', label: 'ที่นั่งเต็ม', ...SEMANTIC.danger };
  if (total > 0 && filled / total >= 0.8) return { key: 'almost', label: 'ใกล้เต็ม', ...SEMANTIC.warning };
  return { key: 'open', label: 'เปิดรับสมัคร', ...SEMANTIC.success };
}

/** สถานะการลงทะเบียนของนิสิต */
export const REG_STATUS: Record<string, { label: string; tone: SemanticTone; icon: string }> = {
  pending: { label: 'รออนุมัติ', tone: 'warning', icon: 'hourglass_top' },
  approved: { label: 'อนุมัติแล้ว', tone: 'success', icon: 'check_circle' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'danger', icon: 'cancel' },
  'checked-in': { label: 'เช็กอินแล้ว', tone: 'purple', icon: 'login' },
  'checked-out': { label: 'รอหลักฐาน', tone: 'warning', icon: 'upload_file' },
  completed: { label: 'เสร็จสิ้น', tone: 'success', icon: 'verified' },
  cancelled: { label: 'ยกเลิก', tone: 'neutral', icon: 'block' },
  'no-show': { label: 'ไม่มาตามนัด', tone: 'neutral', icon: 'person_off' },
};

export const EVIDENCE_STATUS: Record<string, { label: string; tone: SemanticTone }> = {
  pending: { label: 'รอตรวจ', tone: 'warning' },
  approved: { label: 'หลักฐานผ่าน', tone: 'success' },
  rejected: { label: 'หลักฐานไม่ผ่าน', tone: 'danger' },
};

export const APPEAL_STATUS: Record<string, { label: string; tone: SemanticTone }> = {
  pending: { label: 'รอพิจารณา', tone: 'warning' },
  approved: { label: 'อุทธรณ์ผ่าน', tone: 'success' },
  rejected: { label: 'อุทธรณ์ไม่ผ่าน', tone: 'danger' },
};
