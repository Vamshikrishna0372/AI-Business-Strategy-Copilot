import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, CloudCheck, Loader2 } from "lucide-react";
import { useState } from "react";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { startupService } from "@/services/startup-service";
import { useWorkspace } from "@/lib/workspace-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/startups/new")({
  head: () => ({
    meta: [
      { title: "Create Startup — AI Business Strategy Copilot" },
      { name: "description", content: "Set up a new startup workspace in three guided steps: basics, business idea and goals." },
      { property: "og:title", content: "Create Startup — AI Business Strategy Copilot" },
      { property: "og:description", content: "Three guided steps from idea to a full AI startup workspace." },
    ],
  }),
  component: CreateStartup,
});

const steps = ["Basic information", "Business idea", "Business goals"];

function CreateStartup() {
  const navigate = useNavigate();
  const { setActiveId, refetchStartups } = useWorkspace();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [stage, setStage] = useState("pre_seed");
  const [problemStatement, setProblemStatement] = useState("");
  const [solution, setSolution] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [businessModel, setBusinessModel] = useState("B2B SaaS");
  const [revenueModel, setRevenueModel] = useState("Subscription");
  const [teamSize, setTeamSize] = useState("1");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please provide a startup name.");
      setStep(0);
      return;
    }

    setSubmitting(true);
    try {
      const created = await startupService.createStartup({
        name,
        industry,
        stage: stage.toLowerCase().replace(/\s+/g, "_"),
        problem_statement: problemStatement,
        solution,
        target_audience: targetAudience,
        business_model: businessModel,
        revenue_model: revenueModel,
        team_size: parseInt(teamSize, 10) || 5,
        description,
      });

      await refetchStartups();
      setActiveId(created.id);
      toast.success(`Startup Workspace "${created.name}" created successfully!`);
      navigate({ to: "/overview" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create startup workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="New workspace"
        title="Create your startup"
        subtitle="Three short steps. The AI uses this to run your strategy, validation, and analytics."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1.5 text-xs font-medium text-success">
            <CloudCheck className="size-3.5" /> Ready for creation
          </span>
        }
      />

      <SurfaceCard hover={false}>
        <div className="grid grid-cols-3 gap-3">
          {steps.map((s, i) => (
            <div key={s} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                    i < step && "bg-success text-success-foreground",
                    i === step && "bg-primary text-primary-foreground",
                    i > step && "bg-muted text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("truncate text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>{s}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: i <= step ? "100%" : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard hover={false} className="p-6">
        {step === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Startup name" placeholder="e.g. My SaaS Company" value={name} onChange={(e) => setName(e.target.value)} />
            <Picker label="Industry" value={industry} onChange={setIndustry} options={["Technology", "Sustainable Packaging", "Health Tech", "AgriTech", "Fintech", "AI SaaS", "Consumer", "EdTech", "CleanTech", "Other"]} />
            <Picker label="Business stage" value={stage} onChange={setStage} options={["idea", "pre_seed", "seed", "series_a", "growth"]} />
            <Field label="Team size" placeholder="5" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            <Area label="Tagline / Short Description" className="md:col-span-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5">
            <Area label="Problem statement" hint="What is broken today, and for whom?" value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
            <Area label="Solution" hint="How does your product solve it?" value={solution} onChange={(e) => setSolution(e.target.value)} />
            <div className="grid gap-5 md:grid-cols-2">
              <Area label="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={3} />
              <Area label="Business model" value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Revenue Model" value={revenueModel} onChange={(e) => setRevenueModel(e.target.value)} />
            <Picker label="Stage Confirmation" value={stage} onChange={setStage} options={["idea", "pre_seed", "seed", "series_a", "growth"]} />
            <Area label="Target Audience Summary" className="md:col-span-2" rows={3} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
          <Button variant="ghost" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft /> Back
          </Button>
          <p className="hidden text-xs text-muted-foreground sm:block">Step {step + 1} of 3</p>
          {step < 2 ? (
            <Button variant="hero" onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Create Workspace <ArrowRight className="ml-1 size-4" /></>}
            </Button>
          )}
        </div>
      </SurfaceCard>
    </>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="h-11" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

function Area({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  className,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Textarea rows={rows} value={value} onChange={onChange} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o.replace(/_/g, " ").toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
