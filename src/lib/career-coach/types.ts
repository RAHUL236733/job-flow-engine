export type CoachActionType =
  | "ATS Score Check"
  | "Resume Review"
  | "Skill Gap Analysis"
  | "Career Roadmap"
  | "Interview Practice"
  | "Salary Insights"
  | "LinkedIn Optimization"
  | "Cover Letter Generator"
  | "Job Recommendations";

export type StoredAnalysis = {
  resumeReview: unknown;
  atsScore: { score: number; feedback: unknown };
  skillGapAnalysis: unknown;
  salaryInsights: unknown;
  careerRoadmap: unknown;
  linkedinOptimization: unknown;
  interviewPractice: unknown;
  coverLetter: unknown;
  jobRecommendations: string;
};

export type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isRoadmap?: boolean;
  roadmapData?: { phase: string; title: string; skills: string[]; timeline?: string }[];
  isJobRecs?: boolean;
  jobRecsData?: { title: string; company: string; score: number; matchReason: string }[];
  isInterviewMode?: boolean;
  interviewScore?: number;
  interviewStrengths?: string[];
  interviewImprovements?: string[];
};

export type ChatSession = {
  id: string;
  title: string;
  date: string;
};

export type JobRec = {
  title: string;
  company: string;
  location: string;
  skills: string;
  url: string;
  score: string;
  matchReasons?: string[];
};
