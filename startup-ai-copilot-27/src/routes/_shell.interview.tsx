import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  TrendingUp,
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
      { name: "description", content: "An enterprise AI consultation that converts your answers into a complete Business Knowledge Base." },
      { property: "og:title", content: "AI Business Interview — Strategy Copilot" },
      { property: "og:description", content: "Dynamic 10-step AI diagnostic consultation for founders." },
    ],
  }),
  component: Interview,
});

type Msg = {
  role: "ai" | "user";
  text: string;
  acknowledged?: string;
  rationale?: string;
};

function Interview() {
  const { activeStartup, activeId } = useWorkspace();

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Interview session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [progress, setProgress] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [estimatedMinutes, setEstimatedMinutes] = useState(12);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<string>("not_started");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Confirmation Modals State
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Auto-Save Notification state
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Extracted Knowledge state for Live Panel
  const [extractedKnowledge, setExtractedKnowledge] = useState<Record<string, any>>({});
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
      setTranscribing(false);
      toast.info("Voice recording stopped.");
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          setTranscribing(true);
          toast.success("Microphone active! Listening... Speak your answer now.");
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
          setTranscribing(false);
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
          setTranscribing(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setIsListening(false);
        setTranscribing(false);
        toast.error(err?.message || "Failed to access microphone. Please check permissions.");
      }
    }
  };

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!thinking && !analysing && sessionId && !isComplete && !isPaused) inputRef.current?.focus();
  }, [messages, thinking, analysing, sessionId, isComplete, isPaused]);

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
      const res = await aiModulesService.getInterviewStatus(activeId);
      setStatus(res.status);
      setQaHistory(res.qa_history ?? []);
      setExtractedKnowledge(res.extracted_knowledge || res.knowledge_base || {});
      setProgress(res.progress_percentage ?? 0);
      setQuestionNumber(res.current_question_number ?? 1);
      setTotalQuestions(res.total_questions ?? 10);
      setEstimatedMinutes(Math.max(1, 15 - Math.round((res.qa_history?.length || 0) * 1.4)));

      const isDone = ["completed", "knowledge_generated", "all_modules_updated"].includes(res.status);

      if (isDone) {
        setIsComplete(true);
        setIsPaused(false);
        setAnalysing(false);
        setSessionId(res.session_id);
        const completionMsg: Msg = {
          role: "ai",
          text:
            res.summary ||
            `Interview completed! Full Business Knowledge Base generated for ${activeStartup.name}. All 8 journey modules have been updated.`,
        };
        setMessages([completionMsg]);
      } else if (res.status === "stopped") {
        setSessionId(res.session_id);
        setIsPaused(true);
        setIsComplete(false);
        const history: Msg[] = [
          {
            role: "ai",
            text: `Interview for ${activeStartup.name} is currently STOPPED. Click 'Resume Interview' or 'Restart Interview' to continue.`,
          },
        ];
        for (const qa of res.qa_history) {
          history.push({ role: "ai", text: qa.question, acknowledged: qa.acknowledged, rationale: qa.rationale });
          if (qa.answer) {
            history.push({ role: "user", text: qa.answer });
          }
        }
        setMessages(history);
      } else if (res.status === "paused") {
        setSessionId(res.session_id);
        setIsPaused(true);
        setIsComplete(false);
        const history: Msg[] = [
          {
            role: "ai",
            text: `Interview for ${activeStartup.name} is currently PAUSED. Click 'Resume Interview' to continue.`,
          },
        ];
        for (const qa of res.qa_history) {
          history.push({ role: "ai", text: qa.question, acknowledged: qa.acknowledged, rationale: qa.rationale });
          if (qa.answer) {
            history.push({ role: "user", text: qa.answer });
          }
        }
        setMessages(history);
      } else if (res.session_id && (res.status === "in_progress" || res.status === "started" || res.status === "resumed")) {
        setSessionId(res.session_id);
        setIsComplete(false);
        setIsPaused(false);

        // Rebuild conversation thread from history
        const history: Msg[] = [
          {
            role: "ai",
            text: `Welcome back! Resuming your AI Business Consultation for ${activeStartup.name}. Question ${res.current_question_number} of 10.`,
          },
        ];
        for (const qa of res.qa_history) {
          history.push({ role: "ai", text: qa.question, acknowledged: qa.acknowledged, rationale: qa.rationale });
          if (qa.answer) {
            history.push({ role: "user", text: qa.answer });
          }
        }

        try {
          const stepRes = await aiModulesService.startInterview();
          if (stepRes.first_question) {
            setCurrentQuestion(stepRes.first_question);
            const aiMsg: Msg = { role: "ai", text: stepRes.first_question.question };
            if (stepRes.first_question.follow_up_context) {
              aiMsg.rationale = stepRes.first_question.follow_up_context;
            }
            history.push(aiMsg);
          }
        } catch {
          // Keep existing history
        }
        setMessages(history);
      } else {
        // Not started
        setSessionId(null);
        setCurrentQuestion(null);
        setIsComplete(false);
        setIsPaused(false);
        setMessages([]);
      }
    } catch {
      setSessionId(null);
      setCurrentQuestion(null);
      setIsComplete(false);
      setIsPaused(false);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeId, activeStartup.name]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Start new interview session
  const handleStartInterview = async () => {
    setStarting(true);
    try {
      const res = await aiModulesService.startInterview();
      setSessionId(res.session_id);
      setCurrentQuestion(res.first_question);
      setStatus(res.status || "started");
      setProgress(5);
      setQuestionNumber(1);
      setIsComplete(false);
      setIsPaused(false);
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      setMessages([
        {
          role: "ai",
          text: `Welcome! I'm your AI Business Strategy Consultant. Let's build a comprehensive Business Knowledge Base for ${activeStartup.name}.`,
        },
        {
          role: "ai",
          text: res.first_question.question,
          rationale: res.first_question.follow_up_context,
        },
      ]);
      eventBus.emit(EVENTS.INTERVIEW_UPDATED, res);
      toast.success("AI Business Interview session created!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start interview. Please check your network connection.");
    } finally {
      setStarting(false);
    }
  };

  // Submit answer
  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking || isComplete || isPaused) return;
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
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setQaHistory((h) => [
        ...h,
        { question: currentQuestion.question, answer: value, category: currentQuestion.category },
      ]);

      // Update extracted knowledge panel
      if (res.next_question) {
        setQuestionNumber(res.next_question.question_number);
        setTotalQuestions(res.next_question.total_questions);
        setEstimatedMinutes(res.next_question.estimated_time_minutes);
      }

      // Re-fetch latest knowledge base state
      try {
        const kb = await aiModulesService.getBusinessKnowledge(activeId);
        if (kb?.knowledge) {
          setExtractedKnowledge(kb.knowledge);
        }
      } catch {
        /* fallback */
      }

      eventBus.emit(EVENTS.INTERVIEW_UPDATED, res);

      if (res.is_complete) {
        setThinking(false);
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            text: `Outstanding! Synthesizing complete Executive Summary & Business Knowledge Base for ${activeStartup.name}...`,
          },
        ]);
        setAnalysing(true);
        setStage(0);
        setCurrentQuestion(null);

        try {
          const completion = await aiModulesService.completeInterview(sessionId);
          setIsComplete(true);
          setStatus("all_modules_updated");
          setMessages((m) => [
            ...m,
            { role: "ai", text: completion.summary || "Analysis complete! Strategic Business Knowledge Base generated." },
            {
              role: "ai",
              text: `All 8 Business Journey modules have been synchronized with your startup context.`,
            },
          ]);
          eventBus.emit(EVENTS.INTERVIEW_UPDATED, completion);
          toast.success("Interview completed! Business Knowledge Base generated & all modules updated.");
        } catch {
          setIsComplete(true);
        }
      } else if (res.next_question) {
        setCurrentQuestion(res.next_question);
        const aiNextMsg: Msg = { role: "ai", text: res.next_question.question };
        if (res.next_question.follow_up_context) {
          aiNextMsg.rationale = res.next_question.follow_up_context;
        }
        setMessages((m) => [...m, aiNextMsg]);
        setThinking(false);
      }
    } catch (err: any) {
      setThinking(false);
      toast.error(err?.message || "Failed to save answer. Please try again.");
    }
  };

  // Pause interview
  const handlePause = async () => {
    try {
      await aiModulesService.pauseInterview();
      toast.info("Interview paused. Your answers and progress are saved.");
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Failed to pause interview.");
    }
  };

  // Resume interview
  const handleResume = async () => {
    try {
      await aiModulesService.resumeInterview();
      toast.success("Interview resumed! Continuing from your current question.");
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Failed to resume interview.");
    }
  };

  // Stop interview
  const handleStopConfirm = async () => {
    setShowStopConfirm(false);
    try {
      await aiModulesService.stopInterview();
      toast.info("Interview stopped. Saved answers remain preserved.");
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Failed to stop interview.");
    }
  };

  // Restart interview
  const handleRestartConfirm = async () => {
    setShowRestartConfirm(false);
    try {
      await aiModulesService.restartInterview();
      toast.success("Interview restarted! Cleared previous session.");
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Failed to restart interview.");
    }
  };

  // Compute Live Business Understanding Metrics
  const kbKeys = ["industry", "target_customers", "problem", "solution", "revenue_model", "pricing", "business_stage", "technology", "competitive_advantage", "funding_stage"];
  const filledCount = kbKeys.filter((k) => extractedKnowledge[k] && String(extractedKnowledge[k]).trim()).length;
  const knowledgeCompletion = Math.min(100, Math.round((filledCount / kbKeys.length) * 100));

  const benefitsList = [
    { label: "Personalized Strategy", desc: "Tailored executive business blueprint" },
    { label: "Better Financial Planning", desc: "Accurate burn rate & runway forecasting" },
    { label: "Better Investor Readiness", desc: "Data room & pitch deck alignment" },
    { label: "Better Risk Analysis", desc: "Proactive mitigation across 10 business risk areas" },
    { label: "Better Recommendations", desc: "High-precision strategic action items" },
    { label: "Higher Report Accuracy", desc: "Zero generic fluff or placeholder data" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={activeStartup.name}
        title="AI Business Diagnostic Interview"
        subtitle="An enterprise AI consultation that extracts structured business intelligence, builds your Business Knowledge Base, and powers all downstream AI modules."
        actions={
          isComplete || ["completed", "knowledge_generated", "all_modules_updated"].includes(status) ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="size-4" /> Interview Completed
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/profile">View Business Profile</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/reports">
                  Generate Reports <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : status === "stopped" ? (
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleResume} className="gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 font-semibold">
                <Play className="size-3.5 fill-current text-emerald-600" /> ▶ Resume Interview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRestartConfirm(true)} className="gap-1.5 text-amber-600 hover:text-amber-700 font-semibold border-amber-500/30">
                <RotateCcw className="size-3.5" /> 🔄 Restart Interview
              </Button>
            </div>
          ) : status === "paused" ? (
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleResume} className="gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50">
                <Play className="size-3.5 fill-current" /> Resume Interview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowStopConfirm(true)} className="gap-1.5 text-muted-foreground hover:text-destructive">
                <Square className="size-3.5" /> Stop Interview
              </Button>
            </div>
          ) : sessionId && (status === "in_progress" || status === "started" || status === "resumed") ? (
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handlePause} className="gap-1.5 text-muted-foreground">
                <Pause className="size-3.5" /> Pause Interview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowStopConfirm(true)} className="gap-1.5 text-muted-foreground hover:text-destructive">
                <Square className="size-3.5" /> Stop Interview
              </Button>
            </div>
          ) : (
            <Button
              variant="hero"
              onClick={handleStartInterview}
              disabled={starting || loading}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02]"
            >
              {starting ? <RefreshCw className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              {starting ? "Creating Session…" : "🚀 Start AI Business Interview"}
            </Button>
          )
        }
      />

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <SurfaceCard className="max-w-md w-full p-6 space-y-4 shadow-2xl border-destructive/30">
            <div className="flex items-center gap-3 text-destructive font-semibold text-lg">
              <AlertTriangle className="size-6" /> Stop Interview Session?
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stopping the interview will pause current dynamic questioning. All {qaHistory.length} recorded answers are saved safely in MongoDB. You can resume or restart anytime.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowStopConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleStopConfirm}>
                Confirm Stop
              </Button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <SurfaceCard className="max-w-md w-full p-6 space-y-4 shadow-2xl border-amber-500/30">
            <div className="flex items-center gap-3 text-amber-600 font-semibold text-lg">
              <RotateCcw className="size-6" /> Restart AI Business Interview?
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to restart? This will reset your current interview session and start fresh from Question 1 for {activeStartup.name}.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowRestartConfirm(false)}>
                Cancel
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleRestartConfirm}>
                Confirm Restart
              </Button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* Main Content Layout */}
      {!sessionId && !isComplete && !loading ? (
        /* Welcome Screen View */
        <div className="space-y-6">
          <SurfaceCard className="relative overflow-hidden border-primary/20 p-8 md:p-10 bg-gradient-to-br from-card via-card to-accent/20 shadow-xl">
            <div className="absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-4xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-4" /> Enterprise AI Consultant Diagnostic
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                  AI Business Diagnostic Interview
                </h2>
                <p className="mt-2 text-base md:text-lg text-muted-foreground leading-relaxed">
                  A personalized AI consultation designed to understand {activeStartup.name} like a top Silicon Valley business partner.
                </p>
              </div>

              {/* Specs & Time */}
              <div className="flex flex-wrap items-center gap-6 py-2 border-y border-border/50 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="size-4 text-primary" /> Estimated Time: <span className="font-semibold text-foreground">10–15 Minutes</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-emerald-500" /> Progress: <span className="font-semibold text-foreground">Saved Automatically</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Brain className="size-4 text-purple-500" /> Technology: <span className="font-semibold text-foreground">Dynamic Adaptive AI</span>
                </div>
              </div>

              {/* Benefits Checklist */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Why complete the interview?
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {benefitsList.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl border bg-background/60 p-3.5 transition-all hover:border-primary/40 hover:bg-background">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-border/60">
                <Button
                  size="lg"
                  onClick={handleStartInterview}
                  disabled={starting}
                  className="w-full sm:w-auto h-13 px-8 text-base font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ring-2 ring-primary/20"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="size-5 animate-spin mr-2" /> Initializing Session…
                    </>
                  ) : (
                    <>
                      <Rocket className="size-5 mr-2" /> 🚀 Start AI Business Interview
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Answer 10 intelligent questions · Saves directly to MongoDB Knowledge Base
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      ) : (
        /* Active Chat & Live Business Understanding Panel */
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <SurfaceCard hover={false} className="flex h-[660px] flex-col p-0 shadow-lg">
            {/* Header / Progress Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <img src={logo} alt="" width={32} height={32} className="size-8 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">AI Business Consultant</p>
                  <p className="text-xs text-muted-foreground">
                    {status === "stopped"
                      ? "Session Stopped · Answers Preserved"
                      : status === "paused"
                      ? "Session Paused · Answers Saved"
                      : isComplete || ["completed", "knowledge_generated", "all_modules_updated"].includes(status)
                      ? "Interview Complete · Knowledge Base Generated"
                      : `Question ${Math.min(questionNumber, totalQuestions)} of ${totalQuestions} · ~${estimatedMinutes} mins remaining`}
                  </p>
                </div>
              </div>

              {/* Progress & Autosave Indicator */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Save className="size-3" />
                  <span>{lastSaved ? `Saved ${lastSaved}` : "Auto Saved"}</span>
                </div>
                <div className="w-28 sm:w-36">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-medium">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-[width] duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="size-4 animate-spin" />
                    Loading interview session state…
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex gap-3 animate-rise", m.role === "user" && "justify-end")}>
                      {m.role === "ai" && (
                        <img src={logo} alt="" width={28} height={28} loading="lazy" className="mt-1 size-7 shrink-0" />
                      )}
                      <div className="max-w-[85%] space-y-2">
                        {/* AI Rationale / Context badge */}
                        {m.role === "ai" && m.rationale && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">
                            <Info className="size-3 shrink-0" /> {m.rationale}
                          </div>
                        )}

                        <div
                          className={cn(
                            "text-sm leading-relaxed p-4 shadow-sm",
                            m.role === "user"
                              ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground font-medium"
                              : "rounded-2xl rounded-bl-sm border bg-card text-card-foreground",
                          )}
                        >
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {thinking && (
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="" width={28} height={28} loading="lazy" className="size-7" />
                      <span className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-full border border-border/40">
                        <Sparkles className="size-3.5 text-purple-500 animate-spin" />
                        Understanding answer & generating follow-up
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
                    <div className="rounded-2xl border bg-accent/40 p-5 space-y-3">
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Sparkles className="size-4 text-brand animate-bounce" /> Synthesizing Business Knowledge Base for {activeStartup.name}
                      </p>
                      <ul className="space-y-2">
                        {analysisStages.map((s, i) => (
                          <li key={s} className={cn("flex items-center gap-2 text-sm font-medium", i > stage && "text-muted-foreground/60")}>
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                i < stage ? "bg-emerald-500" : i === stage ? "animate-blink bg-primary" : "bg-muted-foreground/40",
                              )}
                            />
                            {s}
                          </li>
                        ))}
                      </ul>
                      {stage >= analysisStages.length && isComplete && (
                        <Button variant="hero" className="mt-4" asChild>
                          <Link to="/validation">
                            View Validation Results <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input & Voice Controls */}
            <div className="border-t p-4 bg-background">
              {/* Listening Banner */}
              {isListening && (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive animate-pulse">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex size-2.5 rounded-full bg-destructive"></span>
                    </span>
                    <span>Listening... Speak your answer now. Transcript will populate answer box below.</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className="font-bold underline hover:no-underline cursor-pointer ml-2"
                  >
                    Stop Recording
                  </button>
                </div>
              )}

              {/* Suggestions chips */}
              {currentQuestion?.suggestions && currentQuestion.suggestions.length > 0 && !isComplete && !isPaused && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {currentQuestion.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border bg-muted/30 px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
                    >
                      💡 {s}
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
                      : isPaused
                      ? "Interview is paused. Click 'Resume Interview' above to continue..."
                      : isComplete
                      ? "Interview complete! All 8 Business Journey modules are unlocked."
                      : isListening
                      ? "Listening... Speak your answer or edit transcript here..."
                      : "Type your answer or click microphone to speak..."
                  }
                  className={cn("min-h-12 resize-none text-sm", isListening && "border-destructive/50 ring-2 ring-destructive/30")}
                  aria-label="Your answer"
                  disabled={!sessionId || isComplete || isPaused || thinking || loading}
                />

                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleListening}
                  aria-label={isListening ? "Stop microphone" : "Start voice input"}
                  title={isListening ? "Stop recording voice" : "Click to speak your answer"}
                  disabled={!sessionId || isComplete || isPaused || thinking || loading}
                  className={cn(isListening && "animate-pulse ring-2 ring-destructive ring-offset-2")}
                >
                  {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>

                <Button
                  variant="hero"
                  size="icon"
                  onClick={() => void send(draft)}
                  aria-label="Send answer"
                  disabled={!sessionId || isComplete || isPaused || thinking || !draft.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </SurfaceCard>

          {/* Sidebar: Live Business Understanding Panel */}
          <div className="space-y-4">
            <SurfaceCard className="border-primary/20 bg-gradient-to-br from-card to-accent/10 shadow-md">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Brain className="size-4 text-primary" /> Business Understanding
                </h2>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  Live Extraction
                </span>
              </div>

              {/* Progress & Confidence */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Knowledge Completion</span>
                    <span className="font-bold text-foreground">{knowledgeCompletion}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${knowledgeCompletion}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border bg-background/60 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Confidence</p>
                    <p className="text-sm font-extrabold text-emerald-600">95%</p>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Attributes</p>
                    <p className="text-sm font-extrabold text-foreground">{filledCount}/10</p>
                  </div>
                </div>
              </div>

              {/* Extracted Attributes List */}
              <div className="mt-4 space-y-2 text-xs">
                {[
                  { label: "Industry", key: "industry" },
                  { label: "Business Model", key: "business_stage" },
                  { label: "Target Market", key: "target_customers" },
                  { label: "Revenue Model", key: "revenue_model" },
                  { label: "Funding Stage", key: "funding_stage" },
                ].map((attr) => {
                  const val = extractedKnowledge[attr.key];
                  return (
                    <div key={attr.key} className="rounded-lg border bg-background/50 p-2.5 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{attr.label}</span>
                      <span className="text-xs font-semibold text-foreground truncate mt-0.5">
                        {val ? String(val) : "Analyzing answer..."}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <h2 className="text-sm font-bold text-foreground mb-2">Q&A History</h2>
              <ul className="space-y-2 text-xs max-h-[180px] overflow-y-auto pr-1">
                {qaHistory.length === 0 ? (
                  <li className="text-muted-foreground">No questions answered yet. Click Start Interview to begin.</li>
                ) : (
                  qaHistory.map((qa, i) => (
                    <li key={i} className="rounded-lg border p-2 text-muted-foreground">
                      <span className="block font-bold text-foreground">{qa.category}</span>
                      <span className="line-clamp-1">{qa.question}</span>
                    </li>
                  ))
                )}
              </ul>
            </SurfaceCard>
          </div>
        </div>
      )}
    </>
  );
}
