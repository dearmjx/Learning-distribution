"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Activity, AdiPhase, AdiWizardState, CerResponse, CoachFeedback, Submission } from "@/lib/domain/types";
import { ADI_PHASES, AdiStepper } from "@/components/adi-stepper";
import { Phase1Orientation } from "@/components/phases/phase1-orientation";
import { Phase2Identification } from "@/components/phases/phase2-identification";
import { Phase3Investigation } from "@/components/phases/phase3-investigation";
import { Phase4Argumentation } from "@/components/phases/phase4-argumentation";
import { Phase5PeerReview } from "@/components/phases/phase5-peer-review";
import { Phase6Revision } from "@/components/phases/phase6-revision";
import { Phase7Reflection } from "@/components/phases/phase7-reflection";
import { DiagnosticTerminalDrawer } from "@/components/diagnostic-terminal-drawer";
import { studentFriendlyError } from "@/lib/ui/student-errors";

const emptyCer: CerResponse = { claim: "", evidence: "", reasoning: "" };
const phaseKeys = ADI_PHASES.map((phase) => phase.key) as AdiPhase[];

function phaseStep(phase: AdiPhase): number {
  return Math.max(1, phaseKeys.indexOf(phase) + 1);
}

interface StudentWorkbenchProps {
  initialActivityId?: string;
}

export function StudentWorkbench({ initialActivityId }: StudentWorkbenchProps = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityId, setActivityId] = useState("");
  const [persistenceMode, setPersistenceMode] = useState<"memory" | "supabase">("memory");
  // Identity always comes from the server session; a client-side picker cannot change who the API records.
  const [studentId, setStudentId] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [hydratedActivityId, setHydratedActivityId] = useState("");
  const [progressStatus, setProgressStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // State across phases
  const [variablesData, setVariablesData] = useState<Record<string, string>>({});
  const [cer, setCer] = useState<CerResponse>(emptyCer);
  const [cerResult, setCerResult] = useState<{ submission: Submission; feedback: CoachFeedback } | null>(null);
  const [, setRevisedSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  // The LLM telemetry console is for the researcher, not for students: opt in with ?debug=1.
  useEffect(() => {
    setShowDiagnostics(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

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
        setPersistenceMode(data.persistence === "supabase" ? "supabase" : "memory");
        if (data.session?.studentId) setStudentId(data.session.studentId);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดกิจกรรมไม่สำเร็จ"))
      .finally(() => setActivitiesLoading(false));
  }, [initialActivityId]);

  const activity = useMemo(() => activities.find((item) => item.id === activityId), [activities, activityId]);

  useEffect(() => {
    if (!activityId || activitiesLoading) return;
    let cancelled = false;
    setHydratedActivityId("");
    setProgressStatus("loading");
    setCurrentStep(1);
    setCompletedSteps([1]);
    setVariablesData({});
    setCer(emptyCer);
    setCerResult(null);

    void fetch(`/api/progress?activityId=${encodeURIComponent(activityId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          state?: AdiWizardState | null;
          submission?: Submission | null;
          feedback?: CoachFeedback | null;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "โหลดความคืบหน้าไม่สำเร็จ");
        if (cancelled) return;
        if (data.state) {
          setCurrentStep(phaseStep(data.state.currentPhase));
          setCompletedSteps(data.state.completedPhases.map(phaseStep));
          setVariablesData({
            independent: data.state.investigationData?.variables?.independent ?? "",
            dependent: data.state.investigationData?.variables?.dependent ?? "",
            controlled: data.state.investigationData?.variables?.controlled?.join(", ") ?? "",
            hypothesis: data.state.investigationData?.notes ?? "",
          });
          setCer(data.state.draftCer ?? emptyCer);
        }
        if (data.submission && data.feedback) setCerResult({ submission: data.submission, feedback: data.feedback });
        setHydratedActivityId(activityId);
        setProgressStatus("saved");
        setError("");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setProgressStatus("error");
        setError(reason instanceof Error ? reason.message : "โหลดความคืบหน้าไม่สำเร็จ");
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, activitiesLoading]);

  useEffect(() => {
    if (!activityId || hydratedActivityId !== activityId || activitiesLoading) return;
    const timeout = window.setTimeout(() => {
      const currentPhase = phaseKeys[currentStep - 1] ?? "orientation";
      const state: AdiWizardState = {
        currentPhase,
        completedPhases: Array.from(new Set(completedSteps.map((step) => phaseKeys[step - 1]).filter((phase): phase is AdiPhase => Boolean(phase)))),
        investigationData: {
          variables: {
            independent: variablesData.independent ?? "",
            dependent: variablesData.dependent ?? "",
            controlled: variablesData.controlled ? [variablesData.controlled] : [],
          },
          notes: variablesData.hypothesis ?? "",
        },
        draftCer: cer,
        activeSubmissionId: cerResult?.submission.id,
      };

      setProgressStatus("saving");
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ activityId, saveId: crypto.randomUUID(), state }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = (await response.json()) as { error?: string };
            throw new Error(data.error ?? "บันทึกความคืบหน้าไม่สำเร็จ");
          }
          setProgressStatus("saved");
          setError("");
        })
        .catch((reason: unknown) => {
          setProgressStatus("error");
          setError(reason instanceof Error ? reason.message : "บันทึกความคืบหน้าไม่สำเร็จ");
        });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [activityId, activitiesLoading, cer, cerResult, completedSteps, currentStep, hydratedActivityId, variablesData]);

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
            <span>ชีววิทยา ม.4 · ระบบนิเวศ</span>
          </div>
          <h1>ห้องสืบเสาะวิทยาศาสตร์</h1>
          <p className="lede">
            ทำทีละขั้น 7 ขั้น: สังเกต → ตั้งสมมติฐาน → ดูข้อมูล → เขียนข้อโต้แย้ง → ประเมินเพื่อน → ปรับปรุง → สะท้อนคิด
          </p>
        </div>

        <div className="hero-actions">
          <div className="activity-selector-box">
            <label htmlFor="activity-select">กิจกรรม:</label>
            <select
              id="activity-select"
              className="activity-dropdown"
              value={activityId}
              onChange={(e) => {
                setActivityId(e.target.value);
                setHydratedActivityId("");
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
            <Link className="pill-link" href="/student/timeline">
              📜 งานของฉัน
            </Link>
            {/* Students in a real class never see teacher tools; the demo keeps the shortcut. */}
            {persistenceMode !== "supabase" && (
              <Link className="pill-link" href="/teacher/review">
                👩‍🏫 แดชบอร์ดครู (สาธิต)
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="notice-strip">
        <div className="notice-pill">🔬 รอบที่ {activity?.cycle ?? 1}</div>
        <p>
          ขั้นที่ {currentStep} จาก 7 · {ADI_PHASES[currentStep - 1]?.thaiName.replace(/^\d+\.\s*/, "")}
        </p>
        {studentId && (
          <span className="active-student-tag">
            ผู้เรียน: <strong>{studentId}</strong>
          </span>
        )}
      </div>

      <p className="small-note" role="status" aria-live="polite">
        {progressStatus === "loading" && "กำลังโหลดความคืบหน้าที่บันทึกไว้…"}
        {progressStatus === "saving" && "กำลังบันทึกความคืบหน้า…"}
        {progressStatus === "saved" && (persistenceMode === "memory"
          ? "บันทึกความคืบหน้าแล้ว (ข้อมูลสาธิตอาจหายเมื่อเซิร์ฟเวอร์เริ่มใหม่)"
          : "บันทึกความคืบหน้าแล้ว")}
        {progressStatus === "error" && "⚠️ บันทึกไม่สำเร็จ โปรดตรวจอินเทอร์เน็ต แล้วลองพิมพ์ต่อ ระบบจะบันทึกใหม่อัตโนมัติ"}
      </p>

      {/* 7-Phase Stepper */}
      <AdiStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onSelectStep={handleSelectStep}
      />

      {error && <p className="error-text global-error" role="alert">{studentFriendlyError(error)}</p>}
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
              onChange={setVariablesData}
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
        <span>🌱 Learning OS · ชีววิทยา ม.4</span>
        <span>งานของคุณบันทึกอัตโนมัติ · AI Coach ช่วยถามนำ ไม่เฉลยคำตอบ</span>
      </footer>

      {showDiagnostics && <DiagnosticTerminalDrawer />}
    </main>
  );
}
