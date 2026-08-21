import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast.error("Admin authentication required. Please sign in.");
        navigate({ to: "/auth" });
      } else if (user?.role !== "admin") {
        toast.error("Access denied: Your account does not have administrator privileges.");
        navigate({ to: "/overview" });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-muted-foreground">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="size-7" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Administrator Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            You must be logged in as an administrator to access the system control panel.
          </p>
          <Button onClick={() => navigate({ to: "/auth" })} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar />
      <main className="flex-1 pl-64 min-w-0">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
