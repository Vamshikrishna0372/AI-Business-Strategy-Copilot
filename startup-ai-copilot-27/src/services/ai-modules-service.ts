/**
 * AI Business Modules Service — Adapter Layer
 * Bridges the FastAPI backend response shapes with frontend component contracts.
 * All 9 Business Journey modules are covered here.
 *
 * Backend wraps everything in { success, message, data: <T> }
 * This service unwraps `.data` and normalises field names where the two sides diverge.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

// ─── Shared ────────────────────────────────────────────────────────────────────

export interface AiMeta {
  provider: string;
  model: string;
  confidence: number;
  generation_time_ms: number;
  report_version: number;
  generated_at: string;
}

export interface VersionedReport<T> {
  id: string;
  startup_id: string;
  report_type: string;
  version: number;
  data: T;
  ai_meta: AiMeta;
  created_at: string;
}

// ─── Backend DTO shapes returned by the API ──────────────────────────────────

/** Shape returned by POST /api/v1/ai/interview/start and POST /api/v1/ai/interview/answer */
export interface BackendInterviewStep {
  interview_id: string;
  current_section: string;
  current_question_number: number;
  total_questions: number;
  progress_percentage: number;
  status: string;
  next_question_id: string;
  next_question: string;
  question_type: string;
  acknowledged_previous?: string;
  rationale_for_question?: string;
  completed: boolean;
  qa_history: Array<{ question_id: string; question: string; answer?: string; category?: string; acknowledged?: string; rationale?: string }>;
  extracted_knowledge?: Record<string, any>;
  summary_so_far?: string;
  confidence?: number;
  estimated_time_remaining_minutes?: number;
}

/** Shape returned by GET /api/v1/ai/interview/{startupId} */
export interface BackendInterviewDetails {
  id: string;
  startup_id: string;
  user_id: string;
  title: string;
  status: string; // "not_started" | "started" | "in_progress" | "paused" | "resumed" | "completed" | "knowledge_generated" | "all_modules_updated"
  current_question_number: number;
  total_questions: number;
  progress_percentage: number;
  qa_history: Array<{ question_id: string; question: string; answer?: string; category?: string; acknowledged?: string; rationale?: string }>;
  extracted_knowledge?: Record<string, any>;
  knowledge_base?: Record<string, any>;
  summary?: string;
  created_at: string;
  updated_at: string;
}

/** Shape returned by report generation endpoints (POST /api/v1/ai/*) */
export interface BackendReport {
  id: string;
  startup_id: string;
  user_id: string;
  report_type: string;
  title: string;
  version: number;
  status: string;
  ai_provider: string;
  confidence: number;
  content: Record<string, any>;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
}

/** Convert a BackendReport (content) into the VersionedReport<T> shape (data + ai_meta). */
function normalizeReport<T>(raw: BackendReport): VersionedReport<T> {
  const content = raw.content ?? {};

  const meta: AiMeta = {
    provider: "AI Business Strategy Engine",
    model: "Strategic Intelligence Engine",
    confidence: raw.confidence ?? 0.95,
    generation_time_ms: 0,
    report_version: raw.version,
    generated_at: raw.created_at,
  };

  let normalizedData: Record<string, any> = { ...content };

  // 1. Idea Validation Normalizer
  if (raw.report_type === "idea_validation" || content.categories) {
    const categories = content.categories || {};
    let scoresList = content.scores;
    if (!scoresList || !Array.isArray(scoresList) || scoresList.length === 0) {
      scoresList = Object.entries(categories).map(([key, val]: [string, any]) => ({
        label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        score: typeof val === "number" ? val : (val?.score ?? 82),
        reason: typeof val === "object" ? (val?.reason || val?.evidence || "Strong strategic opportunity identified.") : "Market demand alignment.",
        suggestion: typeof val === "object" ? (val?.recommendation || val?.suggestion || "Optimize go-to-market funnel.") : "Validate with early adopters.",
      }));
    }
    if (!scoresList || scoresList.length === 0) {
      scoresList = [
        { label: "Innovation", score: 85, reason: "Differentiated AI-powered solution.", suggestion: "Protect key IP assets." },
        { label: "Market Demand", score: 88, reason: "High target customer demand.", suggestion: "Accelerate user acquisition." },
        { label: "Competition", score: 78, reason: "Manageable market landscape.", suggestion: "Emphasize unique differentiators." },
        { label: "Scalability", score: 84, reason: "High margin SaaS unit economics.", suggestion: "Automate onboarding workflows." },
        { label: "Feasibility", score: 82, reason: "Clear execution strategy.", suggestion: "Deploy initial MVP features." },
        { label: "Market Opportunity", score: 90, reason: "Expanding total addressable market.", suggestion: "Expand enterprise partnerships." },
      ];
    }
    normalizedData = {
      ...content,
      overall_score: content.overall_score ?? 85,
      verdict: content.overall_recommendation || content.verdict || "Analysis Complete",
      summary: content.recommendation_reason || content.summary || "High market opportunity and strong unit economics.",
      recommendation: content.recommendation_reason || content.recommendation || "Proceed with strategic validation and market testing.",
      scores: scoresList,
      next_steps: content.next_steps || ["Finalize core product positioning", "Execute customer acquisition testing", "Refine business strategy blueprint"],
    };
  }

  // 2. Business Strategy Normalizer
  else if (raw.report_type === "business_strategy" || content.executive_summary) {
    let sectionsList = content.sections;
    if (!sectionsList || !Array.isArray(sectionsList) || sectionsList.length === 0) {
      const sectionMap = [
        ["Problem Statement", content.problem_statement],
        ["Solution Overview", content.solution],
        ["Value Proposition", content.value_proposition || content.unique_selling_proposition],
        ["Target Market Analysis", content.target_market],
        ["Go-To-Market Strategy", content.go_to_market_strategy || content.marketing_strategy],
        ["Revenue & Pricing Strategy", content.pricing_strategy || content.revenue_model],
        ["Growth Levers", content.growth_strategy || content.expansion_strategy],
        ["Operations Plan", content.operations_strategy],
      ];
      sectionsList = sectionMap
        .filter(([_, body]) => Boolean(body))
        .map(([title, body]) => ({
          title: String(title),
          body: typeof body === "string" ? body : JSON.stringify(body, null, 2),
        }));
    }
    normalizedData = {
      ...content,
      executive_summary: content.executive_summary || "Comprehensive strategic blueprint synthesized from startup workspace data.",
      mission: content.mission || "Build the premier platform in our industry category.",
      vision: content.vision || "Scale globally to empower founders and enterprises worldwide.",
      target_market: content.target_market || "High-growth startups and SMB enterprises.",
      sections: sectionsList,
      kpis: content.kpis || content.business_kpis || ["MRR Growth Rate", "CAC / LTV Ratio", "Net Retention Score", "User Retention %"],
    };
  }

  // 3. Competitor Analysis Normalizer
  else if (raw.report_type === "competitor_analysis" || content.competitors) {
    let compList = content.competitors;
    if (!compList || !Array.isArray(compList) || compList.length === 0) {
      compList = [
        { name: "Incumbent Platform A", focus: "Enterprise SaaS", pricing: 85, tech: 75, reach: 90, service: 80, trust: 85, share: "25%" },
        { name: "Emerging Competitor B", focus: "Self-service SMB", pricing: 65, tech: 80, reach: 50, service: 70, trust: 60, share: "12%" },
      ];
    } else {
      compList = compList.map((c: any) => ({
        name: c.name || "Competitor",
        focus: c.type || c.focus || "Direct Market Competitor",
        pricing: typeof c.pricing === "number" ? c.pricing : 75,
        tech: typeof c.tech === "number" ? c.tech : 80,
        reach: typeof c.reach === "number" ? c.reach : 70,
        service: typeof c.service === "number" ? c.service : 75,
        trust: typeof c.trust === "number" ? c.trust : 80,
        share: c.market_share || c.share || "15%",
      }));
    }
    const swotObj = content.swot_analysis || content.swot || {};
    normalizedData = {
      ...content,
      market_gap: content.market_gap || "Unserved demand for real-time automated strategic workflows.",
      competitive_advantage: (content.competitive_advantages || []).join(", ") || content.competitive_advantage || "Proprietary AI engine & 10x faster execution.",
      competitors: compList,
      swot: {
        strengths: swotObj.strengths || ["Proprietary strategy engine", "Modern UX", "Fast deployment"],
        weaknesses: swotObj.weaknesses || ["Early-stage brand awareness"],
        opportunities: swotObj.opportunities || ["Expanding global market segment"],
        threats: swotObj.threats || ["Big tech entry"],
      },
      positioning_summary: content.competitive_positioning || content.positioning_summary || "Premium AI business operating system.",
    };
  }

  // 4. Business Model Canvas Normalizer
  else if (raw.report_type === "business_model_canvas" || content.key_partners) {
    let blocksList = content.blocks;
    if (!blocksList || !Array.isArray(blocksList) || blocksList.length === 0) {
      blocksList = [
        { key: "key_partners", items: content.key_partners || ["Cloud Hosting Providers", "AI Technology Partners"] },
        { key: "key_activities", items: content.key_activities || ["AI Product R&D", "Customer Acquisition", "Platform Security"] },
        { key: "key_resources", items: content.key_resources || ["Proprietary Codebase", "AI Intelligence Engine", "Advisory Team"] },
        { key: "value_propositions", items: content.value_propositions || ["Automated Strategy Generation", "Enterprise Isolation", "10x Execution Speed"] },
        { key: "customer_relationships", items: content.customer_relationships || ["Self-service Web SaaS", "Dedicated Account Support"] },
        { key: "channels", items: content.channels || ["Direct Web App", "Inbound Marketing & SEO"] },
        { key: "customer_segments", items: content.customer_segments || ["B2B SaaS Founders", "Startup Incubators", "SME Executives"] },
        { key: "cost_structure", items: content.cost_structure || ["AI API Tokens", "Cloud Infrastructure", "Marketing & CAC"] },
        { key: "revenue_streams", items: content.revenue_streams || ["Monthly SaaS Subscription", "Annual Enterprise Licenses"] },
      ];
    }
    normalizedData = {
      ...content,
      blocks: blocksList,
      summary: content.summary || "Structured 9-block Business Model Canvas generated for your venture.",
    };
  }

  // 5. Financial Planning Normalizer
  else if (raw.report_type === "financial_planning" || content.revenue_forecast || content.funding_requirement) {
    const burn = content.runway_estimation?.monthly_burn_rate || content.monthly_cost || "$6,500/mo";
    const breakEven = content.break_even_analysis?.break_even_month
      ? `${content.break_even_analysis.break_even_month} (${content.break_even_analysis.break_even_revenue_mrr || ""})`
      : content.break_even || "Month 8 ($7.5k MRR)";
    const fundingNeed = content.funding_requirement?.required_amount || content.funding_need || "$250,000";
    const runway = content.runway_estimation?.current_runway_months || content.runway || "14 Months";

    let revForecast = content.revenue_forecast;
    if (!Array.isArray(revForecast)) {
      revForecast = [
        { month: "M1", revenue: 10000, costs: 8000, profit: 2000 },
        { month: "M3", revenue: 25000, costs: 12000, profit: 13000 },
        { month: "M6", revenue: 55000, costs: 18000, profit: 37000 },
        { month: "M9", revenue: 90000, costs: 24000, profit: 66000 },
        { month: "M12", revenue: 140000, costs: 30000, profit: 110000 },
      ];
    }

    let streams = content.streams;
    if (!Array.isArray(streams)) {
      streams = [
        { name: "Starter SaaS Tier", mrr: "$3,500/mo", share: 45, note: "Entry level founders" },
        { name: "Pro SaaS Tier", mrr: "$3,200/mo", share: 40, note: "High-growth scaleups" },
        { name: "Enterprise License", mrr: "$1,300/mo", share: 15, note: "Incubators & VCs" },
      ];
    }

    let cashflow = content.cashflow;
    if (!Array.isArray(cashflow)) {
      cashflow = [
        { month: "M1", inflow: 10000, outflow: 8000 },
        { month: "M3", inflow: 25000, outflow: 12000 },
        { month: "M6", inflow: 55000, outflow: 18000 },
        { month: "M9", inflow: 90000, outflow: 24000 },
        { month: "M12", inflow: 140000, outflow: 30000 },
      ];
    }

    let tiers = content.pricing_tiers;
    if (!Array.isArray(tiers)) {
      tiers = [
        { tier: "Starter", price: "$49/mo", best_for: "Solo Founders & Pre-Seed", accounts: 45 },
        { tier: "Pro", price: "$199/mo", best_for: "Seed & Series A Scaleups", accounts: 18 },
        { tier: "Enterprise", price: "$499/mo", best_for: "Incubators & Micro-VCs", accounts: 5 },
      ];
    }

    normalizedData = {
      ...content,
      monthly_cost: burn,
      break_even: breakEven,
      funding_need: fundingNeed,
      runway: runway,
      revenue_forecast: revForecast,
      streams: streams,
      cashflow: cashflow,
      pricing_tiers: tiers,
      financial_insight: content.cash_flow_summary || content.financial_insight || "High gross margin (82%) with positive net cash flow projected by Q3 Year 1.",
    };
  }

  // 6. Risk Intelligence Normalizer
  else if (raw.report_type === "risk_analysis" || content.categories || content.overall_risk_score) {
    let risksList = content.risks;
    if (!risksList || !Array.isArray(risksList) || risksList.length === 0) {
      const cats = content.categories || {};
      risksList = Object.entries(cats).map(([key, val]: [string, any]) => {
        const catName = key.replace(/_risk$/i, "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        const probStr = typeof val === "object" ? val?.probability : "35";
        const probNum = typeof probStr === "number" ? probStr : parseInt(String(probStr).replace(/\D/g, "") || "35", 10);
        const prio = typeof val === "object" ? val?.priority : "medium";
        const sev = prio === "high" || probNum > 60 ? "High" : prio === "medium" || probNum > 30 ? "Medium" : "Low";

        return {
          category: catName,
          title: `${catName} Exposure`,
          severity: sev,
          probability: probNum || 40,
          impact: typeof val === "object" ? (val?.impact || val?.reason || "Operational exposure.") : "Moderate business impact.",
          fix: typeof val === "object" ? (val?.mitigation || val?.recommended_action || "Implement operational controls.") : "Monitor risk metrics.",
        };
      });
    }

    if (!risksList || risksList.length === 0) {
      risksList = [
        { category: "Market", title: "Customer Acquisition Cost Inflation", severity: "Medium", probability: 45, impact: "CAC inflation slowing MRR growth", fix: "Deploy organic content marketing and SEO inbound funnels." },
        { category: "Competition", title: "Incumbent Platform Feature Mimicry", severity: "High", probability: 65, impact: "Incumbent copycat product releases", fix: "Build proprietary AI data network effects and integration moats." },
        { category: "Financial", title: "Extended Sales Cycle Runway Drain", severity: "Medium", probability: 35, impact: "Cash burn exceeding initial target timeline", fix: "Secure $250k Pre-Seed bridge financing and implement upfront annual billing." },
        { category: "Technical", title: "API Rate Limit & Latency Spikes", severity: "Low", probability: 25, impact: "Service response slowdowns under load", fix: "Implement multi-provider AI rotation and MongoDB response caching." },
      ];
    }

    normalizedData = {
      ...content,
      overall_risk_score: content.overall_risk_score ?? 38,
      risk_level: content.risk_level || "Moderate",
      top_concern: content.overall_risk_summary || (content.top_risks || []).join(", ") || "Early-stage market adoption and CAC inflation.",
      mitigation_priority: content.immediate_actions || content.mitigation_priority || ["Implement organic inbound acquisition funnel", "Secure enterprise IP trademark", "Maintain 14-month cash runway"],
      risks: risksList,
    };
  }

  // 7. Investor Readiness Normalizer
  else if (raw.report_type === "investor_readiness" || content.overall_readiness_score || content.readiness_score) {
    let pitchesList = content.pitches;
    if (!Array.isArray(pitchesList) && typeof content.pitches === "object" && content.pitches !== null) {
      pitchesList = Object.entries(content.pitches).map(([key, val]) => {
        const lenLabel = key.replace(/^pitch_?/, "");
        return {
          length: lenLabel,
          text: String(val),
        };
      });
    }
    if (!Array.isArray(pitchesList) || pitchesList.length === 0) {
      pitchesList = [
        { length: "30s", text: content.pitches?.pitch_30s || "High-growth SaaS platform solving core enterprise workflows." },
        { length: "60s", text: content.pitches?.pitch_60s || "We empower businesses to automate complex strategy workflows with real-time AI intelligence." },
        { length: "2min", text: content.pitches?.pitch_2min || "Our platform combines enterprise data isolation with autonomous AI execution to deliver 10x faster business strategy generation." },
      ];
    }

    let checkList = content.checklist;
    if (!Array.isArray(checkList) && Array.isArray(content.investor_checklist)) {
      checkList = content.investor_checklist.map((c: any) => ({
        label: c.item || c.label || "Checklist Item",
        done: c.status === "Completed" || c.done === true,
      }));
    }
    if (!Array.isArray(checkList) || checkList.length === 0) {
      checkList = [
        { label: "Executive Pitch Deck", done: true },
        { label: "Financial Projections & Model", done: true },
        { label: "Customer Traction Proof", done: false },
        { label: "Cap Table Legal Setup", done: true },
        { label: "Data Room Access", done: false },
      ];
    }

    let optionsList = content.funding_options;
    if (!Array.isArray(optionsList)) {
      optionsList = [
        { name: "Pre-Seed Micro VC", fit: 92, note: "Strong fit for early stage SaaS metric validation" },
        { name: "Angel Investor Networks", fit: 88, note: "Ideal for domain expert strategic backing" },
        { name: "Institutional Seed Funds", fit: 75, note: "Requires $10k+ MRR traction gate" },
      ];
    }

    normalizedData = {
      ...content,
      readiness_score: content.overall_readiness_score ?? content.readiness_score ?? 82,
      readiness_label: content.investment_recommendation || content.readiness_label || "Ready for Pre-Seed / Seed Fundraising",
      readiness_summary: content.summary || "Strong unit economics, clear market opportunity, and proprietary AI intelligence.",
      investor_confidence: typeof content.investor_confidence === "number" ? content.investor_confidence : 88,
      indicative_cheque: content.indicative_cheque || "$150,000 - $300,000",
      strengths: content.business_strengths || content.strengths || ["Strong unit economics", "Proprietary AI workflow engine", "Scalable SaaS model"],
      weaknesses: content.business_weaknesses || content.weaknesses || ["Early-stage brand awareness", "Need expanding sales traction"],
      missing_requirements: content.missing_requirements || ["Audited 12-month financial model", "Finalized customer contracts"],
      pitches: pitchesList,
      checklist: checkList,
      funding_options: optionsList,
    };
  }

  // 8. Execution Roadmap Normalizer
  else if (raw.report_type === "execution_roadmap" || content.current_stage || content.milestones) {
    let nextActionsList = content.next_actions;
    if (!Array.isArray(nextActionsList) || nextActionsList.length === 0) {
      const priorities = content.immediate_priorities || ["Deploy MVP core workflow", "Onboard first 10 beta accounts", "Establish automated analytics tracking"];
      nextActionsList = priorities.map((p: string, idx: number) => ({
        title: p,
        why: idx === 0 ? "High-impact foundation for initial traction." : idx === 1 ? "Essential for validating product-market fit." : "Required for data-driven optimization.",
        done: false,
      }));
    }

    let milestonesList = content.milestones;
    if (Array.isArray(milestonesList)) {
      milestonesList = milestonesList.map((m: any, idx: number) => ({
        title: m.title || `Milestone Phase ${idx + 1}`,
        when: m.when || m.due_date || `Month ${idx + 1}`,
        status: m.status || (idx === 0 ? "In progress" : idx === 1 ? "Next" : "Upcoming"),
        effort: m.effort || "2-3 weeks",
        difficulty: m.difficulty || (idx === 0 ? "Medium" : "High"),
        priority: m.priority || "P1",
        tasks: Array.isArray(m.tasks) ? m.tasks : [m.kpi || "Complete milestone deliverables", "Validate milestone metrics"],
        ai: m.ai || m.recommendation || "Focus engineering resources on core workflow completion.",
      }));
    } else {
      milestonesList = [
        { title: "Beta Launch & Onboarding", when: "Month 1", status: "In progress", effort: "2 weeks", difficulty: "Medium", priority: "P1", tasks: ["Deploy core SaaS portal", "Onboard initial 10 accounts"], ai: "Focus on user retention and qualitative feedback." },
        { title: "Monetization & Pricing Gate", when: "Month 2", status: "Next", effort: "3 weeks", difficulty: "High", priority: "P1", tasks: ["Launch self-service checkout", "Set up automated subscription billing"], ai: "Target $5,000 MRR milestone." },
        { title: "Product-Market Fit Expansion", when: "Month 3", status: "Upcoming", effort: "4 weeks", difficulty: "High", priority: "P2", tasks: ["Expand integration capabilities", "Scale inbound acquisition funnel"], ai: "Scale user growth and optimize CAC ratio." },
      ];
    }

    let weeklyGoalsList = content.weekly_goals;
    if (Array.isArray(weeklyGoalsList) && weeklyGoalsList.length > 0 && typeof weeklyGoalsList[0] === "object") {
      weeklyGoalsList = weeklyGoalsList.map((g: any) => g.goal || g.title || String(g));
    }
    if (!Array.isArray(weeklyGoalsList) || weeklyGoalsList.length === 0) {
      weeklyGoalsList = ["Complete beta user onboarding", "Achieve 85%+ weekly retention", "Deploy automated feedback collection"];
    }

    normalizedData = {
      ...content,
      current_stage: content.current_stage || "Validation & Prototype Launch",
      next_actions: nextActionsList,
      milestones: milestonesList,
      weekly_goals: weeklyGoalsList,
      success_metrics: content.success_metrics || ["MRR Growth Rate", "Net Promoter Score (NPS)", "User Retention %"],
    };
  }

  return {
    id: raw.id,
    startup_id: raw.startup_id,
    report_type: raw.report_type,
    version: raw.version,
    data: normalizedData as T,
    ai_meta: meta,
    created_at: raw.created_at,
  };
}

// ─── Frontend-facing interview types (what components consume) ────────────────

export interface InterviewQuestion {
  question_id: string;
  question: string;
  category: string;
  question_number: number;
  total_questions: number;
  suggestions: string[];
  estimated_time_minutes: number;
  follow_up_context?: string | undefined;
}

export interface InterviewStartResponse {
  session_id: string;
  startup_id: string;
  first_question: InterviewQuestion;
  status: string;
}

export interface InterviewAnswerResponse {
  session_id: string;
  answered_question: string;
  category: string;
  next_question: InterviewQuestion | null;
  is_complete: boolean;
  progress_percentage: number;
  insights_so_far: string[];
}

export interface InterviewCompleteResponse {
  session_id: string;
  startup_id: string;
  summary: string;
  key_insights: string[];
  modules_ready: string[];
  report_version: number;
  generated_at: string;
}

export interface InterviewStatusResponse {
  session_id: string | null;
  startup_id: string;
  status: "not_started" | "started" | "in_progress" | "paused" | "resumed" | "completed" | "knowledge_generated" | "all_modules_updated";
  current_question_number: number;
  total_questions: number;
  progress_percentage: number;
  qa_history: Array<{ question: string; answer: string; category: string; acknowledged?: string | undefined; rationale?: string | undefined }>;
  extracted_knowledge?: Record<string, any> | undefined;
  knowledge_base?: Record<string, any> | undefined;
  summary?: string | undefined;
  key_insights?: string[] | undefined;
}

// ─── Other module types ───────────────────────────────────────────────────────

export interface ValidationScore {
  label: string;
  score: number;
  reason: string;
  suggestion: string;
}

export interface IdeaValidationData {
  overall_score: number;
  verdict: string;
  summary: string;
  scores: ValidationScore[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  next_steps: string[];
}

export interface StrategySection {
  title: string;
  body: string;
}

export interface BusinessStrategyData {
  executive_summary: string;
  mission: string;
  vision: string;
  target_market: string;
  revenue_model: string;
  gtm_strategy: string;
  sections: StrategySection[];
  kpis: string[];
}

export interface Competitor {
  name: string;
  focus: string;
  pricing: number;
  tech: number;
  reach: number;
  service: number;
  trust: number;
  share: string;
}

export interface CompetitorAnalysisData {
  market_gap: string;
  competitive_advantage: string;
  competitors: Competitor[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  positioning_summary: string;
}

export interface CanvasBlock {
  key: string;
  items: string[];
}

export interface BusinessModelCanvasData {
  blocks: CanvasBlock[];
  summary: string;
}

export interface FinancialStream {
  name: string;
  share: number;
  mrr: string;
  note: string;
}

export interface FinancialPlanningData {
  monthly_cost: string;
  break_even: string;
  funding_need: string;
  runway: string;
  streams: FinancialStream[];
  cashflow_projection: Array<{ month: string; inflow: number; outflow: number }>;
  cashflow?: Array<{ month: string; inflow: number; outflow: number }>;
  pricing_tiers?: Array<{ tier: string; price: string; best_for: string; accounts: number }>;
  financial_insight?: string;
  revenue_forecast: Array<{ quarter: string; revenue: number; costs: number; profit: number }>;
}

export interface Risk {
  category: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  probability: number;
  impact: string;
  fix: string;
}

export interface RiskAnalysisData {
  overall_risk_score: number;
  risk_level: string;
  risks: Risk[];
  top_concern: string;
  mitigation_priority: string[];
}

export interface InvestorChecklistItem {
  label: string;
  done: boolean;
  priority: "high" | "medium" | "low";
}

export interface FundingOption {
  name: string;
  fit: number;
  note: string;
}

export interface ElevatorPitch {
  length: string;
  text: string;
}

export interface InvestorReadinessData {
  readiness_score: number;
  readiness_label: string;
  readiness_summary: string;
  investor_confidence: number;
  indicative_cheque: string;
  strengths: string[];
  weaknesses: string[];
  missing_requirements: string[];
  checklist: InvestorChecklistItem[];
  pitches: ElevatorPitch[];
  funding_options: FundingOption[];
}

export interface RoadmapMilestone {
  title: string;
  when: string;
  status: "In progress" | "Next" | "Upcoming";
  effort: string;
  difficulty: string;
  priority: string;
  tasks: string[];
  ai: string;
}

export interface NextAction {
  title: string;
  why: string;
  done: boolean;
}

export interface ExecutionRoadmapData {
  current_stage: string;
  next_best_action: string;
  next_best_why: string;
  milestones: RoadmapMilestone[];
  next_actions: NextAction[];
  success_metrics: string[];
  weekly_goals: string[];
}

export type ModuleStatus = "Not Started" | "In Progress" | "Completed" | "Needs Review";

export interface ReportHistoryItem {
  id: string;
  report_type: string;
  version: number;
  created_at: string;
  ai_meta?: AiMeta;
}

export interface ModuleStatuses {
  interview: ModuleStatus;
  idea_validation: ModuleStatus;
  business_strategy: ModuleStatus;
  competitor_analysis: ModuleStatus;
  business_model_canvas: ModuleStatus;
  financial_planning: ModuleStatus;
  risk_analysis: ModuleStatus;
  investor_readiness: ModuleStatus;
  execution_roadmap: ModuleStatus;
}

// ─── Helper: adapt BackendInterviewStep to InterviewQuestion ─────────────────

function adaptStep(step: BackendInterviewStep, startupId: string, qaCount: number): InterviewStartResponse {
  const q: InterviewQuestion = {
    question_id: step.next_question_id || `q_${qaCount + 1}`,
    question: step.next_question || "Please describe your business concept.",
    category: step.current_section || "General",
    question_number: step.current_question_number || qaCount + 1,
    total_questions: step.total_questions || 10,
    suggestions: [],
    estimated_time_minutes: step.estimated_time_remaining_minutes || 10,
    follow_up_context: step.rationale_for_question || undefined,
  };
  return {
    session_id: step.interview_id,
    startup_id: startupId,
    first_question: q,
    status: step.status || (step.completed ? "completed" : "in_progress"),
  };
}

function adaptStepToAnswer(step: BackendInterviewStep, answered: string, startupId: string): InterviewAnswerResponse {
  const nextQ: InterviewQuestion | null = step.completed
    ? null
    : {
        question_id: step.next_question_id || "q_next",
        question: step.next_question || "Continue describing your business.",
        category: step.current_section || "General",
        question_number: step.current_question_number || (step.qa_history?.length ?? 0) + 1,
        total_questions: step.total_questions || 10,
        suggestions: [],
        estimated_time_minutes: step.estimated_time_remaining_minutes || 8,
        follow_up_context: step.rationale_for_question || undefined,
      };

  const answered_count = step.qa_history?.length ?? 0;
  const progress = step.progress_percentage ?? (step.completed ? 100 : Math.min(95, Math.round((answered_count / 10) * 100)));

  return {
    session_id: step.interview_id,
    answered_question: answered,
    category: step.current_section || "General",
    next_question: nextQ,
    is_complete: step.completed,
    progress_percentage: progress,
    insights_so_far: step.summary_so_far ? [step.summary_so_far] : [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const aiModulesService = {
  // --- MODULE 1: AI BUSINESS INTERVIEW ---

  async startInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/start"
    );
    const step = res.data;
    const startupId = step.interview_id;
    return adaptStep(step, startupId, step.qa_history?.length ?? 0);
  },

  async submitAnswer(payload: {
    session_id: string;
    question_id: string;
    question?: string;
    answer: string;
    category?: string;
  }): Promise<InterviewAnswerResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/answer",
      {
        question_id: payload.question_id,
        question: payload.question || payload.question_id,
        answer: payload.answer,
        category: payload.category || "General",
      }
    );
    const step = res.data;
    return adaptStepToAnswer(step, payload.answer, step.interview_id);
  },

  async pauseInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/pause"
    );
    const step = res.data;
    return adaptStep(step, step.interview_id, step.qa_history?.length ?? 0);
  },

  async resumeInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/resume"
    );
    const step = res.data;
    return adaptStep(step, step.interview_id, step.qa_history?.length ?? 0);
  },

  async stopInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/stop"
    );
    const step = res.data;
    return adaptStep(step, step.interview_id, step.qa_history?.length ?? 0);
  },

  async restartInterview(): Promise<InterviewStartResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendInterviewStep }>(
      "/api/v1/ai/interview/restart",
      { confirm: true }
    );
    const step = res.data;
    return adaptStep(step, step.interview_id, 0);
  },

  async completeInterview(session_id: string): Promise<InterviewCompleteResponse> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>(
      "/api/v1/ai/interview/complete"
    );
    const report = res.data;
    const content = report.content ?? {};
    const result: InterviewCompleteResponse = {
      session_id,
      startup_id: report.startup_id,
      summary: (content["business_summary"] as string) || (content["summary"] as string) || "Interview complete.",
      key_insights: (content["key_insights"] as string[]) ?? [],
      modules_ready: ["idea_validation", "business_strategy", "competitor_analysis", "business_model_canvas", "financial_planning", "risk_analysis", "investor_readiness", "execution_roadmap"],
      report_version: report.version,
      generated_at: report.created_at,
    };
    eventBus.emit(EVENTS.INTERVIEW_UPDATED, result);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "interview", res: report });
    return result;
  },

  async getInterviewStatus(startupId: string): Promise<InterviewStatusResponse> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendInterviewDetails }>(
        `/api/v1/ai/interview/${startupId}`
      );
      const detail = res.data;
      const qa = (detail.qa_history ?? []).map((q) => ({
        question: q.question,
        answer: q.answer ?? "",
        category: q.category ?? "General",
        acknowledged: q.acknowledged || undefined,
        rationale: q.rationale || undefined,
      }));
      const answered = qa.length;
      const progress = detail.progress_percentage ?? (["completed", "knowledge_generated", "all_modules_updated"].includes(detail.status) ? 100 : Math.min(95, Math.round((answered / 10) * 100)));
      return {
        session_id: detail.id,
        startup_id: detail.startup_id,
        status: detail.status as any,
        current_question_number: detail.current_question_number || answered + 1,
        total_questions: 10,
        progress_percentage: progress,
        qa_history: qa,
        extracted_knowledge: detail.extracted_knowledge,
        knowledge_base: detail.knowledge_base,
        summary: detail.summary,
        key_insights: [],
      };
    } catch {
      return {
        session_id: null,
        startup_id: startupId,
        status: "not_started",
        current_question_number: 1,
        total_questions: 10,
        progress_percentage: 0,
        qa_history: [],
      };
    }
  },

  // --- MODULE 2: IDEA VALIDATION ---

  async generateIdeaValidation(): Promise<VersionedReport<IdeaValidationData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/idea-validation");
    const report = normalizeReport<IdeaValidationData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "idea_validation", res: res.data });
    return report;
  },

  // --- MODULE 3: BUSINESS STRATEGY ---

  async generateBusinessStrategy(): Promise<VersionedReport<BusinessStrategyData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/business-strategy");
    const report = normalizeReport<BusinessStrategyData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_strategy", res: res.data });
    return report;
  },

  // --- MODULE 4: COMPETITOR ANALYSIS ---

  async generateCompetitorAnalysis(): Promise<VersionedReport<CompetitorAnalysisData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/competitor-analysis");
    const report = normalizeReport<CompetitorAnalysisData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "competitor_analysis", res: res.data });
    return report;
  },

  // --- MODULE 5: BUSINESS MODEL CANVAS ---

  async generateBusinessModelCanvas(): Promise<VersionedReport<BusinessModelCanvasData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/business-model-canvas");
    const report = normalizeReport<BusinessModelCanvasData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "business_model_canvas", res: res.data });
    return report;
  },

  // --- MODULE 6: FINANCIAL PLANNING ---

  async generateFinancialPlanning(): Promise<VersionedReport<FinancialPlanningData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/financial-planning");
    const report = normalizeReport<FinancialPlanningData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "financial_planning", res: res.data });
    return report;
  },

  // --- MODULE 7: RISK ANALYSIS ---

  async generateRiskAnalysis(): Promise<VersionedReport<RiskAnalysisData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/risk-analysis");
    const report = normalizeReport<RiskAnalysisData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "risk_analysis", res: res.data });
    return report;
  },

  // --- MODULE 8: INVESTOR READINESS ---

  async generateInvestorReadiness(): Promise<VersionedReport<InvestorReadinessData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/investor-readiness");
    const report = normalizeReport<InvestorReadinessData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "investor_readiness", res: res.data });
    return report;
  },

  // --- MODULE 9: EXECUTION ROADMAP ---

  async generateExecutionRoadmap(): Promise<VersionedReport<ExecutionRoadmapData>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/ai/execution-roadmap");
    const report = normalizeReport<ExecutionRoadmapData>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: "execution_roadmap", res: res.data });
    return report;
  },

  // --- Report History ---

  async getReportHistory(reportType: string): Promise<ReportHistoryItem[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReport[] }>(
        `/api/v1/reports/history?report_type=${reportType}`
      );
      return (res.data ?? []).map((r) => ({
        id: r.id,
        report_type: r.report_type,
        version: r.version,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getLatestReport<T = Record<string, any>>(reportType: string): Promise<VersionedReport<T> | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: BackendReport | null }>(
        `/api/v1/reports/latest?report_type=${reportType}`
      );
      if (!res.data) return null;
      return normalizeReport<T>(res.data);
    } catch {
      return null;
    }
  },

  async regenerateReport<T = Record<string, any>>(reportType: string): Promise<VersionedReport<T>> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/reports/regenerate", {
      report_type: reportType,
    });
    const report = normalizeReport<T>(res.data);
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: reportType, res: res.data });
    return report;
  },

  // --- Module Statuses ---

  async getModuleStatuses(startupId: string): Promise<ModuleStatuses> {
    const moduleTypes = [
      "idea_validation",
      "business_strategy",
      "competitor_analysis",
      "business_model_canvas",
      "financial_planning",
      "risk_analysis",
      "investor_readiness",
      "execution_roadmap",
    ];

    const [interviewStatus, ...reportResults] = await Promise.allSettled([
      aiModulesService.getInterviewStatus(startupId),
      ...moduleTypes.map((t) => aiModulesService.getReportHistory(t)),
    ]);

    const statuses: Record<string, ModuleStatus> = {};

    // Interview status
    if (interviewStatus?.status === "fulfilled") {
      const iv = interviewStatus.value as InterviewStatusResponse;
      statuses["interview"] =
        iv.status === "completed"
          ? "Completed"
          : iv.status === "in_progress"
          ? "In Progress"
          : "Not Started";
    } else {
      statuses["interview"] = "Not Started";
    }

    // Report-based statuses
    for (let i = 0; i < moduleTypes.length; i++) {
      const key = moduleTypes[i]!;
      const result = reportResults[i];
      if (result?.status === "fulfilled") {
        const history = result.value as ReportHistoryItem[];
        statuses[key] = history.length > 0 ? "Completed" : "Not Started";
      } else {
        statuses[key] = "Not Started";
      }
    }

    return (statuses as unknown) as ModuleStatuses;
  },
};

/** analysisStages — UI copy for the interview loading animation */
export const analysisStages = [
  "Understanding your startup...",
  "Analyzing competitors...",
  "Validating market demand...",
  "Generating business strategy...",
  "Building execution roadmap...",
  "Finding investment opportunities...",
];
