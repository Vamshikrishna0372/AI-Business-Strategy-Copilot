import { apiClient } from "@/lib/api-client";

export type BackendStartup = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  industry: string;
  stage: string;
  problem_statement?: string;
  solution?: string;
  target_audience?: string;
  business_model?: string;
  revenue_model?: string;
  team_size?: number;
  founded_year?: number;
  website?: string;
  description?: string;
  is_active: boolean;
  is_archived: boolean;
  overall_score?: number;
  created_at: string;
  updated_at: string;
};

export type CreateStartupPayload = {
  name: string;
  industry: string;
  stage: string;
  problem_statement?: string;
  solution?: string;
  target_audience?: string;
  business_model?: string;
  revenue_model?: string;
  team_size?: number;
  website?: string;
  description?: string;
};

export type UpdateStartupPayload = Partial<CreateStartupPayload>;

export const startupService = {
  async listStartups(params?: { search?: string; stage?: string; is_archived?: boolean }): Promise<BackendStartup[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.stage) query.set("stage", params.stage);
    if (params?.is_archived !== undefined) query.set("is_archived", String(params.is_archived));

    const endpoint = `/api/v1/startups${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await apiClient.get<{ success: boolean; data: BackendStartup[] }>(endpoint);
    return res.data || [];
  },

  async getStartup(id: string): Promise<BackendStartup> {
    const res = await apiClient.get<{ success: boolean; data: BackendStartup }>(`/api/v1/startups/${id}`);
    return res.data;
  },

  async createStartup(payload: CreateStartupPayload): Promise<BackendStartup> {
    const res = await apiClient.post<{ success: boolean; data: BackendStartup }>("/api/v1/startups", payload);
    return res.data;
  },

  async updateStartup(id: string, payload: UpdateStartupPayload): Promise<BackendStartup> {
    const res = await apiClient.put<{ success: boolean; data: BackendStartup }>(`/api/v1/startups/${id}`, payload);
    return res.data;
  },

  async archiveStartup(id: string): Promise<BackendStartup> {
    const res = await apiClient.patch<{ success: boolean; data: BackendStartup }>(`/api/v1/startups/${id}/archive`);
    return res.data;
  },

  async restoreStartup(id: string): Promise<BackendStartup> {
    const res = await apiClient.patch<{ success: boolean; data: BackendStartup }>(`/api/v1/startups/${id}/restore`);
    return res.data;
  },

  async activateStartup(id: string): Promise<BackendStartup> {
    const res = await apiClient.patch<{ success: boolean; data: BackendStartup }>(`/api/v1/startups/${id}/activate`);
    return res.data;
  },

  async deleteStartup(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/startups/${id}`);
  },
};
