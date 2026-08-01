import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { AiBadge, Bar, PageHeader, ScoreRing, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import {
  aiModulesService,
  type AiMeta,
  type IdeaValidationData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/validation")({
  head: () => ({
    meta: [
      { title: "Idea Validation — AI Business Strategy Copilot" },
      { name: "description", content: "Innovation, market demand, competition, scalability and feasibility scored with evidence and suggestions." },
      { property: "og:title", content: "Idea Validation — AI Business Strategy Copilot" },
      { property: "og:description", content: "Your idea, scored across six dimensions with reasons and next steps." },
    ],
  }),
  component: Validation,
});

function Validation() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<IdeaValidationData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<IdeaValidationData>("idea_validation");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load validation report.");
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
      const report = await aiModulesService.generateIdeaValidation();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Idea validation generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate validation report.");
    } finally {
      setGenerating(false);
    }
  };

  const overall = data?.overall_score ?? (data?.scores ? Math.round(data.scores.reduce((a, s) => a + s.score, 0) / data.scores.length) : 0);

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Idea Validation"
        subtitle="Six dimensions, each scored with the evidence behind it and one concrete improvement."
        actions={
          data ? (
            <Button variant="hero" asChild>
              <Link to="/strategy">
                Generate strategy <ArrowRight />
              </Link>
            </Button>
          ) : null
        }
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Your Idea Validation"
        emptyDescription={`Let AI score ${activeStartup.name} across innovation, demand, scalability, competition, feasibility and timing — with evidence for each score.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is scoring your idea across 6 dimensions…"
      >
        {data && (
          <>
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <SurfaceCard className="flex flex-col items-center text-center">
                <AiBadge>Validated</AiBadge>
                <div className="mt-4">
                  <ScoreRing value={overall} size={168} label="Overall score" tone="success" />
                </div>
                <p className="mt-4 text-sm font-semibold">{data.verdict || "Analysis Complete"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p>
              </SurfaceCard>

              <SurfaceCard>
                <h2 className="text-base font-semibold">Validation profile</h2>
                <div className="mt-2 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={(data.scores || []).map((s) => ({ subject: s.label, score: s.score }))}
                      outerRadius="72%"
                    >
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                      <Radar dataKey="score" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.28} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data.scores || []).map((s) => (
                <SurfaceCard key={s.label}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold">{s.label}</h3>
                    <span className="font-display text-2xl font-semibold tabular-nums text-primary">{s.score}</span>
                  </div>
                  <div className="mt-3">
                    <Bar value={s.score} tone={s.score >= 80 ? "success" : s.score >= 65 ? "primary" : "warning"} />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why</p>
                  <p className="mt-1 text-sm">{s.reason}</p>
                  <div className="mt-4 rounded-xl bg-accent/50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                      <Lightbulb className="size-3.5" /> Suggestion
                    </p>
                    <p className="mt-1 text-sm">{s.suggestion}</p>
                  </div>
                </SurfaceCard>
              ))}
            </div>

            <SurfaceCard hover={false}>
              <h2 className="text-base font-semibold">AI recommendation</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{data.recommendation}</p>
              {data.next_steps?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {data.next_steps.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="hero" asChild>
                  <Link to="/strategy">Open business strategy</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/competitors">Review competitors</Link>
                </Button>
              </div>
            </SurfaceCard>
          </>
        )}
      </ModuleFrame>
    </>
  );
}
