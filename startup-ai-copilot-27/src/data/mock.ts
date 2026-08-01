/**
 * mock.ts — shared TYPE definitions and NON-startup helper data.
 * All demo startup objects (EcoPack AI, MediSync, AgriLens) have been removed.
 * The application is now fully database-driven via the FastAPI backend.
 */

export type Startup = {
  id: string;
  name: string;
  industry: string;
  country: string;
  stage: string;
  score: number;
  investorReadiness: number;
  updated: string;
  tagline: string;
  logo: string;
};

/** Kept empty — real startups come from GET /api/v1/startups */
export const startups: Startup[] = [];

export const activeStartup: Startup | undefined = undefined;

/** Chart helper: empty until real API data is wired per startup */
export const progressSeries: { month: string; score: number; health: number; funding: number }[] = [];

export const revenueForecast: { month: string; revenue: number; costs: number; profit: number }[] = [];

export const riskDistribution: { name: string; value: number; fill: string }[] = [
  { name: "Market", value: 28, fill: "var(--color-chart-1)" },
  { name: "Financial", value: 22, fill: "var(--color-chart-2)" },
  { name: "Operational", value: 18, fill: "var(--color-chart-3)" },
  { name: "Technical", value: 17, fill: "var(--color-chart-4)" },
  { name: "Regulatory", value: 15, fill: "var(--color-chart-5)" },
];

/** AI interview loading stages — purely UI/UX copy, not startup-specific data */
export const analysisStages = [
  "Understanding your startup...",
  "Analyzing competitors...",
  "Validating market demand...",
  "Generating business strategy...",
  "Building execution roadmap...",
  "Finding investment opportunities...",
];
