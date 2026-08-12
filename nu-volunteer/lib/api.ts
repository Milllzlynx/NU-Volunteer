/**
 * ตัวเรียก API ฝั่งเบราว์เซอร์ — แทนที่ transport() ของ nuv-api.js
 * รูปแบบ error ตรงกับ lib/errors.ts: { ok:false, code, message }
 */

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
