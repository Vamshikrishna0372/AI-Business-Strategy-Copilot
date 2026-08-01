import { apiClient } from "@/lib/api-client";
import type { UserProfile } from "./auth-service";

export const userService = {
  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get<{ success: boolean; data: UserProfile }>("/api/v1/users/profile");
    return res.data;
  },

  async updateProfile(payload: { full_name?: string; timezone?: string; preferences?: Record<string, any> }): Promise<UserProfile> {
    const res = await apiClient.put<{ success: boolean; data: UserProfile }>("/api/v1/users/profile", payload);
    return res.data;
  },
};
