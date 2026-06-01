import type { AnalysisData } from "@/hooks/use-analysis";
import type { StoredAnalysis } from "@/lib/career-coach/types";
import { normalizeJob, type TrackedJob } from "@/lib/job-tracker";

export const N8N_ANALYSIS_TIMEOUT_MS = 180_000; // n8n workflow can run ~2 minutes
export const SERVICE_UNAVAILABLE_MESSAGE = "Service unavailable. Try again later.";

/** Unwrap n8n body: single object, `{ data }`, or `[{ ... }]` */
export function unwrapN8nPayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return {};
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
      return o.data as Record<string, unknown>;
    }
    if (o.json && typeof o.json === "object") {
      return unwrapN8nPayload(o.json);
    }
    if (o.body && typeof o.body === "object") {
      return unwrapN8nPayload(o.body);
    }
    return o;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return unwrapN8nPayload(JSON.parse(trimmed));
    } catch {
      return {};
    }
  }
  return {};
}

/** Merge `resumeData` (skills, ATS, etc.) with top-level webhook fields */
export function flattenN8nPayload(raw: unknown): Record<string, unknown> {
  const root = unwrapN8nPayload(raw);
  const resumeData = (root.resumeData ?? root.resume_data) as Record<string, unknown> | undefined;
  if (!resumeData || typeof resumeData !== "object") {
    return root;
  }
  return {
    ...resumeData,
    ...root,
    // Prefer explicit job lists on root, then resumeData
    topJobs: root.topJobs ?? root.top_jobs ?? resumeData.topJobs ?? resumeData.jobs,
    jobs: root.jobs ?? resumeData.jobs,
    internships:
      root.internships ?? root.internship ?? resumeData.internships ?? resumeData.internship,
    skills: resumeData.skills ?? root.skills,
    resumeReview: resumeData.resumeReview ?? root.resumeReview,
    atsScore: resumeData.atsScore ?? root.atsScore,
    skillGapAnalysis: resumeData.skillGapAnalysis ?? root.skillGapAnalysis,
    careerRoadmap: resumeData.careerRoadmap ?? root.careerRoadmap,
    interviewPractice: resumeData.interviewPractice ?? root.interviewPractice,
    salaryInsights: resumeData.salaryInsights ?? root.salaryInsights,
    linkedinOptimization: resumeData.linkedinOptimization ?? root.linkedinOptimization,
    coverLetterGenerator:
      resumeData.coverLetterGenerator ?? root.coverLetterGenerator,
  };
}

/** Arrays from n8n may be `[]` or `{ "0": {}, "1": {} }` */
export function asRecordList(val: unknown): Record<string, unknown>[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter((item) => item != null)
      .map((item) =>
        typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : { title: String(item) },
      );
  }
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if ("title" in o || "company" in o || "matchScore" in o) {
      return [o];
    }
    const numericKeys = Object.keys(o).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => o[k] as Record<string, unknown>)
        .filter((item) => item && typeof item === "object");
    }
  }
  return [];
}

function mapListing(
  raw: Record<string, unknown>,
  index: number,
  kind: "job" | "internship",
): TrackedJob {
  const reasons = raw.matchReasons ?? raw.match_reasons ?? raw.reasons;
  const matchReasons = Array.isArray(reasons)
    ? reasons.map(String)
    : typeof reasons === "string"
      ? [reasons]
      : [];

  const tracked = normalizeJob(
    {
      ...raw,
      title: raw.title || raw.role,
      company: raw.company,
      location: raw.location,
      salary: raw.salary || raw.compensation,
      score: raw.matchScore ?? raw.score,
      url: raw.applyLink ?? raw.url ?? raw.applyUrl,
      type: raw.type || (kind === "internship" ? "Internship" : "Fullstack"),
      matchedSkills: matchReasons.length ? matchReasons.slice(0, 3) : raw.matchedSkills,
    },
    index,
  );

  return {
    ...tracked,
    matchReasons,
    listingKind: kind,
  };
}

export type ParsedN8nPayload = {
  analysis: AnalysisData;
  jobs: TrackedJob[];
  internships: TrackedJob[];
};

export function isValidN8nPayload(parsed: ParsedN8nPayload): boolean {
  const hasListings = parsed.jobs.length > 0 || parsed.internships.length > 0;
  const a = parsed.analysis;
  const hasAnalysis =
    (a.skills?.length ?? 0) > 0 ||
    !!a.resumeReview ||
    (a.atsScore?.score ?? 0) > 0 ||
    !!a.skillGapAnalysis ||
    !!a.careerRoadmap ||
    !!a.interviewPractice ||
    !!a.salaryInsights ||
    !!a.linkedinOptimization ||
    !!a.coverLetterGenerator?.letter;
  return hasListings || hasAnalysis;
}

export function parseN8nResponse(raw: unknown): ParsedN8nPayload {
  const payload = flattenN8nPayload(raw);

  const jobRows = asRecordList(
    payload.topJobs ?? payload.top_jobs ?? payload.jobs ?? payload.jobMatches,
  );
  const internshipRows = asRecordList(
    payload.internships ?? payload.internship ?? payload.internshipList,
  );

  const jobs = jobRows.map((row, i) => mapListing(row, i, "job"));
  const internships = internshipRows.map((row, i) => mapListing(row, i, "internship"));

  const skills = Array.isArray(payload.skills)
    ? (payload.skills as unknown[]).map(String)
    : typeof payload.skills === "string"
      ? payload.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const roles = Array.isArray(payload.roles)
    ? (payload.roles as unknown[]).map(String)
    : asRecordList(payload.roles).map((r) => String(r.title ?? r.name ?? r));

  const keywords = Array.isArray(payload.keywords)
    ? (payload.keywords as unknown[]).map(String)
    : [];

  const resumeReview = (payload.resumeReview ?? payload.resume_review) as AnalysisData["resumeReview"];
  const atsRaw = (payload.atsScore ?? payload.ats_score) as AnalysisData["atsScore"];
  const skillGap = (payload.skillGapAnalysis ?? payload.skill_gap_analysis) as AnalysisData["skillGapAnalysis"];
  const roadmap = (payload.careerRoadmap ?? payload.career_roadmap) as AnalysisData["careerRoadmap"];
  const interview = (payload.interviewPractice ?? payload.interview_practice) as AnalysisData["interviewPractice"];
  const salary = (payload.salaryInsights ?? payload.salary_insights) as AnalysisData["salaryInsights"];
  const linkedin = (payload.linkedinOptimization ?? payload.linkedin_optimization) as AnalysisData["linkedinOptimization"];
  const coverRoot = payload.coverLetterGenerator ?? payload.cover_letter_generator ?? payload.coverLetter;
  const coverLetter =
    typeof coverRoot === "object" && coverRoot !== null && "coverLetter" in (coverRoot as object)
      ? (coverRoot as { coverLetter?: string }).coverLetter
      : typeof coverRoot === "string"
        ? coverRoot
        : undefined;

  const mapJobToAnalysis = (j: TrackedJob, kind: "job" | "internship") => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary,
    matchScore: typeof j.score === "number" ? j.score : parseInt(String(j.score).replace("%", ""), 10) || 0,
    matchReason: j.matchReasons?.[0] || j.matchedSkills?.[0],
    applyUrl: j.url,
    listingKind: kind,
  });

  const analysis: AnalysisData = {
    resumeReview,
    atsScore: atsRaw,
    skillGapAnalysis: skillGap,
    careerRoadmap: roadmap,
    interviewPractice: interview,
    salaryInsights: salary,
    linkedinOptimization: linkedin,
    coverLetterGenerator: coverLetter ? { letter: coverLetter } : undefined,
    jobs: jobs.map((j) => mapJobToAnalysis(j, "job")),
    internships: internships.map((j) => mapJobToAnalysis(j, "internship")),
    skills,
    roles,
    keywords,
    experience: typeof payload.experience === "string" ? payload.experience : undefined,
  };

  return { analysis, jobs, internships };
}

/** Rebuild matcher lists from stored analysis_results JSON */
export function trackedJobsFromAnalysis(analysis: AnalysisData | null): {
  jobs: TrackedJob[];
  internships: TrackedJob[];
} {
  if (!analysis) return { jobs: [], internships: [] };

  const toTracked = (
    list: AnalysisData["jobs"] | undefined,
    kind: "job" | "internship",
  ): TrackedJob[] =>
    (list ?? []).map((j, index) =>
      mapListing(
        {
          title: j.title,
          company: j.company,
          location: j.location,
          salary: j.salary,
          matchScore: j.matchScore,
          applyLink: j.applyUrl,
          matchReasons: j.matchReason ? [j.matchReason] : [],
          type: kind === "internship" ? "Internship" : "Fullstack",
        },
        index,
        kind,
      ),
    );

  return {
    jobs: toTracked(analysis.jobs, "job"),
    internships: toTracked(analysis.internships, "internship"),
  };
}

export function analysisDataToStored(data: AnalysisData | null): StoredAnalysis {
  if (!data) {
    return {
      resumeReview: "",
      atsScore: { score: 0, feedback: "" },
      skillGapAnalysis: "",
      salaryInsights: "",
      careerRoadmap: "",
      linkedinOptimization: "",
      interviewPractice: "",
      coverLetter: "",
      jobRecommendations: "",
    };
  }

  const ats = data.atsScore;
  const score =
    typeof ats?.score === "number"
      ? ats.score
      : typeof (ats as { score?: number })?.score === "number"
        ? (ats as { score: number }).score
        : 0;

  return {
    resumeReview: data.resumeReview ?? "",
    atsScore: { score, feedback: ats ?? "" },
    skillGapAnalysis: data.skillGapAnalysis ?? "",
    salaryInsights: data.salaryInsights ?? "",
    careerRoadmap: data.careerRoadmap ?? "",
    linkedinOptimization: data.linkedinOptimization ?? "",
    interviewPractice: data.interviewPractice ?? "",
    coverLetter: data.coverLetterGenerator?.letter ?? "",
    jobRecommendations: "",
  };
}

/** While waiting on n8n, cycle pipeline steps (never marks complete). */
export const N8N_WAIT_PIPELINE_STEPS: {
  step: "analyzing" | "extracting" | "scoring" | "matching";
  progress: number;
  details: string;
}[] = [
  {
    step: "analyzing",
    progress: 12,
    details: "Uploading resume to n8n — this may take up to 2 minutes…",
  },
  {
    step: "analyzing",
    progress: 22,
    details: "n8n is extracting text from your resume…",
  },
  {
    step: "extracting",
    progress: 38,
    details: "AI is identifying skills and experience…",
  },
  {
    step: "extracting",
    progress: 48,
    details: "Building your skill profile…",
  },
  {
    step: "scoring",
    progress: 62,
    details: "Running ATS score and resume review…",
  },
  {
    step: "scoring",
    progress: 72,
    details: "Generating career insights (roadmap, salary, interview)…",
  },
  {
    step: "matching",
    progress: 85,
    details: "Matching jobs and internships to your profile…",
  },
  {
    step: "matching",
    progress: 92,
    details: "Almost done — waiting for n8n to finish…",
  },
];
