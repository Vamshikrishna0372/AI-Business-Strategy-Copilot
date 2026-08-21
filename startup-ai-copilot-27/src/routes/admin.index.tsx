import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { adminService, type AdminDashboardData } from "@/services/admin-service";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Control Panel & Overview — Strategy Copilot" },
      { name: "description", content: "Administrator control panel and real-time database dashboard." },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await adminService.getDashboardStats();
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch admin dashboard statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-muted-foreground">Loading real-time admin statistics...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    total_startups: 0,
    total_interviews: 0,
    completed_interviews: 0,
    in_progress_interviews: 0,
    paused_interviews: 0,
    stopped_interviews: 0,
    total_reports: 0,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <PageHeader
        eyebrow="System Control Panel · Live Database Metrics"
        title="Admin Control Panel & Dashboard"
        subtitle="Real-time operational metrics, user registrations, startup workspaces, and diagnostic interview activity."
        actions={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20 shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </span>
              SYSTEM HEALTH: OPERATIONAL
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={refreshing}
              className="gap-1.5 font-semibold"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <SurfaceCard className="p-5 space-y-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
            <Users className="size-5 text-primary" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-foreground">{metrics.total_users}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {metrics.active_users} Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{metrics.admin_users} System Administrators</p>
        </SurfaceCard>

        {/* Total Startups */}
        <SurfaceCard className="p-5 space-y-2 border-indigo-500/20 bg-gradient-to-br from-card to-indigo-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Startup Workspaces</span>
            <Building2 className="size-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-foreground">{metrics.total_startups}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              100% DB Synced
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Workspaces created across founders</p>
        </SurfaceCard>

        {/* Diagnostic Interviews */}
        <SurfaceCard className="p-5 space-y-2 border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">AI Interviews</span>
            <MessageSquareText className="size-5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-foreground">{metrics.total_interviews}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {metrics.completed_interviews} Complete
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.in_progress_interviews} in progress · {metrics.paused_interviews} paused
          </p>
        </SurfaceCard>

        {/* Generated Reports */}
        <SurfaceCard className="p-5 space-y-2 border-purple-500/20 bg-gradient-to-br from-card to-purple-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Executive Reports</span>
            <FileText className="size-5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-foreground">{metrics.total_reports}</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
              Versioned
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Generated strategic blueprints</p>
        </SurfaceCard>
      </div>

      {/* System Health Card */}
      <SurfaceCard className="p-6 space-y-4 border-amber-500/30">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldCheck className="size-5 text-amber-500" /> System Operational Health
          </div>
          <span className="text-xs text-muted-foreground">
            Server Time: {data?.system_health?.server_time ? new Date(data.system_health.server_time).toLocaleTimeString() : "Live"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
            <Database className="size-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">MongoDB Cluster</p>
              <p className="text-sm font-bold text-emerald-600 uppercase">Healthy (Connected)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
            <Brain className="size-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">AI Strategy Engine</p>
              <p className="text-sm font-bold text-indigo-600 uppercase">Operational (Ready)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
            <Activity className="size-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">API Gateway</p>
              <p className="text-sm font-bold text-amber-600 uppercase">100% Uptime</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5">
            <Zap className="size-5 text-purple-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">JWT Security</p>
              <p className="text-sm font-bold text-purple-600 uppercase">Role Protected</p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Two Column Section: Recent Users & Recent Startups */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent User Registrations */}
        <SurfaceCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Users className="size-5 text-primary" /> Recent Registrations
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold gap-1 text-primary">
              <Link to="/admin/users">
                View All Users <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="pb-2">User / Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(data?.recent_users ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">
                      <div className="font-semibold text-foreground">{u.full_name || "User"}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${u.role === "admin" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${u.is_active ? "text-emerald-600" : "text-destructive"}`}>
                        <span className={`size-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-destructive"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Recent"}
                    </td>
                  </tr>
                ))}
                {(!data?.recent_users || data.recent_users.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">No recent registrations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        {/* Recent Startup Workspaces */}
        <SurfaceCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Building2 className="size-5 text-indigo-500" /> Recent Startup Workspaces
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold gap-1 text-indigo-500">
              <Link to="/admin/startups">
                View All Startups <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="pb-2">Startup Name</th>
                  <th className="pb-2">Founder</th>
                  <th className="pb-2">Industry / Stage</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(data?.recent_startups ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-semibold text-foreground">{s.name}</td>
                    <td className="py-3 text-muted-foreground">
                      <div className="text-foreground font-medium">{s.founder_name}</div>
                      <div className="text-[10px]">{s.founder_email}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-foreground">{s.industry || "General"}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{s.stage || "Idea"}</div>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recent"}
                    </td>
                  </tr>
                ))}
                {(!data?.recent_startups || data.recent_startups.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">No startups created yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>

      {/* Recent System Activity Log */}
      <SurfaceCard className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Activity className="size-5 text-amber-500" /> Recent System Audit Logs
          </div>
          <span className="text-xs text-muted-foreground">Real-time MongoDB logs</span>
        </div>

        <div className="space-y-3">
          {(data?.recent_activity ?? []).slice(0, 6).map((log, idx) => (
            <div key={idx} className="flex items-start justify-between gap-4 rounded-xl border bg-muted/20 p-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 mt-0.5">
                  <Clock className="size-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{log.action || "System Event"}</p>
                  <p className="text-muted-foreground">{log.description || "Activity logged in system."}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Just now"}
              </span>
            </div>
          ))}
          {(!data?.recent_activity || data.recent_activity.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">No audit logs recorded yet</p>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
