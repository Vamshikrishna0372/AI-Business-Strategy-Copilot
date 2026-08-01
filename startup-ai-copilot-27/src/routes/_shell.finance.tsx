import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Bar as ProgressBar, MetricCard, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/lib/workspace-context";
import {
  aiModulesService,
  type AiMeta,
  type FinancialPlanningData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/finance")({
  head: () => ({
    meta: [
      { title: "Financial Planning — AI Business Strategy Copilot" },
      { name: "description", content: "Revenue streams, pricing, monthly cost, break-even, funding requirement, cash flow and profit forecast." },
      { property: "og:title", content: "Financial Planning — AI Business Strategy Copilot" },
      { property: "og:description", content: "The financial plan investors will ask you for." },
    ],
  }),
  component: Finance,
});

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 12 };
const tip = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 };

function Finance() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<FinancialPlanningData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<FinancialPlanningData>("financial_planning");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load financial plan.");
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
      const report = await aiModulesService.generateFinancialPlanning();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Financial plan generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate financial plan.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Financial Planning"
        subtitle={
          data
            ? `${data.monthly_cost} monthly cost · break-even ${data.break_even} · ${data.funding_need} to get there.`
            : "AI-generated revenue forecast, cash flow, break-even and runway analysis."
        }
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Your Financial Plan"
        emptyDescription={`Let AI build a complete financial model for ${activeStartup.name} — revenue forecast, expense breakdown, cash flow, break-even and runway.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is building your financial model and forecasts…"
      >
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Monthly cost" value={data.monthly_cost} hint="Engineering, cloud, GTM" />
              <MetricCard label="Break-even" value={data.break_even} hint="Based on growth rate" tone="success" />
              <MetricCard label="Funding requirement" value={data.funding_need} hint="18-month plan" />
              <MetricCard label="Runway" value={data.runway} hint="Extend before seed raise" tone="warning" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SurfaceCard className="lg:col-span-2">
                <h2 className="text-base font-semibold">Profit forecast</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenue_forecast || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} {...axis} />
                      <YAxis tickLine={false} axisLine={false} {...axis} />
                      <Tooltip contentStyle={tip} />
                      <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} name="Revenue" />
                      <Bar dataKey="costs" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} name="Costs" />
                      <Bar dataKey="profit" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <h2 className="text-base font-semibold">Revenue streams</h2>
                <div className="mt-4 space-y-4">
                  {(data.streams || []).map((s) => (
                    <div key={s.name}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="tabular-nums text-muted-foreground">{s.mrr}</span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={s.share} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.share}% of revenue · {s.note}
                      </p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SurfaceCard>
                <h2 className="text-base font-semibold">Cash flow overview</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.cashflow || []}>
                      <defs>
                        <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} {...axis} />
                      <YAxis tickLine={false} axisLine={false} {...axis} />
                      <Tooltip contentStyle={tip} />
                      <Area type="monotone" dataKey="inflow" stroke="var(--color-chart-3)" strokeWidth={2.5} fill="url(#inflow)" name="Inflow" />
                      <Area type="monotone" dataKey="outflow" stroke="var(--color-chart-5)" strokeWidth={2.5} fill="transparent" name="Outflow" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>

              <SurfaceCard hover={false}>
                <h2 className="text-base font-semibold">Pricing tiers</h2>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Best for</TableHead>
                        <TableHead className="text-right">Accounts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.pricing_tiers || []).map((r) => (
                        <TableRow key={r.tier}>
                          <TableCell className="font-medium">{r.tier}</TableCell>
                          <TableCell>{r.price}</TableCell>
                          <TableCell className="text-muted-foreground">{r.best_for}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.accounts}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {data.financial_insight && (
                  <div className="mt-5 rounded-xl bg-accent/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Financial insight</p>
                    <p className="mt-1 text-sm">{data.financial_insight}</p>
                  </div>
                )}
              </SurfaceCard>
            </div>
          </>
        )}
      </ModuleFrame>
    </>
  );
}
