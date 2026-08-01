import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Download, FileText, Loader2, MessageSquareText, Plus, RefreshCw, Sparkles } from "lucide-react";

import { AiBadge, MetricCard, PageHeader, ScoreRing, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-context";
import { eventBus, EVENTS } from "@/lib/events";
import { dashboardService, type DashboardOverview, type StartupScores } from "@/services/dashboard-service";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Founder Dashboard — AI Business Strategy Copilot" },
      { name: "description", content: "Track startup score, investor readiness, business health, risk and growth in one founder dashboard." },
      { property: "og:title", content: "Founder Dashboard — AI Business Strategy Copilot" },
      { property: "og:description", content: "Your startup status, AI recommendations and progress at a glance." },
    ],
  }),
  component: Dashboard,
});

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "var(--color-popover-foreground)",
};

const RISK_DISTRIBUTION = [
  { name: "Market", value: 28, fill: "var(--color-chart-1)" },
  { name: "Financial", value: 22, fill: "var(--color-chart-2)" },
  { name: "Operational", value: 18, fill: "var(--color-chart-3)" },
  { name: "Technical", value: 17, fill: "var(--color-chart-4)" },
  { name: "Regulatory", value: 15, fill: "var(--color-chart-5)" },
];

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
      <Sparkles className="size-6 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { activeStartup, startups, activeId, isLoading: workspaceLoading } = useWorkspace();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [scores, setScores] = useState<StartupScores | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!activeStartup?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getOverview();
      setOverview(data);

      const scoreData = await dashboardService.getScores(activeStartup.id);
      setScores(scoreData);

      const timelineData = await dashboardService.getTimeline(activeStartup.id);
      setTimeline(timelineData);
    } catch (err: any) {
      console.warn("Error loading dashboard metrics:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceLoading) {
      fetchDashboardData();
    }

    const unsubReport = eventBus.on(EVENTS.AI_REPORT_GENERATED, () => fetchDashboardData());
    const unsubInterview = eventBus.on(EVENTS.INTERVIEW_UPDATED, () => fetchDashboardData());
    const unsubStartup = eventBus.on(EVENTS.STARTUP_CHANGED, () => fetchDashboardData());

    return () => {
      unsubReport();
      unsubInterview();
      unsubStartup();
    };
  }, [activeId, workspaceLoading]);

  const overallScore = scores?.overall_startup_score?.value ?? activeStartup?.score ?? 0;
  const investorReadiness = scores?.investor_readiness?.value ?? activeStartup?.investorReadiness ?? 0;
  const businessHealth = scores?.business_health?.value ?? 0;
  const riskScore = scores?.risk_rating?.value ?? 0;
  const innovationScore = scores?.innovation_score?.value ?? 0;

  const founderName = user?.full_name?.split(" ")[0] || "Founder";

  // Empty state: no startups at all
  if (!workspaceLoading && !activeStartup) {
    return (
      <>
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome, ${founderName}`}
          subtitle="Create your first startup workspace to get started."
          actions={
            <Button variant="hero" asChild>
              <Link to="/startups/new">
                <Plus /> Create your first startup
              </Link>
            </Button>
          }
        />
        <SurfaceCard hover={false} className="py-20 text-center">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/10">
              <Sparkles className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">No startups yet</h2>
            <p className="text-sm text-muted-foreground">
              Create your first startup workspace and the AI copilot will generate strategy, scores, validation and reports for you.
            </p>
            <Button variant="hero" asChild>
              <Link to="/startups/new">
                <Plus /> Create startup workspace
              </Link>
            </Button>
          </div>
        </SurfaceCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${activeStartup?.name || "Startup Workspace"} · ${activeStartup?.stage || "Pre-Seed"}`}
        title={`Welcome back, ${founderName}`}
        subtitle={`Live intelligence overview for ${activeStartup?.name || "your startup"}. Everything refreshes based on your active workspace context.`}
        actions={
          <>
            <Button variant="outline" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="hero" asChild>
              <Link to="/startups/new">
                <Plus /> Create startup
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-accent/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Overall Startup Score" value={overallScore} unit="/100" trend={overallScore > 0 ? +6 : 0} hint={overallScore > 0 ? "Strong problem-solution fit" : "Complete Business Interview to generate"} tone="primary" />
          <MetricCard label="Investor Readiness" value={investorReadiness} unit="/100" trend={investorReadiness > 0 ? +12 : 0} hint={investorReadiness > 0 ? "Ready for Seed funding" : "Complete journey modules to raise score"} tone="success" />
          <MetricCard label="Business Health" value={businessHealth} unit="/100" trend={businessHealth > 0 ? +3 : 0} hint={businessHealth > 0 ? "Margins improving" : "Complete AI Interview to generate"} tone="primary" />
          <MetricCard label="Innovation Score" value={innovationScore} unit="/100" trend={innovationScore > 0 ? +9 : 0} hint={innovationScore > 0 ? "Strong competitive moat" : "Complete AI Interview to generate"} tone="primary" />
          <MetricCard label="Risk Rating" value={riskScore} unit="/100" trend={riskScore > 0 ? -7 : 0} hint={riskScore > 0 ? "Lower is better" : "Complete Risk Intelligence module"} tone="warning" />
        </div>
      )}

      <SurfaceCard className="gradient-brand text-primary-foreground" hover={false}>
        <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">AI recommendation</p>
            <p className="mt-1 text-lg font-semibold">
              {overview?.ai_recommendations?.[0]?.title || `Start the AI Business Interview for ${activeStartup?.name}`}
            </p>
            <p className="mt-1 text-sm opacity-90">
              {overview?.ai_recommendations?.[0]?.description ||
                `Complete the AI Business Interview to unlock your full strategy, scores and investor readiness for ${activeStartup?.name}.`}
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link to="/interview">
              Start Interview <ArrowRight />
            </Link>
          </Button>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Startup progress</h2>
            <AiBadge>Live API</AiBadge>
          </div>
          <div className="mt-4 h-64">
            {overallScore === 0 ? (
              <EmptyChart message="Complete the AI Business Interview to see your progress chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ month: "Now", score: overallScore, funding: investorReadiness }]}>
                  <defs>
                    <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFund" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} {...axis} />
                  <YAxis tickLine={false} axisLine={false} {...axis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="score" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#gScore)" name="Startup score" />
                  <Area type="monotone" dataKey="funding" stroke="var(--color-chart-2)" strokeWidth={2.5} fill="url(#gFund)" name="Funding readiness" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-base font-semibold">Business health</h2>
          <div className="mt-4 flex flex-col items-center gap-4">
            <ScoreRing value={businessHealth} size={150} label="Health index" />
            <div className="w-full space-y-2 text-sm">
              {[
                ["Product", Math.round(overallScore * 0.98)],
                ["Commercial", Math.round(businessHealth)],
                ["Team", Math.round(innovationScore)],
                ["Capital", Math.round(investorReadiness * 0.9)],
              ].map(([l, v]) => (
                <div key={l as string} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-muted-foreground">{l}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${v as number}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">{v as number}</span>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <h2 className="text-base font-semibold">Funding readiness</h2>
          <div className="mt-4 h-52">
            {investorReadiness === 0 ? (
              <EmptyChart message="Complete Business Journey modules to see your funding readiness trend." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{ month: "Now", funding: investorReadiness }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} {...axis} />
                  <YAxis tickLine={false} axisLine={false} {...axis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="funding" stroke="var(--color-chart-2)" strokeWidth={3} dot={{ r: 3 }} name="Readiness" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-base font-semibold">Risk distribution</h2>
          <div className="mt-4 h-52">
            {riskScore === 0 ? (
              <EmptyChart message="Complete Risk Intelligence to see your risk profile." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RISK_DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {RISK_DISTRIBUTION.map((r) => (
                      <Cell key={r.name} fill={r.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {riskScore > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {RISK_DISTRIBUTION.map((r) => (
                <span key={r.name} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: r.fill }} /> {r.name}
                </span>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-base font-semibold">Revenue projection ($K)</h2>
          <div className="mt-4 h-52">
            <EmptyChart message="Complete Financial Planning to generate your revenue projection." />
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <h2 className="text-base font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            {[
              { label: "Create startup", to: "/startups/new", icon: Plus },
              { label: "View overview", to: "/overview", icon: ArrowRight },
              { label: "Download reports", to: "/reports", icon: FileText },
              { label: "Chat with AI copilot", to: "/interview", icon: MessageSquareText },
            ].map((a) => (
              <Button key={a.label} variant="outline" className="justify-start" asChild>
                <Link to={a.to}>
                  <a.icon /> {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">My startups</h2>
            <Link to="/startups" className="text-xs text-primary hover:underline">
              View all ({startups.length})
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {startups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No startups yet. <Link to="/startups/new" className="text-primary hover:underline">Create one</Link>.</p>
            ) : (
              startups.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  to="/startups"
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    s.id === activeStartup?.id ? "border-primary/50 bg-primary/5" : "hover:bg-accent/60"
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-xs font-semibold text-accent-foreground">
                    {s.logo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.industry}</span>
                  </span>
                  <Badge variant={s.id === activeStartup?.id ? "default" : "secondary"} className="shrink-0">
                    {s.score || "—"}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-base font-semibold">Recent activity timeline</h2>
          {timeline.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">No activities recorded yet for this workspace.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {timeline.slice(0, 5).map((a, idx) => (
                <li key={a.id || idx} className="relative pl-5 text-sm">
                  <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                  <p className="font-medium text-xs">{a.description || a.action}</p>
                  <p className="text-[10px] text-muted-foreground">{a.timestamp ? new Date(a.timestamp).toLocaleString() : "Recently"}</p>
                </li>
              ))}
            </ol>
          )}
        </SurfaceCard>
      </div>
    </>
  );
}
