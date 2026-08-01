import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AiBadge, Bar, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import {
  aiModulesService,
  type AiMeta,
  type ExecutionRoadmapData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/roadmap")({
  head: () => ({
    meta: [
      { title: "Execution Roadmap — AI Business Strategy Copilot" },
      { name: "description", content: "An interactive milestone timeline with tasks, priority, effort and the AI's next best action." },
      { property: "og:title", content: "Execution Roadmap — AI Business Strategy Copilot" },
      { property: "og:description", content: "Know exactly what to do next, every week." },
    ],
  }),
  component: Roadmap,
});

function Roadmap() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<ExecutionRoadmapData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<ExecutionRoadmapData>("execution_roadmap");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
        // Pre-mark done actions
        const doneTitles = (report.data.next_actions || []).filter((a) => a.done).map((a) => a.title);
        setCompletedActions(new Set(doneTitles));
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load execution roadmap.");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const report = await aiModulesService.generateExecutionRoadmap();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Execution roadmap generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate execution roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleAction = (title: string) => {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const nextActions = data?.next_actions ?? [];
  const doneCount = nextActions.filter((a) => completedActions.has(a.title) || a.done).length;
  const current = nextActions.find((a) => !completedActions.has(a.title) && !a.done);

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Execution Roadmap"
        subtitle={data?.current_stage ? `Current stage: ${data.current_stage}` : "From customer discovery today to a funded, scaling company."}
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Your Execution Roadmap"
        emptyDescription={`Let AI build a personalised execution roadmap for ${activeStartup.name} — milestones, weekly goals, tasks, and the AI's recommended next best action.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is building your execution roadmap…"
      >
        {data && (
          <>
            {/* AI next best action hero card */}
            {current && (
              <SurfaceCard hover={false} className="gradient-brand text-primary-foreground">
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">AI next best action</p>
                    <p className="mt-1 text-lg font-semibold">{current.title}</p>
                    <p className="mt-1 text-sm opacity-90">{current.why}</p>
                  </div>
                  <Button variant="secondary" onClick={() => toggleAction(current.title)}>
                    Mark complete
                  </Button>
                </div>
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs opacity-80">
                    <span>{doneCount} of {nextActions.length} actions complete</span>
                    <span className="tabular-nums">{nextActions.length ? Math.round((doneCount / nextActions.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary-foreground/20">
                    <div
                      className="h-full rounded-full bg-primary-foreground"
                      style={{ width: `${nextActions.length ? (doneCount / nextActions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </SurfaceCard>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              {/* Milestone timeline */}
              <div className="relative space-y-4 pl-6">
                <span className="absolute left-2 top-2 h-[calc(100%-1rem)] w-px bg-border" />
                {(data.milestones || []).map((m) => (
                  <div key={m.title} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[18px] top-6 size-3 rounded-full border-2 border-background",
                        m.status === "In progress" ? "bg-primary" : m.status === "Next" ? "bg-brand" : "bg-muted-foreground/40",
                      )}
                    />
                    <SurfaceCard>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{m.when}</Badge>
                        <Badge variant={m.status === "In progress" ? "default" : "outline"}>{m.status}</Badge>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {m.effort} · {m.difficulty} difficulty · {m.priority} priority
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold">{m.title}</h3>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(m.tasks || []).map((t) => (
                          <li key={t} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                            <span className="grid size-4 shrink-0 place-items-center rounded border" />
                            {t}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 rounded-xl bg-accent/50 p-3 text-sm">
                        <span className="font-semibold text-accent-foreground">AI recommendation · </span>
                        {m.ai}
                      </div>
                    </SurfaceCard>
                  </div>
                ))}
              </div>

              {/* Next actions sidebar */}
              <SurfaceCard hover={false} className="h-fit">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Next best actions</h2>
                  <AiBadge>Live</AiBadge>
                </div>
                <ol className="mt-4 space-y-3">
                  {nextActions.map((a) => {
                    const isDone = completedActions.has(a.title) || a.done;
                    return (
                      <li key={a.title} className="flex gap-3">
                        <button
                          onClick={() => toggleAction(a.title)}
                          className={cn(
                            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                            isDone ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary",
                          )}
                        >
                          {isDone ? <Check className="size-3" /> : null}
                        </button>
                        <span className="min-w-0">
                          <span className={cn("block text-sm font-medium", isDone && "text-muted-foreground line-through")}>{a.title}</span>
                          <span className="block text-xs text-muted-foreground">{a.why}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-5">
                  <p className="mb-1 text-xs text-muted-foreground">Execution progress</p>
                  <Bar value={nextActions.length ? (doneCount / nextActions.length) * 100 : 0} />
                </div>
              </SurfaceCard>
            </div>

            {/* Success metrics / weekly goals */}
            {(data.success_metrics?.length > 0 || data.weekly_goals?.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {data.success_metrics?.length > 0 && (
                  <SurfaceCard>
                    <h2 className="text-base font-semibold">Success metrics</h2>
                    <ul className="mt-3 space-y-2">
                      {data.success_metrics.map((m) => (
                        <li key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </SurfaceCard>
                )}
                {data.weekly_goals?.length > 0 && (
                  <SurfaceCard>
                    <h2 className="text-base font-semibold">Weekly goals</h2>
                    <ul className="mt-3 space-y-2">
                      {data.weekly_goals.map((g) => (
                        <li key={g} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="size-1.5 shrink-0 rounded-full bg-success" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </SurfaceCard>
                )}
              </div>
            )}
          </>
        )}
      </ModuleFrame>
    </>
  );
}
