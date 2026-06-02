import type { AnalysisData } from "@/hooks/use-analysis";
import type { StoredAnalysis } from "@/lib/career-coach/types";
import { normalizeJob, type TrackedJob } from "@/lib/job-tracker";

export const SERVICE_UNAVAILABLE_MESSAGE = "Service unavailable. Try again later.";

const CAREER_FIELD_KEYS = [
  "skills",
  "roles",
  "keywords",
  "experience",
  "resumeReview",
  "resume_review",
  "atsScore",
  "ats_score",
  "skillGapAnalysis",
  "skill_gap_analysis",
  "careerRoadmap",
  "career_roadmap",
  "interviewPractice",
  "interview_practice",
  "salaryInsights",
  "salary_insights",
  "linkedinOptimization",
  "linkedin_optimization",
  "coverLetterGenerator",
  "cover_letter_generator",
  "coverLetter",
] as const;

/** n8n often returns lists as `{ "0": "a", "1": "b" }` */
export function asStringList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === "string") {
    const t = val.trim();
    if (!t) return [];
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return asStringList(JSON.parse(t));
      } catch {
        return t.split(/[\n,;|]/).map((s) => s.trim()).filter(Boolean);
      }
    }
    return t.split(/[\n,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    const numericKeys = Object.keys(o).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => String(o[k]).trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseNestedRecord(val: unknown): Record<string, unknown> | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const t = val.trim();
    if (!t) return undefined;
    try {
      return parseNestedRecord(JSON.parse(t));
    } catch {
      return undefined;
    }
  }
  if (typeof val === "object" && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return undefined;
}

function pickField(payload: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = payload[key];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

function pickObject<T>(payload: Record<string, unknown>, ...keys: string[]): T | undefined {
  const val = pickField(payload, ...keys);
  if (!val) return undefined;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") return parsed as T;
    } catch {
      return undefined;
    }
  }
  if (typeof val === "object") return val as T;
  return undefined;
}

/** Unwrap n8n body — merge array items (jobs in [0], career in [1], etc.) */
export function unwrapN8nPayload(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, unknown>>((acc, item) => {
      const part = unwrapN8nPayload(item);
      return { ...acc, ...part };
    }, {});
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.data && typeof o.data === "object") {
      return { ...unwrapN8nPayload(o.data), ...o };
    }
    if (o.json !== undefined) {
      const inner = unwrapN8nPayload(o.json);
      return { ...inner, ...o };
    }
    if (o.body !== undefined) {
      const inner = unwrapN8nPayload(o.body);
      return { ...inner, ...o };
    }
    if (o.output !== undefined) {
      const inner = unwrapN8nPayload(o.output);
      return { ...inner, ...o };
    }
    if (o.result !== undefined) {
      const inner = unwrapN8nPayload(o.result);
      return { ...inner, ...o };
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

/** Flatten resumeData (object or JSON string), output, and root career fields */
export function flattenN8nPayload(raw: unknown): Record<string, unknown> {
  const root = unwrapN8nPayload(raw);

  const layers: Record<string, unknown>[] = [
    parseNestedRecord(root.output) ?? {},
    parseNestedRecord(root.result) ?? {},
    parseNestedRecord(root.careerAnalysis) ?? {},
    parseNestedRecord(root.career_analysis) ?? {},
    parseNestedRecord(root.resumeData) ?? {},
    parseNestedRecord(root.resume_data) ?? {},
    root,
  ];

  const merged = layers.reduce<Record<string, unknown>>(
    (acc, layer) => ({ ...acc, ...layer }),
    {},
  );

  return {
    ...merged,
    topJobs:
      pickField(root, "topJobs", "top_jobs") ??
      pickField(merged, "topJobs", "top_jobs", "jobs"),
    jobs: pickField(root, "jobs") ?? pickField(merged, "jobs"),
    internships:
      pickField(root, "internships", "internship") ??
      pickField(merged, "internships", "internship"),
    skills: pickField(merged, "skills"),
    roles: pickField(merged, "roles"),
    keywords: pickField(merged, "keywords"),
    experience: pickField(merged, "experience"),
    resumeReview: pickField(merged, "resumeReview", "resume_review"),
    atsScore: pickField(merged, "atsScore", "ats_score"),
    skillGapAnalysis: pickField(merged, "skillGapAnalysis", "skill_gap_analysis"),
    careerRoadmap: pickField(merged, "careerRoadmap", "career_roadmap"),
    interviewPractice: pickField(merged, "interviewPractice", "interview_practice"),
    salaryInsights: pickField(merged, "salaryInsights", "salary_insights"),
    linkedinOptimization: pickField(
      merged,
      "linkedinOptimization",
      "linkedin_optimization",
    ),
    coverLetterGenerator: pickField(
      merged,
      "coverLetterGenerator",
      "cover_letter_generator",
      "coverLetter",
    ),
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
  if (typeof val === "string") {
    try {
      return asRecordList(JSON.parse(val));
    } catch {
      return [];
    }
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
      : asStringList(reasons);

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

export type AnalysisStorageDocument = AnalysisData & {
  /** Full flattened n8n payload — used to re-hydrate all 9 tool pages on load */
  _n8nFlat?: Record<string, unknown>;
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

  const skills = asStringList(payload.skills);
  const roles = asStringList(payload.roles);
  const keywords = asStringList(payload.keywords);

  const resumeReview = pickObject<AnalysisData["resumeReview"]>(
    payload,
    "resumeReview",
    "resume_review",
  );
  const atsRaw = pickObject<AnalysisData["atsScore"]>(payload, "atsScore", "ats_score");
  const skillGap = pickObject<AnalysisData["skillGapAnalysis"]>(
    payload,
    "skillGapAnalysis",
    "skill_gap_analysis",
  );
  const roadmap = pickObject<AnalysisData["careerRoadmap"]>(
    payload,
    "careerRoadmap",
    "career_roadmap",
  );
  const interview = pickObject<AnalysisData["interviewPractice"]>(
    payload,
    "interviewPractice",
    "interview_practice",
  );
  const salary = pickObject<AnalysisData["salaryInsights"]>(
    payload,
    "salaryInsights",
    "salary_insights",
  );
  const linkedin = pickObject<AnalysisData["linkedinOptimization"]>(
    payload,
    "linkedinOptimization",
    "linkedin_optimization",
  );
  const coverRoot = pickField(
    payload,
    "coverLetterGenerator",
    "cover_letter_generator",
    "coverLetter",
  );
  let coverLetter: string | undefined;
  if (typeof coverRoot === "object" && coverRoot !== null) {
    const o = coverRoot as { coverLetter?: string; letter?: string };
    coverLetter = o.coverLetter ?? o.letter;
  } else if (typeof coverRoot === "string") {
    coverLetter = coverRoot;
  }

  const mapJobToAnalysis = (j: TrackedJob, kind: "job" | "internship") => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary,
    matchScore: typeof j.score === "number" ? j.score : parseInt(String(j.score).replace("%", ""), 10) || 0,
    matchReason: j.matchReasons?.[0] || j.matchedSkills?.[0],
    matchReasons: j.matchReasons?.length ? j.matchReasons : undefined,
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

/** Store complete career blob + flat payload so Supabase reload never drops fields */
export function buildStorageDocument(raw: unknown): AnalysisStorageDocument {
  const flat = flattenN8nPayload(raw);
  const parsed = parseN8nResponse(flat);
  return {
    ...parsed.analysis,
    _n8nFlat: flat,
  };
}

/** Re-parse from DB — fixes older rows that only saved jobs without career sections */
export function hydrateAnalysisFromDb(stored: unknown): AnalysisData | null {
  if (!stored || typeof stored !== "object") return null;
  const doc = stored as AnalysisStorageDocument;

  if (doc._n8nFlat && typeof doc._n8nFlat === "object") {
    return parseN8nResponse(doc._n8nFlat).analysis;
  }

  const fromStored = parseN8nResponse(stored);
  if (
    fromStored.analysis.linkedinOptimization ||
    fromStored.analysis.resumeReview ||
    fromStored.analysis.interviewPractice ||
    (fromStored.analysis.skills?.length ?? 0) > 0
  ) {
    return fromStored.analysis;
  }

  const hasCareerKeys = CAREER_FIELD_KEYS.some((k) => (doc as Record<string, unknown>)[k]);
  if (hasCareerKeys) {
    return parseN8nResponse(stored).analysis;
  }

  return doc as AnalysisData;
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
          matchReasons: j.matchReasons?.length
            ? j.matchReasons
            : j.matchReason
              ? [j.matchReason]
              : [],
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
    details: "Uploading resume — waiting for processing to finish…",
  },
  {
    step: "analyzing",
    progress: 22,
    details: "Extracting text from your resume…",
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
    details: "Generating career insights (roadmap, salary, interview, LinkedIn)…",
  },
  {
    step: "matching",
    progress: 85,
    details: "Matching jobs and internships to your profile…",
  },
  {
    step: "matching",
    progress: 92,
    details: "Almost done — waiting for processing to finish…",
  },
];
