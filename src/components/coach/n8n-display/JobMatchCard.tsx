import { Bookmark, ExternalLink, MapPin } from "lucide-react";
import type { TrackedJob } from "@/lib/job-tracker";

type JobMatchCardProps = {
  job: TrackedJob;
  isSaved?: boolean;
  onSave?: () => void;
  onApply?: () => void;
};

export function JobMatchCard({ job, isSaved, onSave, onApply }: JobMatchCardProps) {
  const reasons = job.matchReasons?.length ? job.matchReasons : job.matchedSkills;
  const score = String(job.score).replace("%", "");

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-lg font-black text-[#8b5cf6] shrink-0">
            {job.company.charAt(0)}
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-white text-sm tracking-tight truncate">{job.title}</h4>
            <p className="text-[11px] font-bold text-slate-400">{job.company}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#8b5cf6]/10 text-[#3b82f6] border border-[#8b5cf6]/20 shrink-0">
          {score}% match
        </span>
      </div>

      {job.location && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5" />
          <span>{job.location}</span>
        </div>
      )}

      {reasons.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">matchReasons</p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 text-[9px] font-semibold text-[#c4b5fd] leading-snug"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className={`p-2.5 rounded-xl border transition-all ${
              isSaved
                ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/30 text-[#3b82f6]"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title={isSaved ? "Saved" : "Save"}
          >
            <Bookmark className="w-4 h-4" />
          </button>
        )}
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            applyLink <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : onApply ? (
          <button
            type="button"
            onClick={onApply}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold"
          >
            Quick Apply
          </button>
        ) : null}
      </div>
    </div>
  );
}
