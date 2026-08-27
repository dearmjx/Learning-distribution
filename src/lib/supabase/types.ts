import type {
  AdiPhase,
  CerResponse,
  CoachResponse,
  InvestigationData,
  LearningContext,
  PeerReviewScores,
  RubricDimension,
} from "@/lib/domain/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Empty = Record<string, never>;

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      courses: {
        Row: { id: string; school_id: string; title: string; language: "th" | "en"; created_at: string };
        Insert: { id: string; school_id: string; title: string; language?: "th" | "en"; created_at?: string };
        Update: { id?: string; school_id?: string; title?: string; language?: "th" | "en"; created_at?: string };
        Relationships: [];
      };
      classes: {
        Row: { id: string; school_id: string; course_id: string; name: string; created_at: string };
        Insert: { id: string; school_id: string; course_id: string; name: string; created_at?: string };
        Update: { id?: string; school_id?: string; course_id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      learning_profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          external_id: string;
          display_name: string;
          role: "student" | "teacher" | "researcher";
          school_id: string;
          course_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          external_id: string;
          display_name: string;
          role?: "student" | "teacher" | "researcher";
          school_id: string;
          course_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          external_id?: string;
          display_name?: string;
          role?: "student" | "teacher" | "researcher";
          school_id?: string;
          course_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: { id: string; profile_id: string; class_id: string; role: "student" | "teacher"; status: "active" | "inactive"; starts_at: string; ends_at: string | null };
        Insert: { id?: string; profile_id: string; class_id: string; role: "student" | "teacher"; status?: "active" | "inactive"; starts_at?: string; ends_at?: string | null };
        Update: { id?: string; profile_id?: string; class_id?: string; role?: "student" | "teacher"; status?: "active" | "inactive"; starts_at?: string; ends_at?: string | null };
        Relationships: [];
      };
      activities: {
        Row: { id: string; course_id: string; unit: string; title: string; adi_phase: AdiPhase; prompt: string; context: string; rubric_dimensions: RubricDimension[]; peer_review_allowed: boolean; created_at: string };
        Insert: { id: string; course_id: string; unit: string; title: string; adi_phase: AdiPhase; prompt: string; context: string; rubric_dimensions: RubricDimension[]; peer_review_allowed?: boolean; created_at?: string };
        Update: { id?: string; course_id?: string; unit?: string; title?: string; adi_phase?: AdiPhase; prompt?: string; context?: string; rubric_dimensions?: RubricDimension[]; peer_review_allowed?: boolean };
        Relationships: [];
      };
      activity_assignments: {
        Row: { class_id: string; activity_id: string; enabled: boolean; peer_review_enabled: boolean; assigned_at: string };
        Insert: { class_id: string; activity_id: string; enabled?: boolean; peer_review_enabled?: boolean; assigned_at?: string };
        Update: { class_id?: string; activity_id?: string; enabled?: boolean; peer_review_enabled?: boolean };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; auth_user_id: string | null; student_id: string; email: string | null; display_name: string; role: "student" | "teacher" | "researcher" | "system" | "admin"; school_id: string; course_id: string; class_id: string; created_at: string; updated_at: string };
        Insert: { id?: string; auth_user_id?: string | null; student_id: string; email?: string | null; display_name: string; role?: "student" | "teacher" | "researcher" | "system" | "admin"; school_id?: string; course_id?: string; class_id?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; auth_user_id?: string | null; student_id?: string; email?: string | null; display_name?: string; role?: "student" | "teacher" | "researcher" | "system" | "admin"; school_id?: string; course_id?: string; class_id?: string; updated_at?: string };
        Relationships: [];
      };
      submissions: {
        Row: { id: string; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; version: number; content: CerResponse; investigation_data: InvestigationData | null; hint_depth: "none" | "shallow" | "concept" | "deep"; hint_cost: number; response_time_seconds: number; workflow_state: string; previous_draft_id: string | null; idempotency_key: string | null; submitted_at: string; updated_at: string };
        Insert: { id?: string; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; version?: number; content: CerResponse; investigation_data?: InvestigationData | null; hint_depth?: "none" | "shallow" | "concept" | "deep"; hint_cost?: number; response_time_seconds?: number; workflow_state?: string; previous_draft_id?: string | null; idempotency_key?: string | null; submitted_at?: string; updated_at?: string };
        Update: { id?: string; student_id?: string; activity_id?: string; profile_id?: string | null; class_id?: string | null; version?: number; content?: CerResponse; investigation_data?: InvestigationData | null; hint_depth?: "none" | "shallow" | "concept" | "deep"; hint_cost?: number; response_time_seconds?: number; workflow_state?: string; previous_draft_id?: string | null; idempotency_key?: string | null; updated_at?: string };
        Relationships: [];
      };
      revisions: {
        Row: { id: string; submission_id: string; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; version: number; content: CerResponse; investigation_data: InvestigationData | null; idempotency_key: string | null; created_at: string };
        Insert: { id?: string; submission_id: string; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; version: number; content: CerResponse; investigation_data?: InvestigationData | null; idempotency_key?: string | null; created_at?: string };
        Update: { id?: string; submission_id?: string; student_id?: string; activity_id?: string; profile_id?: string | null; class_id?: string | null; version?: number; content?: CerResponse; investigation_data?: InvestigationData | null; idempotency_key?: string | null };
        Relationships: [];
      };
      ai_sessions: {
        Row: { id: string; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; context: LearningContext; provider: CoachResponse["provider"]; started_at: string; ended_at: string | null };
        Insert: { id?: string; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; context: Json; provider: CoachResponse["provider"]; started_at?: string; ended_at?: string | null };
        Update: { ended_at?: string | null };
        Relationships: [];
      };
      ai_interactions: {
        Row: { id: string; session_id: string; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; request: Json; response: Json; fallback_used: boolean; created_at: string };
        Insert: { id?: string; session_id: string; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; request: Json; response?: Json; fallback_used?: boolean; created_at?: string };
        Update: { response?: Json; fallback_used?: boolean };
        Relationships: [];
      };
      hints: {
        Row: { id: string; profile_id: string; class_id: string; student_id: string; activity_id: string; submission_id: string | null; depth: "shallow" | "concept" | "deep"; cost: number; correlation_id: string; created_at: string };
        Insert: { id?: string; profile_id: string; class_id: string; student_id: string; activity_id: string; submission_id?: string | null; depth: "shallow" | "concept" | "deep"; cost: number; correlation_id: string; created_at?: string };
        Update: Empty;
        Relationships: [];
      };
      synthetic_peer_drafts: {
        Row: { id: string; activity_id: string; anonymous_author_alias: string; content: CerResponse; investigation_data: InvestigationData | null; misconception_tag: string | null; is_synthetic: boolean; created_at: string };
        Insert: { id?: string; activity_id: string; anonymous_author_alias: string; content: CerResponse; investigation_data?: InvestigationData | null; misconception_tag?: string | null; is_synthetic?: boolean; created_at?: string };
        Update: { activity_id?: string; anonymous_author_alias?: string; content?: CerResponse; investigation_data?: InvestigationData | null; misconception_tag?: string | null; is_synthetic?: boolean };
        Relationships: [];
      };
      peer_reviews: {
        Row: { id: string; submission_id: string; peer_review_submission_id: string | null; reviewer_student_id: string; author_student_id: string; reviewer_profile_id: string | null; author_profile_id: string | null; class_id: string | null; activity_id: string; scores: PeerReviewScores; strengths: string; suggestions: string; feedback: string; created_at: string };
        Insert: { id?: string; submission_id: string; peer_review_submission_id?: string | null; reviewer_student_id: string; author_student_id: string; reviewer_profile_id?: string | null; author_profile_id?: string | null; class_id?: string | null; activity_id: string; scores?: PeerReviewScores; strengths?: string; suggestions?: string; feedback: string; created_at?: string };
        Update: Empty;
        Relationships: [];
      };
      reflections: {
        Row: { id: string; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; submission_id: string | null; conceptual_learning: string; inquiry_process_reflection: string; peer_review_experience: string | null; confidence_score: number; key_takeaway: string | null; completed_at: string };
        Insert: { id?: string; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; submission_id?: string | null; conceptual_learning?: string; inquiry_process_reflection?: string; peer_review_experience?: string | null; confidence_score?: number; key_takeaway?: string | null; completed_at?: string };
        Update: { student_id?: string; activity_id?: string; profile_id?: string | null; class_id?: string | null; submission_id?: string | null; conceptual_learning?: string; inquiry_process_reflection?: string; peer_review_experience?: string | null; confidence_score?: number; key_takeaway?: string | null };
        Relationships: [];
      };
      teacher_reviews: {
        Row: { id: string; submission_id: string; teacher_id: string; teacher_profile_id: string | null; class_id: string | null; scores: Record<string, number>; feedback: string; final_score: number; authorship_review_decision: string; created_at: string };
        Insert: { id?: string; submission_id: string; teacher_id: string; teacher_profile_id?: string | null; class_id?: string | null; scores: Record<string, number>; feedback?: string; final_score: number; authorship_review_decision?: string; created_at?: string };
        Update: { teacher_id?: string; teacher_profile_id?: string | null; class_id?: string | null; scores?: Record<string, number>; feedback?: string; final_score?: number; authorship_review_decision?: string };
        Relationships: [];
      };
      learning_events: {
        Row: { id: string; schema_version: number; student_id: string; activity_id: string; profile_id: string | null; class_id: string | null; event_type: string; payload: Record<string, unknown>; context: Record<string, unknown>; actor: Record<string, unknown>; correlation_id: string; idempotency_key: string | null; occurred_at: string; created_at: string };
        Insert: { id?: string; schema_version?: number; student_id: string; activity_id: string; profile_id?: string | null; class_id?: string | null; event_type: string; payload?: Record<string, unknown>; context?: Json; actor?: Json; correlation_id: string; idempotency_key?: string | null; occurred_at?: string; created_at?: string };
        Update: Empty;
        Relationships: [];
      };
      consent_records: {
        Row: { id: string; profile_id: string; school_id: string; purpose: string; policy_version: string; status: "granted" | "withdrawn" | "expired"; granted_at: string; withdrawn_at: string | null; expires_at: string | null };
        Insert: { id?: string; profile_id: string; school_id: string; purpose: string; policy_version: string; status?: "granted" | "withdrawn" | "expired"; granted_at?: string; withdrawn_at?: string | null; expires_at?: string | null };
        Update: { status?: "granted" | "withdrawn" | "expired"; withdrawn_at?: string | null; expires_at?: string | null };
        Relationships: [];
      };
      research_identity_mapping: {
        Row: { id: string; profile_id: string; participant_key: string; created_at: string };
        Insert: { id?: string; profile_id: string; participant_key: string; created_at?: string };
        Update: { participant_key?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_assigned_peer_review_draft: { Args: { p_activity_id: string }; Returns: Json };
      submit_peer_review: { Args: { p_submission_id: string; p_peer_review_submission_id: string | null; p_activity_id: string; p_scores: PeerReviewScores; p_strengths: string; p_suggestions: string; p_feedback: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
