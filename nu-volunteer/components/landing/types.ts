/** ข้อมูลสาธารณะที่หน้าแรกต้องใช้ — ตัดเฉพาะฟิลด์ที่แสดงผล ไม่ส่งข้อมูลส่วนบุคคลลงไปฝั่ง client */

export type PublicCategory = {
  id: string;
  label: string;
  labelEn: string;
  color: string;
};

export type PublicActivity = {
  id: string;
  title: string;
  description: string;
  /** ชื่อหน่วยงาน/ชมรมที่จัดกิจกรรม */
  orgName: string;
  photo: string | null;
  /** วันที่จัดกิจกรรม จัดรูปแบบไว้ฝั่งเซิร์ฟเวอร์แล้ว เพื่อให้ SSR กับ client ตรงกันเสมอ */
  dateTh: string;
  dateEn: string;
  /** ช่วงเวลาแบบ HH:mm - HH:mm ตามเวลาไทย จัดรูปแบบฝั่งเซิร์ฟเวอร์ด้วยเหตุผลเดียวกัน */
  time: string;
  hours: number;
  location: string;
  seatsFilled: number;
  seatsTotal: number;
  /** ยังไม่ถึงวันเปิดรับสมัคร — การ์ดต้องปิดปุ่มไว้ ไม่งั้นกดแล้วเซิร์ฟเวอร์ปฏิเสธอยู่ดี */
  notOpenYet: boolean;
  /** วันที่เปิดรับสมัคร จัดรูปแบบไว้ฝั่งเซิร์ฟเวอร์ — null คือเปิดรับตั้งแต่ประกาศ */
  regOpenTh: string | null;
  regOpenEn: string | null;
  category: PublicCategory;
};

export type LandingStats = {
  activities: number;
  participants: number;
  hours: number;
};

export type SessionAccount = {
  name: string;
  email: string;
  role: string;
};
