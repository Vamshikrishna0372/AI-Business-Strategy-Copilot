import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/lib/workspace-context";
import {
  aiModulesService,
  type AiMeta,
  type CompetitorAnalysisData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/competitors")({
  head: () => ({
    meta: [
      { title: "Competitor Analysis — AI Business Strategy Copilot" },
      { name: "description", content: "Compare competitors, spot the market gap and define your competitive advantage with radar charts and SWOT." },
      { property: "og:title", content: "Competitor Analysis — AI Business Strategy Copilot" },
      { property: "og:description", content: "Competitor comparison, market gap and SWOT for your startup." },
    ],
  }),
  component: Competitors,
});

const dims = ["pricing", "tech", "reach", "service", "trust"] as const;

function Competitors() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<CompetitorAnalysisData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<CompetitorAnalysisData>("competitor_analysis");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load competitor analysis.");
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
      const report = await aiModulesService.generateCompetitorAnalysis();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Competitor analysis generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate competitor analysis.");
    } finally {
      setGenerating(false);
    }
  };

  // Build radar data from dynamic competitor list
  const competitors = data?.competitors ?? [];
  const you = competitors[0];
  const radarData =
    you && competitors.length > 1
      ? dims.map((d) => {
          const point: Record<string, number | string> = { dimension: d.charAt(0).toUpperCase() + d.slice(1) };
          competitors.forEach((c) => {
            point[c.name] = (c as any)[d] ?? 50;
          });
          return point;
        })
      : [];

  const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-4)", "var(--color-chart-5)"];

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Competitor Analysis"
        subtitle={data?.positioning_summary || "AI-powered competitive intelligence for your startup."}
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Competitor Intelligence"
        emptyDescription={`Let AI map the competitive landscape for ${activeStartup.name} — identifying competitors, scoring them across key dimensions, and finding your market gap.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is mapping the competitive landscape…"
      >
        {data && (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <SurfaceCard hover={false}>
                <h2 className="text-base font-semibold">Competitor comparison</h2>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Focus</TableHead>
                        <TableHead className="text-right">Pricing</TableHead>
                        <TableHead className="text-right">Technology</TableHead>
                        <TableHead className="text-right">Reach</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitors.map((c, i) => (
                        <TableRow key={c.name} className={i === 0 ? "bg-accent/40" : undefined}>
                          <TableCell className="font-medium">
                            {c.name} {i === 0 && <Badge variant="secondary" className="ml-2">You</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.focus}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.pricing}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.tech}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.reach}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.share}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SurfaceCard>

              {radarData.length > 0 && (
                <SurfaceCard>
                  <h2 className="text-base font-semibold">Competitive positioning</h2>
                  <div className="mt-2 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                        {competitors.map((c, i) => (
                          <Radar
                            key={c.name}
                            dataKey={c.name}
                            stroke={chartColors[i % chartColors.length]}
                            fill={chartColors[i % chartColors.length]}
                            fillOpacity={i === 0 ? 0.3 : 0.12}
                          />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </SurfaceCard>
              )}
            </div>

            {data.swot && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Strengths", items: data.swot.strengths, tone: "text-success" },
                  { title: "Weaknesses", items: data.swot.weaknesses, tone: "text-destructive" },
                  { title: "Opportunities", items: data.swot.opportunities, tone: "text-primary" },
                  { title: "Threats", items: data.swot.threats, tone: "text-warning" },
                ].map((s) => (
                  <SurfaceCard key={s.title}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${s.tone}`}>{s.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {(s.items || []).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </SurfaceCard>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {data.market_gap && (
                <SurfaceCard>
                  <h2 className="text-base font-semibold">Market gap</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{data.market_gap}</p>
                </SurfaceCard>
              )}
              {data.competitive_advantage && (
                <SurfaceCard>
                  <h2 className="text-base font-semibold">Your competitive advantage</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{data.competitive_advantage}</p>
                </SurfaceCard>
              )}
            </div>
          </>
        )}
      </ModuleFrame>
    </>
  );
}
