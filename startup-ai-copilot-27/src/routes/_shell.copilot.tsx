import { createFileRoute } from "@tanstack/react-router";
import { Pin, Plus, Send, Sparkles, Trash2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { SectionHeading } from "@/components/workspace/workspace-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { suggestedPrompts } from "@/data/workspace";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import { copilotService, type BackendConversation, type ChatMessage } from "@/services/copilot-service";
import { eventBus, EVENTS } from "@/lib/events";

export const Route = createFileRoute("/_shell/copilot")({
  head: () => ({
    meta: [
      { title: "AI Copilot — AI Business Strategy Copilot" },
      { name: "description", content: "An AI business assistant scoped to the startup you're working on: pricing, strategy, hiring, fundraising and growth." },
      { property: "og:title", content: "AI Copilot — AI Business Strategy Copilot" },
      { property: "og:description", content: "Ask business questions inside your startup workspace." },
    ],
  }),
  component: CopilotPage,
});

function CopilotPage() {
  const { activeStartup, activeId } = useWorkspace();

  const [conversations, setConversations] = useState<BackendConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<BackendConversation | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load conversations list for current startup
  const loadConversations = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const list = await copilotService.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0]!.id);
      }
    } catch (err) {
      console.warn("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [activeId, activeConvId]);

  useEffect(() => {
    loadConversations();
    const unsub = eventBus.on(EVENTS.CHAT_UPDATED, () => loadConversations());
    return () => unsub();
  }, [loadConversations]);

  // Load active conversation details
  const loadActiveConv = useCallback(async (id: string) => {
    try {
      const details = await copilotService.getConversationDetails(id);
      setActiveConv(details);
    } catch {
      setActiveConv(null);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadActiveConv(activeConvId);
    } else {
      setActiveConv(null);
    }
  }, [activeConvId, loadActiveConv]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, thinking]);

  // Create new conversation
  const handleNewChat = async () => {
    try {
      const newConv = await copilotService.createConversation(`Chat ${conversations.length + 1}`);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setActiveConv(newConv);
      toast.success("New conversation started!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create new conversation.");
    }
  };

  // Send message
  const handleSend = async (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;

    let targetId = activeConvId;
    if (!targetId) {
      try {
        const newConv = await copilotService.createConversation(value.slice(0, 30));
        targetId = newConv.id;
        setActiveConvId(targetId);
        setConversations((prev) => [newConv, ...prev]);
      } catch {
        toast.error("Failed to start chat.");
        return;
      }
    }

    // Optimistic local update — add user message immediately
    const userMsg: ChatMessage = { id: String(Date.now()), role: "user", content: value };
    setActiveConv((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : null));
    setInput("");
    setThinking(true);

    try {
      const res = await copilotService.sendMessage(targetId, value);
      // Backend returns conversation with all messages (sender field, not role)
      // Map backend sender → frontend role for display consistency
      if (res.conversation) {
        const mappedConv: BackendConversation = {
          ...res.conversation,
          messages: res.conversation.messages.map((m: any) => ({
            ...m,
            role: (m.sender === "user" ? "user" : m.sender === "assistant" ? "assistant" : "system") as "user" | "assistant" | "system",
            content: m.content,
          })),
        };
        setActiveConv(mappedConv);
        // Update conversation in sidebar list
        setConversations((prev) =>
          prev.map((c) => (c.id === mappedConv.id ? { ...c, title: mappedConv.title } : c))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
      // Roll back optimistic update on error
      setActiveConv((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== userMsg.id) } : null
      );
    } finally {
      setThinking(false);
    }
  };

  // Pin/unpin conversation
  const togglePin = async (c: BackendConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copilotService.updateConversation(c.id, { is_pinned: !c.is_pinned });
      loadConversations();
    } catch {
      toast.error("Failed to update conversation.");
    }
  };

  // Delete conversation
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copilotService.deleteConversation(id);
      setConversations((prev) => prev.filter((x) => x.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setActiveConv(null);
      }
      toast.success("Conversation deleted.");
    } catch {
      toast.error("Failed to delete conversation.");
    }
  };

  const pinnedList = conversations.filter((c) => c.is_pinned);
  const recentList = conversations.filter((c) => !c.is_pinned);

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="AI Copilot"
        subtitle="A business assistant that already knows this startup's context. Ask anything about pricing, strategy, growth or fundraising."
        actions={
          <Button variant="outline" onClick={handleNewChat}>
            <Plus /> New conversation
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main Chat Interface */}
        <SurfaceCard hover={false} className="flex min-h-[32rem] flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {!activeConv || activeConv.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="text-base font-semibold">Ask your first question</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Everything you ask stays scoped to {activeStartup.name}. Try one of the suggested questions below.
                </p>
              </div>
            ) : (
              activeConv.messages.map((m: any, i) => {
                const isUser = m.role === "user" || m.sender === "user";
                return (
                  <div key={m.id || i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isUser ? "bg-primary text-primary-foreground" : "bg-accent/50 text-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                AI Strategy Copilot is generating response…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {suggestedPrompts.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60"
                >
                  {p}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                rows={2}
                placeholder={`Ask about ${activeStartup.name}…`}
                aria-label="Message the AI Copilot"
                className="min-h-16 resize-none"
              />
              <Button type="submit" size="icon" variant="hero" aria-label="Send message" disabled={!input.trim() || thinking}>
                <Send />
              </Button>
            </form>
          </div>
        </SurfaceCard>

        {/* Conversations Sidebar */}
        <div className="space-y-4">
          <SurfaceCard>
            <SectionHeading title="Pinned conversations" />
            {pinnedList.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No pinned chats yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pinnedList.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2.5 text-xs cursor-pointer transition-colors hover:bg-accent/50",
                      activeConvId === c.id && "border-primary bg-accent/40 font-semibold"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        <Pin className="size-3 text-primary shrink-0" />
                        {c.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.messages.length} messages</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => togglePin(c, e)} className="p-1 text-muted-foreground hover:text-foreground">
                        <Pin className="size-3" />
                      </button>
                      <button onClick={(e) => handleDelete(c.id, e)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading title="Recent conversations" />
            {loading ? (
              <p className="mt-3 text-xs text-muted-foreground">Loading conversations…</p>
            ) : recentList.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No conversation history for this startup.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentList.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2.5 text-xs cursor-pointer transition-colors hover:bg-accent/50",
                      activeConvId === c.id && "border-primary bg-accent/40 font-semibold"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium flex items-center gap-1.5">
                        <MessageSquare className="size-3 text-muted-foreground shrink-0" />
                        {c.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{c.messages.length} messages</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => togglePin(c, e)} className="p-1 text-muted-foreground hover:text-foreground">
                        <Pin className="size-3" />
                      </button>
                      <button onClick={(e) => handleDelete(c.id, e)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading title="Suggested questions" />
            <ul className="mt-3 space-y-1.5">
              {suggestedPrompts.slice(4).map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => handleSend(p)}
                    className="w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-accent/60"
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </div>
      </div>
    </>
  );
}
