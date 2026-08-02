import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { ArrowRight, Loader2, Lock, Mail, User as UserIcon, Shield, Zap, TrendingUp, Target, BarChart3, Rocket, CheckCircle2, Brain, ChevronRight } from "lucide-react";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AI Business Strategy Copilot" },
      { name: "description", content: "Sign in or create your founder account to access your AI business strategy workspace." },
      { property: "og:title", content: "Sign in — AI Business Strategy Copilot" },
      { property: "og:description", content: "Access your AI business strategy workspace." },
    ],
  }),
  component: AuthPage,
});

// ─── Feature list ──────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain,      label: "AI Business Interview",   desc: "Dynamic diagnostic consultant" },
  { icon: TrendingUp, label: "Live Market Intelligence", desc: "Real-time competitive insights" },
  { icon: Target,     label: "Competitor Analysis",      desc: "SWOT & positioning matrix" },
  { icon: BarChart3,  label: "Financial Planning",       desc: "Revenue models & runway" },
  { icon: Zap,        label: "Investor Readiness",        desc: "Pitch deck & scoring" },
  { icon: Rocket,     label: "Execution Roadmap",         desc: "Milestones & KPI tracking" },
];

// ─── Trust badges ──────────────────────────────────────────────────────────────
const TRUST = [
  { icon: Shield,       label: "Enterprise Security" },
  { icon: Lock,         label: "JWT Authentication" },
  { icon: CheckCircle2, label: "Encrypted Data" },
];

// ─── Google "G" SVG logo ───────────────────────────────────────────────────────
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.2c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.3-10.3 7.3-17.2z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.6v6.2C6.6 42.7 14.7 48 24 48z"/>
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6v-6.2H2.6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l8-6.2z"/>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.7 0 6.6 5.3 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/>
    </svg>
  );
}

// ─── Animated left panel ───────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="relative hidden flex-col overflow-hidden lg:flex"
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #1a1248 40%, #0d1b4b 70%, #0a0e2e 100%)",
      }}
    >
      {/* Ambient glow orbs */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          top: "-120px", left: "-100px",
          animation: "orb1 12s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)",
          bottom: "0px", right: "-80px",
          animation: "orb2 15s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: "45%", left: "40%",
          animation: "orb1 10s ease-in-out infinite alternate-reverse",
        }} />
      </div>

      {/* Neural network SVG mesh */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="ng" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Grid lines */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <line key={`v${i}`} x1={`${i*14.3}%`} y1="0" x2={`${i*14.3}%`} y2="100%" stroke="#818cf8" strokeWidth="0.5" />
        ))}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <line key={`h${i}`} x1="0" y1={`${i*12.5}%`} x2="100%" y2={`${i*12.5}%`} stroke="#818cf8" strokeWidth="0.5" />
        ))}
        {/* Neural connection lines */}
        <line x1="10%" y1="15%" x2="35%" y2="42%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <line x1="35%" y1="42%" x2="65%" y2="25%" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <line x1="65%" y1="25%" x2="88%" y2="55%" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.7" />
        <line x1="20%" y1="70%" x2="50%" y2="58%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.6" />
        <line x1="50%" y1="58%" x2="75%" y2="72%" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.6" />
        <line x1="15%" y1="88%" x2="45%" y2="80%" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
        <line x1="45%" y1="80%" x2="80%" y2="90%" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
        {/* Nodes */}
        {[
          [10,15],[35,42],[65,25],[88,55],
          [20,70],[50,58],[75,72],[15,88],[45,80],[80,90],
          [5,35],[55,10],[90,35],[60,85],
        ].map(([x,y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i < 4 ? 4 : 3} fill="#818cf8" opacity={i < 4 ? 0.9 : 0.6} />
        ))}
      </svg>

      {/* Floating particles */}
      {[...Array(18)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: "50%",
            background: i % 2 === 0 ? "rgba(129,140,248,0.7)" : "rgba(139,92,246,0.5)",
            left: `${5 + (i * 87 / 17) % 90}%`,
            top: `${10 + (i * 73 / 17) % 80}%`,
            animation: `float ${4 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.4) % 3}s`,
          }}
        />
      ))}

      {/* Floating metric card */}
      <div style={{
        position: "absolute", top: "28%", right: "8%",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "14px 18px",
        animation: "float 7s ease-in-out infinite",
        animationDelay: "1s",
        minWidth: 160,
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Strategy Score</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>94<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/100</span></div>
        <div style={{ fontSize: 11, color: "#86efac", marginTop: 4 }}>▲ Investor-Ready</div>
      </div>

      <div style={{
        position: "absolute", bottom: "32%", left: "8%",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "12px 16px",
        animation: "float 9s ease-in-out infinite",
        animationDelay: "2.5s",
        minWidth: 150,
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Market Opportunity</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>$4.2B</div>
        <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>↗ TAM validated</div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Copilot" width={40} height={40} className="size-10 drop-shadow-lg" />
          <div>
            <div style={{ color: "#fff", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>AI Business Strategy</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>Copilot</div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ maxWidth: 440 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: 100, padding: "4px 12px", marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>Enterprise AI Platform</span>
          </div>

          <h2 style={{
            fontSize: "clamp(26px, 3vw, 38px)", fontFamily: "Sora, sans-serif",
            fontWeight: 700, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.03em",
            marginBottom: 16,
          }}>
            Turn your startup idea into an{" "}
            <span style={{
              background: "linear-gradient(90deg, #818cf8, #c084fc, #60a5fa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              investor-ready business
            </span>
          </h2>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, marginBottom: 32 }}>
            AI-powered strategy, market intelligence, financial planning, and execution guidance — all in one platform.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(99,102,241,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={15} color="#818cf8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{desc}</div>
                </div>
                <CheckCircle2 size={14} color="rgba(134,239,172,0.8)" />
              </div>
            ))}
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon size={13} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.02em" }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={13} color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Real-Time AI Intelligence</span>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px, 30px) scale(1.1); } }
        @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px, -40px) scale(1.08); } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
      `}</style>
    </div>
  );
}

// ─── Auth page ─────────────────────────────────────────────────────────────────
function AuthPage() {
  const { loginWithEmail, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [name, setName]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Friendly error translator ──
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
    if (!email) { setErrorMessage("Please enter your email address."); return; }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, name || "Founder User", password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setErrorMessage(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Email sign-up ──
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErrorMessage("Please enter your email address."); return; }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, name || "New Founder", password);
      toast.success("Account created successfully! Let's set up your workspace.");
      navigate({ to: "/startups/new" });
    } catch (err: any) {
      setErrorMessage(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Real Google OAuth via popup ──
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: useCallback(async (tokenResponse) => {
      setGoogleLoading(true);
      setErrorMessage(null);
      try {
        // Exchange the access token for user info, then send to backend
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!userInfoRes.ok) throw new Error("Failed to get user information from Google.");
        const userInfo = await userInfoRes.json();

        // We send the sub (Google UID) as id_token substitute via a special login call
        // The backend already supports email-based login, so we use a hybrid approach:
        // POST to /api/v1/auth/google with the id_token field set to access_token
        // The backend verifies via Google's tokeninfo endpoint
        await loginWithGoogle(tokenResponse.access_token);
        toast.success("Welcome! Signed in with Google.");
        navigate({ to: "/dashboard" });
      } catch (err: any) {
        setErrorMessage(friendlyError(err));
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    }, [loginWithGoogle, navigate]),

    onError: (err) => {
      setGoogleLoading(false);
      // popup_closed_by_user is not an error — silently ignore
      const desc = (err as any)?.error_description || (err as any)?.error || "";
      if (desc.includes("popup_closed") || desc.includes("access_denied")) {
        return; // user cancelled — no toast, no error message
      }
      setErrorMessage("Google sign-in was cancelled or failed. Please try again.");
    },

    flow: "implicit",
  });

  const isAnyLoading = submitting || googleLoading || isLoading;

  return (
    <div style={{ display: "grid", minHeight: "100vh", gridTemplateColumns: "1fr" }}>
      <style>{`
        @media (min-width: 1024px) {
          .auth-grid { grid-template-columns: 1fr 1fr !important; }
        }
        .google-btn:hover:not(:disabled) {
          background: #f8f9ff !important;
          border-color: rgba(99,102,241,0.5) !important;
          box-shadow: 0 4px 16px rgba(99,102,241,0.12) !important;
          transform: translateY(-1px) !important;
        }
        .google-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .google-btn { transition: all 0.2s ease !important; }
        .auth-input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
      `}</style>

      <div className="auth-grid" style={{ display: "grid", minHeight: "100vh" }}>
        <LeftPanel />

        {/* Right panel */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", background: "var(--background)",
          minHeight: "100vh",
        }}>
          <div style={{ width: "100%", maxWidth: 400 }} className="animate-rise">

            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 lg:hidden" style={{ marginBottom: 28 }}>
              <img src={logo} alt="" width={32} height={32} className="size-8" />
              <span className="font-display font-semibold">AI Business Strategy Copilot</span>
            </div>

            {/* Heading */}
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4, fontFamily: "Sora, sans-serif" }}>
              Sign in to your workspace
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginBottom: 28 }}>
              Continue building your investor-ready startup.
            </p>

            {/* Error message */}
            {errorMessage && (
              <div style={{
                marginBottom: 20, padding: "12px 14px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, fontSize: 13, color: "var(--destructive)", fontWeight: 500,
              }}>
                {errorMessage}
              </div>
            )}

            {/* Google button */}
            <button
              className="google-btn"
              disabled={isAnyLoading}
              onClick={() => {
                setErrorMessage(null);
                handleGoogleLogin();
              }}
              style={{
                display: "flex", width: "100%", alignItems: "center", justifyContent: "center",
                gap: 10, height: 46,
                background: "#fff",
                border: "1.5px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                color: "#374151",
                cursor: isAnyLoading ? "not-allowed" : "pointer",
                opacity: isAnyLoading ? 0.7 : 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {googleLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0", color: "var(--muted-foreground)", fontSize: 12 }}>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              or continue with email
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="signin" style={{ marginTop: 22 }}>
                <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field id="email" label="Email" type="email" placeholder="founder@startup.com"
                    icon={<Mail size={15} />} value={email} onChange={e => setEmail(e.target.value)} />
                  <Field id="password" label="Password" type="password" placeholder="••••••••"
                    icon={<Lock size={15} />} value={password} onChange={e => setPassword(e.target.value)} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted-foreground)", cursor: "pointer" }}>
                      <Checkbox id="remember" defaultChecked /> Remember me
                    </label>
                    <span style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer" }}
                      onClick={() => toast.info("Password reset coming soon. Contact support.")}>
                      Forgot password?
                    </span>
                  </div>

                  <Button variant="hero" className="w-full" size="lg" type="submit" disabled={isAnyLoading}
                    style={{ height: 46, fontSize: 14, fontWeight: 600 }}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-1 size-4" /></>}
                  </Button>
                </form>
              </TabsContent>

              {/* Create Account */}
              <TabsContent value="signup" style={{ marginTop: 22 }}>
                <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field id="name" label="Full name" placeholder="Your name"
                    icon={<UserIcon size={15} />} value={name} onChange={e => setName(e.target.value)} />
                  <Field id="email2" label="Email" type="email" placeholder="founder@startup.com"
                    icon={<Mail size={15} />} value={email} onChange={e => setEmail(e.target.value)} />
                  <Field id="password2" label="Password" type="password" placeholder="At least 8 characters"
                    icon={<Lock size={15} />} value={password} onChange={e => setPassword(e.target.value)} />

                  <Button variant="hero" className="w-full" size="lg" type="submit" disabled={isAnyLoading}
                    style={{ height: 46, fontSize: 14, fontWeight: 600 }}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Create account <ArrowRight className="ml-1 size-4" /></>}
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
        </div>
      </div>
    </div>
  );
}

// ─── Form field ─────────────────────────────────────────────────────────────────
function Field({
  id, label, type = "text", placeholder, icon, value, onChange,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  icon?: React.ReactNode; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label htmlFor={id} style={{ fontSize: 13, fontWeight: 500 }}>{label}</Label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--muted-foreground)", pointerEvents: "none", display: "flex",
          }}>
            {icon}
          </span>
        )}
        <Input
          id={id} type={type} placeholder={placeholder}
          value={value} onChange={onChange}
          className="auth-input"
          style={{ height: 44, paddingLeft: icon ? 38 : 14, fontSize: 14 }}
        />
      </div>
    </div>
  );
}
