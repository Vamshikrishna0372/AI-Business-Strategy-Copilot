import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MessageSquareText,
  Pause,
  RefreshCw,
  Rocket,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { adminService, type AdminInterviewItem } from "@/services/admin-service";

export const Route = createFileRoute("/admin/interviews")({
  head: () => ({
    meta: [{ title: "AI Interviews — Admin Control Panel" }],
  }),
  component: AdminInterviewsPage,
});

function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<AdminInterviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalInterviews, setTotalInterviews] = useState<number>(0);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await adminService.getInterviews({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setInterviews(res.interviews);
      setTotalPages(res.pagination.total_pages);
      setTotalInterviews(res.pagination.total);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [page, statusFilter]);

  const renderStatusBadge = (statusStr: string) => {
    switch (statusStr.toLowerCase()) {
      case "completed":
      case "knowledge_generated":
      case "all_modules_updated":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="size-3" /> COMPLETED
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 border border-amber-500/30">
            <Pause className="size-3" /> PAUSED
          </span>
        );
      case "stopped":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-orange-600 border border-orange-500/30">
            <Square className="size-3" /> STOPPED
          </span>
        );
      case "in_progress":
      case "started":
      case "resumed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-500/30 animate-pulse">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            IN PROGRESS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary border border-primary/20">
            <Rocket className="size-3" /> READY / NOT STARTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Admin Control Panel · Core Diagnostic Audit"
        title="AI Business Interview Management"
        subtitle="Monitor and audit diagnostic interview sessions across all founder workspaces in real-time."
        actions={
          <Button variant="outline" size="sm" onClick={fetchInterviews} disabled={loading} className="gap-1.5 font-semibold">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Sessions
          </Button>
        }
      />

      <SurfaceCard className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Filter Lifecycle State:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All States</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
            <option value="completed">Completed</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>

        <span className="text-xs font-semibold text-muted-foreground">
          Showing {interviews.length} sessions
        </span>
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Startup Workspace</th>
                <th className="p-4">Founder / User</th>
                <th className="p-4">Lifecycle State</th>
                <th className="p-4">Questions Answered</th>
                <th className="p-4">Progress %</th>
                <th className="p-4">Started / Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="size-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Loading interview sessions...</p>
                  </td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching interview sessions found.
                  </td>
                </tr>
              ) : (
                interviews.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <MessageSquareText className="size-4 text-amber-500 shrink-0" />
                        {item.startup_name}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{item.founder_name}</div>
                      <div className="text-[11px] text-muted-foreground">{item.founder_email}</div>
                    </td>
                    <td className="p-4">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {item.qa_count} of 10 Answers Saved
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      {item.progress_percentage ?? 0}%
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "Recent"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
          <span>Showing total {totalInterviews} interview records</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="size-8 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-semibold text-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="size-8 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
