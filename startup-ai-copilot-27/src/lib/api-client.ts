/**
 * Centralized API Client with JWT Auth Injection, Startup Context Header, and Error Handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem("copilot.auth_token");
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem("copilot.auth_token", token);
    } else {
      localStorage.removeItem("copilot.auth_token");
    }
  } catch {
    /* storage unavailable */
  }
}

export function getActiveStartupId(): string | null {
  try {
    return localStorage.getItem("copilot.activeStartup");
  } catch {
    return null;
  }
}

export function setActiveStartupId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem("copilot.activeStartup", id);
    } else {
      localStorage.removeItem("copilot.activeStartup");
    }
  } catch {
    /* storage unavailable */
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const activeStartupId = getActiveStartupId();
  if (activeStartupId && !headers["X-Startup-ID"]) {
    headers["X-Startup-ID"] = activeStartupId;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Clear expired auth session
      setStoredToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || data?.detail || `API request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : "Network error connecting to backend API", 0);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body), headers }),

  put: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body), headers }),

  patch: <T = any>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body), headers }),

  delete: <T = any>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),
};
