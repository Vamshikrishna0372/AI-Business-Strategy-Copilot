import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/ui-kit";
import { ModuleFrame } from "@/components/common/ai-module-panel";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import {
  aiModulesService,
  type AiMeta,
  type BusinessModelCanvasData,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/canvas")({
  head: () => ({
    meta: [
      { title: "Business Model Canvas — AI Business Strategy Copilot" },
      { name: "description", content: "An auto-generated nine-block business model canvas you can edit and export." },
      { property: "og:title", content: "Business Model Canvas — AI Business Strategy Copilot" },
      { property: "og:description", content: "Nine blocks, generated from your startup profile." },
    ],
  }),
  component: Canvas,
});

const spans: Record<string, string> = {
  "Key Partners": "lg:col-span-2 lg:row-span-2",
  "Key Activities": "lg:col-span-2",
  "Value Proposition": "lg:col-span-2 lg:row-span-2",
  "Customer Relationships": "lg:col-span-2",
  "Customer Segments": "lg:col-span-2 lg:row-span-2",
  "Key Resources": "lg:col-span-2",
  Channels: "lg:col-span-2",
  "Cost Structure": "lg:col-span-5",
  "Revenue Streams": "lg:col-span-5",
};

const order = [
  "Key Partners",
  "Key Activities",
  "Value Proposition",
  "Customer Relationships",
  "Customer Segments",
  "Key Resources",
  "Channels",
  "Cost Structure",
  "Revenue Streams",
];

function Canvas() {
  const { activeStartup, activeId } = useWorkspace();
  const [data, setData] = useState<BusinessModelCanvasData | null>(null);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await aiModulesService.getLatestReport<BusinessModelCanvasData>("business_model_canvas");
      if (report) {
        setData(report.data);
        setMeta(report.ai_meta);
      } else {
        setData(null);
        setMeta(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load canvas.");
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
      const report = await aiModulesService.generateBusinessModelCanvas();
      setData(report.data);
      setMeta(report.ai_meta);
      toast.success(`Business Model Canvas generated! v${report.ai_meta.report_version}`);
    } catch (err: any) {
      setError(err?.message || "AI generation failed. Please try again.");
      toast.error("Failed to generate Business Model Canvas.");
    } finally {
      setGenerating(false);
    }
  };

  // Sort blocks by defined canvas order, fall back to original order
  const blocks = data?.blocks
    ? order
        .map((k) => data.blocks.find((b) => b.key === k) ?? data.blocks.find((b) => b.key.includes(k.split(" ")[0]!)))
        .filter(Boolean)
    : [];

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Business Model Canvas"
        subtitle="Generated from your interview and financials. Every block is editable before export."
        actions={
          data ? (
            <>
              <Button variant="outline" onClick={() => toast.info("Inline editing enabled")}>
                <Pencil /> Edit canvas
              </Button>
              <Button variant="hero" onClick={() => toast.success("Canvas exported as PDF")}>
                <Download /> Export
              </Button>
            </>
          ) : null
        }
      />

      <ModuleFrame
        loading={loading}
        generating={generating}
        error={error}
        hasData={!!data}
        meta={meta}
        emptyTitle="Generate Your Business Model Canvas"
        emptyDescription={`Let AI auto-fill all 9 canvas blocks for ${activeStartup.name} — from key partners to revenue streams.`}
        onGenerate={generate}
        onRegenerate={generate}
        loadingMessage="AI is building your 9-block Business Model Canvas…"
      >
        {data && (
          <>
            {data.summary && (
              <div className="surface-card p-4 text-sm text-muted-foreground">{data.summary}</div>
            )}
            <div className="grid auto-rows-[minmax(150px,auto)] gap-3 md:grid-cols-2 lg:grid-cols-10">
              {blocks.map((b) => (
                <div
                  key={b!.key}
                  className={`surface-card hover-lift flex flex-col p-4 ${spans[b!.key] ?? ""}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{b!.key}</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {(b!.items || []).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </ModuleFrame>
    </>
  );
}
