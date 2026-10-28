/**
 * API errors are written for developers (often in English). Students need a short Thai
 * sentence that says what happened and what to do next; the raw text stays in the console.
 */
const FRIENDLY_ERRORS: Array<[RegExp, string]> = [
  [/identity is controlled|scope denied|Student scope required|student identity is required/i, "ระบบยืนยันตัวตนไม่ตรงกับบัญชีที่เข้าสู่ระบบ ลองรีเฟรชหน้า หรือแจ้งครู"],
  [/authentication is required|login required|401/i, "หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่แล้วกลับมาทำต่อ งานที่พิมพ์ไว้ยังอยู่"],
  [/no Learning OS profile|not available in local memory mode|class scope/i, "บัญชีนี้ยังไม่ได้อยู่ในห้องเรียน กรุณาแจ้งครู"],
  [/rate limit|too many/i, "ส่งคำขอถี่เกินไป รอสักครู่แล้วลองใหม่"],
  [/Failed to fetch|NetworkError|network/i, "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสัญญาณแล้วกดลองใหม่"],
  [/timeout|timed out|aborted/i, "AI ใช้เวลานานเกินไป ลองกดส่งอีกครั้ง"],
];

export function studentFriendlyError(message: string): string {
  for (const [pattern, friendly] of FRIENDLY_ERRORS) {
    if (pattern.test(message)) return friendly;
  }
  // Thai messages from our own routes are already student-facing.
  return /[฀-๿]/.test(message) ? message : "เกิดข้อผิดพลาดชั่วคราว ลองอีกครั้ง หากยังไม่ได้ให้แจ้งครู";
}
