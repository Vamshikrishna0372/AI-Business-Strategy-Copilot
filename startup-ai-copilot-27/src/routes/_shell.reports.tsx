import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, History, Eye, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AiBadge, EmptyState, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace-context";
import { eventBus, EVENTS } from "@/lib/events";
import { reportsService, type BackendReport } from "@/services/reports-service";
import { aiModulesService } from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports Center — AI Business Strategy Copilot" },
      { name: "description", content: "The document hub of your startup: strategy, validation, competitors, finance, risk, investor and roadmap reports." },
      { property: "og:title", content: "Reports Center — AI Business Strategy Copilot" },
      { property: "og:description", content: "Preview, export and regenerate every generated business document." },
    ],
  }),
  component: ReportsCenter,
});

const reportTypesList = [
  { key: "business_strategy", title: "Business Strategy", category: "Strategy", route: "/strategy" },
  { key: "idea_validation", title: "Idea Validation", category: "Market", route: "/validation" },
  { key: "competitor_analysis", title: "Competitor Intelligence", category: "Market", route: "/competitors" },
  { key: "business_model_canvas", title: "Business Model Canvas", category: "Strategy", route: "/canvas" },
  { key: "financial_planning", title: "Financial Planning", category: "Finance", route: "/finance" },
  { key: "risk_analysis", title: "Risk Intelligence", category: "Execution", route: "/risk" },
  { key: "investor_readiness", title: "Investor Readiness", category: "Finance", route: "/investor" },
  { key: "execution_roadmap", title: "Execution Roadmap", category: "Execution", route: "/roadmap" },
];

function ReportsCenter() {
  const { activeStartup, activeId } = useWorkspace();
  const [reports, setReports] = useState<BackendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BackendReport | null>(null);
  const [historyModalType, setHistoryModalType] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<BackendReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const data = await reportsService.listReports();
      setReports(data);
    } catch (err: any) {
      console.warn("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadReports();
    const unsub = eventBus.on(EVENTS.AI_REPORT_GENERATED, () => loadReports());
    return () => unsub();
  }, [loadReports]);

  const viewHistory = async (reportType: string) => {
    setHistoryModalType(reportType);
    setLoadingHistory(true);
    try {
      const items = await reportsService.getReportHistory(reportType);
      setHistoryItems(items);
    } catch {
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const regenerate = async (reportType: string) => {
    setRegenerating(reportType);
    try {
      const newReport = await reportsService.regenerateReport(reportType);
      toast.success(`${newReport.title} regenerated! Version v${newReport.version}`);
      await loadReports();
    } catch (err: any) {
      toast.error(err?.message || "Failed to regenerate report.");
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Reports Center"
        subtitle={`${reports.length} versioned reports available for ${activeStartup.name}. Every report is version-controlled and regenerated from your latest answers.`}
        actions={
          <Button variant="outline" onClick={loadReports} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-accent/40" />
          ))}
        </div>
      ) : reportTypesList.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-7" />}
          title="No reports generated yet"
          message="Complete a Business Journey module and the matching report will be generated automatically."
          action={<Button variant="hero">Start the Business Journey</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportTypesList.map((rt) => {
            const latest = reports.find((r) => r.report_type === rt.key);
            const isRegen = regenerating === rt.key;

            return (
              <SurfaceCard key={rt.key} className="flex h-full flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="secondary" className="text-[10px]">{rt.category}</Badge>
                      <h3 className="mt-1.5 text-base font-semibold">{rt.title}</h3>
                    </div>
                    {latest ? (
                      <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                        v{latest.version} Ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Not Generated
                      </span>
                    )}
                  </div>

                  {latest ? (
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Sparkles className="size-3 text-brand" /> Provider: {latest.ai_provider}
                      </p>
                      <p>Confidence: {latest.confidence}%</p>
                      <p>Updated: {new Date(latest.created_at).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No version generated yet. Run this module to create v1.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-3">
                  {latest ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setSelectedReport(latest)}>
                        <Eye className="size-3.5" /> Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reportsService.downloadAsJson(latest)}>
                        <Download className="size-3.5" /> Export
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => viewHistory(rt.key)}>
                        <History className="size-3.5" /> History
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="hero" onClick={() => regenerate(rt.key)} disabled={isRegen}>
                      <Sparkles className="size-3.5" />
                      {isRegen ? "Generating…" : "Generate v1"}
                    </Button>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-rise">
          <div className="surface-card flex max-h-[85vh] w-full max-w-3xl flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedReport.title} (v{selectedReport.version})</h3>
                <p className="text-xs text-muted-foreground">
                  AI Provider: {selectedReport.ai_provider} · Confidence: {selectedReport.confidence}%
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedReport(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 text-xs font-mono bg-accent/30 p-4 rounded-xl mt-2 leading-relaxed">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedReport.content, null, 2)}</pre>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4 mt-2">
              <Button variant="outline" onClick={() => reportsService.exportAsFormattedText(selectedReport)}>
                Download Text
              </Button>
              <Button variant="hero" onClick={() => reportsService.downloadAsJson(selectedReport)}>
                Download JSON
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-rise">
          <div className="surface-card flex max-h-[80vh] w-full max-w-xl flex-col p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold">Version History — {historyModalType}</h3>
              <Button size="icon" variant="ghost" onClick={() => setHistoryModalType(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingHistory ? (
                <p className="text-sm text-muted-foreground">Loading history…</p>
              ) : historyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past versions found.</p>
              ) : (
                historyItems.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border p-3.5 text-xs">
                    <div>
                      <span className="font-semibold text-sm">v{h.version}</span>
                      <span className="ml-2 text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                      <p className="text-muted-foreground mt-0.5">
                        {h.ai_provider} · Confidence {h.confidence}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedReport(h)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => reportsService.downloadAsJson(h)}>
                        Export
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
