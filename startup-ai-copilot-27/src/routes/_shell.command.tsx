import { createFileRoute, Link } from "@tanstack/react-router";

import { Bar, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import {
  ActivityTimeline,
  BusinessScoreCard,
  InsightCard,
  NextBestAction,
  SectionHeading,
} from "@/components/workspace/workspace-ui";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { eventBus, EVENTS } from "@/lib/events";

export const Route = createFileRoute("/_shell/command")({
  head: () => ({
    meta: [
      { title: "Founder Command Center — AI Business Strategy Copilot" },
      { name: "description", content: "Decision-grade view of business health, investor readiness, risk, priorities and AI recommendations." },
      { property: "og:title", content: "Founder Command Center — AI Business Strategy Copilot" },
      { property: "og:description", content: "Every KPI comes with a reason, a trend and a recommendation." },
    ],
  }),
  component: CommandCenter,
});



function CommandCenter() {
  const { activeStartup, workspace, refetchStartups } = useWorkspace();

  useEffect(() => {
    const unsubReport = eventBus.on(EVENTS.AI_REPORT_GENERATED, () => refetchStartups());
    const unsubInterview = eventBus.on(EVENTS.INTERVIEW_UPDATED, () => refetchStartups());

    return () => {
      unsubReport();
      unsubInterview();
    };
  }, [refetchStartups]);

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="Founder Command Center"
        subtitle="Everything you need to make this week's decisions — no vanity metrics."
        actions={
          <Button variant="outline" asChild>
            <Link to="/reports">Generate report</Link>
          </Button>
        }
      />

      <NextBestAction action={workspace.nextAction} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {workspace.scores.map((s) => (
          <BusinessScoreCard key={s.key} score={s} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <SectionHeading title="Business pulse" hint="Score, health and funding readiness over time." />
          <div className="mt-4 h-72 flex items-center justify-center flex-col gap-2 text-muted-foreground text-xs text-center">
            <Sparkles className="size-6 opacity-30" />
            <p>Complete the AI Business Interview to generate your business pulse chart.</p>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading title="Weekly goal" />
          <p className="mt-3 text-sm">{workspace.weeklyGoal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{workspace.weeklyGoal.detail}</p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{workspace.weeklyGoal.progress}%</span>
            </div>
            <Bar value={workspace.weeklyGoal.progress} />
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Business timeline</p>
            {workspace.milestones.map((m) => (
              <div key={m.title} className="rounded-lg border p-2.5">
                <p className="text-xs font-medium">{m.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.when} · {m.status}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div>
        <SectionHeading title="AI recommendations" hint="Ranked by expected impact on this startup." />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.insights.map((i) => (
            <InsightCard key={i.kind} insight={i} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard>
          <SectionHeading title="Recent progress" />
          <div className="mt-4">
            <ActivityTimeline items={workspace.activities} />
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <SectionHeading
            title="Recent reports"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link to="/reports">Reports Center</Link>
              </Button>
            }
          />
          <ul className="mt-4 space-y-2">
            {workspace.reports.slice(0, 6).map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{r.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {r.version} · {r.updated}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>
    </>
  );
}
