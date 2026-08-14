import type { AdiWorkflowState } from "@/lib/domain/types";

export type AdiAction =
  | "submit"
  | "feedback_received"
  | "start_revision"
  | "request_peer_review"
  | "submit_peer_review"
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

/** Education-owned state machine adapted from the Factory OS workflow pattern. */
export class AdiWorkflow {
  transition(
    currentState: AdiWorkflowState,
    action: AdiAction,
    policy: AdiWorkflowPolicy,
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
    if (state === "revising" && action === "request_peer_review" && policy.peerReviewAllowed) return "peer_review";
    if (state === "peer_review" && action === "submit_peer_review") return "teacher_review";
    if (state === "revising" && action === "send_to_teacher") return "teacher_review";
    if (state === "ai_feedback_received" && action === "send_to_teacher") return "teacher_review";
    if (state === "teacher_review" && action === "complete") return "completed";
    return undefined;
  }
}

export const adiWorkflow = new AdiWorkflow();
