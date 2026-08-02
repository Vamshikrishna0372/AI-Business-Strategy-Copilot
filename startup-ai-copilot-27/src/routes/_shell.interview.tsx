import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Mic,
  MicOff,
  Pin,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { AiBadge, PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analysisStages } from "@/data/mock";
import { eventBus, EVENTS } from "@/lib/events";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
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

  // Voice / Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      setIsListening(false);
      toast.info("Voice recording stopped.");
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          toast.success("Microphone active! Speak your answer now.");
        };

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setDraft(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            toast.error("Microphone access denied. Please allow microphone permissions in your browser.");
          } else if (event.error === "no-speech") {
            toast.info("No speech detected. Speak louder or try again.");
          } else {
            toast.error(`Voice recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setIsListening(false);
        toast.error(err?.message || "Failed to access microphone. Please check permissions.");
      }
    }
  };

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!thinking && !analysing && sessionId && !isComplete) inputRef.current?.focus();
  }, [messages, thinking, analysing, sessionId, isComplete]);

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
        setIsComplete(false);

        // Rebuild chat from qa_history
        const history: Msg[] = [
          {
            role: "ai",
            text: `Welcome back! Resuming your AI Business Interview for ${activeStartup.name}. Question ${status.current_question_number} of ${status.total_questions}.`,
          },
        ];
        for (const qa of status.qa_history) {
          history.push({ role: "ai", text: qa.question });
          if (qa.answer) {
            history.push({ role: "user", text: qa.answer });
          }
        }
        setMessages(history);

        // Fetch active current question for in-progress session
        try {
          const stepRes = await aiModulesService.startInterview();
          if (stepRes.first_question) {
            setCurrentQuestion(stepRes.first_question);
            history.push({ role: "ai", text: stepRes.first_question.question });
            setMessages([...history]);
          }
        } catch {
          // Keep existing history if question fetch fails
        }
      } else {
        // Not started — show welcome screen
        setSessionId(null);
        setCurrentQuestion(null);
        setIsComplete(false);
        setMessages([]);
      }
    } catch {
      setSessionId(null);
      setCurrentQuestion(null);
      setIsComplete(false);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeId, activeStartup.name]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Start a new explicit interview session
  const startInterview = async () => {
    setStarting(true);
    try {
      const res = await aiModulesService.startInterview();
      setSessionId(res.session_id);
      setCurrentQuestion(res.first_question);
      setProgress(10);
      setIsComplete(false);
      setMessages([
        {
          role: "ai",
          text: `Welcome! I'm your AI Business Strategy Copilot. Let's begin the diagnostic interview for ${activeStartup.name}.`,
        },
        { role: "ai", text: res.first_question.question },
      ]);
      eventBus.emit(EVENTS.INTERVIEW_UPDATED, res);
      toast.success("AI Business Interview session created!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start interview. Please check your network connection.");
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

      eventBus.emit(EVENTS.INTERVIEW_UPDATED, res);

      if (res.is_complete) {
        setThinking(false);
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            text: `That's everything I need! Synthesizing full strategic executive summary for ${activeStartup.name}...`,
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
            { role: "ai", text: completion.summary || "Analysis complete! Strategic context generated." },
            {
              role: "ai",
              text: `All Business Journey modules are now ready: ${(completion.modules_ready ?? []).join(", ")}.`,
            },
          ]);
          eventBus.emit(EVENTS.INTERVIEW_UPDATED, completion);
          toast.success("Interview complete! All business modules unlocked.");
        } catch {
          setIsComplete(true);
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

  const featureChecklist = [
    { icon: CheckCircle2, label: "10 Personalized Questions", desc: "Adaptive diagnostic tailored to your startup stage" },
    { icon: Clock, label: "Approximately 10–15 Minutes", desc: "Fast, intelligent baseline setup" },
    { icon: ShieldCheck, label: "Progress Saved Automatically", desc: "Every answer is persisted instantly in MongoDB" },
    { icon: RefreshCw, label: "Resume Anytime", desc: "Pick up right where you left off from any device" },
    { icon: Brain, label: "AI-Powered Business Analysis", desc: "Generates high-precision strategic context" },
    { icon: Layers, label: "Unlocks All Journey Modules", desc: "Powers Validation, Strategy, Financials & Risk Matrix" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="AI Business Interview"
        subtitle="A personalized conversation that helps our AI Business Strategy Engine understand your startup and generate accurate business insights."
        actions={
          isComplete ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Interview Completed
              </span>
              <Button variant="hero" asChild>
                <Link to="/validation">
                  View Validation <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : sessionId ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
                <Zap className="size-3.5" /> Interview In Progress
              </span>
              <AiBadge>Question {Math.min(questionNum, totalQ)} of {totalQ}</AiBadge>
            </div>
          ) : (
            <Button
              variant="hero"
              onClick={startInterview}
              disabled={starting || loading}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02]"
            >
              {starting ? <RefreshCw className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              {starting ? "Creating Session…" : "🚀 Start AI Business Interview"}
            </Button>
          )
        }
      />

      {/* Main Content Layout */}
      {!sessionId && !isComplete && !loading ? (
        /* Welcome Screen View */
        <div className="space-y-6">
          <SurfaceCard className="relative overflow-hidden border-primary/20 p-8 md:p-10 bg-gradient-to-br from-card via-card to-accent/20">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Single Source of Truth Engine
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Welcome to your AI Business Diagnostic Interview
                </h2>
                <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                  Instead of filling out static forms, answer 10 intelligent questions about {activeStartup.name}. Our AI Strategy Engine will synthesize your business context and automatically populate all 8 strategy modules.
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                {featureChecklist.map((item, i) => (
                  <div key={i} className="rounded-xl border bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-background">
                    <div className="flex items-center gap-2.5 font-semibold text-sm text-foreground">
                      <item.icon className="size-4 shrink-0 text-primary" />
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Start Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-border/60">
                <Button
                  size="lg"
                  onClick={startInterview}
                  disabled={starting}
                  className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="size-5 animate-spin mr-2" /> Creating Interview Session…
                    </>
                  ) : (
                    <>
                      <Rocket className="size-5 mr-2" /> 🚀 Start AI Business Interview
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Takes ~10–15 mins · Progress autosaved immediately to MongoDB
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      ) : (
        /* Active Chat & Sidebar Layout */
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
              {/* Listening Banner */}
              {isListening && (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive animate-pulse">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex size-2.5 rounded-full bg-destructive"></span>
                    </span>
                    <span>Listening... Speak your answer now. Transcript will appear below.</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className="font-semibold underline hover:no-underline cursor-pointer ml-2"
                  >
                    Stop
                  </button>
                </div>
              )}

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
                      ? "Click 'Start Interview' to begin…"
                      : isComplete
                      ? "Interview complete. Explore the modules above."
                      : isListening
                      ? "Listening... Speak your answer or edit transcript here..."
                      : "Type your answer or click microphone to speak..."
                  }
                  className={cn("min-h-11 resize-none", isListening && "border-destructive/50 ring-1 ring-destructive/30")}
                  aria-label="Your answer"
                  disabled={!sessionId || isComplete || thinking || loading}
                />
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleListening}
                  aria-label={isListening ? "Stop microphone" : "Start voice input"}
                  title={isListening ? "Stop recording" : "Speak your answer"}
                  disabled={!sessionId || isComplete || thinking || loading}
                  className={cn(isListening && "animate-pulse ring-2 ring-destructive ring-offset-2")}
                >
                  {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
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
                  <p className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-600">
                    ✓ Interview complete — all modules ready
                  </p>
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <h2 className="text-sm font-semibold">Questions answered</h2>
              <ul className="mt-3 space-y-2 text-sm max-h-[220px] overflow-y-auto">
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
                    <li className="text-emerald-600 font-medium">✓ Interview complete</li>
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
      )}
    </>
  );
}
