/**
 * ข้อกำหนดการใช้งาน / นโยบายความเป็นส่วนตัว
 * เนื้อหาสองภาษาเก็บคู่กันที่นี่ (ยาวเกินกว่าจะใช้พจนานุกรมคีย์ไทยแบบข้อความสั้น)
 */

export type LegalSection = {
  id: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 't1',
    title: 'การยอมรับข้อกำหนด',
    titleEn: 'Acceptance of terms',
    body: 'การเข้าใช้งานระบบ NU Volunteer ถือว่าคุณยอมรับข้อกำหนดฉบับนี้ทั้งหมด หากไม่เห็นด้วยกรุณาหยุดใช้งานระบบ ข้อกำหนดนี้ใช้กับนิสิต ผู้จัดกิจกรรม และผู้ดูแลระบบทุกคน',
    bodyEn:
      'By using NU Volunteer you accept these terms in full. If you disagree, please stop using the service. These terms apply to students, activity organizers and administrators alike.',
  },
  {
    id: 't2',
    title: 'คุณสมบัติผู้ใช้งาน',
    titleEn: 'Eligibility',
    body: 'ระบบนี้เปิดให้เฉพาะนิสิตและบุคลากรของมหาวิทยาลัยนเรศวรที่มีบัญชีอีเมลมหาวิทยาลัย (@nu.ac.th) ห้ามใช้บัญชีของผู้อื่นหรือให้ผู้อื่นใช้บัญชีของคุณ',
    bodyEn:
      'The service is limited to Naresuan University students and staff holding an @nu.ac.th account. Do not use another person’s account or lend yours to anyone.',
  },
  {
    id: 't3',
    title: 'การเข้าร่วมกิจกรรมและชั่วโมงจิตอาสา',
    titleEn: 'Activities and volunteer hours',
    body: 'ชั่วโมงจิตอาสาจะถูกบันทึกเมื่อคุณเช็กอิน เช็กเอาต์ และได้รับอนุมัติหลักฐานจากผู้จัดกิจกรรมแล้วเท่านั้น\nการแจ้งข้อมูลเท็จ ปลอมแปลงหลักฐาน หรือให้ผู้อื่นเช็กอินแทน จะถูกยกเลิกชั่วโมงและอาจถูกดำเนินการทางวินัย\nการยกเลิกการเข้าร่วมต้องแจ้งล่วงหน้าตามระยะเวลาที่ระบบกำหนด',
    bodyEn:
      'Hours are recorded only after check-in, check-out and organizer approval of your evidence.\nFalse reporting, forged evidence or proxy check-in voids the hours and may lead to disciplinary action.\nCancellations must be submitted within the notice period configured in the system.',
  },
  {
    id: 't4',
    title: 'ใบประกาศและการตรวจสอบ',
    titleEn: 'Certificates and verification',
    body: 'ใบประกาศทุกฉบับมีรหัสอ้างอิงเฉพาะและตรวจสอบได้แบบสาธารณะที่หน้าตรวจสอบใบประกาศ โดยไม่ต้องเข้าสู่ระบบ มหาวิทยาลัยขอสงวนสิทธิ์ในการเพิกถอนใบประกาศที่ออกโดยข้อมูลอันเป็นเท็จ',
    bodyEn:
      'Every certificate carries a unique reference and can be checked publicly on the verification page without signing in. The university may revoke certificates issued on false information.',
  },
  {
    id: 't5',
    title: 'ข้อจำกัดความรับผิด',
    titleEn: 'Limitation of liability',
    body: 'มหาวิทยาลัยจะพยายามให้ระบบพร้อมใช้งานอย่างต่อเนื่อง แต่ไม่รับผิดต่อความเสียหายที่เกิดจากการหยุดให้บริการชั่วคราว การสูญหายของข้อมูลจากเหตุสุดวิสัย หรือการใช้งานที่ผิดข้อกำหนด',
    bodyEn:
      'The university aims for continuous availability but is not liable for damages arising from temporary outages, data loss due to force majeure, or use that breaches these terms.',
  },
  {
    id: 't6',
    title: 'การเปลี่ยนแปลงข้อกำหนด',
    titleEn: 'Changes to these terms',
    body: 'ข้อกำหนดอาจได้รับการปรับปรุงเป็นครั้งคราว ระบบจะแจ้งให้ทราบล่วงหน้าผ่านประกาศในระบบและอีเมลอย่างน้อย 14 วันก่อนมีผลบังคับใช้',
    bodyEn:
      'These terms may change from time to time. We will announce changes in-app and by email at least 14 days before they take effect.',
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'p1',
    title: 'ข้อมูลที่เราเก็บ',
    titleEn: 'Data we collect',
    body: 'ข้อมูลบัญชี: ชื่อ-นามสกุล รหัสนิสิต คณะ อีเมลมหาวิทยาลัย\nข้อมูลการใช้งาน: กิจกรรมที่สมัคร เวลาเช็กอิน/เช็กเอาต์ ชั่วโมงสะสม หลักฐานที่อัปโหลด\nข้อมูลทางเทคนิค: เวลาเข้าใช้งาน อุปกรณ์และเบราว์เซอร์ เพื่อความปลอดภัยของบัญชี',
    bodyEn:
      'Account data: name, student ID, faculty, university email.\nUsage data: activities joined, check-in/out times, accumulated hours, uploaded evidence.\nTechnical data: sign-in times, device and browser, used to protect your account.',
  },
  {
    id: 'p2',
    title: 'วัตถุประสงค์การใช้ข้อมูล',
    titleEn: 'How we use it',
    body: 'ใช้เพื่อบันทึกและรับรองชั่วโมงจิตอาสา ออกใบประกาศ ตรวจสอบเกณฑ์ กยศ. แจ้งเตือนที่เกี่ยวข้องกับกิจกรรมของคุณ และจัดทำสถิติภาพรวมแบบไม่ระบุตัวตน',
    bodyEn:
      'To record and certify volunteer hours, issue certificates, evaluate student-loan criteria, send activity notifications, and produce anonymized aggregate statistics.',
  },
  {
    id: 'p3',
    title: 'การเปิดเผยข้อมูล',
    titleEn: 'Disclosure',
    body: 'ผู้จัดกิจกรรมเห็นเฉพาะชื่อ คณะ และสถานะการเข้าร่วมของผู้สมัครกิจกรรมของตนเท่านั้น\nผู้ใช้ที่เข้าสู่ระบบแล้วเห็นชื่อและคณะของผู้ที่ได้ที่นั่งในกิจกรรมหนึ่ง ๆ ได้จากหน้ารายละเอียดกิจกรรม โดยไม่เห็นอีเมลหรือเบอร์โทร ส่วนผู้ที่ยังไม่เข้าสู่ระบบไม่เห็นรายชื่อนี้\nหน้าตรวจสอบใบประกาศสาธารณะแสดงเฉพาะชื่อ กิจกรรม ชั่วโมง และวันที่ออก ไม่แสดงอีเมล เบอร์โทร หรือที่อยู่\nเราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลแก่บุคคลภายนอกไม่ว่ากรณีใด',
    bodyEn:
      'Organizers see only the name, faculty and attendance status of their own participants.\nSigned-in users can see the names and faculties of people holding a seat on an activity, from that activity page; email and phone are never shown, and visitors who are not signed in do not see the list at all.\nThe public certificate check shows only name, activity, hours and issue date — never email, phone or address.\nWe never sell or rent personal data to third parties.',
  },
  {
    id: 'p4',
    title: 'ระยะเวลาเก็บรักษา',
    titleEn: 'Retention',
    body: 'ข้อมูลชั่วโมงจิตอาสาและใบประกาศเก็บไว้ตลอดระยะเวลาที่เป็นนิสิตและอีก 5 ปีหลังสำเร็จการศึกษา บันทึกการส่งอีเมลเก็บ 90 วัน ไฟล์สำรองข้อมูลเก็บตามนโยบายที่ผู้ดูแลระบบกำหนด',
    bodyEn:
      'Hours and certificates are kept while you are enrolled and for 5 years after graduation. Email logs are kept 90 days. Backups follow the retention policy set by administrators.',
  },
  {
    id: 'p5',
    title: 'สิทธิของเจ้าของข้อมูล',
    titleEn: 'Your rights',
    body: 'คุณมีสิทธิขอเข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลของคุณ รวมถึงขอรับสำเนาข้อมูลในรูปแบบอิเล็กทรอนิกส์ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) โดยติดต่อผ่านหน้า "ติดต่อผู้ดูแลระบบ"',
    bodyEn:
      'Under Thailand’s PDPA (2019) you may request access, correction, deletion or an electronic copy of your data via the "Contact administrator" page.',
  },
  {
    id: 'p6',
    title: 'คุกกี้และการจัดเก็บในเครื่อง',
    titleEn: 'Cookies and local storage',
    body: 'ระบบใช้ที่จัดเก็บในเบราว์เซอร์เพื่อจำการเข้าสู่ระบบ ภาษา ธีม และข้อมูลที่คุณกรอกค้างไว้ ไม่มีการใช้คุกกี้เพื่อการโฆษณาหรือติดตามข้ามเว็บไซต์',
    bodyEn:
      'We use browser storage to remember your session, language, theme and unsaved input. We do not use advertising or cross-site tracking cookies.',
  },
];

export type LegalTab = 'terms' | 'privacy';

export function legalSections(tab: LegalTab) {
  return tab === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;
}
