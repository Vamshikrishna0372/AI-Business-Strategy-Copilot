import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AiBadge, Bar, PageHeader, ScoreRing, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import {
  aiModulesService,
  type AiMeta,
  type InvestorReadinessData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/investor")({
  head: () => ({
    meta: [
      { title: "Investor Readiness — AI Business Strategy Copilot" },
      { name: "description", content: "Investor readiness score, elevator pitches, funding recommendation and the checklist investors expect." },
      { property: "og:title", content: "Investor Readiness — AI Business Strategy Copilot" },
      { property: "og:description", content: "Know exactly how fundable your startup is today." },
    ],
  }),
  component: Investor,
});

function Investor() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<InvestorReadinessData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<InvestorReadinessData>("investor_readiness");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load investor readiness report.");
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
      const report = await aiModulesService.generateInvestorReadiness();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Investor readiness report generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate investor readiness report.");
    } finally {
      setGenerating(false);
    }
  };

  const checklist = data?.checklist ?? [];
  const done = checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Investor Readiness"
        subtitle="The final destination of your journey — how a seed investor would read your startup today."
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Investor Readiness Report"
        emptyDescription={`Let AI evaluate how fundable ${activeStartup.name} is today — with a readiness score, investor checklist, elevator pitches and funding recommendations.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is evaluating your investor readiness…"
      >
        {data && (
          <>
            {/* Hero score banner */}
            <SurfaceCard hover={false} className="gradient-brand text-primary-foreground">
              <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
                <div className="rounded-3xl bg-primary-foreground/12 p-4">
                  <ScoreRing value={data.readiness_score} size={160} label="Readiness" tone="success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Investment readiness</p>
                  <h2 className="mt-1 text-3xl font-semibold">
                    {data.readiness_score}/100 · {data.readiness_label}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm opacity-90">{data.readiness_summary}</p>
                  {data.investor_confidence && (
                    <p className="mt-2 text-sm opacity-80">
                      Investor confidence: {data.investor_confidence}%
                      {data.indicative_cheque ? ` · Indicative cheque: ${data.indicative_cheque}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </SurfaceCard>

            {/* Strengths / Weaknesses / Missing */}
            <div className="grid gap-4 lg:grid-cols-3">
              <SurfaceCard>
                <h2 className="text-base font-semibold">Startup strengths</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(data.strengths || []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" /> {s}
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
              <SurfaceCard>
                <h2 className="text-base font-semibold">Weaknesses</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(data.weaknesses || []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" /> {s}
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
              <SurfaceCard>
                <h2 className="text-base font-semibold">Missing requirements</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(data.missing_requirements || []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" /> {s}
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            </div>

            {/* Elevator Pitch + Checklist */}
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <SurfaceCard hover={false}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Elevator pitch</h2>
                  <AiBadge>Generated from your interview</AiBadge>
                </div>
                <div className="mt-4 space-y-3">
                  {(data.pitches || []).map((p) => (
                    <div key={p.length} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{p.length} pitch</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            void navigator.clipboard?.writeText(p.text);
                            toast.success(`${p.length} pitch copied`);
                          }}
                        >
                          <Copy /> Copy
                        </Button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <h2 className="text-base font-semibold">Investor checklist</h2>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{done} of {checklist.length} complete</span>
                    <span className="tabular-nums">{checklist.length ? Math.round((done / checklist.length) * 100) : 0}%</span>
                  </div>
                  <Bar value={checklist.length ? (done / checklist.length) * 100 : 0} tone="success" />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {checklist.map((c) => (
                    <li key={c.label} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border",
                          c.done ? "border-success bg-success text-success-foreground" : "border-border",
                        )}
                      >
                        {c.done ? <Check className="size-3" /> : null}
                      </span>
                      <span className={cn(!c.done && "text-muted-foreground")}>{c.label}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="hero" className="mt-5 w-full" asChild>
                  <Link to="/roadmap">
                    <Target /> Close the gaps
                  </Link>
                </Button>
              </SurfaceCard>
            </div>

            {/* Funding recommendation */}
            {data.funding_options?.length > 0 && (
              <SurfaceCard hover={false}>
                <h2 className="text-base font-semibold">Funding recommendation</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.funding_options.map((f) => (
                    <div key={f.name} className={cn("rounded-xl border p-4", f.fit >= 85 && "border-primary bg-accent/50")}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{f.name}</p>
                        <span className="text-sm tabular-nums text-muted-foreground">{f.fit}%</span>
                      </div>
                      <div className="mt-2">
                        <Bar value={f.fit} tone={f.fit >= 85 ? "success" : "primary"} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{f.note}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            )}
          </>
        )}
      </ModuleFrame>
    </>
  );
}
