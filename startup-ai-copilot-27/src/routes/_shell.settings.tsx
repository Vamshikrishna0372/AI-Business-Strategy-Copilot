import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Business Strategy Copilot" },
      { name: "description", content: "Account, notifications, security, AI preferences, theme, language, privacy and connected accounts." },
      { property: "og:title", content: "Settings — AI Business Strategy Copilot" },
      { property: "og:description", content: "Configure your workspace and AI preferences." },
    ],
  }),
  component: SettingsPage,
});

const toggles: Record<string, [string, string, boolean][]> = {
  notifications: [
    ["Strategy generated", "Email me when a new strategy version is ready", true],
    ["Investor score changes", "Notify me when readiness moves by 3+ points", true],
    ["Weekly digest", "A Monday summary of progress and next actions", true],
    ["Product updates", "Occasional news about new AI modules", false],
  ],
  security: [
    ["Two-factor authentication", "Require a code at every sign-in", true],
    ["Active session alerts", "Warn me about new device sign-ins", true],
    ["Data export requests", "Email confirmation before exports", false],
  ],
  ai: [
    ["Direct feedback", "Let the AI challenge weak assumptions", true],
    ["Cite evidence", "Attach reasoning and data to every score", true],
    ["Proactive insights", "Surface daily insights without being asked", true],
    ["Conservative financials", "Use cautious growth assumptions", false],
  ],
  privacy: [
    ["Use my data to improve models", "Anonymised only", false],
    ["Share reports with collaborators", "Anyone with the link can view", true],
  ],
};

function SettingsPage() {
  const { user } = useAuth();
  const { activeStartup } = useWorkspace();

  return (
    <>
      <PageHeader title="Settings" subtitle="Control your account, security, AI behaviour and privacy." />

      <Tabs defaultValue="account">
        <TabsList className="flex w-full flex-wrap justify-start">
          {["Account", "Notifications", "Security", "AI", "Appearance", "Privacy", "Connected"].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase()}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <SurfaceCard hover={false}>
            <h2 className="text-base font-semibold">Account</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input className="h-11" defaultValue={user?.full_name || ""} placeholder="Your Full Name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input className="h-11" defaultValue={user?.email || ""} placeholder="your@email.com" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Active Workspace / Startup</Label>
                <Input className="h-11" defaultValue={activeStartup?.name || ""} placeholder="Startup Name" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input className="h-11" defaultValue={activeStartup?.industry || ""} placeholder="Industry" readOnly />
              </div>
            </div>
            <Button variant="hero" className="mt-5">Save changes</Button>
          </SurfaceCard>
        </TabsContent>

        {(["notifications", "security", "ai", "privacy"] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <SurfaceCard hover={false}>
              <div className="divide-y">
                {toggles[key]!.map(([title, desc, on]) => (
                  <div key={title} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch defaultChecked={on} aria-label={title} />
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </TabsContent>
        ))}

        <TabsContent value="appearance" className="mt-4">
          <SurfaceCard hover={false}>
            <h2 className="text-base font-semibold">Theme & language</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the moon icon in the top bar to switch between light and dark. Language support ships with the next release.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Light", "Dark", "System"].map((t) => (
                <div key={t} className="rounded-xl border p-4 text-sm font-medium">{t}</div>
              ))}
            </div>
          </SurfaceCard>
        </TabsContent>

        <TabsContent value="connected" className="mt-4">
          <SurfaceCard hover={false}>
            <h2 className="text-base font-semibold">Connected accounts</h2>
            <div className="mt-4 divide-y">
              {[["Google", "aarav@ecopack.ai", "Connected"], ["Shopify", "ecopack.myshopify.com", "Connected"], ["Slack", "Not connected", "Connect"]].map(
                ([name, detail, action]) => (
                  <div key={name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                    <Button variant={action === "Connect" ? "hero" : "outline"} size="sm">
                      {action === "Connect" ? "Connect" : "Disconnect"}
                    </Button>
                  </div>
                ),
              )}
            </div>
          </SurfaceCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
