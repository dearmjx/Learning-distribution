"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Activity, CerResponse, CoachFeedback, Submission } from "@/lib/domain/types";
import { AdiStepper } from "@/components/adi-stepper";
import { Phase1Orientation } from "@/components/phases/phase1-orientation";
import { Phase2Identification } from "@/components/phases/phase2-identification";
import { Phase3Investigation } from "@/components/phases/phase3-investigation";
import { Phase4Argumentation } from "@/components/phases/phase4-argumentation";
import { Phase5PeerReview } from "@/components/phases/phase5-peer-review";
import { Phase6Revision } from "@/components/phases/phase6-revision";
import { Phase7Reflection } from "@/components/phases/phase7-reflection";
import { DiagnosticTerminalDrawer } from "@/components/diagnostic-terminal-drawer";

const emptyCer: CerResponse = { claim: "", evidence: "", reasoning: "" };

interface StudentWorkbenchProps {
  initialActivityId?: string;
}

export function StudentWorkbench({ initialActivityId }: StudentWorkbenchProps = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityId, setActivityId] = useState("");
  const [persistenceMode, setPersistenceMode] = useState<"memory" | "supabase">("memory");
  const [classId, setClassId] = useState("biology-m4-class-a");
  const [studentId, setStudentId] = useState("40101");
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  // Generate 57 student IDs for the 2 classrooms (memory/demo mode only)
  const classAStudents = useMemo(() => Array.from({ length: 29 }, (_, i) => `401${String(i + 1).padStart(2, "0")}`), []);
  const classBStudents = useMemo(() => Array.from({ length: 28 }, (_, i) => `402${String(i + 1).padStart(2, "0")}`), []);
  const activeStudentList = useMemo(() => classId === "biology-m4-class-b" ? classBStudents : classAStudents, [classId, classAStudents, classBStudents]);

  // State across phases
  const [variablesData, setVariablesData] = useState<Record<string, string>>({});
  const [cer, setCer] = useState<CerResponse>(emptyCer);
  const [cerResult, setCerResult] = useState<{ submission: Submission; feedback: CoachFeedback } | null>(null);
  const [, setRevisedSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  // Load saved student ID and classroom from localStorage in memory/demo mode only
  useEffect(() => {
    if (persistenceMode === "supabase") return;
    try {
      const savedClass = localStorage.getItem("learning_os_class_id");
      if (savedClass) setClassId(savedClass);
      const savedStudent = localStorage.getItem("learning_os_student_id");
      if (savedStudent) setStudentId(savedStudent);
    } catch {
      // ignore
    }
  }, [persistenceMode]);

  function handleClassIdChange(val: string) {
    if (persistenceMode === "supabase") return;
    setClassId(val);
    const defaultStudent = val === "biology-m4-class-b" ? "40201" : "40101";
    setStudentId(defaultStudent);
    try {
      localStorage.setItem("learning_os_class_id", val);
      localStorage.setItem("learning_os_student_id", defaultStudent);
    } catch {
      // ignore
    }
  }

  function handleStudentIdChange(val: string) {
    if (persistenceMode === "supabase") return;
    const cleaned = val.trim() || "40101";
    setStudentId(val);
    try {
      localStorage.setItem("learning_os_student_id", cleaned);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void fetch("/api/activities")
      .then(async (res) => {
        const data = (await res.json()) as {
          activities?: Activity[];
          persistence?: "memory" | "supabase";
          session?: { studentId?: string | null; classId?: string };
          error?: string;
        };
        // Never put a non-array into state: a failed request must show an error, not crash the page.
        if (!res.ok || !Array.isArray(data.activities)) throw new Error(data.error ?? "โหลดกิจกรรมไม่สำเร็จ");
        return data as typeof data & { activities: Activity[] };
      })
      .then((data) => {
        setActivities(data.activities);
        const selected = data.activities.find((item) => item.id === initialActivityId)?.id ?? data.activities[0]?.id ?? "";
        setActivityId(selected);
        if (data.persistence === "supabase") {
          setPersistenceMode("supabase");
          if (data.session?.classId) setClassId(data.session.classId);
          if (data.session?.studentId) setStudentId(data.session.studentId);
        } else {
          setPersistenceMode("memory");
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดกิจกรรมไม่สำเร็จ"))
      .finally(() => setActivitiesLoading(false));
  }, [initialActivityId]);

  const activity = useMemo(() => activities.find((item) => item.id === activityId), [activities, activityId]);

  function advanceToStep(step: number) {
    setCurrentStep(step);
    setCompletedSteps((prev) => Array.from(new Set([...prev, step])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelectStep(step: number) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    if (window.confirm("คุณต้องการรีเซ็ตและเริ่มต้นทำกิจกรรมตั้งแต่ขั้นตอนที่ 1 หรือไม่?")) {
      setCurrentStep(1);
      setCompletedSteps([1]);
      setVariablesData({});
      setCer(emptyCer);
      setCerResult(null);
      setRevisedSubmission(null);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <main className="shell">
      {/* Modern Top Header */}
      <header className="hero">
        <div className="hero-brand">
          <div className="brand-badge">
            <span className="brand-dot" />
            <span>LEARNING OS · CAR RESEARCH ENVIRONMENT (ม.4)</span>
          </div>
          <h1>7-Phase ADI Inquiry Hub</h1>
          <p className="lede">
            ระบบสืบเสาะทางวิทยาศาสตร์แบบ Argument-Driven Inquiry (ADI) 7 ขั้นตอน พร้อม AI Socratic Coach
          </p>
        </div>

        <div className="hero-actions">
          {persistenceMode !== "supabase" && (
            <>
              {/* Classroom Selector */}
              <div className="student-id-selector-box">
                <label htmlFor="class-select">🏫 ห้องเรียน:</label>
                <select
                  id="class-select"
                  className="form-select"
                  value={classId}
                  onChange={(e) => handleClassIdChange(e.target.value)}
                >
                  <option value="biology-m4-class-a">ม.4/1 (29 คน)</option>
                  <option value="biology-m4-class-b">ม.4/2 (28 คน)</option>
                </select>
              </div>

              {/* Student ID Roster Selector & Input */}
              <div className="student-id-selector-box">
                <label htmlFor="student-id-select">🧑‍🎓 รหัสนักเรียน:</label>
                <select
                  id="student-id-select"
                  className="form-select"
                  value={studentId}
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                >
                  {activeStudentList.map((sid, idx) => (
                    <option key={sid} value={sid}>
                      เลขที่ {idx + 1} ({sid})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="activity-selector-box">
            <label htmlFor="activity-select">เลือกกิจกรรม (PAOR Cycle):</label>
            <select
              id="activity-select"
              className="activity-dropdown"
              value={activityId}
              onChange={(e) => {
                setActivityId(e.target.value);
                setCurrentStep(1);
                setCompletedSteps([1]);
                setCer(emptyCer);
                setCerResult(null);
              }}
            >
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title}
                </option>
              ))}
            </select>
          </div>

          <div className="header-nav-links">
            <button
              type="button"
              className="pill-link"
              style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", cursor: "pointer" }}
              onClick={handleReset}
              title="รีเซ็ตขั้นตอนกลับไปจุดเริ่มต้น"
            >
              🔄 เริ่มใหม่
            </button>
            <Link
              className="pill-link"
              href={persistenceMode === "supabase" ? "/student/timeline" : `/student/timeline?studentId=${encodeURIComponent(studentId)}`}
            >
              📜 Timeline
            </Link>
            <Link className="pill-link" href="/teacher/review">
              👩‍🏫 แดชบอร์ดครู
            </Link>
          </div>
        </div>
      </header>

      {/* Modern Notice Banner */}
      <div className="notice-strip">
        <div className="notice-pill">🔬 PAOR {activity?.cycle ? `Cycle ${activity.cycle}` : "Cycle 1"} · ADI</div>
        <p>
          เรียนรู้ผ่าน 7 ขั้นตอน: ปรากฏการณ์ ➔ ตัวแปร ➔ ข้อมูลสืบเสาะ ➔ ร่าง CER ➔ ประเมินเพื่อน ➔ ปรับปรุงข้อโต้แย้ง ➔ สะท้อนคิด
        </p>
        <span className="active-student-tag">
          ห้อง {persistenceMode === "supabase" ? classId : classId === "biology-m4-class-b" ? "ม.4/2" : "ม.4/1"} · ผู้เรียน: <strong>{studentId}</strong>
        </span>
      </div>

      {/* 7-Phase Stepper */}
      <AdiStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onSelectStep={handleSelectStep}
      />

      {error && <p className="error-text global-error">{error}</p>}
      {activitiesLoading && !error && <p className="muted-text">กำลังโหลดกิจกรรม…</p>}

      {/* Active Phase Content */}
      {activity && (
        <section className="phase-view-wrapper">
          {currentStep === 1 && (
            <Phase1Orientation
              activity={activity}
              onNext={() => advanceToStep(2)}
            />
          )}

          {currentStep === 2 && (
            <Phase2Identification
              savedData={variablesData}
              onNext={(vars) => {
                setVariablesData(vars);
                advanceToStep(3);
              }}
              onBack={() => handleSelectStep(1)}
            />
          )}

          {currentStep === 3 && (
            <Phase3Investigation
              onNext={() => advanceToStep(4)}
              onBack={() => handleSelectStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Phase4Argumentation
              activity={activity}
              studentId={studentId}
              cer={cer}
              onChangeCer={setCer}
              existingResult={cerResult}
              onNext={(sub, fb) => {
                setCerResult({ submission: sub, feedback: fb });
                advanceToStep(5);
              }}
              onBack={() => handleSelectStep(3)}
            />
          )}

          {currentStep === 5 && (
            <Phase5PeerReview
              activity={activity}
              studentId={studentId}
              onNext={() => advanceToStep(6)}
              onBack={() => handleSelectStep(4)}
            />
          )}

          {currentStep === 6 && (
            <Phase6Revision
              activity={activity}
              studentId={studentId}
              initialCer={cer}
              initialFeedback={cerResult?.feedback}
              onNext={(rev) => {
                setRevisedSubmission(rev);
                advanceToStep(7);
              }}
              onBack={() => handleSelectStep(5)}
            />
          )}

          {currentStep === 7 && (
            <Phase7Reflection
              activity={activity}
              studentId={studentId}
              onBack={() => handleSelectStep(6)}
            />
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="footer-bar">
        <span>🌱 Learning OS Ecosystem · ม.4 ชีววิทยา · One-group pre/post research prototype</span>
        <span>Version 2.1 · 7-Phase ADI & LM Studio Telemetry Engine</span>
      </footer>

      {/* LM Studio Style Live Diagnostic Drawer */}
      <DiagnosticTerminalDrawer />
    </main>
  );
}
