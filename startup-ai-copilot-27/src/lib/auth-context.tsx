import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, type UserProfile } from "@/services/auth-service";
import { getStoredToken, setStoredToken } from "@/lib/api-client";

type AuthContextValue = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithEmail: (email: string, fullName?: string, password?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const profile = await authService.getMe();
      setUser(profile);
    } catch (err: any) {
      console.warn("Failed to load authenticated user profile:", err);
      // Only wipe session tokens if explicitly unauthenticated (401 Unauthorized)
      if (err?.status === 401) {
        setStoredToken(null);
        setUser(null);
      } else {
        setError(err?.message || "Failed to reach server. Session retained.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const loginWithEmail = async (email: string, fullName?: string, password?: string): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.loginWithEmail(email, fullName, password);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<UserProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.loginWithGoogle(idToken);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || "Google authentication failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    loginWithEmail,
    loginWithGoogle,
    logout,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
