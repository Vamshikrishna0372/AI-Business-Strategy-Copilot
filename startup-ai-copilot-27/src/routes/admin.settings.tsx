import { createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  CheckCircle2,
  Database,
  Shield,
} from "lucide-react";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "System Settings — Admin Control Panel" }],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Admin Control Panel · System Infrastructure"
        title="System Settings & Configuration"
        subtitle="Operational parameters, database connection info, AI rate limits, and security configuration."
      />

      <div className="space-y-6">
        <SurfaceCard className="p-6 space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Shield className="size-5 text-amber-500" /> Security & Access Controls
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-1">
              <p className="font-bold text-foreground">Backend RBAC Enforcement</p>
              <p className="text-muted-foreground">All `/api/v1/admin/*` endpoints strictly require `require_admin` dependency checks.</p>
            </div>
            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-1">
              <p className="font-bold text-foreground">Password Hashing</p>
              <p className="text-muted-foreground">Bcrypt password hashing enabled with salt rounds.</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 space-y-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Database className="size-5 text-indigo-500" /> Infrastructure Providers
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl border p-3.5 bg-card">
              <div className="flex items-center gap-3">
                <Database className="size-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">MongoDB Atlas</p>
                  <p className="text-muted-foreground text-[11px]">Primary database engine</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="size-3.5" /> Connected
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3.5 bg-card">
              <div className="flex items-center gap-3">
                <Brain className="size-5 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Gemini / Groq AI Strategy Engine</p>
                  <p className="text-muted-foreground text-[11px]">Dynamic diagnostic questioning</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-indigo-600 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                <CheckCircle2 className="size-3.5" /> Operational
              </span>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
