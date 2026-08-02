import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleDashed, CircleCheck, CircleAlert, Clock, Loader } from "lucide-react";
import type { ReactNode } from "react";

import { Bar, SurfaceCard } from "@/components/common/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModuleState, ModuleStatus, ScoreCardData, WorkspaceInsight, WorkspaceReport } from "@/data/workspace";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, { cls: string; icon: ReactNode }> = {
    Completed: { cls: "bg-success/12 text-success", icon: <CircleCheck className="size-3.5" /> },
    "In progress": { cls: "bg-primary/12 text-primary", icon: <Loader className="size-3.5" /> },
    "Needs review": { cls: "bg-warning/15 text-warning", icon: <CircleAlert className="size-3.5" /> },
    "Not started": { cls: "bg-muted text-muted-foreground", icon: <CircleDashed className="size-3.5" /> },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", s.cls)}>
      {s.icon}
      {status}
    </span>
  );
}

export function ModuleCard({ module, index }: { module: ModuleState; index?: number }) {
  return (
    <SurfaceCard className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        {typeof index === "number" ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-xs font-semibold text-accent-foreground">
            {index + 1}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{module.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{module.description}</p>
        </div>
        <StatusBadge status={module.status} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Completion</span>
          <span className="tabular-nums">{module.completion}%</span>
        </div>
        <Bar value={module.completion} tone={module.status === "Completed" ? "success" : "primary"} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Est. time</dt>
          <dd className="font-medium">{module.estimate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">AI confidence</dt>
          <dd className="font-medium tabular-nums">{module.confidence ? `${module.confidence}%` : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="truncate font-medium">{module.updated}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg bg-accent/40 p-2.5 text-[11px] text-muted-foreground">{module.preview}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Recent change: {module.recentChange}</p>

      <div className="mt-auto pt-4">
        <Button size="sm" variant={module.status === "Completed" ? "outline" : "hero"} className="w-full" asChild>
          <Link to={module.route}>
            {module.status === "Completed" ? "Open module" : module.status === "Not started" ? "Start module" : "Continue"}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </SurfaceCard>
  );
}

export function BusinessScoreCard({ score }: { score: ScoreCardData }) {
  const positive = score.invert ? score.trend <= 0 : score.trend >= 0;
  return (
    <SurfaceCard className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{score.label}</p>
        {score.value > 0 ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {score.trend >= 0 ? "+" : ""}
            {score.trend}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Pending
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
        {score.value > 0 ? (
          <>
            {score.value}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/100</span>
          </>
        ) : (
          <span className="text-xl font-medium text-muted-foreground">--</span>
        )}
      </p>
      <div className="mt-3">
        <Bar value={score.value} tone={score.tone === "destructive" ? "destructive" : score.tone} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{score.reason}</p>
      <p className="mt-2 text-xs font-medium">→ {score.recommendation}</p>
    </SurfaceCard>
  );
}

export function InsightCard({ insight }: { insight: WorkspaceInsight }) {
  return (
    <SurfaceCard className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{insight.kind}</span>
        <Badge variant={insight.priority === "High" ? "default" : "secondary"}>{insight.priority}</Badge>
      </div>
      <h3 className="mt-2 text-sm font-semibold">{insight.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{insight.body}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Impact</dt>
          <dd className="font-medium">{insight.impact}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Confidence</dt>
          <dd className="font-medium tabular-nums">{insight.confidence}%</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Effort</dt>
          <dd className="font-medium">{insight.effort}</dd>
        </div>
      </dl>
    </SurfaceCard>
  );
}

export function NextBestAction({
  action,
}: {
  action: { title: string; why: string; impact: string; time: string; priority: string; route: string };
}) {
  return (
    <SurfaceCard className="border-primary/30 bg-primary/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Next best action</p>
          <h3 className="mt-1 text-base font-semibold">{action.title}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{action.why}</p>
        </div>
        <Button variant="hero" asChild>
          <Link to={action.route}>
            Continue journey <ArrowRight />
          </Link>
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Expected impact</dt>
          <dd className="font-semibold">{action.impact}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estimated time</dt>
          <dd className="font-semibold">
            <Clock className="mr-1 inline size-3.5" />
            {action.time}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Priority</dt>
          <dd className="font-semibold">{action.priority}</dd>
        </div>
      </dl>
    </SurfaceCard>
  );
}

export function ActivityTimeline({ items }: { items: { text: string; time: string }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet for this startup.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((a) => (
        <li key={a.text} className="relative">
          <span className="absolute -left-[1.55rem] top-1.5 size-2 rounded-full bg-primary" aria-hidden />
          <p className="text-sm">{a.text}</p>
          <p className="text-[11px] text-muted-foreground">{a.time}</p>
        </li>
      ))}
    </ol>
  );
}

export function ReportCard({ report, onAction }: { report: WorkspaceReport; onAction: (a: string) => void }) {
  const tone =
    report.status === "Ready" ? "bg-success/12 text-success" : report.status === "Draft" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning";
  return (
    <SurfaceCard className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{report.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {report.category} · {report.version}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>{report.status}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{report.summary}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Generated</dt>
          <dd className="font-medium">{report.generated}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last updated</dt>
          <dd className="font-medium">{report.updated}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Button size="sm" variant="outline" onClick={() => onAction(`Preview ${report.name}`)}>
          Preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction(`Export ${report.name}`)} disabled={report.status === "Draft"}>
          Export
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAction(`Regenerate ${report.name}`)}>
          Regenerate
        </Button>
      </div>
    </SurfaceCard>
  );
}

export function SectionHeading({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <CircleAlert className="size-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
