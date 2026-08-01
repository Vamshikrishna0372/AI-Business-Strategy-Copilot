import { apiClient, setStoredToken } from "@/lib/api-client";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  timezone: string;
  is_active: boolean;
  is_verified: boolean;
  preferences?: Record<string, any>;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
};

export const authService = {
  async loginWithEmail(email: string, fullName?: string, password?: string): Promise<TokenResponse> {
    const res = await apiClient.post<{ success: boolean; data: TokenResponse }>("/api/v1/auth/login", {
      email,
      full_name: fullName || "Founder User",
      password,
    });
    if (res.data?.access_token) {
      setStoredToken(res.data.access_token);
    }
    return res.data;
  },

  async loginWithGoogle(idToken: string): Promise<TokenResponse> {
    const res = await apiClient.post<{ success: boolean; data: TokenResponse }>("/api/v1/auth/google", {
      id_token: idToken,
    });
    if (res.data?.access_token) {
      setStoredToken(res.data.access_token);
    }
    return res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<{ success: boolean; data: UserProfile }>("/api/v1/auth/me");
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch {
      /* proceed with token cleanup regardless */
    } finally {
      setStoredToken(null);
    }
  },
};
