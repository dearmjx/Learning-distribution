import type { AdiPhase, AdiWorkflowState } from "@/lib/domain/types";

export type AdiAction =
  | "submit"
  | "feedback_received"
  | "start_revision"
  | "request_peer_review"
  | "submit_peer_review"
  | "start_reflection"
  | "submit_reflection"
  | "send_to_teacher"
  | "complete";

export interface AdiTransitionResult {
  allowed: boolean;
  previousState: AdiWorkflowState;
  newState: AdiWorkflowState;
  reason?: string;
}

export interface AdiWorkflowPolicy {
  peerReviewAllowed: boolean;
}

export const ADI_PHASES: readonly AdiPhase[] = [
  "orientation",
  "identification",
  "investigation",
  "argument",
  "peer_review",
  "revision",
  "reflection",
] as const;

export interface AdiPhaseTransitionResult {
  allowed: boolean;
  fromPhase: AdiPhase;
  toPhase: AdiPhase;
  reason?: string;
}

/** Education-owned state machine adapted from the Factory OS workflow pattern. */
export class AdiWorkflow {
  transition(
    currentState: AdiWorkflowState,
    action: AdiAction,
    policy: AdiWorkflowPolicy = { peerReviewAllowed: true },
  ): AdiTransitionResult {
    const next = this.nextState(currentState, action, policy);
    if (!next) {
      return {
        allowed: false,
        previousState: currentState,
        newState: currentState,
        reason: `ADI action '${action}' is not allowed from '${currentState}'`,
      };
    }
    return { allowed: true, previousState: currentState, newState: next };
  }

  private nextState(
    state: AdiWorkflowState,
    action: AdiAction,
    policy: AdiWorkflowPolicy,
  ): AdiWorkflowState | undefined {
    if (state === "draft" && action === "submit") return "submitted";
    if (state === "submitted" && action === "feedback_received") return "ai_feedback_received";
    if (state === "ai_feedback_received" && action === "start_revision") return "revising";
    if (state === "ai_feedback_received" && action === "request_peer_review" && policy.peerReviewAllowed) return "peer_review";
    if (state === "revising" && action === "request_peer_review" && policy.peerReviewAllowed) return "peer_review";
    if (state === "revising" && action === "start_reflection") return "reflection";
    if (state === "peer_review" && action === "submit_peer_review") return "revision";
    if (state === "peer_review" && action === "start_revision") return "revision";
    if (state === "revision" && action === "start_reflection") return "reflection";
    if (state === "revision" && action === "submit_reflection") return "reflection";
    if (state === "reflection" && (action === "submit_reflection" || action === "complete")) return "completed";
    if (state === "revising" && action === "send_to_teacher") return "teacher_review";
    if (state === "ai_feedback_received" && action === "send_to_teacher") return "teacher_review";
    if (state === "peer_review" && action === "send_to_teacher") return "teacher_review";
    if (state === "revision" && action === "send_to_teacher") return "teacher_review";
    if (state === "reflection" && action === "send_to_teacher") return "teacher_review";
    if (state === "teacher_review" && action === "complete") return "completed";
    return undefined;
  }

  /**
   * Validate and perform transition between ADI learning phases.
   */
  transitionPhase(
    currentPhase: AdiPhase,
    targetPhase: AdiPhase,
    policy: AdiWorkflowPolicy = { peerReviewAllowed: true },
  ): AdiPhaseTransitionResult {
    const fromIndex = ADI_PHASES.indexOf(currentPhase);
    const toIndex = ADI_PHASES.indexOf(targetPhase);

    if (fromIndex === -1 || toIndex === -1) {
      return {
        allowed: false,
        fromPhase: currentPhase,
        toPhase: targetPhase,
        reason: `Invalid ADI phase: ${currentPhase} -> ${targetPhase}`,
      };
    }

    // Staying in same phase is allowed
    if (fromIndex === toIndex) {
      return { allowed: true, fromPhase: currentPhase, toPhase: targetPhase };
    }

    // Navigating backwards to review earlier phase is allowed
    if (toIndex < fromIndex) {
      return { allowed: true, fromPhase: currentPhase, toPhase: targetPhase };
    }

    // Attempting to enter peer_review when peerReviewAllowed is false
    if (targetPhase === "peer_review" && !policy.peerReviewAllowed) {
      return {
        allowed: false,
        fromPhase: currentPhase,
        toPhase: targetPhase,
        reason: "Peer review is not allowed for this activity policy",
      };
    }

    // If peer review is disabled, allow transition from argument directly to revision (step of 2)
    if (!policy.peerReviewAllowed && currentPhase === "argument" && targetPhase === "revision") {
      return { allowed: true, fromPhase: currentPhase, toPhase: targetPhase };
    }

    // Standard forward step (must be exactly 1 step ahead)
    if (toIndex === fromIndex + 1) {
      return { allowed: true, fromPhase: currentPhase, toPhase: targetPhase };
    }

    return {
      allowed: false,
      fromPhase: currentPhase,
      toPhase: targetPhase,
      reason: `Cannot skip intermediate phases: from '${currentPhase}' to '${targetPhase}'`,
    };
  }

  getNextPhase(
    currentPhase: AdiPhase,
    policy: AdiWorkflowPolicy = { peerReviewAllowed: true },
  ): AdiPhase | undefined {
    const currentIndex = ADI_PHASES.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === ADI_PHASES.length - 1) return undefined;
    const nextCandidate = ADI_PHASES[currentIndex + 1];
    if (nextCandidate === "peer_review" && !policy.peerReviewAllowed) {
      return ADI_PHASES[currentIndex + 2]; // skip to revision
    }
    return nextCandidate;
  }

  getPreviousPhase(currentPhase: AdiPhase): AdiPhase | undefined {
    const currentIndex = ADI_PHASES.indexOf(currentPhase);
    if (currentIndex <= 0) return undefined;
    return ADI_PHASES[currentIndex - 1];
  }
}

export const adiWorkflow = new AdiWorkflow();

