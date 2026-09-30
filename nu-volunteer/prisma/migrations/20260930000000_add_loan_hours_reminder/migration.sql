-- การเตือนชั่วโมงจิตอาสา กยศ. ไม่ครบเกณฑ์ — เปิดไว้เป็นค่าเริ่มต้นเหมือนหัวข้ออื่น
ALTER TABLE "NotificationPreference" ADD COLUMN "loanHoursReminder" BOOLEAN NOT NULL DEFAULT true;
