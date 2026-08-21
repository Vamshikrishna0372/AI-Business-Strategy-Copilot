import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Loader2,
  PieChart,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin-service";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [{ title: "System Analytics — Admin Control Panel" }],
  }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAnalytics();
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch system analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-muted-foreground">Aggregating real database metrics...</p>
        </div>
      </div>
    );
  }

  const industryDist = data?.industry_distribution ?? [];
  const stageDist = data?.stage_distribution ?? [];
  const statusDist = data?.status_distribution ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Admin Control Panel · Real Database Aggregations"
        title="System Analytics & Industry Breakdown"
        subtitle="Live database aggregation across startup industries, founder stages, and diagnostic interview completion rates."
        actions={
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-1.5 font-semibold">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Aggregations
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <PieChart className="size-5 text-indigo-500" /> Industry Classification Distribution
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Real DB Counts</span>
          </div>

          <div className="space-y-3 pt-2">
            {industryDist.map((item: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">{item.industry || "General"}</span>
                  <span className="font-bold text-indigo-600">{item.count} Startups</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((item.count / Math.max(1, data?.totals?.startups || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {industryDist.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No industry data recorded yet</p>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <BarChart3 className="size-5 text-amber-500" /> Founder Startup Stage Breakdown
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Real DB Counts</span>
          </div>

          <div className="space-y-3 pt-2">
            {stageDist.map((item: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground uppercase">{item.stage || "Idea"}</span>
                  <span className="font-bold text-amber-600">{item.count} Workspaces</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-pink-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((item.count / Math.max(1, data?.totals?.startups || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {stageDist.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No stage data recorded yet</p>
            )}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <TrendingUp className="size-5 text-emerald-500" /> AI Interview Lifecycle Completion Rates
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Status Breakdown</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {statusDist.map((item: any, i: number) => (
            <div key={i} className="rounded-xl border bg-muted/20 p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{item.status}</p>
              <p className="text-2xl font-extrabold text-foreground">{item.count}</p>
              <p className="text-[11px] text-muted-foreground">Recorded interview sessions</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
