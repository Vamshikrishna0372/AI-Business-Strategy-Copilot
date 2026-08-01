import { Link } from "@tanstack/react-router";
import { Archive, Check, ChevronsUpDown, Settings2, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

export function StartupSwitcher({ className }: { className?: string }) {
  const { startups, activeStartup, setActiveId, favorites, archived } = useWorkspace();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-10 justify-between gap-2", className)} aria-label="Switch startup">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-[10px] font-semibold text-accent-foreground">
            {activeStartup.logo}
          </span>
          <span className="truncate">{activeStartup.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch startup workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {startups.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => setActiveId(s.id)} className="gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-[10px] font-semibold text-accent-foreground">
              {s.logo}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{s.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {s.industry} · {s.stage}
                {archived.includes(s.id) ? " · Archived" : ""}
              </span>
            </span>
            {favorites.includes(s.id) ? <Star className="size-3.5 fill-warning text-warning" /> : null}
            {s.id === activeStartup.id ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/startups">View all startups</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/startups/new">Create startup</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceHeader() {
  const { activeStartup, workspace, favorites, toggleFavorite, archived, toggleArchived } = useWorkspace();
  const isFavorite = favorites.includes(activeStartup.id);
  const isArchived = archived.includes(activeStartup.id);

  return (
    <section className="surface-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground">
          {activeStartup.logo}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{activeStartup.name}</h2>
            <Badge variant="secondary">{activeStartup.stage}</Badge>
            {isArchived ? <Badge variant="outline">Archived</Badge> : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {activeStartup.industry} · {activeStartup.country} · Updated {activeStartup.updated}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <StartupSwitcher className="hidden sm:flex" />
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(activeStartup.id)}
          >
            <Star className={cn("size-4", isFavorite && "fill-warning text-warning")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={isArchived ? "Unarchive startup" : "Archive startup"}
            aria-pressed={isArchived}
            onClick={() => toggleArchived(activeStartup.id)}
          >
            <Archive className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Workspace settings" asChild>
            <Link to="/settings">
              <Settings2 className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
        <Stat label="Business Health" value={`${workspace.scores[0]!.value}/100`} />
        <Stat label="Investor Readiness" value={`${activeStartup.investorReadiness}/100`} />
        <Stat label="Journey Completion" value={`${workspace.completion}%`} />
        <Stat label="Last Updated" value={activeStartup.updated} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
