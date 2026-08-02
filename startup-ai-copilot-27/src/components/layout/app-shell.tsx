import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  Command as CommandIcon,
  Compass,
  FileText,
  Gauge,
  Grid2x2,
  Home,
  LifeBuoy,
  MessageSquareText,
  Moon,
  Plus,
  Repeat2,
  Rocket,
  Route as RouteIcon,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  User,
  Wallet,
  Lightbulb,
  Building2,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logo from "@/assets/logo.png";
import { StartupSwitcher } from "@/components/workspace/workspace-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { journeyModules } from "@/data/workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const moduleIcons: Record<string, typeof Rocket> = {
  interview: MessageSquareText,
  validation: Lightbulb,
  strategy: ChartNoAxesCombined,
  competitors: Building2,
  canvas: Grid2x2,
  finance: Wallet,
  risk: ShieldAlert,
  investor: Target,
  roadmap: RouteIcon,
};

const workspaceItems = [
  { title: "My Startups", url: "/startups", icon: Rocket },
  { title: "Create Startup", url: "/startups/new", icon: Plus },
];

const currentStartupItems = [
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Founder Command Center", url: "/command", icon: Gauge },
  { title: "Reports Center", url: "/reports", icon: FileText },
  { title: "AI Copilot", url: "/copilot", icon: Sparkles },
];

const accountItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help Center", url: "/help", icon: LifeBuoy },
];

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { activeStartup, workspace } = useWorkspace();
  const journeyOpen = pathname === "/journey" || journeyModules.some((m) => m.route === pathname);

  const item = (i: { title: string; url: string; icon: typeof Rocket }) => (
    <SidebarMenuItem key={i.url}>
      <SidebarMenuButton asChild isActive={pathname === i.url} tooltip={i.title}>
        <Link to={i.url} className="flex items-center gap-2.5">
          <i.icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{i.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="gap-1">
        <div className={cn("flex items-center gap-2.5 px-3 py-4", collapsed && "justify-center px-0")}>
          <img src={logo} alt="Copilot logo" width={32} height={32} className="size-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">Copilot</p>
              <p className="truncate text-[11px] text-muted-foreground">AI Business Strategy</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{item({ title: "Home", url: "/dashboard", icon: Home })}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Startup Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{workspaceItems.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="truncate">
              Current Startup · {activeStartup?.name ?? "None selected"}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {currentStartupItems.slice(0, 1).map(item)}

              {workspace && (
              <Collapsible defaultOpen={journeyOpen} className="group/journey">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={pathname === "/journey"} tooltip="Business Journey">
                      <Compass className="size-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">Business Journey</span>
                          <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/journey:rotate-90" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === "/journey"}>
                            <Link to="/journey">All modules</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {workspace.modules.map((m) => {
                          const Icon = moduleIcons[m.key] ?? Compass;
                          return (
                            <SidebarMenuSubItem key={m.key}>
                              <SidebarMenuSubButton asChild isActive={pathname === m.route}>
                                <Link to={m.route} className="flex items-center gap-2">
                                  <Icon className="size-3.5 shrink-0" />
                                  <span className="truncate">{m.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
              )}

              {currentStartupItems.slice(1).map(item)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{accountItems.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { startups, setActiveId, workspace } = useWorkspace();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search startups, modules, reports, conversations…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/startups/new")}>Create startup</CommandItem>
          <CommandItem onSelect={() => go("/journey")}>Continue Business Journey</CommandItem>
          <CommandItem onSelect={() => go("/copilot")}>Open AI Copilot</CommandItem>
          <CommandItem onSelect={() => go("/reports")}>Open Reports Center</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Startups">
          {startups.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.name} ${s.industry} ${s.stage}`}
              onSelect={() => {
                setActiveId(s.id);
                go("/overview");
              }}
            >
              {s.name} <span className="ml-2 text-xs text-muted-foreground">{s.industry}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Business modules">
          {workspace?.modules.map((m) => (
            <CommandItem key={m.key} value={m.title} onSelect={() => go(m.route)}>
              {m.title} <span className="ml-2 text-xs text-muted-foreground">{m.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Reports">
          {workspace?.reports.map((r) => (
            <CommandItem key={r.key} value={`${r.name} report`} onSelect={() => go("/reports")}>
              {r.name} <span className="ml-2 text-xs text-muted-foreground">{r.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="AI conversations">
          {workspace?.conversations.map((c) => (
            <CommandItem key={c.id} value={c.title} onSelect={() => go("/copilot")}>
              {c.title} <span className="ml-2 text-xs text-muted-foreground">{c.updated}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Recent activity">
          {workspace?.activities.map((a) => (
            <CommandItem key={a.text} value={a.text} onSelect={() => go("/overview")}>
              {a.text} <span className="ml-2 text-xs text-muted-foreground">{a.time}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function TopBar() {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, archiveNotification } = useWorkspace();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "FU";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="shrink-0" aria-label="Toggle sidebar" />
        <StartupSwitcher className="max-w-48 sm:flex" />
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="hidden h-10 min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border bg-background px-3 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring md:flex"
        aria-label="Open global search"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search startups, reports, conversations…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border px-1.5 text-[10px] lg:inline">⌘K</kbd>
      </button>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 grid size-2 place-items-center rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-2">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                Mark all read
              </Button>
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    markRead(n.id);
                  }}
                  className="flex-col items-start gap-0.5 py-2"
                >
                  <span className="flex w-full items-center gap-2">
                    {!n.read ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    <span className="text-sm font-medium">{n.title}</span>
                    <button
                      type="button"
                      className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveNotification(n.id);
                      }}
                    >
                      Archive
                    </button>
                  </span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-[11px] text-muted-foreground">{n.time}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
          {dark ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Profile menu">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{user?.full_name || "Founder"}</DropdownMenuLabel>
            <p className="px-2 pb-2 text-[11px] text-muted-foreground truncate">{user?.email}</p>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
          <footer className="border-t px-6 py-4 text-xs text-muted-foreground">
            AI Business Strategy Copilot · v1.0.0 · Built for founders
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
