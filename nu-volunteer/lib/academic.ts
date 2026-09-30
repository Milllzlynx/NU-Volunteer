/**
 * ปีการศึกษา (พ.ศ.) ตามประกาศของมหาวิทยาลัย — นับ 1 พ.ค. ถึง 31 มี.ค. ของปีถัดไป (11 เดือน)
 * ใช้กับเกณฑ์ชั่วโมงจิตอาสา กยศ. ที่นับเป็นรายปีการศึกษา
 *
 * เดือนเมษายนอยู่นอกช่วงนับของทุกปี — ชั่วโมงที่รับรองในเดือนนี้ไม่เข้าปีใดเลย
 * academicYearOf() ของวันในเดือนเมษายนจึงคืนปีที่เพิ่งปิดไป (ช่วงนับจบไปแล้ว end ≤ วันนั้น)
 * ใช้ isCounting() ถ้าต้องรู้ว่าวันนั้นยังอยู่ในช่วงนับหรือไม่
 */

const AY_START_MONTH = 4; // พฤษภาคม (เดือนเริ่มนับที่ 0)
const AY_END_MONTH = 3; // นับถึงสิ้นเดือนมีนาคม — end คือ 1 เม.ย. (ไม่รวม)

export type AcademicYear = {
  /** ปีการศึกษาแบบ พ.ศ. เช่น 2569 */
  year: number;
  /** ช่วงนับชั่วโมงของปีการศึกษา — start ≤ t < end */
  start: Date;
  end: Date;
};

export function academicYearOf(date: Date = new Date()): AcademicYear {
  const ce = date.getFullYear();
  const startCe = date.getMonth() >= AY_START_MONTH ? ce : ce - 1;
  return {
    year: startCe + 543,
    start: new Date(startCe, AY_START_MONTH, 1),
    end: new Date(startCe + 1, AY_END_MONTH, 1),
  };
}

/** วันนั้นอยู่ในช่วงนับชั่วโมงของปีการศึกษาหรือไม่ — เดือนเมษายนได้ false */
export function isCounting(date: Date = new Date()): boolean {
  const ay = academicYearOf(date);
  return date >= ay.start && date < ay.end;
}

/** เกณฑ์ชั่วโมงเริ่มต้นของผู้กู้ยืม กยศ. — แอดมินแก้ได้ผ่าน Setting `kyf.hoursGoal` */
export const DEFAULT_HOURS_GOAL = 36;
export const HOURS_GOAL_KEY = 'kyf.hoursGoal';
