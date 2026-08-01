import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { startupService, type BackendStartup } from "@/services/startup-service";
import { type Startup } from "@/data/mock";
import { buildWorkspace, type Workspace } from "@/data/workspace";
import { setActiveStartupId as setClientActiveStartupId, getActiveStartupId } from "./api-client";
import { notificationsService, type AppNotificationItem } from "@/services/notifications-service";
import { eventBus, EVENTS } from "./events";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "success" | "info" | "warning";
  startupId: string;
  read: boolean;
  archived: boolean;
};

/** Sentinel empty startup — shown only while loading, never as a real startup */
const EMPTY_STARTUP: Startup = {
  id: "",
  name: "",
  industry: "",
  country: "",
  stage: "",
  score: 0,
  investorReadiness: 0,
  updated: "",
  tagline: "",
  logo: "",
};

type WorkspaceContextValue = {
  startups: Startup[];
  rawStartups: BackendStartup[];
  activeStartup: Startup | null;
  rawActiveStartup: BackendStartup | null;
  workspace: Workspace | null;
  activeId: string;
  setActiveId: (id: string) => void;
  isLoading: boolean;
  refetchStartups: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  archived: string[];
  toggleArchived: (id: string) => void;
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  archiveNotification: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function mapBackendStartupToUI(b: BackendStartup): Startup {
  const stageFormatted = b.stage ? b.stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Idea";
  const initials = b.name
    ? b.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "ST";

  return {
    id: b.id,
    name: b.name,
    industry: b.industry || "Technology",
    country: "United States",
    stage: stageFormatted,
    score: Math.round(b.overall_score || 0),
    investorReadiness: Math.round(b.overall_score || 0),
    updated: "Just now",
    tagline: b.description || b.problem_statement || `${b.name} business strategy workspace.`,
    logo: initials,
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rawStartups, setRawStartups] = useState<BackendStartup[]>([]);
  const [activeId, setActiveIdState] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadStartups = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await startupService.listStartups();
      setRawStartups(list);

      const storedId = getActiveStartupId();
      let targetId = storedId;

      if (!targetId || !list.some((s) => s.id === targetId)) {
        targetId = list.length > 0 ? list[0]!.id : "";
      }

      if (targetId) {
        setActiveIdState(targetId);
        setClientActiveStartupId(targetId);
      }
    } catch (err) {
      // On network error, show empty state — never fall back to demo data
      console.error("Failed to load startups from backend:", err);
      setRawStartups([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const items = await notificationsService.listNotifications();
      const mapped: AppNotification[] = items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.message,
        time: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        kind: n.type === "WARNING" ? "warning" : n.type === "SUCCESS" ? "success" : "info",
        startupId: activeId,
        read: n.is_read,
        archived: false,
      }));
      setNotifications(mapped);
    } catch {
      // Keep existing
    }
  }, [activeId]);

  useEffect(() => {
    loadStartups();
    loadNotifications();

    const unsub = eventBus.on(EVENTS.NOTIFICATIONS_UPDATED, () => loadNotifications());
    return () => unsub();
  }, [loadStartups, loadNotifications]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    setClientActiveStartupId(id);
    startupService.activateStartup(id).catch(() => {});
    eventBus.emit(EVENTS.STARTUP_CHANGED, id);
  }, []);

  const uiStartups: Startup[] = useMemo(
    () => rawStartups.map(mapBackendStartupToUI),
    [rawStartups]
  );

  const activeStartup: Startup | null = useMemo(() => {
    if (uiStartups.length === 0) return null;
    return uiStartups.find((s) => s.id === activeId) ?? uiStartups[0] ?? null;
  }, [uiStartups, activeId]);

  const rawActiveStartup: BackendStartup | null = useMemo(
    () => rawStartups.find((s) => s.id === activeId) ?? rawStartups[0] ?? null,
    [rawStartups, activeId]
  );

  const workspace: Workspace | null = useMemo(
    () => (activeStartup ? buildWorkspace(activeStartup) : null),
    [activeStartup]
  );

  const value: WorkspaceContextValue = {
    startups: uiStartups,
    rawStartups,
    activeStartup,
    rawActiveStartup,
    workspace,
    activeId: activeStartup?.id ?? "",
    setActiveId,
    isLoading,
    refetchStartups: loadStartups,
    favorites,
    toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    archived,
    toggleArchived: (id) => setArchived((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])),
    notifications: notifications.filter((n) => n.startupId === (activeStartup?.id ?? "") && !n.archived),
    unreadCount: notifications.filter((n) => n.startupId === (activeStartup?.id ?? "") && !n.archived && !n.read).length,
    markRead: (id) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))),
    markAllRead: () =>
      setNotifications((n) => n.map((x) => (x.startupId === (activeStartup?.id ?? "") ? { ...x, read: true } : x))),
    archiveNotification: (id) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, archived: true } : x))),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
