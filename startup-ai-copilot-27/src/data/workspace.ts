import { type Startup } from "@/data/mock";

export type ModuleStatus = "Not started" | "In progress" | "Completed" | "Needs review";

export type JourneyModule = {
  key: string;
  title: string;
  description: string;
  route: string;
  estimate: string;
};

/** The canonical Business Journey. Order is the guided workflow. */
export const journeyModules: JourneyModule[] = [
  { key: "interview", title: "AI Business Interview", description: "A guided conversation that captures how your business actually works.", route: "/interview", estimate: "15 min" },
  { key: "validation", title: "Idea Validation", description: "Scores innovation, demand, feasibility and market opportunity.", route: "/validation", estimate: "10 min" },
  { key: "strategy", title: "Business Strategy", description: "Positioning, target market, revenue model and go-to-market plan.", route: "/strategy", estimate: "20 min" },
  { key: "competitors", title: "Competitor Intelligence", description: "Competitive landscape, positioning gaps and SWOT.", route: "/competitors", estimate: "12 min" },
  { key: "canvas", title: "Business Model Canvas", description: "Nine blocks describing how the business creates and captures value.", route: "/canvas", estimate: "10 min" },
  { key: "finance", title: "Financial Planning", description: "Revenue streams, cost base, break-even and funding requirement.", route: "/finance", estimate: "20 min" },
  { key: "risk", title: "Risk Intelligence", description: "Risk register with probability, impact and mitigation.", route: "/risk", estimate: "10 min" },
  { key: "investor", title: "Investor Readiness", description: "Readiness checklist, pitch narratives and funding fit.", route: "/investor", estimate: "15 min" },
  { key: "roadmap", title: "Execution Roadmap", description: "Milestone plan from today to your next funding round.", route: "/roadmap", estimate: "12 min" },
];

export type ScoreCardData = {
  key: string;
  label: string;
  value: number;
  trend: number;
  reason: string;
  recommendation: string;
  tone: "primary" | "success" | "warning" | "destructive";
  invert?: boolean;
};

export type ModuleState = JourneyModule & {
  status: ModuleStatus;
  completion: number;
  updated: string;
  confidence: number;
  preview: string;
  recentChange: string;
};

export type WorkspaceInsight = {
  kind: string;
  title: string;
  body: string;
  priority: "High" | "Medium" | "Low";
  impact: string;
  confidence: number;
  effort: string;
};

export type WorkspaceReport = {
  key: string;
  name: string;
  category: "Strategy" | "Market" | "Finance" | "Execution";
  generated: string;
  updated: string;
  status: "Ready" | "Draft" | "Needs regeneration";
  version: string;
  summary: string;
};

export type Conversation = {
  id: string;
  title: string;
  preview: string;
  updated: string;
  pinned: boolean;
  messages: number;
};

export type Workspace = {
  startup: Startup;
  description: string;
  mission: string;
  vision: string;
  completion: number;
  scores: ScoreCardData[];
  modules: ModuleState[];
  nextAction: { title: string; why: string; impact: string; time: string; priority: string; route: string };
  insights: WorkspaceInsight[];
  activities: { text: string; time: string; kind: string }[];
  reports: WorkspaceReport[];
  conversations: Conversation[];
  milestones: { when: string; title: string; status: string }[];
  weeklyGoal: { title: string; progress: number; detail: string };
};

/** Build a workspace shell from a real startup fetched from the API.
 *  All data here is derived from the startup's actual fields — NO hardcoded demo data.
 */
export function buildWorkspace(startup: Startup): Workspace {
  // All modules start as "Not started" for a new startup.
  // Real progress is loaded from the backend interview/report status.
  const modules: ModuleState[] = journeyModules.map((m) => ({
    ...m,
    status: "Not started",
    completion: 0,
    updated: "—",
    confidence: 0,
    preview: "Nothing generated yet. Run this module to populate it.",
    recentChange: "No changes yet",
  }));

  const firstOpen = modules[0]!;

  const scores: ScoreCardData[] = [
    { key: "health", label: "Business Health", value: startup.score || 0, trend: 0, reason: startup.score ? "Calculated from completed AI Interview and analytics." : "Complete the AI Business Interview to generate your health score.", recommendation: "Start the AI Business Interview.", tone: "primary" },
    { key: "investor", label: "Investor Readiness", value: startup.investorReadiness || 0, trend: 0, reason: startup.investorReadiness ? "Calculated from your business journey progress." : "Investor readiness is calculated from your business journey progress.", recommendation: "Complete more journey modules to raise this score.", tone: "success" },
    { key: "innovation", label: "Innovation", value: 0, trend: 0, reason: "Score updates after AI Business Interview is complete.", recommendation: "Run the AI Business Interview first.", tone: "primary" },
    { key: "execution", label: "Execution Progress", value: 0, trend: 0, reason: "0 of 9 journey modules complete.", recommendation: `Start with ${firstOpen.title}.`, tone: "warning" },
    { key: "market", label: "Market Opportunity", value: 0, trend: 0, reason: "Score updates after Idea Validation module is complete.", recommendation: "Run Idea Validation.", tone: "success" },
    { key: "financial", label: "Financial Health", value: 0, trend: 0, reason: "Score updates after Financial Planning module is complete.", recommendation: "Complete Financial Planning.", tone: "primary" },
    { key: "growth", label: "Growth Potential", value: 0, trend: 0, reason: "Score updates after Business Strategy module is complete.", recommendation: "Complete Business Strategy.", tone: "success" },
    { key: "risk", label: "Risk Level", value: 0, trend: 0, reason: "Score updates after Risk Intelligence module is complete.", recommendation: "Run Risk Intelligence.", tone: "destructive", invert: true },
  ];

  const reportCatalog: { key: string; name: string; category: WorkspaceReport["category"]; summary: string }[] = [
    { key: "strategy", name: "Business Strategy", category: "Strategy", summary: "Positioning, target market, revenue model and go-to-market plan." },
    { key: "validation", name: "Idea Validation", category: "Market", summary: "Six-dimension validation scoring with reasoning per dimension." },
    { key: "competitors", name: "Competitor Intelligence", category: "Market", summary: "Competitive landscape, positioning gaps and SWOT." },
    { key: "canvas", name: "Business Model Canvas", category: "Strategy", summary: "Nine-block model of how value is created and captured." },
    { key: "finance", name: "Financial Planning", category: "Finance", summary: "Revenue streams, cost base, break-even and funding requirement." },
    { key: "risk", name: "Risk Intelligence", category: "Execution", summary: "Risk register with probability, impact and mitigation." },
    { key: "investor", name: "Investor Readiness", category: "Finance", summary: "Readiness checklist, pitch narratives and investor fit." },
    { key: "roadmap", name: "Execution Roadmap", category: "Execution", summary: "Milestone plan from today to the next funding round." },
  ];

  const reports: WorkspaceReport[] = reportCatalog.map((r) => ({
    ...r,
    generated: "—",
    updated: "—",
    status: "Draft",
    version: "—",
  }));

  const insights: WorkspaceInsight[] = [
    { kind: "Getting started", title: `Start the AI Business Interview for ${startup.name}`, body: `Complete the AI Business Interview to unlock your strategy, scores, and recommendations.`, priority: "High", impact: "Unlocks all 9 journey modules", confidence: 100, effort: firstOpen.estimate },
  ];

  const activities: { text: string; time: string; kind: string }[] = [
    { text: `${startup.name} workspace created`, time: startup.updated || "Just now", kind: "startup" },
  ];

  return {
    startup,
    description: startup.tagline || `${startup.name} business strategy workspace.`,
    mission: "Mission statement pending — generated from your interview answers.",
    vision: "Vision statement pending — generated from your interview answers.",
    completion: 0,
    scores,
    modules,
    nextAction: {
      title: `Complete ${firstOpen.title}`,
      why: "Start the AI Business Interview so the copilot understands your business.",
      impact: "Unlocks all analytics, scores and recommendations",
      time: firstOpen.estimate,
      priority: "High",
      route: firstOpen.route,
    },
    insights,
    activities,
    reports,
    conversations: [],
    milestones: [
      { when: "This week", title: `Complete ${firstOpen.title}`, status: "Not started" },
      { when: "Next 30 days", title: "Finish all 9 Business Journey modules", status: "Planned" },
      { when: "Next quarter", title: "Complete investor data room", status: "Planned" },
    ],
    weeklyGoal: {
      title: "Complete the AI Business Interview",
      progress: 0,
      detail: "Tracked against journey module completion.",
    },
  };
}

function clamp(n: number) {
  return Math.max(4, Math.min(99, Math.round(n)));
}

export const suggestedPrompts = [
  "Improve our pricing",
  "Review our business strategy",
  "Suggest competitors we're missing",
  "Draft a go-to-market plan",
  "What should we fix before fundraising?",
  "Which hire unlocks the most growth?",
  "How do we lower customer acquisition cost?",
  "Where should we expand next?",
];
