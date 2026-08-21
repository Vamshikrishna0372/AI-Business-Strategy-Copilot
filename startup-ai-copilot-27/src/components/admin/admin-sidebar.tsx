import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  UserCheck,
  Users,
  Settings,
  User as UserIcon,
} from "lucide-react";

import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Startup Workspaces", url: "/admin/startups", icon: Building2 },
  { title: "AI Interviews", url: "/admin/interviews", icon: MessageSquareText },
  { title: "System Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Admin Profile", url: "/admin/profile", icon: UserIcon },
  { title: "System Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card shadow-xl transition-all duration-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link to="/admin" className="flex items-center gap-3 font-bold text-foreground">
          <img src={logo} alt="Copilot" className="size-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight">Strategy Copilot</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Admin Control Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Core Administration
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.url : pathname.startsWith(item.url);
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("size-4 shrink-0", isActive ? "text-amber-500" : "text-muted-foreground")} />
                <span>{item.title}</span>
              </div>
              {isActive && <ChevronRight className="size-4 text-amber-500" />}
            </Link>
          );
        })}

        <div className="pt-4 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspace Switcher
        </div>

        <Link
          to="/overview"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          <ArrowRightLeft className="size-4 text-indigo-500 shrink-0" />
          <span>Switch to Founder View</span>
        </Link>
      </nav>

      {/* Admin Profile Footer */}
      <div className="border-t bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 font-extrabold text-sm border border-amber-500/30">
              {user?.full_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{user?.full_name || "System Admin"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email || "admin@aibusinesscopilot.com"}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 border border-amber-500/20">
            <ShieldCheck className="size-3" /> ADMIN
          </span>
        </div>

        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-white"
        >
          <LogOut className="size-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
