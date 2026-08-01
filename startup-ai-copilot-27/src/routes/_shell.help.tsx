import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, MessageSquareText, Sparkles } from "lucide-react";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/help")({
  head: () => ({
    meta: [
      { title: "Help Center — AI Business Strategy Copilot" },
      { name: "description", content: "Getting started guides, tutorials, AI tips, FAQs and support for founders." },
      { property: "og:title", content: "Help Center — AI Business Strategy Copilot" },
      { property: "og:description", content: "Guides, tips and support for your AI strategy workspace." },
    ],
  }),
  component: Help,
});

const faqs = [
  ["How does the AI interview work?", "You answer ten adaptive questions in a conversation. Each answer refines the next question and feeds validation, strategy, financials and roadmap in one pass."],
  ["Can I edit what the AI generates?", "Yes. Every strategy section and every canvas block is editable, and edits are preserved when you regenerate other modules."],
  ["How is the investor readiness score calculated?", "It weighs problem and market validation, revenue model quality, financial plan completeness, team, traction and risk exposure against seed-stage benchmarks."],
  ["Is my startup data private?", "Your data belongs to you. Model-improvement sharing is off by default and can be reviewed in Settings → Privacy."],
  ["Can I export everything as a PDF?", "Yes — each report exports individually, or download the full bundle from the Reports Center."],
];

function Help() {
  return (
    <>
      <PageHeader title="Help Center" subtitle="Everything you need to get the most out of your AI copilot." />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Getting started", body: "Create a startup, run the interview, read your first strategy — about 12 minutes.", to: "/startups/new", cta: "Start now" },
          { icon: Sparkles, title: "AI tips", body: "Answer with numbers where you can. Specific answers produce sharper strategy and better scores.", to: "/interview", cta: "Open interview" },
          { icon: MessageSquareText, title: "Tutorials", body: "Short walkthroughs for validation, financial planning and the investor module.", to: "/validation", cta: "Watch walkthrough" },
        ].map((c) => (
          <SurfaceCard key={c.title}>
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <c.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold">{c.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to={c.to}>{c.cta}</Link>
            </Button>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard hover={false} className="p-2 sm:p-4">
        <Accordion type="single" collapsible defaultValue={faqs[0]![0]!}>
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q!}>
              <AccordionTrigger className="px-2 text-left font-medium hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="px-2 text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SurfaceCard>

      <SurfaceCard hover={false} className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <LifeBuoy className="size-4 text-primary" /> Still stuck?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Founders get a reply within one business day.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Send feedback</Button>
          <Button variant="hero">Contact support</Button>
        </div>
      </SurfaceCard>
    </>
  );
}
