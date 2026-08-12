import nodemailer from 'nodemailer';

// เทมเพลตตรงกับ TEMPLATES ใน nuv-api.js (th/en) เพื่อให้ข้อความเหมือนกันทุกช่องทาง
const TEMPLATES = {
  'password.reset-requested': {
    th: { subject: 'คำขอรีเซ็ตรหัสผ่าน NU Volunteer',
      body: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชี {email}\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน {ttl} นาที): {link}\nถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใด ๆ' },
    en: { subject: 'Reset your NU Volunteer password',
      body: 'We received a password reset request for {email}\nUse this link to set a new password (expires in {ttl} minutes): {link}\nIf you did not request this, no action is needed.' },
  },
  'password.changed': {
    th: { subject: 'รหัสผ่านของคุณถูกเปลี่ยน',
      body: 'รหัสผ่านถูกเปลี่ยนเมื่อ {time} จาก {device}\nหากไม่ใช่คุณ กรุณาติดต่อผู้ดูแลระบบทันที' },
    en: { subject: 'Your password was changed',
      body: 'Password changed at {time} from {device}.\nIf this was not you, contact the administrator immediately.' },
  },
};

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : '—'));

let tx = null;
function transport() {
  if (tx) return tx;
  const kind = process.env.MAIL_TRANSPORT || 'console';
  if (kind === 'console') {
    tx = { sendMail: async (m) => { console.log('[mail]', m.to, m.subject, '\n', m.text); return { messageId: 'console' }; } };
  } else if (kind === 'sendgrid') {
    tx = nodemailer.createTransport({
      host: 'smtp.sendgrid.net', port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
  } else {
    tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return tx;
}

export async function sendMail(event, { to, lang = 'th', vars = {} }) {
  const t = TEMPLATES[event];
  if (!t) throw new Error('unknown template ' + event);
  const l = t[lang === 'en' ? 'en' : 'th'];
  return transport().sendMail({
    from: process.env.MAIL_FROM || 'no-reply@nu.ac.th',
    to, subject: fill(l.subject, vars), text: fill(l.body, vars),
  });
}
