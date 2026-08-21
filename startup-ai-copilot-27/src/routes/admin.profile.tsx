import { createFileRoute } from "@tanstack/react-router";
import {
  Globe,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [{ title: "Admin Profile — Admin Control Panel" }],
  }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Admin session signed out cleanly.");
    } catch {
      toast.error("Logout failed.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Admin Control Panel · Identity & Session"
        title="Administrator Profile"
        subtitle="Manage your authenticated administrator session, security status, and system identity."
      />

      <SurfaceCard className="p-8 space-y-6 border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 font-extrabold text-2xl border-2 border-amber-500/30 shadow-inner">
              {user?.full_name?.charAt(0) || "A"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-foreground">{user?.full_name || "System Administrator"}</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 border border-amber-500/30">
                  <ShieldCheck className="size-3" /> ADMIN
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email || "admin@aibusinesscopilot.com"}</p>
            </div>
          </div>

          <Button variant="destructive" onClick={handleLogout} className="gap-2 font-semibold">
            <LogOut className="size-4" /> End Admin Session
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-4">
            <Mail className="size-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-muted-foreground font-semibold">Administrator Email</p>
              <p className="font-bold text-foreground mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-4">
            <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-muted-foreground font-semibold">System Permission Role</p>
              <p className="font-bold text-emerald-600 uppercase mt-0.5">{user?.role} (Full Control)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-4">
            <Globe className="size-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-muted-foreground font-semibold">Account Timezone</p>
              <p className="font-bold text-foreground mt-0.5">{user?.timezone || "UTC"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-4">
            <KeyRound className="size-5 text-purple-500 shrink-0" />
            <div>
              <p className="text-muted-foreground font-semibold">Authentication Method</p>
              <p className="font-bold text-foreground mt-0.5">JWT Bearer Token + Bcrypt Hashed DB</p>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
