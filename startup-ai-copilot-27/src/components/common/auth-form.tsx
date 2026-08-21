import { useState, useCallback, useEffect, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Lock, Mail, User as UserIcon, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@/services/auth-service";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.2c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.3-10.3 7.3-17.2z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.6v6.2C6.6 42.7 14.7 48 24 48z"/>
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6v-6.2H2.6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l8-6.2z"/>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.7 0 6.6 5.3 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/>
    </svg>
  );
}

export type AuthFormProps = {
  onSuccess?: (user?: UserProfile) => void;
  redirectUrl?: string;
  defaultTab?: "signin" | "signup";
  className?: string;
};

export function AuthForm({
  onSuccess,
  redirectUrl = "/dashboard",
  defaultTab = "signin",
  className = "",
}: AuthFormProps) {
  const { loginWithEmail, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectHandled = useRef(false);

  // ── Handle return from Google implicit redirect (fallback for URL hash tokens) ──
  useEffect(() => {
    if (redirectHandled.current) return;

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash || !hash.includes("access_token")) return;

    redirectHandled.current = true;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const error = params.get("error");

    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    if (error) {
      if (!error.includes("access_denied")) {
        setErrorMessage("Google sign-in was cancelled or failed. Please try again.");
      }
      return;
    }

    if (accessToken) {
      setGoogleLoading(true);
      loginWithGoogle(accessToken)
        .then(() => {
          toast.success("Welcome! Signed in with Google.");
          if (onSuccess) {
            onSuccess();
          } else {
            navigate({ to: redirectUrl });
          }
        })
        .catch((err: any) => {
          setErrorMessage(friendlyError(err));
          toast.error("Google sign-in failed. Please try again.");
        })
        .finally(() => {
          setGoogleLoading(false);
        });
    }
  }, [loginWithGoogle, navigate, onSuccess, redirectUrl]);

  const friendlyError = (err: any): string => {
    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("popup_closed") || msg.includes("cancelled") || msg.includes("popup closed"))
      return "Sign-in cancelled. Please try again.";
    if (msg.includes("network") || msg.includes("fetch"))
      return "Network error. Please check your connection and try again.";
    if (msg.includes("invalid") || msg.includes("expired"))
      return "Your session has expired. Please sign in again.";
    if (msg.includes("email") || msg.includes("password"))
      return "Invalid email or password. Please try again.";
    return err?.message || "Something went wrong. Please try again.";
  };

  // ── Email sign-in ──
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const loggedUser = await loginWithEmail(email.trim(), name.trim() || "Founder User", password);
      toast.success(loggedUser.role === "admin" ? "Welcome back, System Administrator!" : "Welcome back!");
      if (onSuccess) {
        onSuccess(loggedUser);
      } else {
        navigate({ to: loggedUser.role === "admin" ? "/admin" : redirectUrl });
      }
    } catch (err: any) {
      setErrorMessage(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Email sign-up ──
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email.trim(), name.trim() || "New Founder", password);
      toast.success("Account created successfully!");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate({ to: redirectUrl.startsWith("/auth") ? "/startups/new" : redirectUrl });
      }
    } catch (err: any) {
      setErrorMessage(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Google OAuth Login Popup Handler ──
  const handleGoogleLoginPopup = useGoogleLogin({
    onSuccess: useCallback(
      async (tokenResponse) => {
        setGoogleLoading(true);
        setErrorMessage(null);
        try {
          await loginWithGoogle(tokenResponse.access_token);
          toast.success("Welcome! Signed in with Google.");
          if (onSuccess) {
            onSuccess();
          } else {
            navigate({ to: redirectUrl });
          }
        } catch (err: any) {
          setErrorMessage(friendlyError(err));
          toast.error("Google sign-in failed. Please try again.");
        } finally {
          setGoogleLoading(false);
        }
      },
      [loginWithGoogle, navigate, onSuccess, redirectUrl]
    ),

    onError: (err) => {
      setGoogleLoading(false);
      const desc = (err as any)?.error_description || (err as any)?.error || "";
      if (desc.includes("popup_closed") || desc.includes("access_denied")) return;
      setErrorMessage("Google sign-in was cancelled or failed. Please try again.");
    },

    flow: "implicit",
    ux_mode: "popup",
  });

  const triggerGoogleLogin = () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      handleGoogleLoginPopup();
    } catch (e) {
      setGoogleLoading(false);
      setErrorMessage("Google Login is unavailable or blocked by browser.");
    }
  };

  const isAnyLoading = submitting || googleLoading || isLoading;

  return (
    <div className={`w-full max-w-md ${className}`}>
      {errorMessage && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--destructive)",
            fontWeight: 500,
          }}
        >
          {errorMessage}
        </div>
      )}

      {googleLoading && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px",
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Loader2 size={16} className="animate-spin shrink-0 text-primary" />
          Completing Google sign-in…
        </div>
      )}

      {/* Google button */}
      <button
        type="button"
        className="google-btn cursor-pointer"
        disabled={isAnyLoading}
        onClick={triggerGoogleLogin}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          height: 46,
          background: "#fff",
          border: "1.5px solid rgba(0,0,0,0.14)",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          color: "#374151",
          opacity: isAnyLoading ? 0.7 : 1,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          transition: "all 0.2s ease",
        }}
      >
        {googleLoading ? (
          <>
            <Loader2 size={18} className="animate-spin text-primary" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <GoogleIcon size={18} />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "22px 0",
          color: "var(--muted-foreground)",
          fontSize: 12,
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        or continue with email
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>

        {/* Sign In */}
        <TabsContent value="signin" style={{ marginTop: 22 }}>
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="founder@startup.com"
              icon={<Mail size={15} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={15} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                <Checkbox id="remember" defaultChecked /> Remember me
              </label>
              <span
                style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer" }}
                onClick={() => toast.info("Password reset link sent if account exists.")}
              >
                Forgot password?
              </span>
            </div>

            <Button
              variant="hero"
              className="w-full cursor-pointer"
              size="lg"
              type="submit"
              disabled={isAnyLoading}
              style={{ height: 46, fontSize: 14, fontWeight: 600 }}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="ml-1 size-4" />
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        {/* Create Account */}
        <TabsContent value="signup" style={{ marginTop: 22 }}>
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              id="name"
              label="Full name"
              placeholder="Your name"
              icon={<UserIcon size={15} />}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              id="email2"
              label="Email"
              type="email"
              placeholder="founder@startup.com"
              icon={<Mail size={15} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password2"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              icon={<Lock size={15} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              variant="hero"
              className="w-full cursor-pointer"
              size="lg"
              type="submit"
              disabled={isAnyLoading}
              style={{ height: 46, fontSize: 14, fontWeight: 600 }}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Create account <ArrowRight className="ml-1 size-4" />
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Trust footer */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { icon: Shield, text: "Enterprise Security" },
            { icon: Lock, text: "JWT Auth" },
            { icon: CheckCircle2, text: "Google Sign-In" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon size={12} color="var(--muted-foreground)" />
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  placeholder,
  icon,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label htmlFor={id} style={{ fontSize: 13, fontWeight: 500 }}>
        {label}
      </Label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
              display: "flex",
            }}
          >
            {icon}
          </span>
        )}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="auth-input"
          style={{ height: 44, paddingLeft: icon ? 38 : 14, fontSize: 14 }}
        />
      </div>
    </div>
  );
}
