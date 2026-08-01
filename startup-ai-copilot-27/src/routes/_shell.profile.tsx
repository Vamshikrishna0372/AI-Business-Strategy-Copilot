import { createFileRoute } from "@tanstack/react-router";
import { Award, Mail, MapPin } from "lucide-react";

import { MetricCard, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AI Business Strategy Copilot" },
      { name: "description", content: "Your founder profile: startups created, reports generated, achievements and preferences." },
      { property: "og:title", content: "Profile — AI Business Strategy Copilot" },
      { property: "og:description", content: "Your founder profile and achievements." },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <>
      <PageHeader title="Profile" subtitle="Your founder identity across every startup workspace." />

      <SurfaceCard hover={false}>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-16 shrink-0">
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">AR</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">Aarav Rao</h2>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> aarav@ecopack.ai</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> Bengaluru, India</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Badge variant="secondary">Pro plan (preview)</Badge>
            <Button variant="outline">Edit profile</Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Startups created" value={3} />
        <MetricCard label="Reports generated" value={18} />
        <MetricCard label="AI conversations" value={27} />
        <MetricCard label="Best readiness score" value={91} unit="/100" tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard>
          <h2 className="text-base font-semibold">Achievements</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["First strategy generated", "Mar 2026"],
              ["Idea validated above 85", "May 2026"],
              ["Financial plan completed", "Jun 2026"],
              ["Investor ready", "Jul 2026"],
            ].map(([t, d]) => (
              <div key={t} className="flex items-center gap-3 rounded-xl border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Award className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t}</span>
                  <span className="block text-xs text-muted-foreground">{d}</span>
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-base font-semibold">Preferences</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["AI tone", "Direct, investor-grade"],
              ["Default currency", "INR (₹)"],
              ["Report format", "PDF, A4"],
              ["Weekly digest", "Every Monday, 8:00 AM IST"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </SurfaceCard>
      </div>
    </>
  );
}
