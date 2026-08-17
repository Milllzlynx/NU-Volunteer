/**
 * ปีการศึกษา (พ.ศ.) — เริ่ม 1 มิ.ย. ถึง 31 พ.ค. ของปีถัดไป
 * ใช้กับเกณฑ์ชั่วโมงจิตอาสา กยศ. ที่นับเป็นรายปีการศึกษา
 */

const AY_START_MONTH = 5; // มิถุนายน (เดือนเริ่มนับที่ 0)

export type AcademicYear = {
  /** ปีการศึกษาแบบ พ.ศ. เช่น 2569 */
  year: number;
  /** ช่วงเวลาของปีการศึกษา — start ≤ t < end */
  start: Date;
  end: Date;
};

export function academicYearOf(date: Date = new Date()): AcademicYear {
  const ce = date.getFullYear();
  const startCe = date.getMonth() >= AY_START_MONTH ? ce : ce - 1;
  return {
    year: startCe + 543,
    start: new Date(startCe, AY_START_MONTH, 1),
    end: new Date(startCe + 1, AY_START_MONTH, 1),
  };
}

/** เกณฑ์ชั่วโมงเริ่มต้นของผู้กู้ยืม กยศ. — แอดมินแก้ได้ผ่าน Setting `kyf.hoursGoal` */
export const DEFAULT_HOURS_GOAL = 36;
export const HOURS_GOAL_KEY = 'kyf.hoursGoal';
