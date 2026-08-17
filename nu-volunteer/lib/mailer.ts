import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '@/lib/db';

type Template = { subject: string; body: string };

// เทมเพลตตรงกับ TEMPLATES ใน nuv-api.js (th/en) เพื่อให้ข้อความเหมือนกันทุกช่องทาง
const TEMPLATES: Record<string, { th: Template; en: Template }> = {
  'password.reset-requested': {
    th: {
      subject: 'คำขอรีเซ็ตรหัสผ่าน NU Volunteer',
      body: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชี {email}\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน {ttl} นาที): {link}\nถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใด ๆ',
    },
    en: {
      subject: 'Reset your NU Volunteer password',
      body: 'We received a password reset request for {email}\nUse this link to set a new password (expires in {ttl} minutes): {link}\nIf you did not request this, no action is needed.',
    },
  },
  'password.changed': {
    th: {
      subject: 'รหัสผ่านของคุณถูกเปลี่ยน',
      body: 'รหัสผ่านถูกเปลี่ยนเมื่อ {time} จาก {device}\nหากไม่ใช่คุณ กรุณาติดต่อผู้ดูแลระบบทันที',
    },
    en: {
      subject: 'Your password was changed',
      body: 'Password changed at {time} from {device}.\nIf this was not you, contact the administrator immediately.',
    },
  },
  'registration.created': {
    th: {
      subject: 'มีผู้สมัครใหม่: {activity}',
      body: '{student} สมัครเข้าร่วม "{activity}" ({date}) แล้ว เหลือที่นั่ง {seatsLeft} ที่',
    },
    en: {
      subject: 'New sign-up: {activity}',
      body: '{student} joined "{activity}" ({date}). {seatsLeft} seats left.',
    },
  },
  'cancellation.requested': {
    th: {
      subject: 'คำขอยกเลิก: {activity}',
      body: '{student} ขอยกเลิกการเข้าร่วม "{activity}"\nเหตุผล: {reason}',
    },
    en: {
      subject: 'Cancellation request: {activity}',
      body: '{student} asked to cancel "{activity}".\nReason: {reason}',
    },
  },
  'approval.changed': {
    th: {
      subject: 'ผลการอนุมัติเปลี่ยนแปลง: {activity}',
      body: 'สถานะของคุณสำหรับ "{activity}" เปลี่ยนเป็น {status}',
    },
    en: {
      subject: 'Approval updated: {activity}',
      body: 'Your status for "{activity}" is now {status}.',
    },
  },
  'hours.approved': {
    th: {
      subject: 'ชั่วโมงจิตอาสาได้รับอนุมัติ ({hours} ชม.)',
      body: 'ชั่วโมงจาก "{activity}" จำนวน {hours} ชั่วโมง ได้รับอนุมัติแล้ว',
    },
    en: {
      subject: 'Volunteer hours approved ({hours} hrs)',
      body: '{hours} hours from "{activity}" have been approved.',
    },
  },
  'certificate.issued': {
    th: {
      subject: 'ใบประกาศพร้อมดาวน์โหลด · {ref}',
      body: 'ใบประกาศของ "{activity}" ออกให้แล้ว รหัสอ้างอิง {ref}\nตรวจสอบได้ที่ {verifyUrl}',
    },
    en: {
      subject: 'Your certificate is ready · {ref}',
      body: 'The certificate for "{activity}" has been issued. Reference {ref}.\nVerify it at {verifyUrl}',
    },
  },
  /* อีเมลทดสอบจากหน้าการเชื่อมต่อระบบ — ไม่ได้เกิดจากเหตุการณ์ของผู้ใช้
     มีไว้ให้ผู้ดูแลยืนยันว่าเส้นทางส่งอีเมลใช้งานได้จริงก่อนจะมีเหตุการณ์จริงเกิดขึ้น */
  'system.test': {
    th: {
      subject: 'อีเมลทดสอบจาก NU Volunteer',
      body: 'นี่คืออีเมลทดสอบที่ส่งจากหน้าการเชื่อมต่อระบบเมื่อ {at}\nถ้าคุณได้รับฉบับนี้ แปลว่าการตั้งค่าการส่งอีเมลใช้งานได้',
    },
    en: {
      subject: 'Test email from NU Volunteer',
      body: 'This is a test email sent from the system integrations page at {at}.\nIf you received it, email delivery is working.',
    },
  },
};

const fill = (s: string, vars: Record<string, unknown>) =>
  String(s).replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : '—'));

let tx: Transporter | { sendMail: (m: Record<string, unknown>) => Promise<unknown> } | null = null;

function transport() {
  if (tx) return tx;
  const kind = process.env.MAIL_TRANSPORT || 'console';
  if (kind === 'console') {
    tx = {
      sendMail: async (m: Record<string, unknown>) => {
        console.log('[mail]', m.to, m.subject, '\n', m.text);
        return { messageId: 'console' };
      },
    };
  } else if (kind === 'sendgrid') {
    tx = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
  } else {
    tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return tx;
}

export function renderTemplate(event: string, lang: string | undefined, vars: Record<string, unknown>) {
  const t = TEMPLATES[event];
  if (!t) throw new Error('unknown template ' + event);
  const l = t[lang === 'en' ? 'en' : 'th'];
  return { subject: fill(l.subject, vars), body: fill(l.body, vars) };
}

/**
 * ส่งอีเมลและบันทึกลง EmailLog เสมอ (หน้าแอดมิน "สถานะอีเมล" อ่านจากตารางนี้)
 * ผู้เรียกควร .catch() เอง — การส่งอีเมลล้มเหลวต้องไม่ทำให้คำขอหลักล้มเหลว
 */
export async function sendMail(
  event: string,
  { to, lang = 'th', vars = {} }: { to: string; lang?: string; vars?: Record<string, unknown> },
) {
  const msg = renderTemplate(event, lang, vars);
  const log = await prisma.emailLog.create({
    data: {
      event,
      to,
      lang: lang === 'en' ? 'en' : 'th',
      subject: msg.subject,
      body: msg.body,
      status: 'sending',
      attempts: 1,
    },
  });

  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM || 'no-reply@nu.ac.th',
      to,
      subject: msg.subject,
      text: msg.body,
    });
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'sent', sentAt: new Date() },
    });
    return { id: log.id, status: 'sent' as const };
  } catch (e) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'failed', error: (e as Error).message },
    });
    throw e;
  }
}
