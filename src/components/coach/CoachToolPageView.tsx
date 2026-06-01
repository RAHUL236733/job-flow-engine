import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";
import { FormattedMessage } from "@/components/chat/FormattedMessage";
import { buildCoachResponse } from "@/lib/career-coach/analysis-service";
import type { CoachToolConfig } from "@/lib/career-tools-config";
import { analysisDataToStored } from "@/lib/n8n-response";
import type { TrackedJob } from "@/lib/job-tracker";

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
};

export function CoachToolPageView({
  tool,
  onBack,
  onOpenMatcher,
  displayName,
  profileEmail,
  resumeName,
  parsedSkills,
  jobs,
  internships = [],
}: CoachToolPageViewProps) {
  const { analysis, isLoading: analysisLoading, refreshAnalysis } = useAnalysis();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [jobRecs, setJobRecs] = useState<
    { title: string; company: string; score: number; matchReason: string }[]
  >([]);

  const loadContent = useCallback(() => {
    setLoading(true);
    try {
      const stored = analysisDataToStored(analysis);
      const skills =
        parsedSkills.length > 0 ? parsedSkills : analysis?.skills ?? [];
      const score = stored.atsScore.score || analysis?.atsScore?.score || 0;

      const allJobs =
        tool.id === "tool-jobs"
          ? [...jobs, ...internships]
          : jobs;

      const response = buildCoachResponse({
        actionType: tool.actionType,
        promptText: tool.title,
        analysis: stored,
        atsScore: score,
        parsedSkills: skills,
        profileName: displayName,
        profileEmail,
        resumeName,
        jobs: allJobs.map((j) => ({
          title: j.title,
          company: j.company,
          score: String(j.score),
          matchReasons: j.matchReasons?.length
            ? j.matchReasons
            : j.matchedSkills,
          location: j.location,
          salary: j.salary,
          url: j.url,
        })),
        assistantMode: "chat",
        activeInterviewStep: 0,
      });

      setContent(response.text);
      setJobRecs(response.jobRecsData || []);
    } catch (err) {
      console.error(err);
      setContent(
        `# ⚠️ Unable to load analysis\n\nUpload your resume under **Job Matcher** first, then return here to view your **${tool.title}** report.`,
      );
    } finally {
      setLoading(false);
    }
  }, [
    analysis,
    tool.actionType,
    tool.title,
    tool.id,
    parsedSkills,
    displayName,
    profileEmail,
    resumeName,
    jobs,
    internships,
  ]);

  useEffect(() => {
    if (!analysisLoading) {
      loadContent();
    }
  }, [analysisLoading, loadContent]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              refreshAnalysis();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenMatcher}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-xs font-bold text-white"
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
      </div>

      <div className="glass-card rounded-3xl border border-white/10 bg-[#0f0d20]/80 backdrop-blur-xl p-6 md:p-8 min-h-[320px]">
        {loading || analysisLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
            <p className="text-sm text-slate-400 font-medium">Loading your analysis from Supabase…</p>
          </div>
        ) : !analysis ? (
          <p className="text-sm text-slate-400 text-center py-16">
            No analysis yet. Upload your resume in <strong className="text-white">Job Matcher</strong> to
            generate ATS, roadmap, salary, and job matches.
          </p>
        ) : (
          <>
            <FormattedMessage text={content} />
            {tool.id === "tool-jobs" && jobRecs.length > 0 && (
              <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                <h3 className="text-lg font-bold text-white">Matched roles</h3>
                {jobRecs.map((job, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-white">{job.title}</p>
                      <p className="text-sm text-slate-400">{job.company}</p>
                      <p className="text-xs text-slate-500 mt-1">{job.matchReason}</p>
                    </div>
                    <span className="text-sm font-black text-[#8b5cf6] shrink-0">{job.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
