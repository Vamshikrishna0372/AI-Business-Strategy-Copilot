import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, FileText, MessageSquareText } from "lucide-react";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import {
  ActivityTimeline,
  BusinessScoreCard,
  InsightCard,
  NextBestAction,
  SectionHeading,
  StatusBadge,
} from "@/components/workspace/workspace-ui";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import { eventBus, EVENTS } from "@/lib/events";

export const Route = createFileRoute("/_shell/overview")({
  head: () => ({
    meta: [
      { title: "Startup Overview — AI Business Strategy Copilot" },
      { name: "description", content: "The executive home page of your startup workspace: health, priority, progress and recent activity." },
      { property: "og:title", content: "Startup Overview — AI Business Strategy Copilot" },
      { property: "og:description", content: "What is happening in your startup and what to do next." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { activeStartup, workspace, notifications, refetchStartups } = useWorkspace();
  const headline = workspace.scores.filter((s) => ["health", "investor", "execution", "innovation", "financial"].includes(s.key));

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
        eyebrow={`${activeStartup.industry} · ${activeStartup.stage}`}
        title="Overview"
        subtitle={workspace.description}
        actions={
          <Button variant="hero" asChild>
            <Link to="/journey">
              Continue journey <ArrowRight />
            </Link>
          </Button>
        }
      />

      <NextBestAction action={workspace.nextAction} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="lg:col-span-2">
          <SectionHeading title="Startup summary" hint="Generated from your AI Business Interview." />
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Mission</dt>
              <dd className="mt-1 text-sm">{workspace.mission && !workspace.mission.includes("pending") ? workspace.mission : "Generate after AI Interview"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Vision</dt>
              <dd className="mt-1 text-sm">{workspace.vision && !workspace.vision.includes("pending") ? workspace.vision : "Generate after AI Interview"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Industry</dt>
              <dd className="mt-1 text-sm">{activeStartup.industry || "Not selected"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Stage</dt>
              <dd className="mt-1 text-sm">
                {activeStartup.stage || "Not selected"}{activeStartup.country ? ` · ${activeStartup.country}` : ""}
              </dd>
            </div>
          </dl>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading title="Today's priority" />
          <p className="mt-3 text-sm">{workspace.weeklyGoal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{workspace.weeklyGoal.detail}</p>
          <div className="mt-4 space-y-2">
            {workspace.milestones.map((m) => (
              <div key={m.title} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">{m.when}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{m.status}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {headline.map((s) => (
          <BusinessScoreCard key={s.key} score={s} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard>
          <SectionHeading title="Recent activity" hint={`Scoped to ${activeStartup.name}.`} />
          <div className="mt-4">
            <ActivityTimeline items={workspace.activities} />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Recent reports"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link to="/reports">All</Link>
              </Button>
            }
          />
          <ul className="mt-4 space-y-2">
            {workspace.reports.slice(0, 5).map((r) => (
              <li key={r.key} className="flex items-center gap-2 rounded-lg border p-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{r.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {r.version} · {r.updated}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Recent conversations"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link to="/copilot">Open</Link>
              </Button>
            }
          />
          {workspace.conversations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No conversations yet. Ask the AI Copilot your first business question.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {workspace.conversations.slice(0, 4).map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{c.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{c.preview}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeading title="AI insights" hint="Prioritised recommendations for this startup." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {workspace.insights.slice(0, 4).map((i) => (
              <InsightCard key={i.kind} insight={i} />
            ))}
          </div>
        </div>
        <SurfaceCard>
          <SectionHeading title="Recent notifications" />
          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No notifications for this startup.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{n.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{n.time}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Journey status</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs">{workspace.nextAction.title}</span>
              <StatusBadge status="In progress" />
            </div>
          </div>
        </SurfaceCard>
      </div>
    </>
  );
}
