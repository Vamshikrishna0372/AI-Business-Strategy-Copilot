import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Bar, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import {
  aiModulesService,
  type AiMeta,
  type RiskAnalysisData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/risk")({
  head: () => ({
    meta: [
      { title: "Risk Analysis — AI Business Strategy Copilot" },
      { name: "description", content: "Business, financial, technical, operational and market risks with severity, probability, impact and fixes." },
      { property: "og:title", content: "Risk Analysis — AI Business Strategy Copilot" },
      { property: "og:description", content: "Know what can break your startup, and how to fix it." },
    ],
  }),
  component: Risk,
});

const severityTone: Record<string, string> = {
  High: "bg-destructive/12 text-destructive",
  Medium: "bg-warning/18 text-warning",
  Low: "bg-success/12 text-success",
};

function Risk() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<RiskAnalysisData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<RiskAnalysisData>("risk_analysis");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load risk analysis.");
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
      const report = await aiModulesService.generateRiskAnalysis();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Risk analysis generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate risk analysis.");
    } finally {
      setGenerating(false);
    }
  };

  const risks = data?.risks ?? [];
  const categories = [...new Set(risks.map((r) => r.category))];
  const impactLevels = ["Low", "Medium", "High"];

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Risk Analysis"
        subtitle={`${categories.length || "Five"} risk categories scored on probability and impact, each with a concrete mitigation.`}
        actions={
          data ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/18 px-3 py-1.5 text-xs font-semibold text-warning">
              <ShieldAlert className="size-3.5" />
              Overall risk {data.overall_risk_score}/100 — {data.risk_level}
            </span>
          ) : null
        }
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Risk Intelligence"
        emptyDescription={`Let AI identify and score all risks for ${activeStartup.name} — market, financial, technical, operational and regulatory — with mitigation strategies.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is mapping risks and mitigation strategies…"
      >
        {data && (
          <>
            {/* Risk heatmap */}
            {categories.length > 0 && (
              <SurfaceCard hover={false}>
                <h2 className="text-base font-semibold">Risk heatmap</h2>
                <p className="mt-1 text-sm text-muted-foreground">Probability increases upward; colour intensity shows severity.</p>
                <div className="mt-5 overflow-x-auto">
                  <div
                    className="grid gap-2 min-w-[560px]"
                    style={{ gridTemplateColumns: `90px repeat(${categories.length}, 1fr)` }}
                  >
                    <div />
                    {categories.map((h) => (
                      <div key={h} className="text-center text-xs font-medium text-muted-foreground">
                        {h}
                      </div>
                    ))}
                    {[...impactLevels].reverse().map((level) => (
                      <Fragment key={level}>
                        <div key={`l-${level}`} className="flex items-center text-xs text-muted-foreground">
                          {level} impact
                        </div>
                        {categories.map((cat) => {
                          const r = risks.find((x) => x.category === cat);
                          if (!r) return <div key={`${level}-${cat}`} className="grid h-14 place-items-center rounded-lg border bg-muted/50 text-xs font-semibold text-muted-foreground/40">—</div>;
                          const active =
                            (level === "High" && r.probability >= 55) ||
                            (level === "Medium" && r.probability >= 30 && r.probability < 55) ||
                            (level === "Low" && r.probability < 30);
                          return (
                            <div
                              key={`${level}-${cat}`}
                              className={cn(
                                "grid h-14 place-items-center rounded-lg border text-xs font-semibold transition-colors",
                                active && r.severity === "High" && "bg-destructive/20 text-destructive",
                                active && r.severity === "Medium" && "bg-warning/25 text-warning",
                                active && r.severity === "Low" && "bg-success/18 text-success",
                                !active && "bg-muted/50 text-muted-foreground/40",
                              )}
                            >
                              {active ? `${r.probability}%` : "—"}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </SurfaceCard>
            )}

            {/* Risk cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {risks.map((r) => (
                <SurfaceCard key={r.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge variant="secondary">{r.category}</Badge>
                      <h3 className="mt-2 text-base font-semibold">{r.title}</h3>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", severityTone[r.severity] ?? "bg-muted text-muted-foreground")}>
                      {r.severity}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Probability</span>
                      <span className="tabular-nums">{r.probability}%</span>
                    </div>
                    <Bar
                      value={r.probability}
                      tone={r.severity === "High" ? "destructive" : r.severity === "Medium" ? "warning" : "success"}
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impact</p>
                  <p className="mt-1 text-sm">{r.impact}</p>
                  <div className="mt-4 rounded-xl bg-accent/50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                      <TriangleAlert className="size-3.5" /> Suggested solution
                    </p>
                    <p className="mt-1 text-sm">{r.fix}</p>
                  </div>
                </SurfaceCard>
              ))}
            </div>

            {/* Priority callout */}
            {data.mitigation_priority?.length > 0 && (
              <SurfaceCard hover={false}>
                <h2 className="text-base font-semibold">Top concern</h2>
                <p className="mt-2 text-sm text-muted-foreground">{data.top_concern}</p>
                <h3 className="mt-4 text-sm font-semibold">Mitigation priority</h3>
                <ol className="mt-2 space-y-1.5">
                  {data.mitigation_priority.map((p, i) => (
                    <li key={p} className="flex items-center gap-3 text-sm">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground">
                        {i + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ol>
              </SurfaceCard>
            )}
          </>
        )}
      </ModuleFrame>
    </>
  );
}
