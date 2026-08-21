import { apiClient } from "@/lib/api-client";

export type SystemMetrics = {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_startups: number;
  total_interviews: number;
  completed_interviews: number;
  in_progress_interviews: number;
  paused_interviews: number;
  stopped_interviews: number;
  total_reports: number;
};

export type SystemHealth = {
  database: string;
  storage: string;
  ai_engine: string;
  api_server: string;
  server_time: string;
};

export type AdminDashboardData = {
  metrics: SystemMetrics;
  recent_users: Array<any>;
  recent_startups: Array<any>;
  recent_activity: Array<any>;
  system_health: SystemHealth;
};

export type AdminUserItem = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string;
  startup_count: number;
};

export type AdminStartupItem = {
  id: string;
  name: string;
  industry: string;
  stage: string;
  user_id: string;
  founder_email: string;
  founder_name: string;
  interview_status: string;
  interview_progress: number;
  created_at: string;
};

export type AdminInterviewItem = {
  id: string;
  startup_id: string;
  user_id: string;
  startup_name: string;
  founder_email: string;
  founder_name: string;
  status: string;
  current_question_index?: number;
  total_questions?: number;
  progress_percentage?: number;
  qa_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
};

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardData> {
    const res = await apiClient.get<{ success: boolean; data: AdminDashboardData }>(
      "/api/v1/admin/dashboard/stats"
    );
    return res.data;
  },

  async getUsers(params?: {
    query?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ users: AdminUserItem[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set("query", params.query);
    if (params?.role) searchParams.set("role", params.role);
    if (params?.is_active !== undefined) searchParams.set("is_active", String(params.is_active));
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await apiClient.get<{ success: boolean; data: { users: AdminUserItem[]; pagination: any } }>(
      `/api/v1/admin/users${queryStr}`
    );
    return res.data;
  },

  async getUserDetails(userId: string): Promise<any> {
    const res = await apiClient.get<{ success: boolean; data: any }>(
      `/api/v1/admin/users/${userId}`
    );
    return res.data;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserItem> {
    const res = await apiClient.patch<{ success: boolean; data: AdminUserItem }>(
      `/api/v1/admin/users/${userId}/status`,
      { is_active: isActive }
    );
    return res.data;
  },

  async updateUserRole(userId: string, role: string): Promise<AdminUserItem> {
    const res = await apiClient.patch<{ success: boolean; data: AdminUserItem }>(
      `/api/v1/admin/users/${userId}/role`,
      { role }
    );
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/users/${userId}`);
  },

  async getStartups(params?: {
    query?: string;
    industry?: string;
    stage?: string;
    page?: number;
    limit?: number;
  }): Promise<{ startups: AdminStartupItem[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set("query", params.query);
    if (params?.industry) searchParams.set("industry", params.industry);
    if (params?.stage) searchParams.set("stage", params.stage);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await apiClient.get<{ success: boolean; data: { startups: AdminStartupItem[]; pagination: any } }>(
      `/api/v1/admin/startups${queryStr}`
    );
    return res.data;
  },

  async deleteStartup(startupId: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/startups/${startupId}`);
  },

  async getInterviews(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ interviews: AdminInterviewItem[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await apiClient.get<{ success: boolean; data: { interviews: AdminInterviewItem[]; pagination: any } }>(
      `/api/v1/admin/interviews${queryStr}`
    );
    return res.data;
  },

  async getAnalytics(): Promise<any> {
    const res = await apiClient.get<{ success: boolean; data: any }>("/api/v1/admin/analytics");
    return res.data;
  },
};
