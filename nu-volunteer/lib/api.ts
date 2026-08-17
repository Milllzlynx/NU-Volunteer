/**
 * ตัวเรียก API ฝั่งเบราว์เซอร์ — แทนที่ transport() ของ nuv-api.js
 * รูปแบบ error ตรงกับ lib/errors.ts: { ok:false, code, message }
 */

import type { ActivityDetailView } from '@/lib/activityDetail';

/** รีวิวหนึ่งรายการตามรูปแบบที่ getActivityDetail() ส่งกลับมา */
export type ActivityReview = ActivityDetailView['reviews'][number];

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'UPSTREAM_UNAVAILABLE', status = 0) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

const BASE = '/api/v1';

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  { method = 'GET', body, query, signal }: Options = {},
): Promise<T> {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v != null) qs.set(k, String(v));
    if (qs.size) url += (url.includes('?') ? '&' : '?') + qs.toString();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      // cookie httpOnly (nuv_at / nuv_rt) ต้องถูกส่งไปด้วยเสมอ
      credentials: 'include',
      headers: body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    // เครือข่ายล้ม — ไม่ใช่ error จากเซิร์ฟเวอร์
    throw new ApiClientError(
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
      'NETWORK_ERROR',
      0,
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new ApiClientError(
      data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่',
      data.code || 'UPSTREAM_UNAVAILABLE',
      res.status,
    );
  }
  return data as T;
}

export const apiGet = <T = Record<string, unknown>>(
  path: string,
  query?: Options['query'],
  signal?: AbortSignal,
) => apiFetch<T>(path, { method: 'GET', query, signal });

export const apiPost = <T = Record<string, unknown>>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'POST', body });

/** ข้อความ error ที่พร้อมแสดงบนหน้าจอ */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiClientError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

export function errorCode(e: unknown): string {
  return e instanceof ApiClientError ? e.code : 'UPSTREAM_UNAVAILABLE';
}

/* ───────────────── auth ───────────────── */

export type Account = {
  id: string;
  email: string;
  role: string;
  name: string;
  studentId: string;
  faculty: string;
  loanStatus: string;
  avatarUrl: string | null;
};

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<{ ok: true; account: Account }>('/auth/login', { email, password }),

  register: (payload: {
    email: string;
    password: string;
    name?: string;
    studentId?: string;
    faculty?: string;
    loanStatus?: string;
    acceptedTerms: boolean;
  }) => apiPost<{ ok: true; account: Account }>('/auth/register', payload),

  checkEmail: (email: string, signal?: AbortSignal) =>
    apiGet<{ ok: true; exists: boolean }>('/auth/check-email', { email }, signal),

  forgot: (email: string, lang: string) =>
    apiPost<{ ok: true; sent: boolean }>('/auth/forgot', { email, lang }),

  reset: (token: string, password: string, lang: string) =>
    apiPost<{ ok: true; email: string }>('/auth/reset', { token, password, lang }),

  logout: () => apiPost<{ ok: true }>('/auth/logout'),

  me: () => apiGet<{ ok: true; account: Account }>('/auth/me'),
};

/* ───────────────── กิจกรรมฝั่งนิสิต ───────────────── */

export const activityApi = {
  apply: (activityId: string) =>
    apiPost<{ ok: true; registration: { id: string; activityId: string; status: string } }>(
      '/registrations',
      { activityId },
    ),

  toggleFavorite: (activityId: string) =>
    apiPost<{ ok: true; favorited: boolean }>('/favorites', { activityId }),

  /**
   * รายละเอียดกิจกรรมหนึ่งรายการ — เซิร์ฟเวอร์กรองข้อมูลตามสิทธิ์ของผู้เรียกมาแล้ว
   * (รายชื่อผู้เข้าร่วมว่างเมื่อยังไม่เข้าสู่ระบบ ชื่อผู้รีวิวถูกย่อให้ผู้เยี่ยมชม)
   */
  detail: (activityId: string, signal?: AbortSignal) =>
    apiGet<{ ok: true; activity: ActivityDetailView }>(`/activities/${activityId}`, undefined, signal),

  review: (activityId: string, payload: { stars: number; comment: string }) =>
    apiPost<{ ok: true; review: ActivityReview }>(`/activities/${activityId}/reviews`, payload),
};

/* ───────────────── ผู้จัดกิจกรรม ───────────────── */

export type ActivityFormPayload = {
  title: string;
  categoryId: string;
  orgName: string;
  description: string;
  location: string;
  /** ค่าจาก <input type="datetime-local"> ส่งเป็นสตริงตรง ๆ ให้เซิร์ฟเวอร์แปลง */
  startAt: string;
  endAt: string;
  regOpenAt: string;
  regCloseAt: string;
  seatsTotal: number;
  hours: number;
  status: string;
  requiresApproval: boolean;
  photo: string;
  /** ลิงก์ Google Maps ที่ผู้จัดวางเอง — เว้นว่าง = ระบบสร้างลิงก์ค้นหาจากชื่อสถานที่ให้ */
  mapLink: string;
  /** ภาพนิ่งของแผนที่ที่แสดงคู่กับลิงก์ในหน้ารายละเอียด — ลิงก์ http หรือ data URL */
  mapImage: string;
  /** ภาพประกอบกิจกรรม กรองช่องว่างออกแล้ว — ลิงก์ http หรือ data URL */
  gallery: string[];
  /** หลายบรรทัด — หนึ่งบรรทัดคือหนึ่งรายการ */
  perks: string;
  prep: string;
  /** หมายเหตุพิเศษ — ข้อความอิสระ ไม่ได้ตัดเป็นรายการเหมือน perks/prep */
  notes: string;
};

export const organizerApi = {
  createActivity: (payload: ActivityFormPayload) =>
    apiPost<{ ok: true; activity: { id: string; title: string; status: string } }>(
      '/organizer/activities',
      payload,
    ),

  updateActivity: (id: string, payload: ActivityFormPayload) =>
    apiFetch<{ ok: true; activity: { id: string; title: string; status: string } }>(
      `/organizer/activities/${id}`,
      { method: 'PATCH', body: payload },
    ),

  /** เปลี่ยนสถานะอย่างเดียว — เผยแพร่ ปิดรับ หรือยกเลิก จากหน้ารายการ */
  setActivityStatus: (id: string, status: string) =>
    apiFetch<{ ok: true; activity: { id: string; status: string } }>(
      `/organizer/activities/${id}`,
      { method: 'PATCH', body: { status } },
    ),

  deleteActivity: (id: string) =>
    apiFetch<{ ok: true }>(`/organizer/activities/${id}`, { method: 'DELETE' }),

  decideRegistration: (id: string, action: 'approve' | 'reject', reason?: string) =>
    apiFetch<{ ok: true; registration: { id: string; status: string } }>(
      `/organizer/registrations/${id}`,
      { method: 'PATCH', body: { action, reason } },
    ),

  /** เช็กอิน/เช็กเอาต์ให้นิสิตเอง เมื่อสแกน QR หน้างานไม่ได้ */
  manualCheckin: (registrationId: string, kind: 'in' | 'out') =>
    apiFetch<{ ok: true; result: { registrationId: string; atMs: number; hoursComputed: number } }>(
      `/organizer/registrations/${registrationId}/checkin`,
      { method: 'PATCH', body: { kind } },
    ),

  /** รับรองชั่วโมง — ไม่ส่ง hours = ให้ตามที่กิจกรรมประกาศไว้ */
  decideHours: (id: string, payload: { action: 'approve' | 'reject'; hours?: number; note?: string }) =>
    apiFetch<{ ok: true; registration: { id: string; hoursAwarded: number; status: string } }>(
      `/organizer/hours/${id}`,
      { method: 'PATCH', body: payload },
    ),

  reviewEvidence: (id: string, status: 'approved' | 'rejected', note?: string) =>
    apiFetch<{ ok: true; evidence: { id: string; status: string; reviewNote: string | null } }>(
      `/organizer/evidence/${id}`,
      { method: 'PATCH', body: { status, note } },
    ),

  /** อนุมัติ/ปฏิเสธหลายใบพร้อมกัน — คืนจำนวนที่ทำสำเร็จและที่ถูกข้าม */
  bulkDecideRegistrations: (
    registrationIds: string[],
    action: 'approve' | 'reject',
    reason?: string,
  ) =>
    apiPost<{ ok: true; done: number; skipped: number }>('/organizer/registrations/bulk', {
      registrationIds,
      action,
      reason,
    }),

  decideCancellation: (id: string, action: 'approve' | 'reject', note?: string) =>
    apiFetch<{ ok: true; registration: { id: string; status: string; cancelStatus: string | null } }>(
      `/organizer/cancellations/${id}`,
      { method: 'PATCH', body: { action, note } },
    ),

  /** รหัสเช็กอินที่ใช้อยู่ตอนนี้ พร้อมภาพ QR เป็น data URL — เรียกซ้ำได้ รหัสจะเปลี่ยนเองเมื่อหมดอายุ */
  checkinToken: (activityId: string, kind: CheckinKindDto, signal?: AbortSignal) =>
    apiGet<{ ok: true; token: CheckinTokenDto; image: string }>(
      '/organizer/checkin-token',
      { activityId, kind },
      signal,
    ),

  /** ยกเลิกรหัสเดิมแล้วออกใหม่เดี๋ยวนี้ — ใช้ตอนสงสัยว่ารหัสรั่ว จอที่เปิดค้างอยู่จะตามมาเอง */
  rotateCheckinToken: (activityId: string, kind: CheckinKindDto) =>
    apiFetch<{ ok: true; token: CheckinTokenDto; image: string }>('/organizer/checkin-token', {
      method: 'POST',
      query: { activityId, kind },
    }),
};

/** in/out = รหัสแยกกัน, auto = ใบเดียวสลับทิศทางตามสถานะของคนสแกน */
export type CheckinKindDto = 'in' | 'out' | 'auto';

export type CheckinTokenDto = {
  code: string;
  kind: CheckinKindDto;
  /** ข้อความที่อยู่ใน QR */
  payload: string;
  expiresAtMs: number;
  ttlSec: number;
};

export type CheckinResultDto = {
  kind: 'in' | 'out';
  registrationId: string;
  activityId: string;
  activityTitle: string;
  atMs: number;
  /** เช็กอินนอกรัศมีที่กิจกรรมกำหนด — ไม่ได้ถูกปฏิเสธ แต่ผู้จัดเห็นเครื่องหมายไว้ */
  outOfRange: boolean;
  hoursComputed: number;
};

export const checkinApi = {
  /** รับได้ทั้งข้อความเต็มจาก QR และรหัสที่พิมพ์มือ — ฝั่งเซิร์ฟเวอร์ตัดหัว NUV1: ให้เอง */
  redeem: (code: string, geo?: { lat: number; lng: number } | null) =>
    apiPost<{ ok: true; result: CheckinResultDto }>('/checkin', {
      code,
      lat: geo?.lat,
      lng: geo?.lng,
    }),
};

export const registrationApi = {
  cancel: (id: string, reason: string) =>
    apiPost<{ ok: true; registration: { id: string; status: string; cancelStatus: string | null } }>(
      `/registrations/${id}/cancel`,
      { reason },
    ),

  /** ส่งหลักฐานการเข้าร่วม — รูปเป็น data URL ที่ฟอร์มย่อขนาดมาแล้ว */
  submitEvidence: (id: string, payload: { fileUrl: string; fileName?: string; note?: string }) =>
    apiPost<{ ok: true; evidence: { id: string; status: string } }>(
      `/registrations/${id}/evidence`,
      payload,
    ),
};

/* ───────────────── ปฏิทินส่วนตัว ───────────────── */

export const calendarApi = {
  /** date เป็น YYYY-MM-DD และ time เป็น HH:mm ตามเวลาไทย — ไม่ส่ง time = นัดหมายทั้งวัน */
  create: (payload: {
    title: string;
    date: string;
    time?: string;
    endTime?: string;
    note?: string;
    color?: string;
  }) =>
    apiPost<{ ok: true; event: { id: string; title: string; startAt: string } }>(
      '/calendar-events',
      payload,
    ),

  remove: (id: string) =>
    apiFetch<{ ok: true }>('/calendar-events', { method: 'DELETE', query: { id } }),
};

/* ───────────────── การแจ้งเตือน ───────────────── */

export const notificationApi = {
  setRead: (id: string, read: boolean) =>
    apiFetch<{ ok: true; updated: number }>('/notifications', { method: 'PATCH', body: { id, read } }),

  setAllRead: (read: boolean) =>
    apiFetch<{ ok: true; updated: number }>('/notifications', { method: 'PATCH', body: { all: true, read } }),

  remove: (id: string) =>
    apiFetch<{ ok: true; deleted: number }>('/notifications', { method: 'DELETE', query: { id } }),

  clearRead: () =>
    apiFetch<{ ok: true; deleted: number }>('/notifications', { method: 'DELETE', query: { scope: 'read' } }),
};

export type NotifyPrefsDto = {
  activityReminder: boolean;
  deadlineReminder: boolean;
  systemNotice: boolean;
  chatMessage: boolean;
  leadDays: number;
  emailEnabled: boolean;
};

export const preferencesApi = {
  get: () => apiGet<{ ok: true; prefs: NotifyPrefsDto }>('/notification-preferences'),

  update: (patch: Partial<NotifyPrefsDto>) =>
    apiFetch<{ ok: true; prefs: NotifyPrefsDto }>('/notification-preferences', {
      method: 'PATCH',
      body: patch,
    }),
};

/* ───────────────── โปรไฟล์และบัญชี ───────────────── */

export type ProfileDto = {
  id: string;
  name: string;
  bio: string;
  phone: string | null;
  faculty: string | null;
  avatarUrl: string | null;
  shareContact: boolean;
};

export const profileApi = {
  update: (patch: Partial<Omit<ProfileDto, 'id'>>) =>
    apiFetch<{ ok: true; profile: ProfileDto }>('/profile', { method: 'PATCH', body: patch }),
};

export const accountApi = {
  /** ฝั่งเซิร์ฟเวอร์รับคีย์ชื่อ current/next และจะเพิกถอนเซสชันอื่นทั้งหมดให้ด้วย */
  changePassword: (current: string, next: string, lang: string) =>
    apiPost<{ ok: true }>('/auth/password', { current, next, lang }),
};

/* ───────────────── แชท ───────────────── */

export type ChatThreadDto = {
  id: string;
  /** null = ห้องที่ไม่ผูกกับกิจกรรม เพราะกิจกรรมถูกลบไปแล้ว */
  activityId: string | null;
  activityTitle: string | null;
  /** id ของคู่สนทนา — ใช้จับคู่เหตุการณ์ออนไลน์/ออฟไลน์ที่ส่งมาทางสตรีม */
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  otherOnline: boolean;
  lastText: string | null;
  lastAtMs: number;
  unread: number;
  muted: boolean;
  archived: boolean;
};

export type ChatMessageDto = {
  id: string;
  text: string | null;
  mine: boolean;
  senderName: string;
  readAt: number | null;
  atMs: number;
};

export const chatApi = {
  threads: () => apiGet<{ ok: true; threads: ChatThreadDto[] }>('/chat/threads'),

  /** เปิด (หรือกลับเข้า) ห้องคุยกับผู้จัดของกิจกรรมที่ลงทะเบียนไว้ */
  openThread: (activityId: string) =>
    apiPost<{ ok: true; id: string }>('/chat/threads', { activityId }),

  messages: (threadId: string, signal?: AbortSignal) =>
    apiGet<{ ok: true; messages: ChatMessageDto[] }>('/chat/messages', { threadId }, signal),

  send: (threadId: string, text: string) =>
    apiPost<{ ok: true; id: string; atMs: number }>('/chat/messages', { threadId, text }),

  typing: (threadId: string) => apiPost<{ ok: true }>('/chat/typing', { threadId }),

  setThread: (id: string, patch: { muted?: boolean; archived?: boolean }) =>
    apiFetch<{ ok: true }>('/chat/threads', { method: 'PATCH', body: { id, ...patch } }),

  removeThread: (id: string) =>
    apiFetch<{ ok: true; hidden: number }>('/chat/threads', { method: 'DELETE', query: { id } }),
};

/* ───────────────── ค้นหา ───────────────── */

export type SearchHitActivity = {
  id: string;
  title: string;
  orgName: string;
  location: string;
  hours: number;
  status: string;
  dateTh: string;
  dateEn: string;
  category: { id: string; label: string; labelEn: string; color: string };
};

export type SearchHitRegistration = SearchHitActivity & {
  activityId: string;
  hoursAwarded: number;
  who: string | null;
};

export type SearchHitUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
  faculty: string | null;
  active: boolean;
};

export type SearchResult = {
  ok: true;
  q: string;
  activities: SearchHitActivity[];
  registrations: SearchHitRegistration[];
  users: SearchHitUser[];
  truncated: boolean;
};

export const searchApi = {
  query: (
    params: { q: string; scope?: string; category?: string; status?: string },
    signal?: AbortSignal,
  ) => apiGet<SearchResult>('/search', params, signal),
};

/* ───────────────── admin ───────────────── */

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  studentId: string | null;
  faculty: string | null;
  avatarUrl: string | null;
  active: boolean;
  deletionRequested: boolean;
  deletionReason: string | null;
  registrations: number;
  organized: number;
  joinedTh: string;
  joinedEn: string;
};

/** ตัวเลขบนแท็บ — นับจากทั้งระบบเสมอ ไม่ผูกกับตัวกรองที่เปิดอยู่ */
export type AdminUserCounts = {
  all: number;
  students: number;
  organizers: number;
  admins: number;
  suspended: number;
  deletion: number;
};

export type AdminUserList = {
  ok: true;
  users: AdminUserRow[];
  counts: AdminUserCounts;
  faculties: string[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export const adminApi = {
  users: (
    params: { q?: string; role?: string; state?: string; faculty?: string; page?: number },
    signal?: AbortSignal,
  ) => apiGet<AdminUserList>('/admin/users', params, signal),

  /** เปลี่ยนบทบาท ระงับ/คืนสิทธิ์ หรือปิดคำขอลบบัญชี — ส่งเฉพาะสิ่งที่จะเปลี่ยน */
  updateUser: (id: string, payload: { role?: string; active?: boolean; clearDeletion?: boolean }) =>
    apiFetch<{
      ok: true;
      user: { id: string; role: string; active: boolean; deletionRequested: boolean };
    }>(`/admin/users/${id}`, { method: 'PATCH', body: payload }),

  /**
   * ลบบัญชีถาวร — ย้อนกลับไม่ได้ และพาใบลงทะเบียน ใบประกาศ ชั่วโมง และแชทของคนนั้นไปด้วย
   * ถ้าต้องการแค่ไม่ให้เข้าใช้งาน ให้ใช้ updateUser({ active: false }) แทน
   */
  deleteUser: (id: string) =>
    apiFetch<{ ok: true; removed: { registrations: number; certificates: number } }>(
      `/admin/users/${id}`,
      { method: 'DELETE' },
    ),
};

export type AdminCategory = {
  id: string;
  label: string;
  labelEn: string;
  desc: string;
  icon: string;
  color: string;
  order: number;
  active: boolean;
  /** จำนวนกิจกรรมที่ผูกกับหมวดนี้ — มากกว่า 0 แปลว่าลบไม่ได้ */
  activities: number;
};

export type AdminFaculty = {
  id: string;
  name: string;
  nameEn: string;
  abbr: string;
  email: string;
  phone: string;
  location: string;
  active: boolean;
  color: string;
  order: number;
  students: number;
};

/** ชื่อคณะที่มีนิสิตใช้อยู่จริงแต่ยังไม่มีในตาราง Faculty */
export type FacultyOrphan = { name: string; students: number };

export const adminContentApi = {
  categories: (signal?: AbortSignal) =>
    apiGet<{ ok: true; categories: AdminCategory[] }>('/admin/categories', undefined, signal),

  createCategory: (payload: Partial<AdminCategory> & { id: string; label: string }) =>
    apiPost<{ ok: true; category: AdminCategory }>('/admin/categories', payload),

  updateCategory: (id: string, payload: Partial<AdminCategory> | { move: 'up' | 'down' }) =>
    apiFetch<{ ok: true; category?: AdminCategory; moved?: boolean }>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  deleteCategory: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/categories/${id}`, { method: 'DELETE' }),

  faculties: (signal?: AbortSignal) =>
    apiGet<{ ok: true; faculties: AdminFaculty[]; orphans: FacultyOrphan[] }>(
      '/admin/faculties',
      undefined,
      signal,
    ),

  createFaculty: (payload: Partial<AdminFaculty> & { name: string }) =>
    apiPost<{ ok: true; faculty: AdminFaculty }>('/admin/faculties', payload),

  /** นำเข้าจาก CSV — ชื่อที่มีอยู่แล้วถูกข้าม ไม่ทับของเดิม */
  importFaculties: (rows: Partial<AdminFaculty>[]) =>
    apiPost<{ ok: true; created: number; skipped: number }>('/admin/faculties', { rows }),

  updateFaculty: (id: string, payload: Partial<AdminFaculty> | { move: 'up' | 'down' }) =>
    apiFetch<{ ok: true; faculty?: AdminFaculty; moved?: boolean }>(`/admin/faculties/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  deleteFaculty: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/faculties/${id}`, { method: 'DELETE' }),

  /** ย้ายกิจกรรมไปวันอื่นทั้งก้อน (ลากวางบนปฏิทิน) — เวลาและความยาวคงเดิม */
  rescheduleActivity: (id: string, day: string) =>
    apiFetch<{
      ok: true;
      moved: boolean;
      notified?: number;
      activity?: { id: string; day: string; endDay: string };
    }>(`/admin/activities/${id}/schedule`, { method: 'PATCH', body: { day } }),

  /** เปลี่ยนสถานะกิจกรรมหลายรายการพร้อมกัน */
  bulkActivityStatus: (ids: string[], status: string) =>
    apiFetch<{ ok: true; updated: number; status: string }>('/admin/activities', {
      method: 'PATCH',
      body: { ids, status },
    }),
};

/** ข้อความที่ผู้ใช้ส่งถึงผู้ดูแลระบบ */
export type AdminContactRow = {
  id: string;
  fromName: string;
  email: string;
  subject: string;
  text: string;
  read: boolean;
  atMs: number;
};

export const adminContactApi = {
  list: (signal?: AbortSignal) =>
    apiGet<{ ok: true; cap: number; messages: AdminContactRow[] }>('/admin/contact', undefined, signal),

  setRead: (id: string, read: boolean) =>
    apiFetch<{ ok: true; message: { id: string; read: boolean } }>(`/admin/contact/${id}`, {
      method: 'PATCH',
      body: { read },
    }),

  /** ทำเครื่องหมายอ่านแล้วทั้งกล่อง */
  readAll: () =>
    apiFetch<{ ok: true; updated: number }>('/admin/contact', { method: 'PATCH', body: { read: true } }),

  remove: (id: string) => apiFetch<{ ok: true }>(`/admin/contact/${id}`, { method: 'DELETE' }),
};

export const adminOpsApi = {
  /** ส่งอีเมลทดสอบไปยังอีเมลของผู้ดูแลที่กดปุ่ม — ใช้ตรวจว่าเส้นทางส่งอีเมลใช้งานได้จริง */
  sendTestEmail: () =>
    apiPost<{ ok: true; to: string; status: string; transport: string }>('/admin/ops/test-email', {}),
};

export type AdminNewsRow = {
  id: string;
  title: string;
  body: string;
  /** ข้อความย่อที่ตัดเครื่องหมายออกแล้ว — ใช้ในรายการโดยไม่ต้องแยกเนื้อหาซ้ำฝั่งหน้าเว็บ */
  excerpt: string;
  status: string;
  /** ตั้งเวลาเผยแพร่ไว้ในอนาคต ยังไม่ถึงเวลา */
  scheduled: boolean;
  publishedAt: string | null;
  publishedTh: string | null;
  publishedEn: string | null;
  image: string | null;
  pinned: boolean;
  audience: string;
  views: number;
  tags: string[];
  author: string | null;
  updatedTh: string;
  updatedEn: string;
};

export type AdminBannerRow = {
  id: string;
  title: string;
  desc: string;
  image: string | null;
  ctaLabel: string;
  /** คีย์หน้าใน ROLE_NAV ไม่ใช่ URL */
  ctaTarget: string;
  type: string;
  visible: boolean;
  order: number;
};

export type NewsInput = {
  title?: string;
  body?: string;
  status?: string;
  publishedAt?: string | null;
  image?: string;
  pinned?: boolean;
  audience?: string;
  tags?: string[];
};

export type BannerInput = {
  title?: string;
  desc?: string;
  image?: string;
  ctaLabel?: string;
  ctaTarget?: string;
  type?: string;
  visible?: boolean;
};

export const adminNewsApi = {
  list: (signal?: AbortSignal) =>
    apiGet<{ ok: true; news: AdminNewsRow[] }>('/admin/news', undefined, signal),

  create: (payload: NewsInput) =>
    apiPost<{ ok: true; news: { id: string; title: string; status: string } }>('/admin/news', payload),

  update: (id: string, payload: NewsInput) =>
    apiFetch<{ ok: true }>(`/admin/news/${id}`, { method: 'PATCH', body: payload }),

  remove: (id: string) => apiFetch<{ ok: true }>(`/admin/news/${id}`, { method: 'DELETE' }),

  banners: (signal?: AbortSignal) =>
    apiGet<{ ok: true; banners: AdminBannerRow[]; targets: string[] }>(
      '/admin/banners',
      undefined,
      signal,
    ),

  createBanner: (payload: BannerInput) =>
    apiPost<{ ok: true; banner: AdminBannerRow }>('/admin/banners', payload),

  updateBanner: (id: string, payload: BannerInput | { move: 'up' | 'down' }) =>
    apiFetch<{ ok: true; moved?: boolean }>(`/admin/banners/${id}`, { method: 'PATCH', body: payload }),

  removeBanner: (id: string) => apiFetch<{ ok: true }>(`/admin/banners/${id}`, { method: 'DELETE' }),
};
