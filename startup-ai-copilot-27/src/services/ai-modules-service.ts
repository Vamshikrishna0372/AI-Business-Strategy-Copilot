/**
 * AI Business Modules Service — Adapter Layer
 * Bridges the FastAPI backend response shapes with frontend component contracts.
 * All 9 Business Journey modules are covered here.
 *
 * Backend wraps everything in { success, message, data: <T> }
 * This service unwraps `.data` and normalises field names where the two sides diverge.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

// ─── Shared ────────────────────────────────────────────────────────────────────

export interface AiMeta {
  provider: string;
  model: string;
  confidence: number;
  generation_time_ms: number;
  report_version: number;
  generated_at: string;
}

export interface VersionedReport<T> {
  id: string;
  startup_id: string;
  report_type: string;
  version: number;
  data: T;
  ai_meta: AiMeta;
  created_at: string;
}

// ─── Backend DTO shapes returned by the API ──────────────────────────────────

/** Shape returned by POST /api/v1/ai/interview/start and POST /api/v1/ai/interview/answer */
export interface BackendInterviewStep {
  interview_id: string;
  current_section: string;
  next_question_id: string;
  next_question: string;
  question_type: string;
  completed: boolean;
  qa_history: Array<{ question_id: string; question: string; answer?: string; category?: string }>;
  summary_so_far?: string;
}

/** Shape returned by GET /api/v1/ai/interview/{startupId} */
export interface BackendInterviewDetails {
  id: string;
  startup_id: string;
  user_id: string;
  title: string;
  status: string; // "not_started" | "in_progress" | "completed"
  qa_history: Array<{ question_id: string; question: string; answer?: string; category?: string }>;
  summary?: string;
  created_at: string;
  updated_at: string;
}

/** Shape returned by report generation endpoints (POST /api/v1/ai/*) */
export interface BackendReport {
  id: string;
  startup_id: string;
  user_id: string;
  report_type: string;
  title: string;
  version: number;
  status: string;
  ai_provider: string;
  confidence: number;
  content: Record<string, any>;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
}

/** Convert a BackendReport (content) into the VersionedReport<T> shape (data + ai_meta). */
function normalizeReport<T>(raw: BackendReport): VersionedReport<T> {
  return {
    id: raw.id,
    startup_id: raw.startup_id,
    report_type: raw.report_type,
    version: raw.version,
    data: (raw.content ?? {}) as T,
    ai_meta: {
      provider: raw.ai_provider ?? "gemini",
      model: raw.ai_provider ?? "gemini-pro",
      confidence: raw.confidence ?? 0.9,
      generation_time_ms: 0,
      report_version: raw.version,
      generated_at: raw.created_at,
    },
    created_at: raw.created_at,
  };
}

// ─── Frontend-facing interview types (what components consume) ────────────────

export interface InterviewQuestion {
  question_id: string;
  question: string;
  category: string;
  question_number: number;
  total_questions: number;
  suggestions: string[];
  estimated_time_minutes: number;
  follow_up_context?: string;
}

export interface InterviewStartResponse {
  session_id: string;
  startup_id: string;
  first_question: InterviewQuestion;
  status: string;
}

export interface InterviewAnswerResponse {
  session_id: string;
  answered_question: string;
  category: string;
  next_question: InterviewQuestion | null;
  is_complete: boolean;
  progress_percentage: number;
  insights_so_far: string[];
}

export interface InterviewCompleteResponse {
  session_id: string;
  startup_id: string;
  summary: string;
  key_insights: string[];
  modules_ready: string[];
  report_version: number;
  generated_at: string;
}

export interface InterviewStatusResponse {
  session_id: string | null;
  startup_id: string;
  status: "not_started" | "in_progress" | "completed";
  current_question_number: number;
  total_questions: number;
  progress_percentage: number;
  qa_history: Array<{ question: string; answer: string; category: string }>;
  summary?: string;
  key_insights?: string[];
}

// ─── Other module types ───────────────────────────────────────────────────────

export interface ValidationScore {
  label: string;
  score: number;
  reason: string;
  suggestion: string;
}

export interface IdeaValidationData {
  overall_score: number;
  verdict: string;
  summary: string;
  scores: ValidationScore[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  next_steps: string[];
}

export interface StrategySection {
  title: string;
  body: string;
}

export interface BusinessStrategyData {
  executive_summary: string;
  mission: string;
  vision: string;
  target_market: string;
  revenue_model: string;
  gtm_strategy: string;
  sections: StrategySection[];
  kpis: string[];
}

export interface Competitor {
  name: string;
  focus: string;
  pricing: number;
  tech: number;
  reach: number;
  service: number;
  trust: number;
  share: string;
}

export interface CompetitorAnalysisData {
  market_gap: string;
  competitive_advantage: string;
  competitors: Competitor[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  positioning_summary: string;
}

export interface CanvasBlock {
  key: string;
  items: string[];
}

export interface BusinessModelCanvasData {
  blocks: CanvasBlock[];
  summary: string;
}

export interface FinancialStream {
  name: string;
  share: number;
  mrr: string;
  note: string;
}

export interface FinancialPlanningData {
  monthly_cost: string;
  break_even: string;
  funding_need: string;
  runway: string;
  streams: FinancialStream[];
  cashflow_projection: Array<{ month: string; inflow: number; outflow: number }>;
  revenue_forecast: Array<{ quarter: string; revenue: number; costs: number; profit: number }>;
}

export interface Risk {
  category: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  probability: number;
  impact: string;
  fix: string;
}

export interface RiskAnalysisData {
  overall_risk_score: number;
  risk_level: string;
  risks: Risk[];
  top_concern: string;
  mitigation_priority: string[];
}

export interface InvestorChecklistItem {
  label: string;
  done: boolean;
  priority: "high" | "medium" | "low";
}

export interface FundingOption {
  name: string;
  fit: number;
  note: string;
}

export interface ElevatorPitch {
  length: string;
  text: string;
}

export interface InvestorReadinessData {
  readiness_score: number;
  readiness_label: string;
  readiness_summary: string;
  investor_confidence: number;
  indicative_cheque: string;
  strengths: string[];
  weaknesses: string[];
  missing_requirements: string[];
  checklist: InvestorChecklistItem[];
  pitches: ElevatorPitch[];
  funding_options: FundingOption[];
}

export interface RoadmapMilestone {
  title: string;
  when: string;
  status: "In progress" | "Next" | "Upcoming";
  effort: string;
  difficulty: string;
  priority: string;
  tasks: string[];
  ai: string;
}

export interface NextAction {
  title: string;
  why: string;
  done: boolean;
}

export interface ExecutionRoadmapData {
  current_stage: string;
  next_best_action: string;
  next_best_why: string;
  milestones: RoadmapMilestone[];
  next_actions: NextAction[];
  success_metrics: string[];
  weekly_goals: string[];
}

export type ModuleStatus = "Not Started" | "In Progress" | "Completed" | "Needs Review";

export interface ReportHistoryItem {
  id: string;
  report_type: string;
  version: number;
  created_at: string;
  ai_meta?: AiMeta;
}

export interface ModuleStatuses {
  interview: ModuleStatus;
  idea_validation: ModuleStatus;
  business_strategy: ModuleStatus;
  competitor_analysis: ModuleStatus;
  business_model_canvas: ModuleStatus;
  financial_planning: ModuleStatus;
  risk_analysis: ModuleStatus;
  investor_readiness: ModuleStatus;
  execution_roadmap: ModuleStatus;
}

// ─── Helper: adapt BackendInterviewStep to InterviewQuestion ─────────────────

function adaptStep(step: BackendInterviewStep, startupId: string, qaCount: number): InterviewStartResponse {
  const q: InterviewQuestion = {
    question_id: step.next_question_id || `q_${qaCount + 1}`,
    question: step.next_question || "Please describe your business concept.",
    category: step.current_section || "General",
    question_number: qaCount + 1,
    total_questions: 10,
    suggestions: [],
    estimated_time_minutes: 2,
  };
  return {
    session_id: step.interview_id,
    startup_id: startupId,
    first_question: q,
    status: step.completed ? "completed" : "in_progress",
  };
}

function adaptStepToAnswer(step: BackendInterviewStep, answered: string, startupId: string): InterviewAnswerResponse {
  const nextQ: InterviewQuestion | null = step.completed
    ? null
    : {
        question_id: step.next_question_id || "q_next",
        question: step.next_question || "Continue describing your business.",
        category: step.current_section || "General",
        question_number: (step.qa_history?.length ?? 0) + 1,
        total_questions: 10,
        suggestions: [],
        estimated_time_minutes: 2,
      };

  const answered_count = step.qa_history?.length ?? 0;
  const progress = step.completed ? 100 : Math.min(95, Math.round((answered_count / 10) * 100));

  return {
    session_id: step.interview_id,
    answered_question: answered,
    category: step.current_section || "General",
    next_question: nextQ,
    is_complete: step.completed,
    progress_percentage: progress,
    insights_so_far: step.summary_so_far ? [step.summary_so_far] : [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const aiModulesService = {
  // --- MODULE 1: AI BUSINESS INTERVIEW ---

  async startInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/start"
    );
    const step = res.data;
    const startupId = step.interview_id; // best proxy — actual startup_id not returned by this endpoint
    return adaptStep(step, startupId, step.qa_history?.length ?? 0);
  },

  async submitAnswer(payload: {
    session_id: string;
    question_id: string;
    question?: string;
    answer: string;
    category?: string;
  }): Promise<InterviewAnswerResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/answer",
      {
        question_id: payload.question_id,
        question: payload.question || payload.question_id, // backend requires non-empty question text
        answer: payload.answer,
        category: payload.category || "General",
      }
    );
    const step = res.data;
    return adaptStepToAnswer(step, payload.answer, step.interview_id);
  },

  async completeInterview(session_id: string): Promise<InterviewCompleteResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>(
      "/api/v1/ai/interview/complete"
    );
    const report = res.data;
    const content = report.content ?? {};
    const result: InterviewCompleteResponse = {
      session_id,
      startup_id: report.startup_id,
      summary: content.business_summary || content.summary || "Interview complete.",
      key_insights: content.key_insights ?? [],
      modules_ready: ["idea_validation", "business_strategy", "competitor_analysis", "business_model_canvas", "financial_planning", "risk_analysis", "investor_readiness", "execution_roadmap"],
      report_version: report.version,
      generated_at: report.created_at,
    };
    eventBus.emit(EVENTS.INTERVIEW_UPDATED, result);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "interview", res: report });
    return result;
  },

  async getInterviewStatus(startupId: string): Promise<InterviewStatusResponse> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendInterviewDetails }>(
        `/api/v1/ai/interview/${startupId}`
      );
      const detail = res.data;
      const qa = (detail.qa_history ?? []).map((q) => ({
        question: q.question,
        answer: q.answer ?? "",
        category: q.category ?? "General",
      }));
      const answered = qa.length;
      const progress = detail.status === "completed" ? 100 : Math.min(95, Math.round((answered / 10) * 100));
      return {
        session_id: detail.id,
        startup_id: detail.startup_id,
        status: detail.status as "not_started" | "in_progress" | "completed",
        current_question_number: answered + 1,
        total_questions: 10,
        progress_percentage: progress,
        qa_history: qa,
        summary: detail.summary,
        key_insights: [],
      };
    } catch {
      return {
        session_id: null,
        startup_id: startupId,
        status: "not_started",
        current_question_number: 1,
        total_questions: 10,
        progress_percentage: 0,
        qa_history: [],
      };
    }
  },

  // --- MODULE 2: IDEA VALIDATION ---

  async generateIdeaValidation(): Promise<VersionedReport<IdeaValidationData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/idea-validation");
    const report = normalizeReport<IdeaValidationData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "idea_validation", res: res.data });
    return report;
  },

  // --- MODULE 3: BUSINESS STRATEGY ---

  async generateBusinessStrategy(): Promise<VersionedReport<BusinessStrategyData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/business-strategy");
    const report = normalizeReport<BusinessStrategyData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_strategy", res: res.data });
    return report;
  },

  // --- MODULE 4: COMPETITOR ANALYSIS ---

  async generateCompetitorAnalysis(): Promise<VersionedReport<CompetitorAnalysisData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/competitor-analysis");
    const report = normalizeReport<CompetitorAnalysisData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "competitor_analysis", res: res.data });
    return report;
  },

  // --- MODULE 5: BUSINESS MODEL CANVAS ---

  async generateBusinessModelCanvas(): Promise<VersionedReport<BusinessModelCanvasData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/business-model-canvas");
    const report = normalizeReport<BusinessModelCanvasData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_model_canvas", res: res.data });
    return report;
  },

  // --- MODULE 6: FINANCIAL PLANNING ---

  async generateFinancialPlanning(): Promise<VersionedReport<FinancialPlanningData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/financial-planning");
    const report = normalizeReport<FinancialPlanningData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "financial_planning", res: res.data });
    return report;
  },

  // --- MODULE 7: RISK ANALYSIS ---

  async generateRiskAnalysis(): Promise<VersionedReport<RiskAnalysisData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/risk-analysis");
    const report = normalizeReport<RiskAnalysisData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "risk_analysis", res: res.data });
    return report;
  },

  // --- MODULE 8: INVESTOR READINESS ---

  async generateInvestorReadiness(): Promise<VersionedReport<InvestorReadinessData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/investor-readiness");
    const report = normalizeReport<InvestorReadinessData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "investor_readiness", res: res.data });
    return report;
  },

  // --- MODULE 9: EXECUTION ROADMAP ---

  async generateExecutionRoadmap(): Promise<VersionedReport<ExecutionRoadmapData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/execution-roadmap");
    const report = normalizeReport<ExecutionRoadmapData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "execution_roadmap", res: res.data });
    return report;
  },

  // --- Report History ---

  async getReportHistory(reportType: string): Promise<ReportHistoryItem[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReport[] }>(
        `/api/v1/reports/history?report_type=${reportType}`
      );
      return (res.data ?? []).map((r) => ({
        id: r.id,
        report_type: r.report_type,
        version: r.version,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getLatestReport<T = Record<string, any>>(reportType: string): Promise<VersionedReport<T> | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReport | null }>(
        `/api/v1/reports/latest?report_type=${reportType}`
      );
      if (!res.data) return null;
      return normalizeReport<T>(res.data);
    } catch {
      return null;
    }
  },

  async regenerateReport<T = Record<string, any>>(reportType: string): Promise<VersionedReport<T>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/reports/regenerate", {
      report_type: reportType,
    });
    const report = normalizeReport<T>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: reportType, res: res.data });
    return report;
  },

  // --- Module Statuses ---

  async getModuleStatuses(startupId: string): Promise<ModuleStatuses> {
    const moduleTypes = [
      "idea_validation",
      "business_strategy",
      "competitor_analysis",
      "business_model_canvas",
      "financial_planning",
      "risk_analysis",
      "investor_readiness",
      "execution_roadmap",
    ];

    const [interviewStatus, ...reportResults] = await Promise.allSettled([
      aiModulesService.getInterviewStatus(startupId),
      ...moduleTypes.map((t) => aiModulesService.getReportHistory(t)),
    ]);

    const statuses: Record<string, ModuleStatus> = {};

    // Interview status
    if (interviewStatus?.status === "fulfilled") {
      const iv = interviewStatus.value as InterviewStatusResponse;
      statuses["interview"] =
        iv.status === "completed"
          ? "Completed"
          : iv.status === "in_progress"
          ? "In Progress"
          : "Not Started";
    } else {
      statuses["interview"] = "Not Started";
    }

    // Report-based statuses
    for (let i = 0; i < moduleTypes.length; i++) {
      const key = moduleTypes[i]!;
      const result = reportResults[i];
      if (result?.status === "fulfilled") {
        const history = result.value as ReportHistoryItem[];
        statuses[key] = history.length > 0 ? "Completed" : "Not Started";
      } else {
        statuses[key] = "Not Started";
      }
    }

    return statuses as ModuleStatuses;
  },
};

/** analysisStages — UI copy for the interview loading animation */
export const analysisStages = [
  "Understanding your startup...",
  "Analyzing competitors...",
  "Validating market demand...",
  "Generating business strategy...",
  "Building execution roadmap...",
  "Finding investment opportunities...",
];
