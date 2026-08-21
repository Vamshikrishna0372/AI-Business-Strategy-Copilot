import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { adminService, type AdminStartupItem } from "@/services/admin-service";

export const Route = createFileRoute("/admin/startups")({
  head: () => ({
    meta: [{ title: "Startup Workspaces — Admin Control Panel" }],
  }),
  component: AdminStartupsPage,
});

function AdminStartupsPage() {
  const [startups, setStartups] = useState<AdminStartupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStartups, setTotalStartups] = useState<number>(0);

  const [deleteConfirmStartup, setDeleteConfirmStartup] = useState<AdminStartupItem | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchStartups = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStartups({
        query: search || undefined,
        stage: stageFilter || undefined,
        page,
        limit: 10,
      });
      setStartups(res.startups);
      setTotalPages(res.pagination.total_pages);
      setTotalStartups(res.pagination.total);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch startups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartups();
  }, [page, stageFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStartups();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmStartup) return;
    try {
      setActionLoading(true);
      await adminService.deleteStartup(deleteConfirmStartup.id);
      toast.success(`Startup workspace '${deleteConfirmStartup.name}' deleted.`);
      setDeleteConfirmStartup(null);
      await fetchStartups();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete startup workspace");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Admin Control Panel · Workspace Directory"
        title="Startup Workspaces Management"
        subtitle="View and manage all registered founder startup workspaces, industry classification, and interview progress."
        actions={
          <Button variant="outline" size="sm" onClick={fetchStartups} disabled={loading} className="gap-1.5 font-semibold">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Workspaces
          </Button>
        }
      />

      <SurfaceCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by startup name or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
                className="rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">All Stages</option>
                <option value="idea">Idea Stage</option>
                <option value="seed">Seed Stage</option>
                <option value="series_a">Series A</option>
                <option value="growth">Growth</option>
              </select>
            </div>

            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Apply Filter
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Startup Workspace</th>
                <th className="p-4">Founder / User</th>
                <th className="p-4">Industry / Stage</th>
                <th className="p-4">Interview Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="size-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Loading startup workspaces...</p>
                  </td>
                </tr>
              ) : startups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching startup workspaces found.
                  </td>
                </tr>
              ) : (
                startups.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 font-extrabold text-sm border border-indigo-500/20">
                          <Building2 className="size-4" />
                        </div>
                        <div className="font-bold text-foreground">{s.name}</div>
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      <div className="font-semibold text-foreground">{s.founder_name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.founder_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{s.industry || "General"}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{s.stage || "Idea"}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            ["completed", "knowledge_generated", "all_modules_updated"].includes(s.interview_status)
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                              : ["in_progress", "started", "resumed"].includes(s.interview_status)
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse"
                              : "bg-muted text-muted-foreground border"
                          }`}
                        >
                          {s.interview_status || "not_started"}
                        </span>
                        <span className="text-[11px] font-bold text-foreground">
                          {s.interview_progress}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={actionLoading}
                        onClick={() => setDeleteConfirmStartup(s)}
                        title="Delete Startup Workspace"
                        className="size-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
          <span>Showing total {totalStartups} startup workspaces</span>
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

      {deleteConfirmStartup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <SurfaceCard className="max-w-md w-full p-6 space-y-4 shadow-2xl border-destructive/30">
            <div className="flex items-center gap-3 text-destructive font-bold text-lg">
              <AlertTriangle className="size-6 shrink-0" /> Confirm Startup Deletion
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete startup workspace <strong className="text-foreground">{deleteConfirmStartup.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirmStartup(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Confirm Delete
              </Button>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
