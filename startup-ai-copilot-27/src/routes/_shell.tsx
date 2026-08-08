import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { journeyModules } from "@/data/workspace";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

const workspacePaths = new Set<string>([
  "/overview",
  "/journey",
  "/command",
  "/reports",
  "/copilot",
  ...journeyModules.map((m) => m.route),
]);

function ShellLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const showHeader = workspacePaths.has(pathname);
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = `/auth?redirect=${encodeURIComponent(pathname)}`;
      }
    }
  }, [isLoading, isAuthenticated, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WorkspaceProvider>
      <AppShell>
        {showHeader ? <WorkspaceHeader /> : null}
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  );
}
