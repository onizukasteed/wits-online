import crypto from 'node:crypto';

// รหัสผ่านครอบครัวสำหรับ "สร้างห้อง" ตั้งค่าเป็นตัวแปร FAMILY_PASSCODE ใน Vercel
// ถ้าไม่ได้ตั้งค่า จะไม่ล็อก (ทำงานเหมือนเดิม)
const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
export function gateCheck(pass) {
  const want = process.env.FAMILY_PASSCODE;
  if (!want) return null;
  if (!pass) return 'NEED_PASS';
  return crypto.timingSafeEqual(h(pass), h(want)) ? null : 'WRONG_PASS';
}
