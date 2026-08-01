import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Bar, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleCard, NextBestAction, SectionHeading, StatusBadge } from "@/components/workspace/workspace-ui";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { aiModulesService, type ModuleStatuses } from "@/services/ai-modules-service";
import type { ModuleState } from "@/data/workspace";

export const Route = createFileRoute("/_shell/journey")({
  head: () => ({
    meta: [
      { title: "Business Journey — AI Business Strategy Copilot" },
      { name: "description", content: "One guided workflow from AI Business Interview to Execution Roadmap, with status and completion per module." },
      { property: "og:title", content: "Business Journey — AI Business Strategy Copilot" },
      { property: "og:description", content: "Your guided path from idea to investor readiness." },
    ],
  }),
  component: JourneyPage,
});

// Maps backend module keys to workspace module keys
const MODULE_KEY_MAP: Record<keyof ModuleStatuses, string> = {
  interview: "interview",
  idea_validation: "validation",
  business_strategy: "strategy",
  competitor_analysis: "competitors",
  business_model_canvas: "canvas",
  financial_planning: "finance",
  risk_analysis: "risk",
  investor_readiness: "investor",
  execution_roadmap: "roadmap",
};

// Maps backend status strings to the UI status strings expected by StatusBadge / ModuleStatus
const STATUS_MAP: Record<string, "Completed" | "In progress" | "Not started" | "Needs review"> = {
  "Completed": "Completed",
  "In Progress": "In progress",
  "Not Started": "Not started",
  "Needs Review": "Needs review",
};

function JourneyPage() {
  const { activeStartup, workspace, activeId } = useWorkspace();

  const [liveStatuses, setLiveStatuses] = useState<ModuleStatuses | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const statuses = await aiModulesService.getModuleStatuses(activeId);
      setLiveStatuses(statuses);
    } catch {
      // Fall back to workspace module statuses
      setLiveStatuses(null);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // Merge live statuses into workspace modules
  const modules: ModuleState[] = workspace.modules.map((m) => {
    if (!liveStatuses) return m;
    // Find the backend key for this module
    const backendKey = Object.keys(MODULE_KEY_MAP).find(
      (k) => MODULE_KEY_MAP[k as keyof ModuleStatuses] === m.key
    ) as keyof ModuleStatuses | undefined;

    if (!backendKey || !liveStatuses[backendKey]) return m;

    const backendStatus = liveStatuses[backendKey];
    const uiStatus = STATUS_MAP[backendStatus] ?? m.status;
    const completion =
      uiStatus === "Completed" ? 100 :
      uiStatus === "In Progress" ? 50 :
      uiStatus === "Needs Review" ? 90 :
      0;

    return { ...m, status: uiStatus, completion };
  });

  const completed = modules.filter((m) => m.status === "Completed").length;
  const totalCompletion = Math.round(
    (modules.reduce((a, m) => a + m.completion, 0) / (modules.length * 100)) * 100
  );

  // Find next incomplete module
  const nextModule = modules.find((m) => m.status !== "Completed") ?? modules[modules.length - 1]!;
  const nextAction = {
    ...workspace.nextAction,
    route: nextModule.route,
    title: `Continue with ${nextModule.title}`,
  };

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Business Journey"
        subtitle="Nine connected modules. Work through them in order, or reopen any completed module at any time."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStatuses}
              disabled={loading}
              aria-label="Refresh module statuses"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              {loading ? "Checking…" : "Refresh"}
            </Button>
            <Button variant="hero" asChild>
              <Link to={nextModule.route}>
                Continue <ArrowRight />
              </Link>
            </Button>
          </div>
        }
      />

      <SurfaceCard hover={false}>
        <SectionHeading
          title="Journey progress"
          hint={`${completed} of ${modules.length} modules complete · ${totalCompletion}% overall${loading ? " · Refreshing…" : ""}`}
        />
        <div className="mt-3">
          <Bar value={totalCompletion} tone="success" />
        </div>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m, i) => (
            <li key={m.key} className="flex items-center gap-2 rounded-lg border p-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <Link to={m.route} className="min-w-0 flex-1 truncate text-xs font-medium hover:underline">
                {m.title}
              </Link>
              <StatusBadge status={m.status} />
            </li>
          ))}
        </ol>
      </SurfaceCard>

      <NextBestAction action={nextAction} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((m, i) => (
          <ModuleCard key={m.key} module={m} index={i} />
        ))}
      </div>
    </>
  );
}
