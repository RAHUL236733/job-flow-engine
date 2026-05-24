import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, X, Sparkles, Loader2, ExternalLink, RotateCcw, Briefcase, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Instant AI Job Matcher" },
      { name: "description", content: "Upload your resume to instantly scrape live job boards and find roles tailored exactly to your skillset." },
    ],
  }),
});

const N8N_WEBHOOK_URL = "https://bhavanisankar.app.n8n.cloud/webhook/upload-resume";

type Job = {
  title: string;
  company: string;
  location: string;
  skills: string;
  url: string;
  score: string;
};

type Phase = "upload" | "loading" | "results";

const STEPS = [
  { label: "Extracting skills from your resume...", at: 0 },
  { label: "Spawning live AI web scrapers across job boards...", at: 3000 },
  { label: "Analyzing company listings against your profile...", at: 8000 },
  { label: "Finalizing your custom recommendation dashboard...", at: 12000 },
];

const ACCEPTED = [".pdf", ".doc", ".docx"];

function Index() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const validateFile = (f: File) => {
    const name = f.name.toLowerCase();
    return ACCEPTED.some((ext) => name.endsWith(ext));
  };

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!validateFile(f)) {
      toast.error("Unsupported file", { description: "Please upload a PDF, DOC, or DOCX file." });
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);

  const reset = () => {
    clearTimers();
    setFile(null);
    setResults([]);
    setStepIndex(0);
    setPhase("upload");
  };

  const startLoadingSteps = () => {
    setStepIndex(0);
    STEPS.forEach((s, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setStepIndex(i), s.at);
      timersRef.current.push(t);
    });
  };

  const submit = async () => {
    if (!file) return;
    setPhase("loading");
    startLoadingSteps();

    try {
      const fd = new FormData();
      fd.append("resume", file);

      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const raw: Job[] = Array.isArray(data)
        ? data
        : data.topJobs ?? data.jobs ?? [];
      clearTimers();
      setResults(raw.slice(0, 5));
      setPhase("results");
    } catch (err) {
      console.error(err);
      clearTimers();
      toast.error("Something went wrong", {
        description: "We couldn't reach the matcher. Please try again.",
      });
      setPhase("upload");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Hero />

        <div className="mt-12">
          {phase === "upload" && (
            <UploadCard
              file={file}
              dragOver={dragOver}
              setDragOver={setDragOver}
              onDrop={onDrop}
              onPick={() => inputRef.current?.click()}
              onRemove={() => setFile(null)}
              onSubmit={submit}
              inputRef={inputRef}
              onInputChange={(e) => handleFile(e.target.files?.[0])}
            />
          )}

          {phase === "loading" && <LoadingPanel stepIndex={stepIndex} />}

          {phase === "results" && <Results jobs={results} onReset={reset} />}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        AI-powered job discovery
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
        Instant AI Job Matcher
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
        Upload your resume to instantly scrape live job boards and find roles tailored
        exactly to your skillset.
      </p>
    </header>
  );
}

function UploadCard(props: {
  file: File | null;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
  onRemove: () => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { file, dragOver, setDragOver, onDrop, onPick, onRemove, onSubmit, inputRef, onInputChange } = props;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={onPick}
        className={[
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={onInputChange}
        />
        <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
          <Upload className="h-7 w-7" />
        </div>
        <p className="mt-4 text-base font-medium text-foreground">
          Drag &amp; drop your resume here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse — PDF, DOC, DOCX
        </p>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={!file}
        className="mt-6 h-12 w-full rounded-xl text-base font-medium"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Find Matches
      </Button>
    </div>
  );
}

function LoadingPanel({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-elegant md:p-10">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative rounded-full bg-primary/10 p-5 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-foreground">
          Matching you with the best roles
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This usually takes 10–15 seconds.
        </p>
      </div>

      <ol className="mt-8 space-y-3">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li
              key={i}
              className={[
                "flex items-start gap-3 rounded-xl border px-4 py-3 transition-all",
                active
                  ? "border-primary/40 bg-primary/5"
                  : done
                  ? "border-border bg-muted/30"
                  : "border-border bg-muted/10 opacity-60",
              ].join(" ")}
            >
              <div className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-border" />
                )}
              </div>
              <div className="text-sm">
                <span className="font-medium text-foreground">Step {i + 1}:</span>{" "}
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Results({ jobs, onReset }: { jobs: Job[]; onReset: () => void }) {
  return (
    <section>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Your Top Matches
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobs.length} role{jobs.length === 1 ? "" : "s"} curated for you
          </p>
        </div>
        <Button variant="outline" onClick={onReset} className="rounded-xl">
          <RotateCcw className="mr-2 h-4 w-4" />
          Upload Another Resume
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-elegant">
          No matches returned. Try a different resume.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, i) => (
            <JobCard key={i} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {job.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {job.company}
          </p>
          {job.location && (
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {job.score}
        </span>
      </div>

      {job.skills && (
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Skills: </span>
          {job.skills}
        </p>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
      >
        Apply Directly
        <ExternalLink className="h-4 w-4" />
      </a>
    </article>
  );
}
