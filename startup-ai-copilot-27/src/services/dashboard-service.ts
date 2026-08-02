import { apiClient } from "@/lib/api-client";

export type MetricScore = {
  score: number;
  label: string;
  status?: string;
};

export type StartupScores = {
  startup_id: string;
  overall_startup_score: { value: number; label: string };
  business_health: { value: number; label: string };
  innovation_score: { value: number; label: string };
  investor_readiness: { value: number; label: string };
  market_fit: { value: number; label: string };
  financial_health: { value: number; label: string };
  risk_rating: { value: number; label: string };
  execution_score: { value: number; label: string };
  calculated_at: string;
};

export type DashboardOverview = {
  startup_id: string;
  startup_name: string;
  scores: StartupScores;
  recent_reports: any[];
  ai_recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    action_type: string;
  }>;
  recent_activities: Array<{
    id: string;
    action: string;
    entity_type: string;
    description: string;
    timestamp: string;
  }>;
  priority_actions: Array<{
    id: string;
    task: string;
    deadline: string;
    completed: boolean;
  }>;
};

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const res = await apiClient.get<{ success: boolean; data: any }>("/api/v1/dashboard");
    const raw = res.data ?? {};
    const rawScores = raw.scores ?? {};

    const normalizedScores: StartupScores = {
      startup_id: raw.startup_id || "",
      overall_startup_score: { value: rawScores.overall_startup_score?.value ?? 0, label: "Overall" },
      business_health: { value: rawScores.business_health?.value ?? 0, label: "Health" },
      innovation_score: { value: rawScores.innovation_score?.value ?? 0, label: "Innovation" },
      investor_readiness: { value: rawScores.investor_readiness?.value ?? 0, label: "Readiness" },
      market_fit: { value: rawScores.market_fit?.value ?? rawScores.market_opportunity?.value ?? 0, label: "Market Fit" },
      financial_health: { value: rawScores.financial_health?.value ?? 0, label: "Financial Health" },
      risk_rating: { value: rawScores.risk_rating?.value ?? rawScores.risk_level?.value ?? 0, label: "Risk Rating" },
      execution_score: { value: rawScores.execution_score?.value ?? rawScores.execution_progress?.value ?? 0, label: "Execution" },
      calculated_at: new Date().toISOString(),
    };

    const recs = (raw.ai_recommendations || []).map((r: any, idx: number) => ({
      id: r.id || `rec-${idx}`,
      title: r.title || "Strategic Recommendation",
      description: r.description || r.reason || r.expected_impact || "Action item derived from strategy analysis.",
      priority: r.priority || "High",
      action_type: r.business_area || r.action_type || "Strategy",
    }));

    const acts = (raw.recent_activity || raw.recent_activities || []).map((a: any, idx: number) => ({
      id: a.id || `act-${idx}`,
      action: a.action || "Activity",
      entity_type: a.entity_type || "system",
      description: a.description || "",
      timestamp: a.timestamp || a.created_at || new Date().toISOString(),
    }));

    return {
      startup_id: raw.startup_id || "",
      startup_name: raw.startup_name || "Startup",
      scores: normalizedScores,
      recent_reports: raw.latest_reports || raw.recent_reports || [],
      ai_recommendations: recs,
      recent_activities: acts,
      priority_actions: [],
    };
  },

  async getScores(startupId: string): Promise<StartupScores> {
    const res = await apiClient.get<{ success: boolean; data: any }>(`/api/v1/startup/${startupId}/scores`);
    const rawScores = res.data ?? {};
    return {
      startup_id: startupId,
      overall_startup_score: { value: rawScores.overall_startup_score?.value ?? 0, label: "Overall" },
      business_health: { value: rawScores.business_health?.value ?? 0, label: "Health" },
      innovation_score: { value: rawScores.innovation_score?.value ?? 0, label: "Innovation" },
      investor_readiness: { value: rawScores.investor_readiness?.value ?? 0, label: "Readiness" },
      market_fit: { value: rawScores.market_fit?.value ?? rawScores.market_opportunity?.value ?? 0, label: "Market Fit" },
      financial_health: { value: rawScores.financial_health?.value ?? 0, label: "Financial Health" },
      risk_rating: { value: rawScores.risk_rating?.value ?? rawScores.risk_level?.value ?? 0, label: "Risk Rating" },
      execution_score: { value: rawScores.execution_score?.value ?? rawScores.execution_progress?.value ?? 0, label: "Execution" },
      calculated_at: new Date().toISOString(),
    };
  },

  async getTimeline(startupId: string): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/startup/${startupId}/timeline`);
    return res.data || [];
  },
};
