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
  photo: string | null;
  /** วันที่จัดกิจกรรม จัดรูปแบบไว้ฝั่งเซิร์ฟเวอร์แล้ว เพื่อให้ SSR กับ client ตรงกันเสมอ */
  dateTh: string;
  dateEn: string;
  hours: number;
  location: string;
  seatsFilled: number;
  seatsTotal: number;
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
