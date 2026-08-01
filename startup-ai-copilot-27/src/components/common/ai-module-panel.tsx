/**
 * AiModulePanel — Shared wrapper for all AI Business Journey modules.
 * Handles: Loading skeleton, error boundary, AI metadata badge, and generate/regenerate buttons.
 */

import { AlertCircle, Bot, Clock, RefreshCw, Sparkles, Zap } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiMeta } from "@/services/ai-modules-service";

// ─── AI Metadata Badge ─────────────────────────────────────────────────────────

export function AiMetaBadge({ meta, className }: { meta: AiMeta; className?: string }) {
  const isGemini = meta.provider?.toLowerCase().includes("gemini");
  const genDate = meta.generated_at
    ? new Date(meta.generated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const genSeconds = meta.generation_time_ms ? (meta.generation_time_ms / 1000).toFixed(1) : "—";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border bg-accent/50 px-4 py-3 text-xs",
        className
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {isGemini ? (
          <Sparkles className="size-3.5 text-brand" />
        ) : (
          <Zap className="size-3.5 text-warning" />
        )}
        {isGemini ? "Gemini" : "Groq"}
        <span className="font-normal text-muted-foreground">· {meta.model || "AI"}</span>
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Bot className="size-3" />
        Confidence {meta.confidence ?? "—"}%
      </span>
      <span className="text-muted-foreground">v{meta.report_version ?? 1}</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3" />
        {genDate} · {genSeconds}s
      </span>
    </div>
  );
}

// ─── Module Skeleton Loader ────────────────────────────────────────────────────

export function ModuleSkeleton({ message = "AI is generating your report…" }: { message?: string }) {
  return (
    <div className="space-y-4 animate-rise">
      <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
        <div className="relative grid size-16 place-items-center rounded-2xl bg-accent">
          <Sparkles className="size-8 text-brand animate-pulse" />
          <span className="absolute -right-1 -top-1 size-4 animate-blink rounded-full bg-primary" />
        </div>
        <p className="text-sm font-semibold">{message}</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Our AI is analysing your startup context. This usually takes 10–30 seconds.
        </p>
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-muted via-primary/40 to-muted bg-[length:200%_100%]" />
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="surface-card space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-2 w-3/4 animate-pulse rounded-full bg-muted" />
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────────────────────

export function ModuleError({
  error,
  onRetry,
  onGenerate,
  generating,
}: {
  error: string;
  onRetry?: () => void;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-4 p-12 text-center animate-rise">
      <div className="grid size-16 place-items-center rounded-2xl bg-destructive/12 text-destructive">
        <AlertCircle className="size-8" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Failed to load report</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry} disabled={generating}>
            <RefreshCw className={cn("size-4", generating && "animate-spin")} />
            Retry
          </Button>
        )}
        {onGenerate && (
          <Button variant="hero" onClick={onGenerate} disabled={generating}>
            <Sparkles className="size-4" />
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Generate Prompt (no report yet) ──────────────────────────────────────────

export function ModuleEmpty({
  title,
  description,
  onGenerate,
  generating,
}: {
  title: string;
  description: string;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-4 p-14 text-center animate-rise">
      <div className="grid size-16 place-items-center rounded-2xl bg-accent">
        <Sparkles className="size-8 text-brand" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="hero" onClick={onGenerate} disabled={generating} size="lg">
        <Sparkles className="size-4" />
        {generating ? "Generating…" : "Generate with AI"}
      </Button>
    </div>
  );
}

// ─── Regenerate Toolbar ────────────────────────────────────────────────────────

export function RegenerateBar({
  meta,
  onRegenerate,
  generating,
}: {
  meta: AiMeta;
  onRegenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AiMetaBadge meta={meta} className="flex-1" />
      <Button variant="outline" size="sm" onClick={onRegenerate} disabled={generating}>
        <RefreshCw className={cn("size-3.5", generating && "animate-spin")} />
        {generating ? "Regenerating…" : "Regenerate"}
      </Button>
    </div>
  );
}

// ─── Module Frame ──────────────────────────────────────────────────────────────

/**
 * Wraps a module with consistent loading, error, and empty-state handling.
 */
export function ModuleFrame({
  loading,
  generating,
  error,
  hasData,
  meta,
  emptyTitle,
  emptyDescription,
  onGenerate,
  onRegenerate,
  loadingMessage,
  children,
}: {
  loading: boolean;
  generating: boolean;
  error: string | null;
  hasData: boolean;
  meta: AiMeta | null;
  emptyTitle: string;
  emptyDescription: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  loadingMessage?: string;
  children: ReactNode;
}) {
  if (loading || generating) {
    return <ModuleSkeleton message={loadingMessage} />;
  }

  if (error && !hasData) {
    return (
      <ModuleError
        error={error}
        onGenerate={onGenerate}
        generating={generating}
        onRetry={onGenerate}
      />
    );
  }

  if (!hasData) {
    return (
      <ModuleEmpty
        title={emptyTitle}
        description={emptyDescription}
        onGenerate={onGenerate}
        generating={generating}
      />
    );
  }

  return (
    <>
      {meta && (
        <RegenerateBar meta={meta} onRegenerate={onRegenerate} generating={generating} />
      )}
      {children}
    </>
  );
}
