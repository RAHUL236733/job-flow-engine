import type { AnalysisData } from "@/hooks/use-analysis";
import type { CoachToolTabId } from "@/lib/career-tools-config";
import type { TrackedJob } from "@/lib/job-tracker";
import { JobMatchCard } from "./JobMatchCard";
import {
  asStringList,
  BulletItems,
  NumberedItems,
  ScoreHero,
  Section,
  TagPills,
  TextBlock,
} from "./primitives";

type N8nStructuredToolContentProps = {
  toolId: CoachToolTabId;
  analysis: AnalysisData;
  jobs: TrackedJob[];
  internships: TrackedJob[];
  onSaveJob?: (job: TrackedJob) => void;
  onApplyJob?: (job: TrackedJob) => void;
  isJobSaved?: (job: TrackedJob) => boolean;
};

function ProfileContext({ analysis }: { analysis: AnalysisData }) {
  const skills = analysis.skills ?? [];
  const roles = analysis.roles ?? [];
  const keywords = analysis.keywords ?? [];
  if (!skills.length && !roles.length && !keywords.length && !analysis.experience) {
    return null;
  }
  return (
    <div className="space-y-6 pb-6 border-b border-white/10">
      {analysis.experience && (
        <Section title="experience">
          <TextBlock>{analysis.experience}</TextBlock>
        </Section>
      )}
      {skills.length > 0 && (
        <Section title="skills">
          <TagPills items={skills} variant="purple" />
        </Section>
      )}
      {roles.length > 0 && (
        <Section title="roles">
          <TagPills items={roles} variant="blue" />
        </Section>
      )}
      {keywords.length > 0 && (
        <Section title="keywords">
          <TagPills items={keywords} variant="green" />
        </Section>
      )}
    </div>
  );
}

function AtsScoreView({ analysis }: { analysis: AnalysisData }) {
  const ats = analysis.atsScore;
  const score = ats?.score ?? 0;
  const missing = asStringList(ats?.missingKeywords);
  const recs = asStringList(ats?.recommendations);

  return (
    <div className="space-y-8">
      <ScoreHero score={score} label="atsScore" />
      {missing.length > 0 && (
        <Section title="missingKeywords">
          <TagPills items={missing} variant="amber" />
        </Section>
      )}
      {recs.length > 0 && (
        <Section title="recommendations">
          <NumberedItems items={recs} />
        </Section>
      )}
    </div>
  );
}

function ResumeReviewView({ analysis }: { analysis: AnalysisData }) {
  const r = analysis.resumeReview;
  if (!r) return <EmptySection name="resumeReview" />;
  return (
    <div className="space-y-8">
      {r.summary && (
        <Section title="summary">
          <TextBlock>{r.summary}</TextBlock>
        </Section>
      )}
      {asStringList(r.strengths).length > 0 && (
        <Section title="strengths">
          <NumberedItems items={asStringList(r.strengths)} />
        </Section>
      )}
      {asStringList(r.weaknesses).length > 0 && (
        <Section title="weaknesses">
          <NumberedItems items={asStringList(r.weaknesses)} />
        </Section>
      )}
      {asStringList(r.improvements).length > 0 && (
        <Section title="improvements">
          <NumberedItems items={asStringList(r.improvements)} />
        </Section>
      )}
    </div>
  );
}

function SkillGapView({ analysis }: { analysis: AnalysisData }) {
  const g = analysis.skillGapAnalysis;
  return (
    <div className="space-y-8">
      <ProfileContext analysis={analysis} />
      {!g ? (
        <EmptySection name="skillGapAnalysis" />
      ) : (
        <>
          {asStringList(g.currentSkills).length > 0 && (
            <Section title="currentSkills">
              <TagPills items={asStringList(g.currentSkills)} variant="green" />
            </Section>
          )}
          {asStringList(g.missingSkills).length > 0 && (
            <Section title="missingSkills">
              <TagPills items={asStringList(g.missingSkills)} variant="red" />
            </Section>
          )}
          {asStringList(g.prioritySkills).length > 0 && (
            <Section title="prioritySkills">
              <NumberedItems items={asStringList(g.prioritySkills)} />
            </Section>
          )}
          {asStringList(g.learningSuggestions).length > 0 && (
            <Section title="learningSuggestions">
              <NumberedItems items={asStringList(g.learningSuggestions)} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function RoadmapView({ analysis }: { analysis: AnalysisData }) {
  const r = analysis.careerRoadmap;
  if (!r) return <EmptySection name="careerRoadmap" />;
  return (
    <div className="space-y-8">
      {asStringList(r.next30Days).length > 0 && (
        <Section title="next30Days">
          <NumberedItems items={asStringList(r.next30Days)} />
        </Section>
      )}
      {asStringList(r.next90Days).length > 0 && (
        <Section title="next90Days">
          <NumberedItems items={asStringList(r.next90Days)} />
        </Section>
      )}
      {asStringList(r.next6Months).length > 0 && (
        <Section title="next6Months">
          <NumberedItems items={asStringList(r.next6Months)} />
        </Section>
      )}
    </div>
  );
}

function InterviewView({ analysis }: { analysis: AnalysisData }) {
  const i = analysis.interviewPractice;
  if (!i) return <EmptySection name="interviewPractice" />;
  const technical = asStringList(i.technicalQuestions);
  const hr = asStringList(i.hrQuestions);
  const tips = asStringList(i.preparationTips);

  return (
    <div className="space-y-8">
      {technical.length > 0 && (
        <Section title="technicalQuestions">
          <NumberedItems items={technical} />
        </Section>
      )}
      {hr.length > 0 && (
        <Section title="hrQuestions">
          <NumberedItems items={hr} />
        </Section>
      )}
      {tips.length > 0 && (
        <Section title="preparationTips">
          <BulletItems items={tips} />
        </Section>
      )}
    </div>
  );
}

function SalaryView({ analysis }: { analysis: AnalysisData }) {
  const s = analysis.salaryInsights;
  if (!s) return <EmptySection name="salaryInsights" />;
  return (
    <div className="space-y-8">
      {s.entryLevelRange && (
        <Section title="entryLevelRange">
          <div className="rounded-2xl bg-[#10b981]/10 border border-[#10b981]/25 p-5">
            <TextBlock>{s.entryLevelRange}</TextBlock>
          </div>
        </Section>
      )}
      {s.growthPotential && (
        <Section title="growthPotential">
          <div className="rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 p-5">
            <TextBlock>{s.growthPotential}</TextBlock>
          </div>
        </Section>
      )}
    </div>
  );
}

function LinkedInView({ analysis }: { analysis: AnalysisData }) {
  const l = analysis.linkedinOptimization;
  const headlines = asStringList(l?.headlineSuggestions ?? l?.headline);
  const about = asStringList(l?.aboutSectionSuggestions);
  const improvements = asStringList(l?.profileImprovements ?? l?.recruiterSearchTips);

  if (!l && !headlines.length && !about.length && !improvements.length) {
    return <EmptySection name="linkedinOptimization" />;
  }

  return (
    <div className="space-y-8">
      {headlines.length > 0 && (
        <Section title="headlineSuggestions">
          <NumberedItems items={headlines} />
        </Section>
      )}
      {about.length > 0 && (
        <Section title="aboutSectionSuggestions">
          {about.map((text, idx) => (
            <div key={idx} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-3">
              <TextBlock>{text}</TextBlock>
            </div>
          ))}
        </Section>
      )}
      {improvements.length > 0 && (
        <Section title="profileImprovements">
          <NumberedItems items={improvements} />
        </Section>
      )}
    </div>
  );
}

function CoverLetterView({ analysis }: { analysis: AnalysisData }) {
  const letter = analysis.coverLetterGenerator?.letter;
  if (!letter) return <EmptySection name="coverLetterGenerator.coverLetter" />;
  const text = letter.replace(/\\n/g, "\n");
  return (
    <Section title="coverLetter">
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 md:p-8">
        <TextBlock>{text}</TextBlock>
      </div>
    </Section>
  );
}

function JobsView({
  jobs,
  internships,
  onSaveJob,
  onApplyJob,
  isJobSaved,
}: {
  jobs: TrackedJob[];
  internships: TrackedJob[];
  onSaveJob?: (job: TrackedJob) => void;
  onApplyJob?: (job: TrackedJob) => void;
  isJobSaved?: (job: TrackedJob) => boolean;
}) {
  return (
    <div className="space-y-10">
      {jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            topJobs <span className="text-slate-500 font-bold">({jobs.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <JobMatchCard
                key={job.id}
                job={job}
                isSaved={isJobSaved?.(job)}
                onSave={onSaveJob ? () => onSaveJob(job) : undefined}
                onApply={onApplyJob ? () => onApplyJob(job) : undefined}
              />
            ))}
          </div>
        </div>
      )}
      {internships.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            internships <span className="text-slate-500 font-bold">({internships.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {internships.map((job) => (
              <JobMatchCard
                key={job.id}
                job={job}
                isSaved={isJobSaved?.(job)}
                onSave={onSaveJob ? () => onSaveJob(job) : undefined}
                onApply={onApplyJob ? () => onApplyJob(job) : undefined}
              />
            ))}
          </div>
        </div>
      )}
      {jobs.length === 0 && internships.length === 0 && (
        <EmptySection name="topJobs / internships" />
      )}
    </div>
  );
}

function EmptySection({ name }: { name: string }) {
  return (
    <p className="text-sm text-slate-500 text-center py-8">
      No <span className="text-slate-400 font-mono">{name}</span> in your last processing run.
    </p>
  );
}

export function N8nStructuredToolContent({
  toolId,
  analysis,
  jobs,
  internships,
  onSaveJob,
  onApplyJob,
  isJobSaved,
}: N8nStructuredToolContentProps) {
  switch (toolId) {
    case "tool-ats":
      return <AtsScoreView analysis={analysis} />;
    case "tool-resume":
      return <ResumeReviewView analysis={analysis} />;
    case "tool-skill-gap":
      return <SkillGapView analysis={analysis} />;
    case "tool-roadmap":
      return <RoadmapView analysis={analysis} />;
    case "tool-interview":
      return <InterviewView analysis={analysis} />;
    case "tool-salary":
      return <SalaryView analysis={analysis} />;
    case "tool-linkedin":
      return <LinkedInView analysis={analysis} />;
    case "tool-cover-letter":
      return <CoverLetterView analysis={analysis} />;
    case "tool-jobs":
      return (
        <JobsView
          jobs={jobs}
          internships={internships}
          onSaveJob={onSaveJob}
          onApplyJob={onApplyJob}
          isJobSaved={isJobSaved}
        />
      );
    default:
      return null;
  }
}
