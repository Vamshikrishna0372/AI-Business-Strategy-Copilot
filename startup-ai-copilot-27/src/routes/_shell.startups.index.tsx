import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Plus, Rocket, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { Bar, PageHeader, SurfaceCard, EmptyState } from "@/components/common/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace-context";
import { startupService } from "@/services/startup-service";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/startups/")({
  head: () => ({
    meta: [
      { title: "My Startups — AI Business Strategy Copilot" },
      { name: "description", content: "Every startup workspace you're building, with scores, stage and investor readiness." },
      { property: "og:title", content: "My Startups — AI Business Strategy Copilot" },
      { property: "og:description", content: "Switch between startup workspaces and track their readiness." },
    ],
  }),
  component: StartupsPage,
});

function StartupsPage() {
  const { startups, activeId, setActiveId, isLoading, refetchStartups } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = startups.filter((s) =>
    `${s.name} ${s.industry} ${s.stage}`.toLowerCase().includes(query.toLowerCase()),
  );

  const handleOpenWorkspace = (id: string) => {
    setActiveId(id);
    toast.success("Workspace switched!");
    navigate({ to: "/dashboard" });
  };

  const handleDeleteStartup = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await startupService.deleteStartup(id);
      toast.success(`Deleted workspace "${name}".`);
      await refetchStartups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete startup.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="My Startups"
        subtitle="Each startup keeps its own strategy, financials, context and AI memory."
        actions={
          <Button variant="hero" asChild>
            <Link to="/startups/new">
              <Plus /> Create startup
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search startups..."
          className="h-10 pl-9"
          aria-label="Search startups"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Rocket className="size-7" />}
          title="No startups found"
          message="Try searching for a different keyword or create your first startup workspace."
          action={
            <Button variant="hero" asChild>
              <Link to="/startups/new">Create startup workspace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const isActive = s.id === activeId;
            return (
              <SurfaceCard key={s.id} className={isActive ? "border-primary/50 ring-1 ring-primary/20" : ""}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground">
                    {s.logo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-base font-semibold">{s.name}</h2>
                      {isActive && (
                        <Badge variant="default" className="text-[10px] py-0 px-1.5">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.industry} · {s.country}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{s.stage}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{s.tagline}</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Startup score</span>
                      <span className="tabular-nums">{s.score}/100</span>
                    </div>
                    <Bar value={s.score} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Investor readiness</span>
                      <span className="tabular-nums">{s.investorReadiness}/100</span>
                    </div>
                    <Bar value={s.investorReadiness} tone="success" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteStartup(s.id, s.name)}
                    disabled={deletingId === s.id}
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    title="Delete workspace"
                  >
                    {deletingId === s.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "outline"}
                    onClick={() => handleOpenWorkspace(s.id)}
                  >
                    {isActive ? "Active Workspace" : "Open Workspace"}
                  </Button>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {startups.length > 0 && (
        <SurfaceCard hover={false}>
          <h2 className="text-base font-semibold">Workspace Quick Navigation</h2>
          <p className="mt-1 text-sm text-muted-foreground">Access modules and strategy reports for your active workspace.</p>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="flex w-full flex-wrap justify-start">
              {["Overview", "Strategy", "Finance", "Roadmap", "Reports", "Settings"].map((t) => (
                <TabsTrigger key={t} value={t.toLowerCase().replace(" ", "-")}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
            {[
              { v: "overview", body: "Executive business health scores, milestone tracking, and next best action.", to: "/overview", cta: "Open overview" },
              { v: "strategy", body: "Business strategy blueprint covering positioning, GTM, and market opportunity.", to: "/strategy", cta: "Read strategy" },
              { v: "finance", body: "Revenue forecast, expense model, and break-even analysis.", to: "/finance", cta: "Open financials" },
              { v: "roadmap", body: "Strategic execution milestones with tracked progress.", to: "/roadmap", cta: "View roadmap" },
              { v: "reports", body: "Versioned strategy reports and investor presentation exports.", to: "/reports", cta: "Open reports" },
              { v: "settings", body: "Workspace name, collaborators, and AI preferences.", to: "/settings", cta: "Open settings" },
            ].map((t) => (
              <TabsContent key={t.v} value={t.v} className="mt-4 rounded-xl border bg-accent/30 p-5">
                <p className="text-sm">{t.body}</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link to={t.to}>{t.cta}</Link>
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </SurfaceCard>
      )}
    </>
  );
}
