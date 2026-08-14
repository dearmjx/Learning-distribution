"use client";

export interface AdiPhaseStep {
  id: number;
  key: string;
  name: string;
  thaiName: string;
  icon: string;
}

export const ADI_PHASES: AdiPhaseStep[] = [
  { id: 1, key: "orientation", name: "Orientation", thaiName: "1. ปรากฏการณ์", icon: "🌱" },
  { id: 2, key: "identification", name: "Variables", thaiName: "2. ตัวแปร & สมมติฐาน", icon: "🔍" },
  { id: 3, key: "investigation", name: "Investigation", thaiName: "3. ข้อมูลสืบเสาะ", icon: "📊" },
  { id: 4, key: "argument", name: "CER Argument", thaiName: "4. สร้าง CER", icon: "✍️" },
  { id: 5, key: "peer_review", name: "Peer Review", thaiName: "5. ประเมินเพื่อน", icon: "👥" },
  { id: 6, key: "revision", name: "Revision", thaiName: "6. ปรับปรุงข้อโต้แย้ง", icon: "🔄" },
  { id: 7, key: "reflection", name: "Reflection", thaiName: "7. สะท้อนคิด", icon: "🌟" },
];

interface AdiStepperProps {
  currentStep: number;
  completedSteps: number[];
  onSelectStep: (stepId: number) => void;
}

export function AdiStepper({ currentStep, completedSteps, onSelectStep }: AdiStepperProps) {
  return (
    <nav aria-label="ADI 7-Phase Progress" className="stepper-wrapper">
      <div className="stepper-track">
        {ADI_PHASES.map((phase) => {
          const isCompleted = completedSteps.includes(phase.id);
          const isCurrent = currentStep === phase.id;
          const isAccessible = isCompleted || phase.id <= Math.max(...completedSteps, 1);

          return (
            <button
              key={phase.id}
              type="button"
              className={`stepper-node ${isCurrent ? "node-current" : ""} ${isCompleted ? "node-completed" : ""} ${!isAccessible ? "node-locked" : ""}`}
              onClick={() => {
                if (isAccessible) onSelectStep(phase.id);
              }}
              disabled={!isAccessible}
              title={`${phase.name} (${phase.thaiName})`}
            >
              <div className="node-circle">
                {isCompleted ? "✓" : <span className="node-num">{phase.id}</span>}
              </div>
              <div className="node-label-group">
                <span className="node-icon">{phase.icon}</span>
                <span className="node-text">{phase.thaiName}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
