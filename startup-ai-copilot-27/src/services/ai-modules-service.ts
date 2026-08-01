/**
 * AI Business Modules Service
 * Centralized service for all 9 Business Journey AI modules.
 * Every request automatically carries Authorization + X-Startup-ID via apiClient.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

// ─── Shared Types ──────────────────────────────────────────────────────────────

export interface AiMeta {
  provider: string;        // "gemini" | "groq"
  model: string;
  confidence: number;      // 0–100
  generation_time_ms: number;
  report_version: number;
  generated_at: string;    // ISO timestamp
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

// ─── Interview Types ───────────────────────────────────────────────────────────

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

// ─── Idea Validation Types ─────────────────────────────────────────────────────

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

// ─── Business Strategy Types ───────────────────────────────────────────────────

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

// ─── Competitor Analysis Types ─────────────────────────────────────────────────

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

// ─── Business Model Canvas Types ───────────────────────────────────────────────

export interface CanvasBlock {
  key: string;
  items: string[];
}

export interface BusinessModelCanvasData {
  blocks: CanvasBlock[];
  summary: string;
}

// ─── Financial Planning Types ──────────────────────────────────────────────────

export interface FinancialStream {
  name: string;
  mrr: string;
  share: number;
  note: string;
}

export interface ForecastPoint {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface CashflowPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface FinancialPlanningData {
  monthly_cost: string;
  break_even: string;
  funding_need: string;
  runway: string;
  streams: FinancialStream[];
  revenue_forecast: ForecastPoint[];
  cashflow: CashflowPoint[];
  pricing_tiers: Array<{ tier: string; price: string; best_for: string; accounts: string }>;
  financial_insight: string;
}

// ─── Risk Analysis Types ───────────────────────────────────────────────────────

export interface Risk {
  title: string;
  category: string;
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

// ─── Investor Readiness Types ──────────────────────────────────────────────────

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

// ─── Execution Roadmap Types ───────────────────────────────────────────────────

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

// ─── Report History Types ──────────────────────────────────────────────────────

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

// ─── Service ───────────────────────────────────────────────────────────────────

export const aiModulesService = {
  // --- Interview ---

  startInterview(): Promise<InterviewStartResponse> {
    return apiClient.post("/api/v1/ai/interview/start");
  },

  submitAnswer(payload: {
    session_id: string;
    question_id: string;
    answer: string;
  }): Promise<InterviewAnswerResponse> {
    return apiClient.post("/api/v1/ai/interview/answer", payload);
  },

  async completeInterview(session_id: string): Promise<InterviewCompleteResponse> {
    const res = await apiClient.post<InterviewCompleteResponse>("/api/v1/ai/interview/complete", { session_id });
    eventBus.emit(EVENTS.INTERVIEW_UPDATED, res);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "interview", res });
    return res;
  },

  getInterviewStatus(startupId: string): Promise<InterviewStatusResponse> {
    return apiClient.get(`/api/v1/ai/interview/${startupId}`);
  },

  // --- Idea Validation ---

  async generateIdeaValidation(): Promise<VersionedReport<IdeaValidationData>> {
    const res = await apiClient.post<VersionedReport<IdeaValidationData>>("/api/v1/ai/idea-validation");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "idea_validation", res });
    return res;
  },

  // --- Business Strategy ---

  async generateBusinessStrategy(): Promise<VersionedReport<BusinessStrategyData>> {
    const res = await apiClient.post<VersionedReport<BusinessStrategyData>>("/api/v1/ai/business-strategy");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_strategy", res });
    return res;
  },

  // --- Competitor Analysis ---

  async generateCompetitorAnalysis(): Promise<VersionedReport<CompetitorAnalysisData>> {
    const res = await apiClient.post<VersionedReport<CompetitorAnalysisData>>("/api/v1/ai/competitor-analysis");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "competitor_analysis", res });
    return res;
  },

  // --- Business Model Canvas ---

  async generateBusinessModelCanvas(): Promise<VersionedReport<BusinessModelCanvasData>> {
    const res = await apiClient.post<VersionedReport<BusinessModelCanvasData>>("/api/v1/ai/business-model-canvas");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_model_canvas", res });
    return res;
  },

  // --- Financial Planning ---

  async generateFinancialPlanning(): Promise<VersionedReport<FinancialPlanningData>> {
    const res = await apiClient.post<VersionedReport<FinancialPlanningData>>("/api/v1/ai/financial-planning");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "financial_planning", res });
    return res;
  },

  // --- Risk Analysis ---

  async generateRiskAnalysis(): Promise<VersionedReport<RiskAnalysisData>> {
    const res = await apiClient.post<VersionedReport<RiskAnalysisData>>("/api/v1/ai/risk-analysis");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "risk_analysis", res });
    return res;
  },

  // --- Investor Readiness ---

  async generateInvestorReadiness(): Promise<VersionedReport<InvestorReadinessData>> {
    const res = await apiClient.post<VersionedReport<InvestorReadinessData>>("/api/v1/ai/investor-readiness");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "investor_readiness", res });
    return res;
  },

  // --- Execution Roadmap ---

  async generateExecutionRoadmap(): Promise<VersionedReport<ExecutionRoadmapData>> {
    const res = await apiClient.post<VersionedReport<ExecutionRoadmapData>>("/api/v1/ai/execution-roadmap");
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "execution_roadmap", res });
    return res;
  },

  // --- Report History ---

  getReportHistory(reportType: string): Promise<ReportHistoryItem[]> {
    return apiClient.get(`/api/v1/reports/history?report_type=${reportType}`);
  },

  getLatestReport<T>(reportType: string): Promise<VersionedReport<T> | null> {
    return apiClient.get(`/api/v1/reports/latest?report_type=${reportType}`).catch(() => null);
  },

  async regenerateReport(reportType: string): Promise<VersionedReport<unknown>> {
    const res = await apiClient.post<VersionedReport<unknown>>("/api/v1/reports/regenerate", { report_type: reportType });
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: reportType, res });
    return res;
  },

  // --- Module Statuses ---

  async getModuleStatuses(startupId: string): Promise<ModuleStatuses> {
    const moduleTypes = [
      "interview",
      "idea_validation",
      "business_strategy",
      "competitor_analysis",
      "business_model_canvas",
      "financial_planning",
      "risk_analysis",
      "investor_readiness",
      "execution_roadmap",
    ];

    const results = await Promise.allSettled(
      moduleTypes.map((t) =>
        t === "interview"
          ? aiModulesService.getInterviewStatus(startupId)
          : aiModulesService.getReportHistory(t)
      )
    );

    const statuses: Record<string, ModuleStatus> = {};

    // Interview status
    const interviewResult = results[0];
    if (interviewResult?.status === "fulfilled") {
      const iv = interviewResult.value as InterviewStatusResponse;
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
    for (let i = 1; i < moduleTypes.length; i++) {
      const key = moduleTypes[i]!;
      const result = results[i];
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
