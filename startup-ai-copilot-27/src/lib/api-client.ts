/**
 * Centralized API Client — uses VITE_API_BASE_URL environment variable.
 * Development:  http://localhost:8000
 * Production:   https://ai-business-strategy-copilot.onrender.com
 */

// The env var is injected at build time by Vite from .env / .env.production
const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://ai-business-strategy-copilot.onrender.com"
    : "http://localhost:8000");

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
    const fromLocal = localStorage.getItem("copilot.auth_token");
    if (fromLocal) return fromLocal;
  } catch {
    /* storage unavailable */
  }

  try {
    const fromSession = sessionStorage.getItem("copilot.auth_token");
    if (fromSession) return fromSession;
  } catch {
    /* storage unavailable */
  }

  try {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )copilot\.auth_token=([^;]*)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
  } catch {
    /* cookie unavailable */
  }

  return null;
}

export function setStoredToken(token: string | null): void {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = isHttps ? "; Secure" : "";

  if (token) {
    try { localStorage.setItem("copilot.auth_token", token); } catch {}
    try { sessionStorage.setItem("copilot.auth_token", token); } catch {}
    try {
      if (typeof document !== "undefined") {
        document.cookie = `copilot.auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
      }
    } catch {}
  } else {
    try { localStorage.removeItem("copilot.auth_token"); } catch {}
    try { sessionStorage.removeItem("copilot.auth_token"); } catch {}
    try {
      if (typeof document !== "undefined") {
        document.cookie = `copilot.auth_token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      }
    } catch {}
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

async function request<T = any>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const activeStartupId = getActiveStartupId();
  if (
    activeStartupId &&
    activeStartupId !== "null" &&
    activeStartupId !== "undefined" &&
    !headers["X-Startup-ID"]
  ) {
    headers["X-Startup-ID"] = activeStartupId;
  }

  const config: RequestInit = { ...options, headers };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      setStoredToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        data?.detail ||
        `API request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // Render cold-start: retry once on network failure (timeout/ECONNRESET)
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 3000));
      return request<T>(endpoint, options, retries - 1);
    }

    throw new ApiError(
      error instanceof Error
        ? error.message
        : "Network error — backend may be waking up. Please retry in a moment.",
      0
    );
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

  /** Exposes the resolved base URL for debugging / health checks */
  getBaseUrl: () => BASE_URL,
};
