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

const emptyCer: CerResponse = { claim: "", evidence: "", reasoning: "" };

interface StudentWorkbenchProps {
  initialActivityId?: string;
}

export function StudentWorkbench({ initialActivityId }: StudentWorkbenchProps = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  // State across phases
  const [variablesData, setVariablesData] = useState<Record<string, string>>({});
  const [cer, setCer] = useState<CerResponse>(emptyCer);
  const [cerResult, setCerResult] = useState<{ submission: Submission; feedback: CoachFeedback } | null>(null);
  const [, setRevisedSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/activities")
      .then((res) => res.json())
      .then((data: { activities: Activity[] }) => {
        setActivities(data.activities);
        const selected = data.activities.find((item) => item.id === initialActivityId)?.id ?? data.activities[0]?.id ?? "";
        setActivityId(selected);
      })
      .catch(() => setError("โหลดกิจกรรมไม่สำเร็จ"));
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

  return (
    <main className="shell">
      {/* Modern Top Header */}
      <header className="hero">
        <div className="hero-brand">
          <div className="brand-badge">
            <span className="brand-dot" />
            <span>LEARNING OS · BIOLOGY M.4</span>
          </div>
          <h1>7-Phase ADI Inquiry Hub</h1>
          <p className="lede">
            ระบบสืบเสาะทางวิทยาศาสตร์แบบ Argument-Driven Inquiry (ADI) 7 ขั้นตอน พร้อม AI Socratic Coach
          </p>
        </div>

        <div className="hero-actions">
          <div className="activity-selector-box">
            <label htmlFor="activity-select">เลือกกิจกรรม:</label>
            <select
              id="activity-select"
              className="activity-dropdown"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
            >
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title} ({act.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="header-nav-links">
            <Link className="pill-link" href="/student/timeline">
              📜 Timeline ของฉัน
            </Link>
            <Link className="pill-link" href="/teacher/review">
              👩‍🏫 แดชบอร์ดครู
            </Link>
          </div>
        </div>
      </header>

      {/* Modern Notice Banner */}
      <div className="notice-strip">
        <div className="notice-pill">🔬 ADI Framework</div>
        <p>
          เรียนรู้ผ่าน 7 ขั้นตอน: ปรากฏการณ์ ➔ ตัวแปร ➔ ข้อมูลสืบเสาะ ➔ ร่าง CER ➔ ประเมินเพื่อน ➔ ปรับปรุงข้อโต้แย้ง ➔ สะท้อนคิด
        </p>
      </div>

      {/* 7-Phase Stepper */}
      <AdiStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onSelectStep={handleSelectStep}
      />

      {error && <p className="error-text global-error">{error}</p>}

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
              onNext={() => advanceToStep(6)}
              onBack={() => handleSelectStep(4)}
            />
          )}

          {currentStep === 6 && (
            <Phase6Revision
              activity={activity}
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
              onBack={() => handleSelectStep(6)}
            />
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="footer-bar">
        <span>🌱 Learning OS Ecosystem · ม.4 ชีววิทยา · One-group pre/post research prototype</span>
        <span>Version 2.0 · 7-Phase ADI & Socratic Coach Engine</span>
      </footer>
    </main>
  );
}
