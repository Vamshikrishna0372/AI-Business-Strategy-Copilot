import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mic, Pin, RefreshCw, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { AiBadge, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analysisStages } from "@/data/mock";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";
import {
  aiModulesService,
  type InterviewQuestion,
  type InterviewStatusResponse,
} from "@/services/ai-modules-service";

export const Route = createFileRoute("/_shell/interview")({
  head: () => ({
    meta: [
      { title: "AI Business Interview — Strategy Copilot" },
      { name: "description", content: "A guided AI conversation that turns your answers into a validated business strategy." },
      { property: "og:title", content: "AI Business Interview — Strategy Copilot" },
      { property: "og:description", content: "Ten intelligent questions instead of a form." },
    ],
  }),
  component: Interview,
});

type Msg = { role: "ai" | "user"; text: string };

function Interview() {
  const { activeStartup, activeId } = useWorkspace();

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Interview session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // History for sidebar
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string; category: string }>>([]);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!thinking && !analysing) inputRef.current?.focus();
  }, [messages, thinking, analysing]);

  // Analysis stage progress animation
  useEffect(() => {
    if (!analysing) return;
    if (stage >= analysisStages.length) return;
    const t = setTimeout(() => setStage((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [analysing, stage]);

  // Load existing interview status on mount / startup change
  const loadStatus = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const status = await aiModulesService.getInterviewStatus(activeId);
      setInterviewStatus(status);
      setQaHistory(status.qa_history ?? []);
      setProgress(status.progress_percentage ?? 0);

      if (status.status === "completed") {
        setIsComplete(true);
        setAnalysing(false);
        setSessionId(status.session_id);
        const completionMsg: Msg = {
          role: "ai",
          text:
            status.summary ||
            "Interview complete! Your startup data has been analysed. You can now explore the other modules.",
        };
        setMessages([completionMsg]);
        if (status.key_insights?.length) {
          setMessages((m) => [
            ...m,
            {
              role: "ai",
              text: "Key insights: " + status.key_insights!.join(" · "),
            },
          ]);
        }
      } else if (status.status === "in_progress" && status.session_id) {
        setSessionId(status.session_id);
        // Rebuild chat from qa_history
        const history: Msg[] = [
          {
            role: "ai",
            text: `Welcome back! You're on question ${status.current_question_number} of ${status.total_questions} for ${activeStartup.name}. Let's continue.`,
          },
        ];
        for (const qa of status.qa_history) {
          history.push({ role: "ai", text: qa.question });
          history.push({ role: "user", text: qa.answer });
        }
        setMessages(history);
      } else {
        // Not started — show welcome
        setMessages([
          {
            role: "ai",
            text: `Welcome! I'm your AI Business Strategy Copilot. I'll ask strategic questions about ${activeStartup.name}, then generate your complete business strategy, financials, and investor plan. Click "Start Interview" to begin.`,
          },
        ]);
      }
    } catch {
      setMessages([
        {
          role: "ai",
          text: `Welcome! I'm ready to interview you about ${activeStartup.name}. Click "Start Interview" to begin your AI business analysis.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [activeId, activeStartup.name]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Start a new interview
  const startInterview = async () => {
    setStarting(true);
    try {
      const res = await aiModulesService.startInterview();
      setSessionId(res.session_id);
      setCurrentQuestion(res.first_question);
      setProgress(0);
      setMessages((m) => [
        ...m,
        { role: "ai", text: res.first_question.question },
      ]);
      toast.success("Interview started!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start interview. Is the backend running?");
    } finally {
      setStarting(false);
    }
  };

  // Submit an answer
  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking || isComplete) return;
    if (!sessionId || !currentQuestion) {
      toast.warning("Please start the interview first.");
      return;
    }

    setMessages((m) => [...m, { role: "user", text: value }]);
    setDraft("");
    setThinking(true);

    try {
      const res = await aiModulesService.submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.question_id,
        question: currentQuestion.question,
        answer: value,
        category: currentQuestion.category,
      });

      setProgress(res.progress_percentage);
      setQaHistory((h) => [
        ...h,
        { question: currentQuestion.question, answer: value, category: currentQuestion.category },
      ]);

      if (res.is_complete) {
        setThinking(false);
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            text: `That's everything I need. Let me analyse ${activeStartup.name} end to end.`,
          },
        ]);
        setAnalysing(true);
        setStage(0);
        setCurrentQuestion(null);

        // Complete the interview
        try {
          const completion = await aiModulesService.completeInterview(sessionId);
          setIsComplete(true);
          setMessages((m) => [
            ...m,
            { role: "ai", text: completion.summary || "Analysis complete!" },
            {
              role: "ai",
              text: `Modules now ready: ${(completion.modules_ready ?? []).join(", ")}. Report version v${completion.report_version}.`,
            },
          ]);
          toast.success("Interview complete! All modules are now ready.");
        } catch {
          // Analysis finished anyway, status will reflect
        }
      } else if (res.next_question) {
        setCurrentQuestion(res.next_question);
        setMessages((m) => [...m, { role: "ai", text: res.next_question!.question }]);
        setThinking(false);
      }
    } catch (err: any) {
      setThinking(false);
      toast.error(err?.message || "Failed to submit answer. Please try again.");
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Sorry, I had trouble processing that. Please try again." },
      ]);
    }
  };

  const questionNum = currentQuestion?.question_number ?? (qaHistory.length + 1);
  const totalQ = currentQuestion?.total_questions ?? 10;

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="AI Business Interview"
        subtitle="A conversation, not a form. Every answer sharpens the next question."
        actions={
          isComplete ? (
            <Button variant="hero" asChild>
              <Link to="/validation">
                View validation <ArrowRight />
              </Link>
            </Button>
          ) : sessionId ? (
            <AiBadge>Question {Math.min(questionNum, totalQ)} of {totalQ}</AiBadge>
          ) : (
            <Button variant="hero" onClick={startInterview} disabled={starting || loading}>
              <Sparkles />
              {starting ? "Starting…" : "Start Interview"}
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SurfaceCard hover={false} className="flex h-[640px] flex-col p-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <img src={logo} alt="" width={32} height={32} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Strategy Copilot</p>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Loading interview status…"
                  : isComplete
                  ? "Interview complete · All modules ready"
                  : sessionId
                  ? "Analysing as you answer · AI-powered"
                  : "Ready to begin your interview"}
              </p>
            </div>
            {sessionId && !isComplete && (
              <div className="hidden w-32 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin" />
                  Loading interview status…
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-3 animate-rise", m.role === "user" && "justify-end")}>
                    {m.role === "ai" && (
                      <img src={logo} alt="" width={28} height={28} loading="lazy" className="mt-1 size-7 shrink-0" />
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="" width={28} height={28} loading="lazy" className="size-7" />
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Thinking
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="size-1.5 animate-blink rounded-full bg-muted-foreground"
                          style={{ animationDelay: `${d * 0.18}s` }}
                        />
                      ))}
                    </span>
                  </div>
                )}

                {analysing && (
                  <div className="rounded-2xl border bg-accent/40 p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="size-4 text-brand" /> Running full analysis on {activeStartup.name}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {analysisStages.map((s, i) => (
                        <li key={s} className={cn("flex items-center gap-2 text-sm", i > stage && "text-muted-foreground/60")}>
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              i < stage ? "bg-success" : i === stage ? "animate-blink bg-primary" : "bg-muted-foreground/40",
                            )}
                          />
                          {s}
                        </li>
                      ))}
                    </ul>
                    {stage >= analysisStages.length && isComplete && (
                      <Button variant="hero" className="mt-4" asChild>
                        <Link to="/validation">
                          View validation results <ArrowRight />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-4">
            {/* Suggestion chips */}
            {currentQuestion?.suggestions && currentQuestion.suggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {currentQuestion.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                placeholder={
                  loading
                    ? "Loading…"
                    : !sessionId && !isComplete
                    ? "Click 'Start Interview' above to begin…"
                    : isComplete
                    ? "Interview complete. Explore the modules above."
                    : "Type your answer…"
                }
                className="min-h-11 resize-none"
                aria-label="Your answer"
                disabled={!sessionId || isComplete || thinking || loading}
              />
              <Button variant="outline" size="icon" aria-label="Voice input (coming soon)" disabled>
                <Mic />
              </Button>
              <Button
                variant="hero"
                size="icon"
                onClick={() => void send(draft)}
                aria-label="Send answer"
                disabled={!sessionId || isComplete || thinking || !draft.trim()}
              >
                <Send />
              </Button>
            </div>
          </div>
        </SurfaceCard>

        {/* Sidebar */}
        <div className="space-y-4">
          <SurfaceCard>
            <h2 className="text-sm font-semibold">Interview progress</h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{qaHistory.length} questions answered</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
              </div>
              {isComplete && (
                <p className="rounded-lg bg-success/12 px-3 py-2 text-xs font-semibold text-success">
                  ✓ Interview complete — all modules ready
                </p>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="text-sm font-semibold">Questions answered</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {qaHistory.length === 0 ? (
                <li className="text-xs text-muted-foreground">No answers yet. Start the interview to begin.</li>
              ) : (
                qaHistory.map((qa, i) => (
                  <li key={i} className="rounded-lg border p-2.5 text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground mb-0.5">{qa.category}</span>
                    {qa.question.length > 80 ? qa.question.substring(0, 80) + "…" : qa.question}
                  </li>
                ))
              )}
            </ul>
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Pin className="size-4 text-primary" /> Next steps
            </h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              {isComplete ? (
                <>
                  <li>✓ Interview complete</li>
                  <li>→ Review idea validation scores</li>
                  <li>→ Explore AI-generated strategy</li>
                  <li>→ Check financial forecast</li>
                </>
              ) : (
                <>
                  <li>Answer all questions honestly for best results.</li>
                  <li>AI adapts each question based on your previous answers.</li>
                  <li>The interview unlocks all 8 remaining modules.</li>
                </>
              )}
            </ul>
          </SurfaceCard>
        </div>
      </div>
    </>
  );
}
