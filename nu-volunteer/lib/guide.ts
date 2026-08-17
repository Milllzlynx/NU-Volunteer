/**
 * เนื้อหาคู่มือการใช้งานในระบบ
 *
 * เก็บสองภาษาคู่กันที่นี่แบบเดียวกับ lib/legal.ts เพราะเป็นย่อหน้ายาว
 * ไม่เหมาะกับพจนานุกรมคีย์ไทยใน lib/i18n ที่ออกแบบไว้สำหรับข้อความสั้น
 *
 * ที่มา: USER-GUIDE.md — ปรับถ้อยคำให้ตรงกับสิ่งที่ระบบทำได้จริงในตอนนี้
 * ตัวเลขทุกตัวตรวจกับโค้ดแล้ว (เกณฑ์รหัสผ่านที่ lib/validation.ts, อายุลิงก์รีเซ็ต
 * และโควตาการเข้าสู่ระบบที่ lib/rateLimit.ts, เกณฑ์ชั่วโมงที่ lib/academic.ts)
 *
 * หมายเหตุ: หัวข้อ "บัญชีทดสอบ" ใน USER-GUIDE.md จงใจไม่นำมาไว้ที่นี่
 * เพราะเอกสารต้นทางระบุว่าไม่ให้รวมในคู่มือฉบับเผยแพร่
 */

export type GuideItem = {
  /** bullet = ข้อย่อย · step = ลำดับขั้นตอน · note = กล่องข้อความเน้น */
  kind: 'bullet' | 'step' | 'note';
  text: string;
  textEn: string;
};

export type GuideSection = {
  id: string;
  icon: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  /**
   * คีย์หน้าใน ROLE_NAV ที่หัวข้อนี้พูดถึง — ใช้ทำปุ่ม "ไปที่หน้านี้"
   * และใช้ตรวจว่าหน้านั้นเปิดใช้งานแล้วหรือยัง จะได้ไม่สอนวิธีใช้สิ่งที่ยังกดไม่ได้
   */
  pageKey?: string;
  items: GuideItem[];
};

export type GuideFaq = {
  id: string;
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
};

/** หัวข้อที่ทุกบทบาทเห็นเหมือนกัน */
export const GUIDE_OVERVIEW: GuideSection[] = [
  {
    id: 'about',
    icon: 'info',
    title: 'ระบบนี้ทำอะไรได้บ้าง',
    titleEn: 'What this system does',
    summary: 'ภาพรวมของ NU Volunteer ตั้งแต่ประกาศกิจกรรมจนถึงออกใบประกาศนียบัตร',
    summaryEn: 'An overview of NU Volunteer, from posting activities to issuing certificates.',
    items: [
      {
        kind: 'bullet',
        text: 'NU Volunteer คือระบบบริหารจัดการกิจกรรมจิตอาสาของมหาวิทยาลัยนเรศวร ครอบคลุมการประกาศกิจกรรม การลงทะเบียนเข้าร่วม การบันทึกและรับรองชั่วโมง และการออกใบประกาศนียบัตรพร้อมหน้าตรวจสอบสาธารณะ',
        textEn:
          'NU Volunteer manages volunteer activities at Naresuan University: posting activities, registering to join, recording and approving service hours, and issuing certificates with a public verification page.',
      },
      {
        kind: 'bullet',
        text: 'สำหรับผู้กู้ยืมกองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.) ระบบคิดความคืบหน้าเทียบเกณฑ์ 36 ชั่วโมงต่อปีการศึกษา',
        textEn:
          'For Student Loan Fund (กยศ.) borrowers, the system tracks progress against the 36 hours per academic year requirement.',
      },
      {
        kind: 'bullet',
        text: 'ระบบมีสองภาษา (ไทย/อังกฤษ) โหมดมืด และสไตล์การแสดงผล 4 แบบ สลับได้จากปุ่มบนแถบหัวเรื่อง การตั้งค่าเหล่านี้จำไว้ต่ออุปกรณ์ ไม่ผูกกับบัญชี',
        textEn:
          'The system supports two languages (Thai/English), dark mode, and four visual styles, all switchable from the header. These settings are remembered per device, not per account.',
      },
      {
        kind: 'note',
        text: 'ระบบมี 3 บทบาท ได้แก่ นิสิต ผู้จัดกิจกรรม และผู้ดูแลระบบ แต่ละบทบาทเห็นเมนูและสิทธิ์ต่างกัน คู่มือหน้านี้แสดงเฉพาะหัวข้อของบทบาทที่คุณใช้อยู่',
        textEn:
          'There are three roles — student, organizer and administrator — each with its own menu and permissions. This guide shows only the topics for your role.',
      },
    ],
  },
];

/** หัวข้อของนิสิต — เรียงตามลำดับที่ผู้ใช้จริงจะเจอ */
export const GUIDE_STUDENT: GuideSection[] = [
  {
    id: 'account',
    icon: 'person_add',
    title: 'สมัครสมาชิกและเข้าสู่ระบบ',
    titleEn: 'Signing up and signing in',
    summary: 'เงื่อนไขอีเมล รหัสผ่าน และวิธีกู้คืนบัญชีเมื่อลืมรหัสผ่าน',
    summaryEn: 'Email and password rules, and how to recover your account.',
    items: [
      {
        kind: 'bullet',
        text: 'ต้องใช้อีเมลมหาวิทยาลัย @nu.ac.th เท่านั้น อีเมลโดเมนอื่นจะสมัครไม่ผ่าน',
        textEn: 'Only university @nu.ac.th addresses are accepted; other domains cannot register.',
      },
      {
        kind: 'bullet',
        text: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข หน้าสมัครมีตัววัดความแข็งแรงของรหัสผ่านให้ดูระหว่างพิมพ์',
        textEn:
          'Passwords must be at least 8 characters and contain both letters and numbers. The sign-up page shows a strength meter as you type.',
      },
      {
        kind: 'step',
        text: 'กรอกข้อมูลบัญชี ได้แก่ ชื่อ อีเมล และรหัสผ่าน',
        textEn: 'Enter your account details: name, email and password.',
      },
      {
        kind: 'step',
        text: 'กรอกข้อมูลนิสิต ได้แก่ รหัสนิสิต คณะ และสถานะผู้กู้ยืม กยศ.',
        textEn: 'Enter your student details: student ID, faculty, and loan-borrower status.',
      },
      {
        kind: 'step',
        text: 'อ่านและยอมรับข้อกำหนดการใช้งาน แล้วยืนยันการสมัคร',
        textEn: 'Read and accept the terms of use, then confirm.',
      },
      {
        kind: 'bullet',
        text: 'ลืมรหัสผ่าน: กรอกอีเมลที่หน้าเข้าสู่ระบบ ระบบจะส่งลิงก์ตั้งรหัสใหม่ที่ใช้ได้ภายใน 30 นาที ถ้าลิงก์หมดอายุให้ขอใหม่ได้',
        textEn:
          'Forgot your password: enter your email on the sign-in page and we send a reset link valid for 30 minutes. Request a new one if it expires.',
      },
      {
        kind: 'note',
        text: 'ระบบจำกัดการพยายามเข้าสู่ระบบไว้ 5 ครั้งต่อนาที เพื่อกันการเดารหัสผ่าน ถ้าเจอข้อความว่าพยายามมากเกินไป ให้รอสักครู่แล้วลองใหม่',
        textEn:
          'Sign-in attempts are limited to 5 per minute to prevent password guessing. If you see a "too many attempts" message, wait a moment and try again.',
      },
    ],
  },
  {
    id: 'discover',
    icon: 'travel_explore',
    title: 'ค้นหาและลงทะเบียนกิจกรรม',
    titleEn: 'Finding and joining activities',
    summary: 'วิธีค้นกิจกรรม อ่านสถานะที่นั่ง และลงทะเบียนเข้าร่วม',
    summaryEn: 'How to search, read seat status, and register.',
    pageKey: 'discover',
    items: [
      {
        kind: 'bullet',
        text: 'ค้นกิจกรรมได้จากช่องค้นหาบนแถบหัวเรื่องทุกหน้า หรือใช้ตัวกรองหมวดหมู่ในหน้าค้นหากิจกรรม',
        textEn:
          'Search from the header on any page, or use the category filters on the Find Activities page.',
      },
      {
        kind: 'bullet',
        text: 'สถานะที่นั่งอ่านได้จากป้ายสีพร้อมข้อความกำกับ ได้แก่ เปิดรับสมัคร · ใกล้เต็ม (ตั้งแต่ 80%) · ที่นั่งเต็ม · ปิดรับสมัคร',
        textEn:
          'Seat status is shown as a labelled badge: open, almost full (from 80%), full, or closed.',
      },
      {
        kind: 'bullet',
        text: 'เมื่อกดลงทะเบียน สถานะเริ่มต้นคือ รออนุมัติ จนกว่าผู้จัดกิจกรรมจะกดอนุมัติ ติดตามสถานะได้ที่หน้าการลงทะเบียน',
        textEn:
          'After you register, your status starts as pending until the organizer approves it. Track it on the My Registrations page.',
      },
      {
        kind: 'bullet',
        text: 'กดรูปหัวใจบนการ์ดกิจกรรมเพื่อบันทึกไว้ในรายการโปรด แล้วกลับมาดูภายหลังได้ที่หน้ารายการโปรด',
        textEn:
          'Tap the heart on an activity card to save it to your favourites and come back to it later.',
      },
      {
        kind: 'bullet',
        text: 'หน้ารายละเอียดกิจกรรมบอกวันเวลา สถานที่ สิทธิประโยชน์ที่จะได้รับ สิ่งที่ต้องเตรียมมา และแผนที่สถานที่จัด',
        textEn:
          'The activity page lists the date and time, location, what you get, what to bring, and a map of the venue.',
      },
      {
        kind: 'note',
        text: 'เมื่อเข้าสู่ระบบแล้ว คุณจะเห็นชื่อและคณะของผู้ที่ได้ที่นั่งในกิจกรรมนั้น และคนอื่นก็เห็นชื่อคุณเช่นกันเมื่อคุณได้ที่นั่งแล้ว ระบบไม่แสดงอีเมลหรือเบอร์โทรของใครทั้งสิ้น',
        textEn:
          'Once signed in you can see the names and faculties of people holding a seat on an activity — and they can see yours once you hold a seat. Email and phone numbers are never shown.',
      },
    ],
  },
  {
    id: 'hours',
    icon: 'schedule',
    title: 'ชั่วโมงจิตอาสาและหลักฐาน',
    titleEn: 'Volunteer hours and evidence',
    summary: 'ชั่วโมงนับเมื่อไร ดูความคืบหน้าเทียบเกณฑ์ กยศ. ได้ที่ไหน',
    summaryEn: 'When hours count, and where to track progress against the loan requirement.',
    pageKey: 'hours',
    items: [
      {
        kind: 'bullet',
        text: 'ชั่วโมงจะเข้ายอดสะสมเมื่อผู้จัดกิจกรรมรับรองการเข้าร่วมของคุณแล้วเท่านั้น ก่อนหน้านั้นรายการจะยังไม่ปรากฏในยอดรวม',
        textEn:
          'Hours are added to your total only after the organizer approves your attendance. Until then the activity does not count towards your total.',
      },
      {
        kind: 'bullet',
        text: 'หน้าชั่วโมงสะสมแสดงยอดรวมทั้งหมด ยอดของเดือนนี้ ยอดของปีการศึกษา และความคืบหน้าเทียบเกณฑ์ 36 ชั่วโมงต่อปีการศึกษา',
        textEn:
          'The Volunteer Hours page shows your all-time total, this month, this academic year, and progress against the 36-hour yearly requirement.',
      },
      {
        kind: 'bullet',
        text: 'กรองรายการตามช่วงวันที่และประเภทกิจกรรมได้ และส่งออกเป็นไฟล์ CSV หรือสั่งพิมพ์เป็น PDF เพื่อใช้เป็นหลักฐานประกอบได้',
        textEn:
          'Filter by date range and activity type, then export to CSV or print to PDF for your records.',
      },
      {
        kind: 'bullet',
        text: 'ชั่วโมงที่เจ้าหน้าที่ปรับเพิ่มหรือลดจะแสดงแยกไว้ต่างหาก พร้อมเหตุผลของการปรับ เพื่อให้ตรวจสอบย้อนหลังได้',
        textEn:
          'Any manual adjustments by staff are listed separately with the reason given, so the record stays auditable.',
      },
      {
        kind: 'bullet',
        text: 'ปีการศึกษาเริ่มนับวันที่ 1 มิถุนายน ถึง 31 พฤษภาคมของปีถัดไป',
        textEn: 'The academic year runs from 1 June to 31 May of the following year.',
      },
    ],
  },
  {
    id: 'certificates',
    icon: 'workspace_premium',
    title: 'ใบประกาศนียบัตร',
    titleEn: 'Certificates',
    summary: 'ใบประกาศออกเมื่อไร ดาวน์โหลดอย่างไร และให้คนอื่นตรวจสอบได้อย่างไร',
    summaryEn: 'When certificates are issued, how to download them, and how others verify them.',
    pageKey: 'certificates',
    items: [
      {
        kind: 'bullet',
        text: 'ใบประกาศออกให้อัตโนมัติเมื่อชั่วโมงของกิจกรรมนั้นได้รับการรับรองแล้ว ไม่ต้องยื่นคำขอเอง',
        textEn:
          'A certificate is issued automatically once your hours for an activity are approved — no request needed.',
      },
      {
        kind: 'bullet',
        text: 'กดดูตัวอย่างเพื่อดูใบก่อนพิมพ์ และกดดาวน์โหลดเพื่อสั่งพิมพ์หรือบันทึกเป็นไฟล์ PDF ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์',
        textEn:
          'Use Preview to see the certificate, then Download to print it or save it as a PDF through your browser’s print dialog.',
      },
      {
        kind: 'bullet',
        text: 'ใบประกาศทุกฉบับมีรหัสอ้างอิงเฉพาะในรูปแบบ NUV-ปีการศึกษา-รหัส 5 หลัก คัดลอกรหัสได้จากการ์ดใบประกาศ',
        textEn:
          'Every certificate carries a unique reference in the form NUV-<academic year>-<5 characters>, copyable from the certificate card.',
      },
      {
        kind: 'bullet',
        text: 'หน่วยงานภายนอกตรวจสอบความถูกต้องได้ที่หน้าตรวจสอบสาธารณะโดยไม่ต้องเข้าสู่ระบบ หน้านั้นแสดงเฉพาะชื่อผู้ถือ กิจกรรม ชั่วโมง และวันที่ออกใบ',
        textEn:
          'Anyone can check a certificate on the public verification page without signing in. That page shows only the holder name, activity, hours and issue date.',
      },
      {
        kind: 'note',
        text: 'ใบที่ถูกเพิกถอนจะยังอยู่ในรายการของคุณและยังตรวจสอบได้ แต่จะขึ้นสถานะว่าถูกเพิกถอนพร้อมเหตุผล และดาวน์โหลดไม่ได้',
        textEn:
          'A revoked certificate stays in your list and remains verifiable, but it is marked as revoked with a reason and cannot be downloaded.',
      },
    ],
  },
  {
    id: 'calendar',
    icon: 'calendar_month',
    title: 'ปฏิทินและการลงทะเบียนของฉัน',
    titleEn: 'Calendar and my registrations',
    summary: 'ดูกิจกรรมที่ลงทะเบียนไว้ และเพิ่มนัดหมายส่วนตัว',
    summaryEn: 'See the activities you joined and add your own reminders.',
    pageKey: 'calendar',
    items: [
      {
        kind: 'bullet',
        text: 'ปฏิทินแสดงเฉพาะกิจกรรมที่คุณลงทะเบียนไว้ พร้อมแถบกิจกรรมที่กำลังจะถึงด้านล่าง',
        textEn:
          'The calendar shows only activities you registered for, with an upcoming list underneath.',
      },
      {
        kind: 'bullet',
        text: 'เพิ่มนัดหมายส่วนตัวลงปฏิทินได้ เช่น เวลาอ่านหนังสือหรือประชุมเตรียมงาน นัดหมายเหล่านี้เห็นได้เฉพาะคุณเท่านั้น',
        textEn:
          'You can add personal reminders such as study time or prep meetings. These are visible only to you.',
      },
      {
        kind: 'bullet',
        text: 'หน้าการลงทะเบียนรวมทุกใบสมัครของคุณพร้อมสถานะ และยกเลิกการเข้าร่วมได้ตามเงื่อนไขที่ผู้จัดกำหนด',
        textEn:
          'My Registrations lists every application with its status, and lets you cancel within the organizer’s notice period.',
      },
    ],
  },
  {
    id: 'chat',
    icon: 'forum',
    title: 'แชทกับผู้จัดกิจกรรม',
    titleEn: 'Messaging organizers',
    summary: 'สอบถามรายละเอียดกับผู้จัดกิจกรรมที่คุณลงทะเบียนไว้',
    summaryEn: 'Ask the organizer of an activity you registered for.',
    pageKey: 'chat',
    items: [
      {
        kind: 'bullet',
        text: 'เริ่มบทสนทนาได้จากหน้าแชท โดยเลือกกิจกรรมที่คุณลงทะเบียนไว้ ระบบจะเปิดห้องคุยกับผู้จัดของกิจกรรมนั้นให้',
        textEn:
          'Start a conversation from the Messages page by picking an activity you registered for; a thread with its organizer opens.',
      },
      {
        kind: 'bullet',
        text: 'ข้อความส่งถึงกันทันทีโดยไม่ต้องรีเฟรชหน้า และมีสัญญาณบอกว่าอีกฝ่ายกำลังพิมพ์อยู่หรืออ่านข้อความแล้ว',
        textEn:
          'Messages arrive live without refreshing, with typing indicators and read receipts.',
      },
      {
        kind: 'bullet',
        text: 'ปิดเสียงแจ้งเตือนของห้องใดห้องหนึ่ง หรือเก็บเข้าคลังข้อความเพื่อซ่อนจากรายการหลักได้',
        textEn: 'You can mute a conversation, or archive it to hide it from the main list.',
      },
      {
        kind: 'note',
        text: 'การลบบทสนทนาจะลบออกจากหน้าจอของคุณเท่านั้น อีกฝ่ายยังเห็นประวัติของเขาตามเดิม และการลบนี้กู้คืนไม่ได้',
        textEn:
          'Deleting a conversation removes it from your view only — the other person keeps their copy — and it cannot be undone.',
      },
    ],
  },
  {
    id: 'settings',
    icon: 'settings',
    title: 'โปรไฟล์ การแจ้งเตือน และความปลอดภัย',
    titleEn: 'Profile, notifications and security',
    summary: 'แก้ข้อมูลส่วนตัว เลือกการแจ้งเตือนที่อยากได้รับ และดูแลความปลอดภัยบัญชี',
    summaryEn: 'Update your details, choose which notifications to receive, and secure your account.',
    pageKey: 'profile',
    items: [
      {
        kind: 'bullet',
        text: 'แก้ชื่อ คณะ รหัสนิสิต และอัปโหลดรูปโปรไฟล์ได้ที่หน้าโปรไฟล์',
        textEn: 'Change your name, faculty, student ID and profile photo on the Profile page.',
      },
      {
        kind: 'bullet',
        text: 'เลือกได้ว่าจะรับการแจ้งเตือนประเภทใดบ้าง เช่น เตือนกิจกรรมที่ใกล้ถึง เตือนกำหนดปิดรับสมัคร ข้อความจากผู้จัด และประกาศจากระบบ',
        textEn:
          'Choose which notifications you receive: upcoming activities, closing deadlines, organizer messages, and system announcements.',
      },
      {
        kind: 'bullet',
        text: 'ตัวเลขบนกระดิ่งที่แถบหัวเรื่องนับเฉพาะรายการที่ยังไม่อ่าน',
        textEn: 'The number on the header bell counts unread items only.',
      },
      {
        kind: 'note',
        text: 'เมื่อเปลี่ยนรหัสผ่าน ระบบจะออกจากระบบบนอุปกรณ์อื่นทั้งหมดโดยอัตโนมัติและส่งอีเมลแจ้งเตือน ถือเป็นพฤติกรรมปกติเพื่อความปลอดภัย',
        textEn:
          'Changing your password signs you out on all other devices and sends a notification email. This is normal and intended.',
      },
    ],
  },
];

export const GUIDE_FAQ: GuideFaq[] = [
  {
    id: 'q-hours',
    question: 'ทำไมชั่วโมงยังไม่ขึ้น',
    questionEn: 'Why have my hours not appeared yet?',
    answer:
      'ชั่วโมงจะเข้ายอดสะสมเมื่อผู้จัดกิจกรรมรับรองการเข้าร่วมของคุณแล้ว ตรวจสถานะได้ที่หน้าการลงทะเบียน ถ้ายังไม่ได้รับการรับรอง ให้สอบถามผู้จัดผ่านหน้าแชทได้โดยตรง',
    answerEn:
      'Hours count once the organizer approves your attendance. Check the status on My Registrations, and message the organizer directly from the Messages page if it is still pending.',
  },
  {
    id: 'q-pending',
    question: 'ลงทะเบียนแล้วสถานะยังเป็น "รออนุมัติ"',
    questionEn: 'My registration still says "pending"',
    answer:
      'ผู้จัดกิจกรรมต้องกดอนุมัติก่อน จึงจะเปลี่ยนเป็นอนุมัติแล้ว ระยะเวลาขึ้นกับผู้จัดแต่ละราย สอบถามได้ผ่านหน้าแชท',
    answerEn:
      'The organizer must approve it first. How long that takes is up to them — you can ask through the Messages page.',
  },
  {
    id: 'q-reset',
    question: 'ลืมรหัสผ่านทำอย่างไร',
    questionEn: 'What do I do if I forget my password?',
    answer:
      'กดลืมรหัสผ่านที่หน้าเข้าสู่ระบบ กรอกอีเมล @nu.ac.th แล้วเปิดลิงก์ในอีเมลภายใน 30 นาที ถ้าลิงก์หมดอายุให้ขอใหม่ ถ้าไม่ได้รับอีเมล ให้ตรวจโฟลเดอร์อีเมลขยะก่อนแจ้งผู้ดูแลระบบ',
    answerEn:
      'Use "Forgot password" on the sign-in page, enter your @nu.ac.th address, and open the emailed link within 30 minutes. Request a new link if it expires, and check your junk folder before contacting an administrator.',
  },
  {
    id: 'q-ratelimit',
    question: 'เข้าสู่ระบบไม่ได้ ขึ้นว่าพยายามมากเกินไป',
    questionEn: 'I cannot sign in — it says too many attempts',
    answer:
      'ระบบจำกัดการพยายามเข้าสู่ระบบไว้ 5 ครั้งต่อนาทีเพื่อป้องกันการเดารหัสผ่าน รอประมาณหนึ่งนาทีแล้วลองใหม่ ถ้าจำรหัสไม่ได้ให้ใช้ลืมรหัสผ่านแทนการเดา',
    answerEn:
      'Sign-in is limited to 5 attempts per minute to prevent password guessing. Wait about a minute and try again — or use "Forgot password" rather than guessing.',
  },
  {
    id: 'q-sessions',
    question: 'เปลี่ยนรหัสผ่านแล้วอุปกรณ์อื่นหลุดหมด ปกติหรือไม่',
    questionEn: 'Changing my password signed me out everywhere — is that normal?',
    answer:
      'ปกติ ระบบจะปิดเซสชันบนอุปกรณ์อื่นทั้งหมดทุกครั้งที่เปลี่ยนรหัสผ่าน เพื่อกันกรณีที่มีคนอื่นยังค้างการเข้าใช้งานอยู่',
    answerEn:
      'Yes. Every password change ends sessions on all other devices, in case someone else still has one open.',
  },
  {
    id: 'q-verify',
    question: 'ให้หน่วยงานภายนอกตรวจสอบใบประกาศอย่างไร',
    questionEn: 'How can an external body verify my certificate?',
    answer:
      'ส่งรหัสอ้างอิงบนใบประกาศให้เขา แล้วให้เปิดหน้าตรวจสอบสาธารณะและกรอกรหัสนั้น ไม่ต้องเข้าสู่ระบบ หน้านั้นจะบอกว่าใบถูกต้องหรือถูกเพิกถอน',
    answerEn:
      'Give them the reference code printed on the certificate and point them at the public verification page. No sign-in is needed, and the page states whether the certificate is valid or revoked.',
  },
  {
    id: 'q-lang',
    question: 'เปลี่ยนภาษาหรือโหมดมืดได้ที่ไหน',
    questionEn: 'Where do I change the language or dark mode?',
    answer:
      'ปุ่มสลับภาษา โหมดมืด และสไตล์การแสดงผลอยู่บนแถบหัวเรื่องด้านขวา การตั้งค่าจะจำไว้เฉพาะอุปกรณ์ที่คุณใช้ ไม่ตามไปกับบัญชี',
    answerEn:
      'The language, dark mode and visual style controls are on the right of the header. These are remembered on that device only, not on your account.',
  },
];

/**
 * หัวข้อคู่มือของผู้จัดกิจกรรม
 *
 * เรียงตามลำดับงานจริง: สร้างกิจกรรม → รับสมัคร → วันงาน → รับรองชั่วโมง → ดูผล
 * ทุกหัวข้อผูก pageKey ไว้กับคีย์ใน ROLE_NAV เพื่อให้ปุ่ม "ไปที่หน้านี้" พาไปถูกที่
 * และซ่อนเองเมื่อหน้านั้นยังไม่เปิดใช้งาน
 */
export const GUIDE_ORGANIZER: GuideSection[] = [
  {
    id: 'org-activities',
    icon: 'campaign',
    title: 'สร้างและเผยแพร่กิจกรรม',
    titleEn: 'Creating and publishing an activity',
    summary: 'ตั้งแต่ฉบับร่างจนถึงเปิดรับสมัครจริง และความหมายของแต่ละสถานะ',
    summaryEn: 'From draft to open for registration, and what each status means.',
    pageKey: 'activities',
    items: [
      {
        kind: 'step',
        text: 'ไปที่หน้ากิจกรรม แล้วกดสร้างกิจกรรม กรอกชื่อ หมวดหมู่ สถานที่ วันเวลาเริ่มและสิ้นสุด',
        textEn:
          'Go to My Activities and create one, filling in the title, category, location and start/end times.',
      },
      {
        kind: 'step',
        text: 'กำหนดจำนวนที่นั่งและชั่วโมงจิตอาสาที่ผู้เข้าร่วมจะได้รับ ใส่ที่นั่งเป็น 0 หากไม่จำกัดจำนวน',
        textEn:
          'Set the seat count and the volunteer hours participants will earn. Use 0 seats for unlimited.',
      },
      {
        kind: 'step',
        text: 'เลือกว่าต้องอนุมัติผู้สมัครก่อนหรือไม่ ถ้าไม่ต้องอนุมัติ ใบลงทะเบียนจะผ่านทันทีที่นิสิตกดสมัคร',
        textEn:
          'Choose whether registrations need approval. Without it, a registration is approved the moment a student applies.',
      },
      {
        kind: 'bullet',
        text: 'ฉบับร่างยังไม่แสดงให้นิสิตเห็น เปลี่ยนสถานะเป็นเปิดรับสมัครเมื่อพร้อมจริง',
        textEn: 'Drafts are invisible to students. Switch the status to open when you are ready.',
      },
      {
        kind: 'bullet',
        text: 'วันปิดรับสมัครต้องไม่เลยวันเริ่มกิจกรรม และเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มเสมอ',
        textEn:
          'The registration close date cannot fall after the start date, and the end time must be after the start time.',
      },
      {
        kind: 'note',
        text: 'ผู้จัดเห็นและแก้ไขได้เฉพาะกิจกรรมของตัวเอง กิจกรรมของหน่วยงานอื่นจะไม่ปรากฏและเปิดด้วยลิงก์ตรงก็ไม่ได้',
        textEn:
          'You can only see and edit your own activities. Other organisers’ activities never appear, and direct links to them will not open.',
      },
    ],
  },
  {
    id: 'org-registrations',
    icon: 'groups',
    title: 'อนุมัติผู้เข้าร่วม',
    titleEn: 'Approving participants',
    summary: 'พิจารณาใบลงทะเบียนทีละใบหรือหลายใบพร้อมกัน และการนับที่นั่ง',
    summaryEn: 'Reviewing registrations one at a time or in bulk, and how seats are counted.',
    pageKey: 'registrations',
    items: [
      {
        kind: 'bullet',
        text: 'ใบที่รออนุมัติกินที่นั่งไว้แล้ว ที่นั่งจึงไม่ถูกขายเกินระหว่างที่คุณยังไม่ได้พิจารณา',
        textEn:
          'Pending registrations already hold a seat, so seats cannot be oversold while you decide.',
      },
      {
        kind: 'step',
        text: 'เลือกกิจกรรมที่ต้องการ แล้วกดอนุมัติหรือไม่อนุมัติเป็นรายคน',
        textEn: 'Pick the activity, then approve or reject each person.',
      },
      {
        kind: 'step',
        text: 'ต้องการพิจารณาทีเดียวหลายใบ ให้เลือกหลายรายการแล้วกดอนุมัติพร้อมกัน ครั้งละไม่เกิน 200 รายการ',
        textEn:
          'To decide in bulk, select several rows and approve them together — up to 200 at a time.',
      },
      {
        kind: 'bullet',
        text: 'การอนุมัติหลายใบพร้อมกันจะตรวจที่นั่งทีละใบ ถ้าที่นั่งหมดกลางทาง ใบที่เหลือจะถูกข้ามและระบบจะบอกว่าข้ามไปกี่ใบ',
        textEn:
          'Bulk approval checks seats row by row. If seats run out midway, the rest are skipped and you are told how many.',
      },
      {
        kind: 'bullet',
        text: 'การไม่อนุมัติต้องระบุเหตุผลเสมอ เหตุผลนี้จะถูกส่งไปให้นิสิตพร้อมการแจ้งเตือน',
        textEn: 'Rejections always require a reason, which is sent to the student with the notification.',
      },
    ],
  },
  {
    id: 'org-cancellations',
    icon: 'event_busy',
    title: 'คำขอยกเลิกจากนิสิต',
    titleEn: 'Cancellation requests',
    summary: 'นิสิตขอยกเลิกได้ก่อนวันงานตามกำหนด และที่นั่งจะคืนเมื่อคุณอนุมัติ',
    summaryEn: 'Students may cancel ahead of the event; the seat returns once you approve.',
    pageKey: 'cancellations',
    items: [
      {
        kind: 'bullet',
        text: 'นิสิตยื่นคำขอยกเลิกได้ก่อนวันจัดกิจกรรมอย่างน้อย 3 วัน หลังจากนั้นต้องติดต่อผู้จัดโดยตรง',
        textEn:
          'Students can request cancellation up to 3 days before the activity; after that they must contact you directly.',
      },
      {
        kind: 'bullet',
        text: 'ที่นั่งจะยังไม่ถูกคืนจนกว่าคุณจะอนุมัติคำขอ ตัวเลขที่นั่งว่างจึงไม่กระโดดไปมาระหว่างรอพิจารณา',
        textEn:
          'The seat is not released until you approve, so the free-seat count does not fluctuate while requests are pending.',
      },
      {
        kind: 'step',
        text: 'เปิดหน้าคำขอยกเลิก อ่านเหตุผลที่นิสิตให้ไว้ แล้วกดอนุมัติหรือปฏิเสธ',
        textEn: 'Open Cancellation Requests, read the reason given, then approve or reject.',
      },
    ],
  },
  {
    id: 'org-hours',
    icon: 'fact_check',
    title: 'รับรองชั่วโมงจิตอาสา',
    titleEn: 'Approving volunteer hours',
    summary: 'ขั้นตอนสุดท้ายที่ทำให้ชั่วโมงเข้าไปอยู่ในบัญชีของนิสิตจริง',
    summaryEn: 'The final step that puts hours into a student’s record.',
    pageKey: 'hoursApproval',
    items: [
      {
        kind: 'bullet',
        text: 'รับรองได้เฉพาะผู้ที่เช็กเอาต์แล้วเท่านั้น ผู้ที่ยังไม่เช็กเอาต์ถือว่ายังไม่มีหลักฐานว่ามาจริง',
        textEn:
          'Only people who have checked out can be approved — without a check-out there is no evidence they attended.',
      },
      {
        kind: 'bullet',
        text: 'ปรับจำนวนชั่วโมงขึ้นลงได้ตามจริง เช่น มาสายหรือกลับก่อน แต่ต้องไม่เกินชั่วโมงที่ประกาศไว้ตอนเปิดรับสมัคร',
        textEn:
          'You may adjust the hours up or down for late arrivals or early leavers, but never above the figure announced when registration opened.',
      },
      {
        kind: 'bullet',
        text: 'ไม่ใส่จำนวนชั่วโมง = รับรองเต็มตามที่กิจกรรมกำหนด',
        textEn: 'Leaving the hours blank approves the full amount defined by the activity.',
      },
      {
        kind: 'bullet',
        text: 'การไม่รับรองต้องระบุเหตุผล นิสิตจะได้รับการแจ้งเตือนพร้อมเหตุผลนั้น',
        textEn: 'Declining requires a reason, which the student receives with the notification.',
      },
      {
        kind: 'note',
        text: 'เมื่อรับรองแล้ว ใบลงทะเบียนจะเปลี่ยนเป็นสถานะเสร็จสิ้น และชั่วโมงจะไปแสดงในหน้าชั่วโมงสะสมของนิสิตทันที',
        textEn:
          'Once approved, the registration becomes completed and the hours appear on the student’s hours page immediately.',
      },
    ],
  },
  {
    id: 'org-insights',
    icon: 'insights',
    title: 'สถิติ รีวิว และรายงาน',
    titleEn: 'Statistics, reviews and reports',
    summary: 'ดูภาพรวมผู้เข้าร่วม อ่านความเห็นจากนิสิต และส่งออกตัวเลขไปใช้ต่อ',
    summaryEn: 'See participation at a glance, read student feedback, and export the numbers.',
    pageKey: 'stats',
    items: [
      {
        kind: 'bullet',
        text: 'หน้าสถิติแสดงผู้เข้าร่วมรายเดือน ชั่วโมงแยกตามประเภทกิจกรรม และขั้นตอนการเข้าร่วมที่บอกว่าผู้สมัครหล่นหายที่ขั้นไหน',
        textEn:
          'Statistics shows participants by month, hours by category, and a funnel revealing where applicants drop off.',
      },
      {
        kind: 'bullet',
        text: 'ตัวเลขสรุปทุกตัวคิดจากรายการที่ผ่านตัวกรองที่เลือกไว้ ไม่ใช่ทั้งระบบ เปลี่ยนช่วงวันแล้วตัวเลขจะขยับตาม',
        textEn:
          'Every summary figure reflects the current filters, not the whole system — change the date range and the numbers follow.',
      },
      {
        kind: 'bullet',
        text: 'นิสิตเขียนรีวิวได้ก็ต่อเมื่อคุณรับรองชั่วโมงของกิจกรรมนั้นให้เขาแล้ว คะแนนจึงมาจากคนที่เข้าร่วมจริงเท่านั้น',
        textEn:
          'Students can only review an activity after you approve their hours for it, so ratings come only from real participants.',
      },
      {
        kind: 'bullet',
        text: 'หน้ารายงานส่งออกเป็นไฟล์ CSV เปิดใน Excel ได้ หรือสั่งพิมพ์เป็น PDF พร้อมหัวกระดาษที่ระบุช่วงวันที่ดึงข้อมูล',
        textEn:
          'Reports export to CSV for Excel, or print to PDF with a header stating the date range covered.',
      },
    ],
  },
  {
    id: 'org-chat',
    icon: 'forum',
    title: 'ตอบข้อความจากนิสิต',
    titleEn: 'Replying to students',
    summary: 'นิสิตเป็นฝ่ายเปิดห้องคุย ส่วนคุณเป็นฝ่ายตอบ',
    summaryEn: 'Students open the conversation; you reply.',
    pageKey: 'chat',
    items: [
      {
        kind: 'bullet',
        text: 'ห้องแชททุกห้องเริ่มจากนิสิตที่ลงทะเบียนกิจกรรมของคุณ ผู้จัดเปิดห้องหานิสิตเองไม่ได้',
        textEn:
          'Every conversation is started by a student registered for one of your activities; organisers cannot open one first.',
      },
      {
        kind: 'bullet',
        text: 'คุณเห็นเฉพาะห้องที่ตัวเองเป็นคู่สนทนา ไม่เห็นบทสนทนาระหว่างนิสิตกับผู้จัดคนอื่น',
        textEn:
          'You only see conversations you are part of, never those between students and other organisers.',
      },
      {
        kind: 'bullet',
        text: 'การลบข้อความเป็นการลบสำหรับตัวเองเท่านั้น อีกฝ่ายยังเห็นประวัติของเขาตามเดิม',
        textEn:
          'Deleting a message removes it for you only; the other side keeps their copy of the history.',
      },
    ],
  },
];

export const GUIDE_ADMIN: GuideSection[] = [
  {
    id: 'admin-users',
    icon: 'manage_accounts',
    title: 'จัดการผู้ใช้งานและคำขอลบบัญชี',
    titleEn: 'Managing users and deletion requests',
    summary: 'เปลี่ยนบทบาท ระงับบัญชี และพิจารณาคำขอลบบัญชีที่ระบบไม่ลบให้เอง',
    summaryEn: 'Change roles, suspend accounts, and review deletion requests the system never auto-approves.',
    pageKey: 'users',
    items: [
      {
        kind: 'step',
        text: 'ไปที่หน้าผู้ใช้งาน ค้นหาด้วยชื่อ อีเมล หรือรหัสนิสิต แล้วเปิดบัญชีที่ต้องการแก้ไข',
        textEn: 'Open Users, search by name, email or student ID, then open the account you need.',
      },
      {
        kind: 'bullet',
        text: 'บทบาทไหลลงทางเดียว — แอดมินทำแทนผู้จัดกิจกรรมได้ แต่ผู้จัดทำแทนแอดมินไม่ได้',
        textEn:
          'Permissions only flow downward: an admin can act for an organiser, never the other way round.',
      },
      {
        kind: 'bullet',
        text: 'การระงับบัญชีทำให้ผู้ใช้เข้าสู่ระบบไม่ได้ แต่ข้อมูลและประวัติการเข้าร่วมยังอยู่ครบ',
        textEn:
          'Suspending an account blocks sign-in but keeps all of the user’s data and participation history.',
      },
      {
        kind: 'note',
        text: 'คำขอลบบัญชีจะค้างอยู่จนกว่าจะมีผู้ดูแลพิจารณา ระบบไม่ลบให้อัตโนมัติเด็ดขาด เพราะการลบพาชั่วโมงและใบประกาศของนิสิตหายไปด้วย',
        textEn:
          'Deletion requests wait until an admin acts — nothing is ever deleted automatically, because deleting an account also removes that student’s hours and certificates.',
      },
    ],
  },
  {
    id: 'admin-content',
    icon: 'category',
    title: 'หมวดหมู่ คณะ และข่าวประชาสัมพันธ์',
    titleEn: 'Categories, faculties, and announcements',
    summary: 'ข้อมูลหลักที่ทุกหน้าในระบบดึงไปใช้ร่วมกัน',
    summaryEn: 'The shared reference data every other page reads from.',
    pageKey: 'categories',
    items: [
      {
        kind: 'bullet',
        text: 'ลบหมวดหมู่ที่ยังมีกิจกรรมอยู่ไม่ได้ ให้ย้ายกิจกรรมออกก่อนหรือปิดการใช้งานหมวดแทน',
        textEn:
          'A category with activities in it cannot be deleted — move the activities first, or deactivate the category instead.',
      },
      {
        kind: 'bullet',
        text: 'ลำดับของหมวดหมู่คือลำดับที่นิสิตเห็นบนหน้าแรกและหน้าค้นหา ไม่ได้เรียงตามตัวอักษร',
        textEn:
          'Category order is the order students see on the home and search pages — it is not alphabetical.',
      },
      {
        kind: 'step',
        text: 'ข่าวและแบนเนอร์อยู่หน้าเดียวกัน แยกเป็นสองแท็บ — ข่าวคือบทความ ส่วนแบนเนอร์คือสไลด์บนหน้าหลักของนิสิต',
        textEn:
          'News and banners share one page in two tabs: news are articles, banners are the slides on the student home page.',
      },
      {
        kind: 'note',
        text: 'ตั้งเวลาเผยแพร่ข่าวล่วงหน้าได้ ข่าวที่ยังไม่ถึงเวลาจะขึ้นว่าตั้งเวลาไว้และยังไม่แสดงให้นิสิตเห็น',
        textEn:
          'News can be scheduled ahead of time. Until the scheduled moment it is marked as scheduled and stays hidden from students.',
      },
    ],
  },
  {
    id: 'admin-oversight',
    icon: 'summarize',
    title: 'รายงานและบันทึกการทำงานของระบบ',
    titleEn: 'Reports and the system log',
    summary: 'ดูภาพรวมทั้งระบบ และไล่ย้อนว่าใครทำอะไรไว้เมื่อไร',
    summaryEn: 'See the whole system at a glance, and trace who did what and when.',
    pageKey: 'reports',
    items: [
      {
        kind: 'bullet',
        text: 'หน้ารายงานของแอดมินใช้ตารางเดียวกับของผู้จัด ต่างกันที่เห็นกิจกรรมทั้งระบบ ไม่ใช่เฉพาะของตัวเอง',
        textEn:
          'The admin report uses the same table as the organiser one; the difference is that it covers every activity in the system, not just your own.',
      },
      {
        kind: 'bullet',
        text: 'ปรับแต่งคอลัมน์และส่งออก CSV ได้ ไฟล์ที่ส่งออกจะมีเฉพาะแถวที่ตัวกรองเหลือไว้',
        textEn:
          'Columns can be customised and the view exported to CSV — the file contains only the rows your filters left.',
      },
      {
        kind: 'step',
        text: 'ที่หน้า System Log กรองตามระดับ ค้นด้วยคำ หรือจำกัดช่วงวันที่ เพื่อไล่หาเหตุการณ์ที่ต้องการ',
        textEn:
          'On System Log, filter by level, search by keyword, or narrow the date range to find the event you need.',
      },
      {
        kind: 'note',
        text: 'บันทึกแสดงเฉพาะรายการล่าสุดตามจำนวนที่กำหนดไว้ หน้าเว็บจะบอกเมื่อรายการถูกตัด จะได้ไม่เข้าใจผิดว่าประวัติมีเท่านี้',
        textEn:
          'The log shows only a capped number of recent entries. The page says so when the list is truncated, so a short list is never mistaken for the full history.',
      },
    ],
  },
  {
    id: 'admin-ops',
    icon: 'hub',
    title: 'การเชื่อมต่อระบบและกล่องข้อความ',
    titleEn: 'System integrations and the inbox',
    summary: 'สถานะอีเมล การสำรองข้อมูล เซสชัน และข้อความที่ผู้ใช้ส่งเข้ามา',
    summaryEn: 'Email status, backups, sessions, and messages users send in.',
    pageKey: 'ops',
    items: [
      {
        kind: 'bullet',
        text: 'ตัวเลขบนหน้าการเชื่อมต่อระบบอ่านจากตารางจริงทุกครั้งที่เปิดหน้า ไม่ใช่ค่าที่เขียนไว้ตายตัว',
        textEn:
          'Every figure on the integrations page is read from the real tables each time you open it — none of it is hard-coded.',
      },
      {
        kind: 'bullet',
        text: 'ปุ่มส่งอีเมลทดสอบส่งไปที่อีเมลของคุณเองเสมอ ใช้ตรวจว่าเส้นทางส่งอีเมลใช้งานได้ก่อนจะมีเหตุการณ์จริง',
        textEn:
          'The test email always goes to your own address — use it to confirm delivery works before a real event depends on it.',
      },
      {
        kind: 'bullet',
        text: 'เมื่อ MAIL_TRANSPORT เป็น console อีเมลจะถูกเขียนลง log ของเซิร์ฟเวอร์เท่านั้น ยังไม่ได้ส่งออกจริง',
        textEn:
          'When MAIL_TRANSPORT is set to console, emails are only written to the server log and never actually delivered.',
      },
      {
        kind: 'step',
        text: 'ข้อความที่ผู้ใช้ส่งเข้ามาอยู่ที่หน้ากล่องข้อความ เปิดอ่านแล้วระบบทำเครื่องหมายอ่านแล้วให้เอง',
        textEn:
          'Messages from users arrive in the Inbox. Opening one marks it as read automatically.',
      },
      {
        kind: 'note',
        text: 'การตอบกลับเปิดโปรแกรมอีเมลของคุณเอง เพราะระบบไม่ได้เก็บคำตอบไว้ — ถ้าตอบจากในระบบได้ จะไม่มีใครรู้ว่าเคยตอบไปแล้วหรือยัง',
        textEn:
          'Replying opens your own mail client, because the system does not store replies — an in-app reply box would leave no record that anyone had answered.',
      },
    ],
  },
];

/** หัวข้อคู่มือของแต่ละบทบาท */
export function guideFor(role: string): GuideSection[] {
  const byRole: Record<string, GuideSection[]> = {
    student: GUIDE_STUDENT,
    organizer: GUIDE_ORGANIZER,
    admin: GUIDE_ADMIN,
  };
  return [...GUIDE_OVERVIEW, ...(byRole[role] ?? [])];
}
