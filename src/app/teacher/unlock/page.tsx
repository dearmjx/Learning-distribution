import Link from "next/link";
import { TeacherUnlockForm } from "@/components/teacher-unlock-form";
import { isTeacherGateEnabled } from "@/lib/teacher-gate";

export const dynamic = "force-dynamic";

export default function TeacherUnlockPage() {
  const enabled = isTeacherGateEnabled();
  return (
    <main className="demo-gate-page">
      <section className="demo-gate-card" aria-labelledby="teacher-unlock-title">
        <p className="demo-gate-eyebrow">LEARNING OS · สำหรับครู</p>
        <h1 id="teacher-unlock-title">แดชบอร์ดครู</h1>
        <p className="demo-gate-copy">
          ใส่รหัสครูเพื่อดูงานนักเรียน รายชื่อห้อง และผลวิเคราะห์ นักเรียนไม่ต้องใช้หน้านี้
        </p>
        {enabled ? (
          <TeacherUnlockForm />
        ) : (
          <p className="demo-gate-warning">ยังไม่ได้ตั้งรหัส: เพิ่ม TEACHER_DASHBOARD_PASSWORD ใน .env.local แล้วเริ่มเซิร์ฟเวอร์ใหม่</p>
        )}
        <Link className="secondary-button" href="/">กลับหน้านักเรียน</Link>
      </section>
    </main>
  );
}
