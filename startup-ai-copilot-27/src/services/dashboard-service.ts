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
    const res = await apiClient.get<{ success: boolean; data: DashboardOverview }>("/api/v1/dashboard");
    return res.data;
  },

  async getScores(startupId: string): Promise<StartupScores> {
    const res = await apiClient.get<{ success: boolean; data: StartupScores }>(`/api/v1/startup/${startupId}/scores`);
    return res.data;
  },

  async getTimeline(startupId: string): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/startup/${startupId}/timeline`);
    return res.data || [];
  },
};
