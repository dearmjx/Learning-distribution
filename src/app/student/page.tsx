import Link from "next/link";

export default function StudentHomePage() {
  return (
    <main className="simple-page">
      <p className="eyebrow">LEARNING OS / STUDENT</p>
      <h1>พื้นที่การเรียนรู้ของฉัน</h1>
      <p className="lede">เริ่มกิจกรรม CER ที่ครูอนุมัติ หรือเปิด timeline ของการเรียนรู้ของคุณ</p>
      <div className="simple-actions">
        <Link className="primary-button compact-button" href="/student/activity">เริ่มกิจกรรมระบบนิเวศ</Link>
        <Link className="secondary-button" href="/student/timeline">เปิด learning timeline</Link>
      </div>
    </main>
  );
}
