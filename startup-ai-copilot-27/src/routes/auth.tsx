import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";

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

function AuthPage() {
  const { loginWithEmail, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, name || "Founder User", password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, name || "New Founder", password);
      toast.success("Account created successfully!");
      navigate({ to: "/startups/new" });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoGoogleLogin = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail("demo.founder@aistrategycopilot.com", "Demo Founder", "demopassword");
      toast.success("Signed in as Demo Founder!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex" style={{ backgroundImage: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="" width={36} height={36} className="size-9" />
          <span className="font-display text-lg font-semibold">Copilot</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Welcome back. Your startup AI strategy workspace is ready.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-90">
            Real-time business strategy, competitor intelligence, and investor readiness scoring.
          </p>
        </div>
        <p className="text-xs opacity-75">Trusted by founders building fundable companies.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src={logo} alt="" width={32} height={32} className="size-8" />
            <span className="font-display font-semibold">Copilot</span>
          </div>
          <h1 className="text-2xl font-semibold">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue building your investor-ready startup.</p>

          {errorMessage && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          <Button
            variant="outline"
            className="mt-6 w-full"
            size="lg"
            onClick={handleDemoGoogleLogin}
            disabled={submitting || isLoading}
          >
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <span className="mr-2 font-semibold">G</span>}
            Continue with Google / Quick Demo
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="founder@startup.com"
                  icon={<Mail className="size-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="size-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox id="remember" defaultChecked /> Remember me
                  </label>
                  <span className="cursor-pointer text-sm text-primary hover:underline">Forgot password?</span>
                </div>
                <Button variant="hero" className="w-full" size="lg" type="submit" disabled={submitting || isLoading}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-1 size-4" /></>}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field
                  id="name"
                  label="Full name"
                  placeholder="Aarav Rao"
                  icon={<UserIcon className="size-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Field
                  id="email2"
                  label="Email"
                  type="email"
                  placeholder="founder@startup.com"
                  icon={<Mail className="size-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Field
                  id="password2"
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  icon={<Lock className="size-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button variant="hero" className="w-full" size="lg" type="submit" disabled={submitting || isLoading}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Create account <ArrowRight className="ml-1 size-4" /></>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Authenticated via backend JWT tokens & MongoDB persistence.
          </p>
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
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span> : null}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={icon ? "h-11 pl-9" : "h-11"}
        />
      </div>
    </div>
  );
}
