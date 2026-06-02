import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";
import { N8nStructuredToolContent } from "@/components/coach/n8n-display/N8nStructuredToolContent";
import type { CoachToolConfig } from "@/lib/career-tools-config";
import type { TrackedJob } from "@/lib/job-tracker";
import { normalizeJob } from "@/lib/job-tracker";

type CoachToolPageViewProps = {
  tool: CoachToolConfig;
  onBack: () => void;
  onOpenMatcher: () => void;
  displayName: string;
  profileEmail: string;
  resumeName?: string;
  parsedSkills: string[];
  jobs: TrackedJob[];
  internships?: TrackedJob[];
  onSaveJob?: (job: TrackedJob) => void;
  onApplyJob?: (job: TrackedJob) => void;
  savedJobsList?: TrackedJob[];
};

export function CoachToolPageView({
  tool,
  onBack,
  onOpenMatcher,
  jobs,
  internships = [],
  onSaveJob,
  onApplyJob,
  savedJobsList = [],
}: CoachToolPageViewProps) {
  const { analysis, isLoading: analysisLoading, refreshAnalysis } = useAnalysis();

  const isJobSaved = (job: TrackedJob) =>
    savedJobsList.some((j) => j.id === normalizeJob(job).id);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto w-full px-0 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => refreshAnalysis()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenMatcher}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-xs font-bold text-white min-h-[44px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Job Matcher
          </button>
        </div>
      </div>

      <div
        className={`rounded-3xl p-6 md:p-8 border border-white/10 bg-gradient-to-br ${tool.gradient} shadow-[0_20px_50px_rgba(0,0,0,0.35)]`}
      >
        <span className="text-4xl">{tool.emoji}</span>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-3">{tool.title}</h1>
        <p className="text-sm text-white/80 mt-1 font-medium">{tool.subtitle}</p>
        <p className="text-[10px] text-white/50 mt-3 font-mono uppercase tracking-wider">
          Live processing output — fields match your results
        </p>
      </div>

      <div className="glass-card rounded-3xl border border-white/10 bg-[#0f0d20]/80 backdrop-blur-xl p-6 md:p-8 min-h-[320px]">
        {analysisLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
            <p className="text-sm text-slate-400 font-medium">Loading analysis from Supabase…</p>
          </div>
        ) : !analysis ? (
          <p className="text-sm text-slate-400 text-center py-16">
            No analysis yet. Upload your resume in <strong className="text-white">Job Matcher</strong> and wait
            until processing finishes — then open this page again.
          </p>
        ) : (
          <N8nStructuredToolContent
            toolId={tool.id}
            analysis={analysis}
            jobs={jobs}
            internships={internships}
            onSaveJob={onSaveJob}
            onApplyJob={onApplyJob}
            isJobSaved={isJobSaved}
          />
        )}
      </div>
    </div>
  );
}
