import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleCheckBig,
  PlayCircle,
  Rocket,
  Route as RouteIcon,
  Target,
  Wallet,
} from "lucide-react";

import hero from "@/assets/hero.jpg";
import logo from "@/assets/logo.png";
import { AiBadge, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Business Strategy Copilot — Idea to Investor Ready" },
      {
        name: "description",
        content:
          "Turn your business idea into an investor-ready startup with AI-powered strategy, market validation, financial planning and execution guidance.",
      },
      { property: "og:title", content: "AI Business Strategy Copilot" },
      {
        property: "og:description",
        content: "AI-powered business strategy, validation, financial planning and investor readiness for founders.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ChartNoAxesCombined, title: "Business Strategy", body: "Executive summary, positioning, GTM and growth plans generated from your answers." },
  { icon: BrainCircuit, title: "AI Validation", body: "Innovation, demand, competition and feasibility scored with evidence." },
  { icon: Wallet, title: "Financial Planning", body: "Revenue streams, pricing, burn, break-even and funding requirement." },
  { icon: Target, title: "Investor Readiness", body: "A readiness score, elevator pitches and a checklist investors expect." },
  { icon: RouteIcon, title: "Execution Roadmap", body: "A week-by-week plan with priorities, effort and the next best action." },
];

const stats = [
  { value: "12,480", label: "Startups created" },
  { value: "31,902", label: "Ideas validated" },
  { value: "18,640", label: "Business strategies generated" },
  { value: "₹412 Cr", label: "Funding tracked by founders" },
];

const testimonials = [
  { name: "Ananya Sharma", role: "Founder, EcoPack AI", quote: "We walked into our pre-seed meetings with a strategy doc the investors actually read. The readiness checklist told us exactly what was missing." },
  { name: "Daniel Okoro", role: "Founder, AgriLens", quote: "The AI interview asked sharper questions than my accelerator mentor. Two of them changed our pricing model completely." },
  { name: "Wei Lin", role: "Co-founder, MediSync", quote: "Financial planning used to take us a weekend. Now it takes eight minutes and the break-even math holds up." },
];

const flow = ["Idea", "AI Analysis", "Business Strategy", "Investor Ready"];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img src={logo} alt="AI Business Strategy Copilot logo" width={32} height={32} className="size-8" />
          <span className="font-display text-base font-semibold">Copilot</span>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#workflow" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#proof" className="transition-colors hover:text-foreground">Founders</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-6">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/dashboard">Start Building</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-40 size-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise">
            <AiBadge>AI copilot for founders</AiBadge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              AI Business <span className="text-gradient">Strategy Copilot</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Transform your business idea into an investor-ready startup with AI-powered business strategy,
              market validation, financial planning, and execution guidance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/startups/new">
                  Start Building <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">
                  <PlayCircle /> Watch Demo
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card", "10-question AI interview", "Investor-ready PDF"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CircleCheckBig className="size-4 text-success" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative animate-fade-in">
            <img
              src={hero}
              alt="Illustration of an AI business analytics dashboard with growth charts and score rings"
              width={1280}
              height={1024}
              className="w-full rounded-3xl border shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">Everything a founder needs, in one workspace</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Nine AI modules that move your startup from a raw idea to a fundable business.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <SurfaceCard key={f.title}>
              <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">From idea to investor ready</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {flow.map((step, i) => (
              <div key={step} className="surface-card hover-lift relative p-6">
                <span className="font-display text-sm font-semibold text-primary">0{i + 1}</span>
                <p className="mt-2 text-lg font-semibold">{step}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {["Describe the problem you're solving.", "Ten intelligent questions, scored instantly.", "Strategy, canvas, finance and risk.", "Pitch, checklist and funding plan."][i]}
                </p>
                {i < flow.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 hidden size-5 -translate-y-1/2 text-muted-foreground md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <SurfaceCard key={s.label} className="text-center">
              <p className="font-display text-3xl font-semibold text-gradient">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </SurfaceCard>
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <SurfaceCard key={t.name}>
              <p className="text-sm leading-relaxed">“{t.quote}”</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="gradient-brand rounded-3xl px-6 py-12 text-center text-primary-foreground sm:px-12">
          <Rocket className="mx-auto size-8" />
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Your first strategy is eight minutes away</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">
            Answer ten questions. Get a validated idea, a business model canvas, a financial plan and an investor pitch.
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link to="/startups/new">Create your startup</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" width={28} height={28} loading="lazy" className="size-7" />
              <span className="font-display font-semibold">Copilot</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The AI business strategy workspace for founders building fundable companies.
            </p>
          </div>
          {[
            { title: "Product", links: ["Dashboard", "AI Interview", "Reports", "Roadmap"] },
            { title: "Modules", links: ["Validation", "Strategy", "Finance", "Risk"] },
            { title: "Company", links: ["About", "Careers", "Privacy", "Contact"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <span className="cursor-pointer transition-colors hover:text-foreground">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          © 2026 AI Business Strategy Copilot. Demo experience with representative data.
        </div>
      </footer>
    </div>
  );
}
