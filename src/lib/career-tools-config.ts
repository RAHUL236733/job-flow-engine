import type { CoachActionType } from "@/lib/career-coach/types";

export type CoachToolTabId =
  | "tool-ats"
  | "tool-resume"
  | "tool-skill-gap"
  | "tool-roadmap"
  | "tool-interview"
  | "tool-salary"
  | "tool-linkedin"
  | "tool-cover-letter"
  | "tool-jobs";

export type CoachToolConfig = {
  id: CoachToolTabId;
  actionType: CoachActionType;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
};

export const COACH_TOOLS: CoachToolConfig[] = [
  {
    id: "tool-ats",
    actionType: "ATS Score Check",
    title: "ATS Score Check",
    subtitle: "Keyword density, formatting & parser compatibility",
    emoji: "🎯",
    gradient: "from-[#4c1d95] to-[#7c3aed]",
  },
  {
    id: "tool-resume",
    actionType: "Resume Review",
    title: "Resume Review",
    subtitle: "AI audit with strengths and improvements",
    emoji: "📝",
    gradient: "from-[#1e3a8a] to-[#3b82f6]",
  },
  {
    id: "tool-skill-gap",
    actionType: "Skill Gap Analysis",
    title: "Skill Gap Analysis",
    subtitle: "Map your stack vs hiring requirements",
    emoji: "📊",
    gradient: "from-[#311042] to-[#6366f1]",
  },
  {
    id: "tool-roadmap",
    actionType: "Career Roadmap",
    title: "Career Roadmap",
    subtitle: "30 / 90 day and 6-month milestones",
    emoji: "🗺️",
    gradient: "from-[#064e3b] to-[#10b981]",
  },
  {
    id: "tool-interview",
    actionType: "Interview Practice",
    title: "Interview Practice",
    subtitle: "Mock questions and answer strategies",
    emoji: "🚀",
    gradient: "from-[#7c2d12] to-[#fb923c]",
  },
  {
    id: "tool-salary",
    actionType: "Salary Insights",
    title: "Salary Insights",
    subtitle: "Compensation benchmarks for your role",
    emoji: "💰",
    gradient: "from-[#115e59] to-[#14b8a6]",
  },
  {
    id: "tool-linkedin",
    actionType: "LinkedIn Optimization",
    title: "LinkedIn Optimization",
    subtitle: "Headline, summary & recruiter keywords",
    emoji: "🌐",
    gradient: "from-[#1e3a8a] to-[#2563eb]",
  },
  {
    id: "tool-cover-letter",
    actionType: "Cover Letter Generator",
    title: "Cover Letter Generator",
    subtitle: "Tailored letter ready to personalize",
    emoji: "✉️",
    gradient: "from-[#831843] to-[#ec4899]",
  },
  {
    id: "tool-jobs",
    actionType: "Job Recommendations",
    title: "Job Recommendations",
    subtitle: "Roles matched to your resume & skills",
    emoji: "💼",
    gradient: "from-[#14532d] to-[#22c55e]",
  },
];

export function getCoachToolByTab(tab: string): CoachToolConfig | undefined {
  return COACH_TOOLS.find((t) => t.id === tab);
}
