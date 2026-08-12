/* NU Volunteer — mock API layer.
 * Single swap point for the real backend: replace `transport()` below with fetch().
 * Every call here mirrors an endpoint documented in the API spec.
 */
(function (global) {
  'use strict';

  var LS_EMAIL = 'nuv-email-log';
  var LS_BACKUP = 'nuv-backups';
  var LS_SESSION = 'nuv-sessions';

  function load(k, fb) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid(p) { return p + Math.random().toString(36).slice(2, 9); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nowIso() { return new Date().toISOString(); }

  /* ---------- email templates (th / en) ---------- */
  var TEMPLATES = {
    'registration.created': {
      th: { subject: 'มีผู้สมัครใหม่: {activity}', body: '{student} สมัครเข้าร่วม "{activity}" ({date}) แล้ว เหลือที่นั่ง {seatsLeft} ที่' },
      en: { subject: 'New sign-up: {activity}', body: '{student} joined "{activity}" ({date}). {seatsLeft} seats left.' },
    },
    'cancellation.requested': {
      th: { subject: 'คำขอยกเลิก: {activity}', body: '{student} ขอยกเลิกการเข้าร่วม "{activity}"\nเหตุผล: {reason}' },
      en: { subject: 'Cancellation request: {activity}', body: '{student} asked to cancel "{activity}".\nReason: {reason}' },
    },
    'approval.changed': {
      th: { subject: 'ผลการอนุมัติเปลี่ยนแปลง: {activity}', body: 'สถานะของคุณสำหรับ "{activity}" เปลี่ยนเป็น {status}' },
      en: { subject: 'Approval updated: {activity}', body: 'Your status for "{activity}" is now {status}.' },
    },
    'hours.approved': {
      th: { subject: 'ชั่วโมงจิตอาสาได้รับอนุมัติ ({hours} ชม.)', body: 'ชั่วโมงจาก "{activity}" จำนวน {hours} ชั่วโมง ได้รับอนุมัติแล้ว' },
      en: { subject: 'Volunteer hours approved ({hours} hrs)', body: '{hours} hours from "{activity}" have been approved.' },
    },
    'certificate.issued': {
      th: { subject: 'ใบประกาศพร้อมดาวน์โหลด · {ref}', body: 'ใบประกาศของ "{activity}" ออกให้แล้ว รหัสอ้างอิง {ref}' },
      en: { subject: 'Your certificate is ready · {ref}', body: 'The certificate for "{activity}" has been issued. Reference {ref}.' },
    },
    'password.changed': {
      th: { subject: 'รหัสผ่านของคุณถูกเปลี่ยน', body: 'รหัสผ่านถูกเปลี่ยนเมื่อ {time} จาก {device}\nหากไม่ใช่คุณ กรุณาติดต่อผู้ดูแลระบบทันที' },
      en: { subject: 'Your password was changed', body: 'Password changed at {time} from {device}.\nIf this was not you, contact the administrator immediately.' },
    },
    'backup.failed': {
      th: { subject: 'การสำรองข้อมูลล้มเหลว', body: 'รอบสำรองข้อมูล {freq} ล้มเหลวเมื่อ {time} — {error}' },
      en: { subject: 'Backup failed', body: 'The {freq} backup failed at {time} — {error}' },
    },
  };

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : '—'; });
  }

  TEMPLATES['password.reset-requested'] = {
    th: { subject: 'คำขอรีเซ็ตรหัสผ่าน NU Volunteer', body: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชี {email}\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 30 นาที): {link}\nถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใด ๆ' },
    en: { subject: 'Reset your NU Volunteer password', body: 'We received a password reset request for {email}\nUse this link to set a new password (expires in 30 minutes): {link}\nIf you did not request this, no action is needed.' },
  };

  function render(event, lang, vars) {
    var t = TEMPLATES[event] || { th: { subject: event, body: '' }, en: { subject: event, body: '' } };
    var l = t[lang === 'en' ? 'en' : 'th'];
    return { subject: fill(l.subject, vars || {}), body: fill(l.body, vars || {}) };
  }

  /* ---------- transport (SWAP THIS FOR fetch) ---------- */
  // โหมดจำลองเปิดได้เฉพาะเมื่อระบุชัดเจน: ?mock=1 หรือ window.NUV_ENV === 'development'
  function mockEnabled() {
    try {
      // production (มี backend จริง หรือไม่ได้รันบน host ทดสอบ) — ?mock=1 ต้องเปิดโหมดจำลองไม่ได้
      var host = String(location.hostname || '');
      var devHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || /(^|\.)(dev|staging|test)\./.test(host) || host === '';
      if (global.NUV_API_BASE || !devHost) return false;
      var qs = new URLSearchParams(location.search);
      if (qs.get('mock') === '1') return true;
      if (qs.get('mock') === '0') return false;
      return global.NUV_ENV === 'development' || global.NUV_ENV === 'test';
    } catch (e) { return false; }
  }
  var MOCK = mockEnabled();
  // LIVE = มี backend จริง (ตั้ง window.NUV_API_BASE ก่อนโหลดไฟล์นี้) — ไม่ตั้ง = โหมดจำลองเดิม
  var LIVE = !!global.NUV_API_BASE;
  var API = {
    env: MOCK ? 'development' : 'production',
    live: LIVE,
    baseUrl: global.NUV_API_BASE || '/api/v1',
    chaos: MOCK ? 0.14 : 0,          // production ต้องไม่สร้าง error หลอกเด็ดขาด
    latency: MOCK ? [380, 1100] : [120, 320],
    _forceFail: null,                // ตั้งเป็น path เพื่อบังคับให้ call ถัดไปล้มเหลว (ทดสอบเท่านั้น)
  };

  /* 401 → ให้ UI พากลับหน้าเข้าสู่ระบบพร้อมข้อความ */
  function onUnauthorized(err) {
    try {
      global.dispatchEvent(new CustomEvent('nuv:unauthorized', { detail: { message: err.message } }));
    } catch (e) {}
  }

  function transport(method, path, payload) {
    if (LIVE) {
      var url = API.baseUrl + path;
      var opts = {
        method: method,
        credentials: 'include',            // ส่ง httpOnly cookie (nuv_at / nuv_rt) ไปด้วยเสมอ
        headers: { 'Accept': 'application/json' },
      };
      if (method !== 'GET' && method !== 'HEAD') {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(payload || {});
      } else if (payload && Object.keys(payload).length) {
        url += (url.indexOf('?') < 0 ? '?' : '&') + new URLSearchParams(payload).toString();
      }
      return fetch(url, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) return j;
          var err = new Error(j.message || 'เกิดข้อผิดพลาด');
          err.code = j.code || 'UPSTREAM_UNAVAILABLE';
          err.status = r.status;
          if (r.status === 401 && path.indexOf('/auth/login') < 0) onUnauthorized(err);
          throw err;
        });
      }, function () {
        var err = new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        err.code = 'UPSTREAM_UNAVAILABLE'; err.status = 0;
        throw err;
      });
    }
    var lo = API.latency[0], hi = API.latency[1];
    return sleep(lo + Math.random() * (hi - lo)).then(function () {
      var forced = API._forceFail && API._forceFail === path;
      if (forced) API._forceFail = null;
      if (forced || Math.random() < API.chaos) {
        var err = new Error('อัปสตรีมไม่ตอบสนอง (503 Service Unavailable)');
        err.code = 'UPSTREAM_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
      return { ok: true, data: payload };
    });
  }

  /* retry with exponential backoff */
  function withRetry(fn, tries, onAttempt) {
    var attempt = 0;
    function go() {
      attempt++;
      if (onAttempt) onAttempt(attempt);
      return fn().catch(function (err) {
        if (attempt >= tries) throw err;
        return sleep(400 * Math.pow(2, attempt - 1)).then(go);
      });
    }
    return go();
  }

  /* ---------- email ---------- */
  function emailLog() { return load(LS_EMAIL, []); }
  function writeEmailLog(list) { save(LS_EMAIL, list.slice(0, 200)); }

  /* POST /v1/notifications/email */
  function sendEmail(opts) {
    // opts: {event, to, lang, vars, enabled, retries}
    if (!opts.enabled) {
      return Promise.resolve({ skipped: true, reason: 'EMAIL_NOTIFICATIONS_OFF' });
    }
    var msg = render(opts.event, opts.lang, opts.vars);
    var entry = {
      id: uid('em-'), event: opts.event, to: opts.to || 'unknown@nu.ac.th',
      lang: opts.lang === 'en' ? 'en' : 'th', subject: msg.subject, body: msg.body,
      status: 'sending', attempts: 0, createdAt: nowIso(), error: null,
    };
    var list = [entry].concat(emailLog());
    writeEmailLog(list);
    if (opts.onChange) opts.onChange(emailLog());

    return withRetry(function () {
      return transport('POST', '/notifications/email', { to: entry.to, subject: msg.subject });
    }, opts.retries == null ? 3 : opts.retries, function (n) {
      var l = emailLog();
      var i = l.findIndex(function (x) { return x.id === entry.id; });
      if (i >= 0) { l[i].attempts = n; l[i].status = n > 1 ? 'retrying' : 'sending'; writeEmailLog(l); if (opts.onChange) opts.onChange(l); }
    }).then(function () {
      var l = emailLog(); var i = l.findIndex(function (x) { return x.id === entry.id; });
      if (i >= 0) { l[i].status = 'sent'; l[i].sentAt = nowIso(); writeEmailLog(l); if (opts.onChange) opts.onChange(l); }
      return { id: entry.id, status: 'sent' };
    }).catch(function (err) {
      var l = emailLog(); var i = l.findIndex(function (x) { return x.id === entry.id; });
      if (i >= 0) { l[i].status = 'failed'; l[i].error = err.message; writeEmailLog(l); if (opts.onChange) opts.onChange(l); }
      throw err;
    });
  }

  /* POST /v1/notifications/email/{id}/retry */
  function retryEmail(id, onChange) {
    var l = emailLog(); var i = l.findIndex(function (x) { return x.id === id; });
    if (i < 0) return Promise.reject(new Error('ไม่พบรายการ'));
    l[i].status = 'retrying'; writeEmailLog(l); if (onChange) onChange(l);
    return transport('POST', '/notifications/email/retry', { id: id }).then(function () {
      var m = emailLog(); var j = m.findIndex(function (x) { return x.id === id; });
      m[j].status = 'sent'; m[j].sentAt = nowIso(); m[j].error = null; m[j].attempts = (m[j].attempts || 0) + 1;
      writeEmailLog(m); if (onChange) onChange(m);
      return { status: 'sent' };
    }).catch(function (err) {
      var m = emailLog(); var j = m.findIndex(function (x) { return x.id === id; });
      m[j].status = 'failed'; m[j].error = err.message; m[j].attempts = (m[j].attempts || 0) + 1;
      writeEmailLog(m); if (onChange) onChange(m);
      throw err;
    });
  }

  /* ---------- chat deletion ---------- */
  /* DELETE /v1/messages/{id}   scope: 'me' | 'all' */
  function deleteMessage(id, scope) {
    return transport('DELETE', '/messages/' + id, { scope: scope || 'me' })
      .then(function () { return { id: id, scope: scope || 'me', deletedAt: nowIso() }; });
  }

  /* DELETE /v1/conversations/{id}   (ฝั่งผู้เรียกเท่านั้น) */
  function deleteConversation(id) {
    return transport('DELETE', '/conversations/' + id, {})
      .then(function () { return { id: id, scope: 'me', deletedAt: nowIso() }; });
  }

  /* POST /v1/messages/bulk-delete   (olderThanMonths) */
  function bulkDeleteMessages(opts) {
    opts = opts || {};
    return transport('POST', '/messages/bulk-delete', { olderThanMonths: opts.olderThanMonths || 6 })
      .then(function () {
        return { deleted: opts.expected || 0, olderThanMonths: opts.olderThanMonths || 6, runAt: nowIso() };
      });
  }

  /* ---------- backups ---------- */
  function backups() { return load(LS_BACKUP, []); }

  /* POST /v1/backups   (trigger: 'manual' | 'scheduled') */
  function runBackup(opts) {
    opts = opts || {};
    var retention = opts.retention || 7;
    return withRetry(function () {
      return transport('POST', '/backups', { trigger: opts.trigger || 'manual' });
    }, opts.retries == null ? 2 : opts.retries).then(function () {
      var rec = {
        id: uid('bk-'), createdAt: nowIso(), trigger: opts.trigger || 'manual',
        sizeMb: +(38 + Math.random() * 22).toFixed(1), status: 'success',
        location: 's3://nuv-backups/' + new Date().toISOString().slice(0, 10) + '/', error: null,
      };
      var list = [rec].concat(backups()).slice(0, retention);
      save(LS_BACKUP, list);
      return rec;
    }).catch(function (err) {
      var rec = {
        id: uid('bk-'), createdAt: nowIso(), trigger: opts.trigger || 'manual',
        sizeMb: 0, status: 'failed', location: '—', error: err.message,
      };
      save(LS_BACKUP, [rec].concat(backups()).slice(0, retention));
      throw err;
    });
  }

  /* next scheduled run for a frequency */
  function nextBackupAt(freq, from) {
    var d = new Date(from || Date.now());
    d.setHours(2, 0, 0, 0);
    if (freq === 'weekly') d.setDate(d.getDate() + ((7 - d.getDay() + 7) % 7 || 7));
    else if (freq === 'monthly') { d.setMonth(d.getMonth() + 1); d.setDate(1); }
    else d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  /* ---------- auth ---------- */
  function sessions() {
    var s = load(LS_SESSION, null);
    if (!s) {
      s = [
        { id: uid('se-'), device: 'Chrome · Windows', ip: '10.20.1.44', current: true, lastSeen: nowIso() },
        { id: uid('se-'), device: 'Safari · iPhone 14', ip: '110.77.x.x', current: false, lastSeen: nowIso() },
        { id: uid('se-'), device: 'Edge · ห้องแล็บ CS-204', ip: '10.20.9.7', current: false, lastSeen: nowIso() },
      ];
      save(LS_SESSION, s);
    }
    return s;
  }

  /* POST /v1/auth/password */
  function changePassword(opts) {
    // opts: {current, next, currentHint}
    var pw = String(opts.next || '');
    if (pw.length < 8) return Promise.reject(mkErr('WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'));
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return Promise.reject(mkErr('WEAK_PASSWORD', 'ต้องมีทั้งตัวอักษรและตัวเลข'));
    if (opts.current === opts.next) return Promise.reject(mkErr('SAME_PASSWORD', 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'));
    if (LIVE) {
      return transport('POST', '/auth/password', { current: opts.current, next: opts.next, lang: opts.lang })
        .then(function (r) { return { revoked: true, sessionsRemaining: r.sessionsRemaining }; });
    }
    return transport('POST', '/auth/password', { }).then(function () {
      // server-side: bcrypt.hash(next, 12) then invalidate other sessions
      if (String(opts.current || '') !== String(opts.currentHint || 'nu12345678')) {
        throw mkErr('INVALID_CREDENTIALS', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
      var kept = sessions().filter(function (s) { return s.current; });
      save(LS_SESSION, kept);
      return { revoked: true, sessionsRemaining: kept.length };
    });
  }

  /* ---------- accounts & auth ---------- */
  var LS_ACCOUNTS = 'nuv-accounts';
  var LS_RESET = 'nuv-reset-tokens';
  var RESET_TTL = 30 * 60 * 1000;

  // จำลอง hash ฝั่งเซิร์ฟเวอร์ — ของจริงต้องใช้ bcrypt/argon2 ฝั่ง backend เท่านั้น
  function pwHash(pw) {
    var s = 'nuv|' + String(pw || '');
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return 'sim$' + (h >>> 0).toString(36);
  }
  function accounts() { return load(LS_ACCOUNTS, []); }
  function writeAccounts(list) { save(LS_ACCOUNTS, list); }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function findAccount(email) {
    var e = normEmail(email);
    return accounts().filter(function (a) { return normEmail(a.email) === e; })[0] || null;
  }

  /* GET /v1/auth/check-email */
  function checkEmail(email) {
    if (LIVE) return transport('GET', '/auth/check-email', { email: normEmail(email) }).then(function (r) { return { exists: !!r.exists }; });
    return transport('GET', '/auth/check-email', {}).then(function () {
      return { exists: !!findAccount(email) };
    });
  }

  /* POST /v1/auth/register */
  function register(opts) {
    var email = normEmail(opts.email);
    var pw = String(opts.password || '');
    if (!/@nu\.ac\.th$/.test(email)) return Promise.reject(mkErr('EMAIL_DOMAIN', 'กรุณาใช้อีเมลมหาวิทยาลัย @nu.ac.th เท่านั้น'));
    if (pw.length < 8) return Promise.reject(mkErr('WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'));
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return Promise.reject(mkErr('WEAK_PASSWORD', 'ต้องมีทั้งตัวอักษรและตัวเลข'));
    if (!opts.acceptedTerms) return Promise.reject(mkErr('TERMS_REQUIRED', 'กรุณายอมรับข้อกำหนดการใช้งานก่อนสมัคร'));
    if (LIVE) {
      return transport('POST', '/auth/register', {
        email: email, password: pw, name: opts.name || '', studentId: opts.studentId || '',
        faculty: opts.faculty || '', loanStatus: opts.loanStatus || '',
        acceptedTerms: !!opts.acceptedTerms, role: opts.role || 'student',
        captchaToken: opts.captchaToken,
      }).then(function (r) { return { account: r.account }; });
    }
    return transport('POST', '/auth/register', {}).then(function () {
      if (findAccount(email)) throw mkErr('EMAIL_TAKEN', 'อีเมลนี้มีบัญชีอยู่แล้ว');
      var acc = {
        id: uid('u-'), email: email, pwHash: pwHash(pw), role: opts.role || 'student',
        name: opts.name || '', studentId: opts.studentId || '', faculty: opts.faculty || '',
        loanStatus: opts.loanStatus || '', createdAt: nowIso(),
      };
      writeAccounts([acc].concat(accounts()));
      return { account: { id: acc.id, email: acc.email, role: acc.role, name: acc.name, studentId: acc.studentId, faculty: acc.faculty, loanStatus: acc.loanStatus } };
    });
  }

  /* POST /v1/auth/login */
  function login(opts) {
    var email = normEmail(opts.email);
    var pw = String(opts.password || '');
    if (!email || !pw) return Promise.reject(mkErr('INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
    if (LIVE) {
      return transport('POST', '/auth/login', { email: email, password: pw, captchaToken: opts.captchaToken })
        .then(function (r) { return { account: r.account }; });
    }
    return transport('POST', '/auth/login', {}).then(function () {
      var acc = findAccount(email);
      // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด เพื่อไม่ให้ใช้ฟอร์มสแกนหาอีเมลที่มีบัญชี
      if (!acc || acc.pwHash !== pwHash(pw)) throw mkErr('INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return { account: { id: acc.id, email: acc.email, role: acc.role, name: acc.name, studentId: acc.studentId, faculty: acc.faculty, loanStatus: acc.loanStatus } };
    });
  }

  function resetTokens() { return load(LS_RESET, []); }
  function writeResetTokens(list) { save(LS_RESET, list.slice(0, 50)); }

  /* POST /v1/auth/forgot — คืนผลเหมือนกันทุกกรณี (ไม่เปิดเผยว่าอีเมลมีบัญชีหรือไม่) */
  function requestPasswordReset(opts) {
    var email = normEmail(opts.email);
    if (LIVE) {
      // backend สร้าง token + ส่งอีเมลเอง — client ไม่มีทางเห็น token
      return transport('POST', '/auth/forgot', {
        email: email, lang: opts.lang, baseLink: opts.baseLink, captchaToken: opts.captchaToken,
      }).then(function () { return { sent: true, token: null }; });
    }
    return transport('POST', '/auth/forgot', {}).then(function () {
      var acc = findAccount(email);
      if (!acc) return { sent: true, token: null };
      var tk = uid('rst-');
      var rec = { token: tk, email: email, exp: Date.now() + RESET_TTL, used: false, createdAt: nowIso() };
      writeResetTokens([rec].concat(resetTokens().filter(function (r) { return r.email !== email; })));
      var link = (opts.baseLink || 'https://nuv.nu.ac.th/reset') + '?token=' + tk;
      return sendEmail({
        event: 'password.reset-requested', to: email, lang: opts.lang, enabled: true, retries: 2,
        vars: { email: email, link: link },
      }).then(function () { return { sent: true, token: tk, link: link }; })
        .catch(function () { return { sent: true, token: tk, link: link }; });
    });
  }

  function verifyResetToken(token) {
    var rec = resetTokens().filter(function (r) { return r.token === String(token || ''); })[0];
    if (!rec) return { valid: false, reason: 'TOKEN_INVALID' };
    if (rec.used) return { valid: false, reason: 'TOKEN_USED' };
    if (Date.now() > rec.exp) return { valid: false, reason: 'TOKEN_EXPIRED' };
    return { valid: true, email: rec.email };
  }

  /* POST /v1/auth/reset */
  function resetPassword(opts) {
    var pw = String(opts.password || '');
    if (pw.length < 8) return Promise.reject(mkErr('WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'));
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return Promise.reject(mkErr('WEAK_PASSWORD', 'ต้องมีทั้งตัวอักษรและตัวเลข'));
    if (LIVE) {
      return transport('POST', '/auth/reset', { token: opts.token, password: pw, lang: opts.lang })
        .then(function (r) { return { ok: true, email: r.email }; });
    }
    return transport('POST', '/auth/reset', {}).then(function () {
      var chk = verifyResetToken(opts.token);
      if (!chk.valid) throw mkErr(chk.reason, chk.reason === 'TOKEN_EXPIRED' ? 'ลิงก์รีเซ็ตหมดอายุแล้ว' : 'ลิงก์รีเซ็ตไม่ถูกต้องหรือถูกใช้ไปแล้ว');
      var list = accounts().map(function (a) {
        return normEmail(a.email) === chk.email ? Object.assign({}, a, { pwHash: pwHash(pw) }) : a;
      });
      writeAccounts(list);
      writeResetTokens(resetTokens().map(function (r) {
        return r.token === opts.token ? Object.assign({}, r, { used: true }) : r;
      }));
      sendEmail({ event: 'password.changed', to: chk.email, lang: opts.lang, enabled: true, retries: 1, vars: { email: chk.email } }).catch(function () {});
      return { ok: true, email: chk.email };
    });
  }

  function seedAccounts(list) {
    if (LIVE) return [];            // โหมดจริง: บัญชีมาจาก prisma/seed.js เท่านั้น
    // upsert: เพิ่มบัญชีที่ยังไม่มี และอัปเดตเฉพาะบัญชีที่ระบบ seed ไว้ (ไม่แตะบัญชีที่ผู้ใช้สมัครเอง)
    var out = accounts().slice();
    (list || []).forEach(function (x) {
      var email = normEmail(x.email);
      var rec = {
        email: email, pwHash: pwHash(x.password), role: x.role || 'student',
        name: x.name || '', studentId: x.studentId || '', faculty: x.faculty || '',
        loanStatus: x.loanStatus || '', seeded: true,
      };
      var i = out.findIndex(function (a) { return normEmail(a.email) === email; });
      if (i < 0) out.unshift(Object.assign({ id: uid('u-'), createdAt: nowIso() }, rec));
      else if (out[i].seeded) out[i] = Object.assign({}, out[i], rec);
    });
    writeAccounts(out);
    return out;
  }

  /* ---------- two-factor auth ---------- */
  var LS_2FA = 'nuv-2fa';
  function twoFactor() { return load(LS_2FA, { enabled: false, method: 'totp', backupCodes: [], enrolledAt: null }); }

  function makeBackupCodes() {
    var out = [];
    for (var i = 0; i < 8; i++) {
      out.push((Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6)).toUpperCase());
    }
    return out;
  }

  /* POST /v1/auth/2fa/enable  {method:'totp'|'sms', phone?} */
  function enable2fa(opts) {
    opts = opts || {};
    return transport('POST', '/auth/2fa/enable', { method: opts.method || 'totp' }).then(function () {
      var secret = 'NUV' + Math.random().toString(36).slice(2, 12).toUpperCase();
      var rec = {
        enabled: false, pending: true, method: opts.method || 'totp',
        phone: opts.phone || null, secret: secret,
        otpauth: 'otpauth://totp/NU%20Volunteer:' + encodeURIComponent(opts.account || 'me@nu.ac.th') +
          '?secret=' + secret + '&issuer=NU%20Volunteer',
        backupCodes: makeBackupCodes(), enrolledAt: null,
      };
      save(LS_2FA, rec);
      return rec;
    });
  }

  /* POST /v1/auth/2fa/verify  {code} */
  function verify2fa(code) {
    var c = String(code || '').replace(/\s/g, '');
    return transport('POST', '/auth/2fa/verify', {}).then(function () {
      var rec = twoFactor();
      var isBackup = (rec.backupCodes || []).indexOf(c.toUpperCase()) >= 0;
      // mock: ยอมรับรหัส 6 หลักใดก็ได้ หรือรหัสสำรองที่ยังไม่ถูกใช้ (จริง: ตรวจ TOTP ฝั่งเซิร์ฟเวอร์)
      if (!isBackup && !/^\d{6}$/.test(c)) throw mkErr('INVALID_OTP', 'รหัสยืนยันไม่ถูกต้อง');
      if (isBackup) rec.backupCodes = rec.backupCodes.filter(function (x) { return x !== c.toUpperCase(); });
      rec.enabled = true; rec.pending = false; rec.enrolledAt = rec.enrolledAt || nowIso();
      save(LS_2FA, rec);
      return { verified: true, usedBackupCode: isBackup, backupCodesLeft: rec.backupCodes.length };
    });
  }

  /* DELETE /v1/auth/2fa */
  function disable2fa() {
    return transport('DELETE', '/auth/2fa', {}).then(function () {
      save(LS_2FA, { enabled: false, method: 'totp', backupCodes: [], enrolledAt: null });
      return true;
    });
  }

  /* POST /v1/auth/2fa/backup-codes/regenerate */
  function regenBackupCodes() {
    return transport('POST', '/auth/2fa/backup-codes/regenerate', {}).then(function () {
      var rec = twoFactor(); rec.backupCodes = makeBackupCodes(); save(LS_2FA, rec);
      return rec.backupCodes;
    });
  }

  /* DELETE /v1/auth/session */
  function signOut() {
    return transport('DELETE', '/auth/session', {}).then(function () { save(LS_SESSION, []); return true; })
      .catch(function () { save(LS_SESSION, []); return true; });
  }

  function mkErr(code, msg) { var e = new Error(msg); e.code = code; return e; }

  /* POST /v1/auth/sessions/revoke-others */
  function revokeOtherSessions() {
    return transport('POST', '/auth/sessions/revoke-others', {}).then(function () {
      var kept = sessions().filter(function (s) { return s.current; });
      save(LS_SESSION, kept);
      return kept;
    });
  }

  /* ---------- certificates ---------- */
  /* POST /v1/certificates */
  function issueCertificate(opts) {
    // opts: {student, studentId, activity, hours, date, enabled}
    if (!opts.enabled) return Promise.resolve({ skipped: true, reason: 'AUTO_CERT_OFF' });
    return withRetry(function () {
      return transport('POST', '/certificates', { activityId: opts.activityId });
    }, 2).then(function () {
      var y = new Date().getFullYear() + 543;
      var ref = 'NUV-' + y + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      return {
        ref: ref, issuedAt: nowIso(),
        url: '/api/v1/certificates/' + ref + '.pdf',
        verifyUrl: location.origin + location.pathname + '#/verify?ref=' + ref,
      };
    });
  }

  /* ---------- calendar (.ics) ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function icsStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }

  /* events: [{uid, title, description, location, start:Date, end:Date, cancelled:bool, sequence:int}] */
  function buildIcs(events, calName) {
    var out = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Naresuan University//NU Volunteer//TH',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + esc(calName || 'NU Volunteer'),
      'X-WR-TIMEZONE:Asia/Bangkok',
    ];
    (events || []).forEach(function (e) {
      out.push('BEGIN:VEVENT');
      out.push('UID:' + esc(e.uid) + '@nuvolunteer.nu.ac.th');
      out.push('DTSTAMP:' + icsStamp(new Date()));
      out.push('SEQUENCE:' + (e.sequence || 0));
      out.push('DTSTART:' + icsStamp(e.start));
      out.push('DTEND:' + icsStamp(e.end));
      out.push('SUMMARY:' + esc(e.title));
      if (e.description) out.push('DESCRIPTION:' + esc(e.description));
      if (e.location) out.push('LOCATION:' + esc(e.location));
      out.push('STATUS:' + (e.cancelled ? 'CANCELLED' : 'CONFIRMED'));
      out.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.title), 'END:VALARM');
      out.push('END:VEVENT');
    });
    out.push('END:VCALENDAR');
    return out.join('\r\n');
  }

  function downloadIcs(events, filename, calName) {
    var blob = new Blob([buildIcs(events, calName)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = (filename || 'nu-volunteer') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return events.length;
  }

  global.NUVApi = {
    config: API, render: render, templates: TEMPLATES,
    sendEmail: sendEmail, retryEmail: retryEmail, emailLog: emailLog,
    clearEmailLog: function () { writeEmailLog([]); },
    deleteMessage: deleteMessage, deleteConversation: deleteConversation, bulkDeleteMessages: bulkDeleteMessages,
    runBackup: runBackup, backups: backups, nextBackupAt: nextBackupAt,
    changePassword: changePassword, sessions: sessions, signOut: signOut,
    login: login, register: register, checkEmail: checkEmail, accounts: accounts,
    config: API, logoutOtherSessions: function () { return transport('POST', '/auth/logout-other-sessions', {}); },
    me: function () { return transport('GET', '/auth/me', {}); },
    refresh: function () { return transport('POST', '/auth/refresh', {}); },
    seedAccounts: seedAccounts, requestPasswordReset: requestPasswordReset,
    verifyResetToken: verifyResetToken, resetPassword: resetPassword,
    resetTokens: resetTokens,
    twoFactor: twoFactor, enable2fa: enable2fa, verify2fa: verify2fa,
    disable2fa: disable2fa, regenBackupCodes: regenBackupCodes, revokeOtherSessions: revokeOtherSessions,
    issueCertificate: issueCertificate,
    buildIcs: buildIcs, downloadIcs: downloadIcs,
  };
})(window);
