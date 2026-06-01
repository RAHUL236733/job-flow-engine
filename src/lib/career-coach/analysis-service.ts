import { supabase } from "@/lib/supabase";
import type { CoachActionType, StoredAnalysis } from "./types";
import {
  formatAtsResponse,
  formatCoverLetter,
  formatInterview,
  formatJobRecommendations,
  formatLinkedIn,
  formatResumeReview,
  formatRoadmap,
  formatSalary,
  formatSkillGap,
} from "./format-analysis";

function contentFromJsonb(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null) {
    const o = field as Record<string, unknown>;
    if (typeof o.content === "string") return o.content;
    if (typeof o.feedback === "string") return o.feedback;
    if (typeof o.text === "string") return o.text;
  }
  return "";
}

export function rowToStoredAnalysis(row: Record<string, unknown> | null): StoredAnalysis {
  if (!row) {
    return emptyAnalysis();
  }
  const atsRaw = row.ats_analysis || row.ats_score;
  const ats = atsRaw as { score?: number; feedback?: string } | null;
  return {
    resumeReview: contentFromJsonb(row.resume_review),
    atsScore: {
      score: typeof ats?.score === "number" ? ats.score : (typeof atsRaw === "number" ? atsRaw : 0),
      feedback: ats?.feedback ?? contentFromJsonb(atsRaw),
    },
    skillGapAnalysis: contentFromJsonb(row.skill_gap_analysis),
    salaryInsights: contentFromJsonb(row.salary_insights),
    careerRoadmap: contentFromJsonb(row.career_roadmap),
    linkedinOptimization: contentFromJsonb(row.linkedin_optimization),
    interviewPractice: contentFromJsonb(row.interview_practice),
    coverLetter: contentFromJsonb(row.cover_letter || row.cover_letter_generator),
    jobRecommendations: contentFromJsonb(row.job_recommendations),
  };
}

export function emptyAnalysis(): StoredAnalysis {
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

export async function fetchLatestAnalysis(
  userId: string,
  isMockMode: boolean,
): Promise<StoredAnalysis | null> {
  if (isMockMode) {
    const cached = localStorage.getItem(`ai_job_matcher_extended_results_${userId}`);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      const c = parsed.careerAnalysis;
      if (!c) return null;
      return {
        resumeReview: c.resumeReview || "",
        atsScore: c.atsScore || { score: parsed.atsScore || 0, feedback: "" },
        skillGapAnalysis: c.skillGapAnalysis || "",
        salaryInsights: c.salaryInsights || "",
        careerRoadmap: c.careerRoadmap || "",
        linkedinOptimization: c.linkedinOptimization || "",
        interviewPractice: c.interviewPractice || "",
        coverLetter: c.coverLetter || "",
        jobRecommendations: "",
      };
    } catch {
      return null;
    }
  }

  // Try career_analysis table first
  try {
    const { data, error } = await supabase
      .from("career_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return rowToStoredAnalysis(data as Record<string, unknown>);
    }
  } catch (err) {
    console.warn("Failed to fetch from career_analysis, trying ai_analysis...", err);
  }

  // Fallback to ai_analysis table
  try {
    const { data, error } = await supabase
      .from("ai_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return rowToStoredAnalysis(data as Record<string, unknown>);
    }
  } catch (err) {
    console.warn("Failed to fetch from ai_analysis fallback...", err);
  }

  return null;
}

export type BuildResponseContext = {
  actionType?: CoachActionType | string;
  promptText: string;
  analysis: StoredAnalysis;
  atsScore: number;
  parsedSkills: string[];
  profileName: string;
  profileEmail: string;
  resumeName?: string;
  jobs: { title: string; company: string; score: string; matchReasons?: string[] }[];
  assistantMode: "chat" | "interview" | "roadmap" | "recommendation";
  activeInterviewStep: number;
};

export type CoachResponse = {
  text: string;
  isRoadmap?: boolean;
  roadmapData?: { phase: string; title: string; skills: string[]; timeline?: string }[];
  isJobRecs?: boolean;
  jobRecsData?: { title: string; company: string; score: number; matchReason: string }[];
  isInterviewMode?: boolean;
  interviewScore?: number;
  interviewStrengths?: string[];
  interviewImprovements?: string[];
  nextInterviewStep?: number;
  nextAssistantMode?: "chat" | "interview" | "roadmap" | "recommendation";
};

export function buildCoachResponse(ctx: BuildResponseContext): CoachResponse {
  const {
    actionType,
    promptText,
    analysis,
    atsScore,
    parsedSkills,
    profileName,
    profileEmail,
    resumeName,
    jobs,
    assistantMode,
    activeInterviewStep,
  } = ctx;

  const lower = promptText.toLowerCase();
  const skillsStr =
    parsedSkills.length > 0 ? parsedSkills.join(", ") : "Python, React, TypeScript, SQL";
  const score = atsScore || analysis.atsScore.score || 78;

  if (
    actionType === "Interview Practice" ||
    lower.includes("interview") ||
    lower.includes("mock interview") ||
    assistantMode === "interview"
  ) {
    if (assistantMode !== "interview") {
      const stored = analysis.interviewPractice;
      if (stored.trim()) {
        return { text: formatInterview(stored), nextAssistantMode: "interview", nextInterviewStep: 1 };
      }
      return {
        text: formatInterview(null),
        nextAssistantMode: "interview",
        nextInterviewStep: 1,
      };
    }

    const userLen = promptText.length;
    if (activeInterviewStep === 1) {
      return {
        text: `# ✅ Evaluation — Question 1\n\nThank you for your response!\n\n---\n\n## Question 2\n\n**What is the difference between SQL and NoSQL databases?**`,
        isInterviewMode: true,
        interviewScore: userLen > 80 ? 9 : userLen > 30 ? 7 : 5,
        interviewStrengths: [
          "Clearly explained REST architecture and resource endpoints.",
          "Mentioned client-server separation correctly.",
        ],
        interviewImprovements: [
          "Cover HTTP verbs (GET, POST, PUT, DELETE) with examples.",
          "Discuss status codes (200, 404, 500) and when to use each.",
        ],
        nextInterviewStep: 2,
        nextAssistantMode: "interview",
      };
    }
    if (activeInterviewStep === 2) {
      return {
        text: `# ✅ Evaluation — Question 2\n\nExcellent work!\n\n---\n\n🎉 **Interview session complete.** Ask me anything else or start a new topic.`,
        isInterviewMode: true,
        interviewScore: userLen > 80 ? 8 : userLen > 30 ? 7 : 6,
        interviewStrengths: [
          "Identified schema flexibility vs structured SQL models.",
          "Explained scaling patterns (vertical vs horizontal).",
        ],
        interviewImprovements: [
          "Reference ACID guarantees for transactional workloads.",
          "Give examples: PostgreSQL vs MongoDB use cases.",
        ],
        nextInterviewStep: 0,
        nextAssistantMode: "chat",
      };
    }
  }

  if (
    actionType === "Career Roadmap" ||
    lower.includes("roadmap") ||
    lower.includes("become a")
  ) {
    const stored = analysis.careerRoadmap;
    if (stored.trim()) {
      return { text: formatRoadmap(stored) };
    }
    let role = "AI Engineer";
    if (lower.includes("frontend")) role = "Frontend Developer";
    if (lower.includes("fullstack") || lower.includes("full stack")) role = "Full Stack Developer";
    const roadmapData = [
      {
        phase: "Phase 1",
        title: "Core Foundations",
        skills: ["Data structures", "Git", "APIs", "SQL"],
        timeline: "Month 1–2",
      },
      {
        phase: "Phase 2",
        title: "Framework Depth",
        skills: ["React", "Node/Python", "Testing"],
        timeline: "Month 3–5",
      },
      {
        phase: "Phase 3",
        title: "Production Skills",
        skills: ["Docker", "CI/CD", "Cloud deploy"],
        timeline: "Month 6–9",
      },
      {
        phase: "Phase 4",
        title: "Portfolio & Applications",
        skills: ["Live projects", "Open source", "Interview prep"],
        timeline: "Month 10–12",
      },
    ];
    return {
      text: `# 🗺️ Phased Career Roadmap — ${role}\n\nA structured path to become a **${role}** (6–12 months).`,
      isRoadmap: true,
      roadmapData,
    };
  }

  if (
    actionType === "Job Recommendations" ||
    lower.includes("recommend") ||
    (lower.includes("job") && !lower.includes("application"))
  ) {
    const jobRecsData = jobs.slice(0, 6).map((j) => ({
      title: j.title,
      company: j.company,
      score: parseInt(String(j.score).replace("%", ""), 10) || 85,
      matchReason: j.matchReasons?.[0] || "Strong skill alignment with your profile.",
    }));
    return {
      text: formatJobRecommendations(jobs, resumeName, skillsStr),
      isJobRecs: jobRecsData.length > 0,
      jobRecsData,
    };
  }

  if (actionType === "Resume Review" || (lower.includes("resume") && !lower.includes("upload"))) {
    const stored = analysis.resumeReview;
    if (stored.trim()) return { text: formatResumeReview(stored, resumeName) };
    return {
      text: formatResumeReview(
        null,
        resumeName,
      ).replace(
        "here is your personalized audit",
        resumeName
          ? `here is guidance for **${resumeName}**`
          : "upload your resume in **Job Matcher** for a full AI audit",
      ),
    };
  }

  if (actionType === "ATS Score Check" || lower.includes("ats")) {
    const fb = analysis.atsScore.feedback || analysis.atsScore;
    if (analysis.atsScore.feedback?.trim() || score > 0) {
      return { text: formatAtsResponse(score, fb) };
    }
    return {
      text: formatAtsResponse(score, {
        score,
        strengths: parsedSkills.slice(0, 4).map((s) => `Strong ${s} experience`),
        improvements: [
          "Add Docker and containerization projects",
          "Include cloud technologies (AWS/GCP)",
          "Mention CI/CD pipelines in experience bullets",
        ],
        nextSteps: [
          "Add Docker to one portfolio project",
          "Learn AWS basics (S3, Lambda, EC2)",
          "Improve keyword density for target roles",
        ],
      }),
    };
  }

  if (actionType === "Skill Gap Analysis" || lower.includes("skill") || lower.includes("learn")) {
    if (analysis.skillGapAnalysis.trim()) {
      return { text: formatSkillGap(analysis.skillGapAnalysis, parsedSkills) };
    }
    return { text: formatSkillGap(null, parsedSkills.length ? parsedSkills : skillsStr.split(",").map((s) => s.trim())) };
  }

  if (actionType === "Salary Insights" || lower.includes("salary") || lower.includes("lpa") || lower.includes("how much")) {
    if (analysis.salaryInsights.trim()) return { text: formatSalary(analysis.salaryInsights) };
    return {
      text: formatSalary({
        entryLevel: "₹6 LPA – ₹12 LPA",
        growthPotential: "₹18 LPA – ₹30 LPA",
        topRoles: ["AI Engineer", "Machine Learning Engineer", "Data Scientist", "Full Stack Developer"],
      }),
    };
  }

  if (actionType === "LinkedIn Optimization" || lower.includes("linkedin")) {
    if (analysis.linkedinOptimization.trim()) return { text: formatLinkedIn(analysis.linkedinOptimization) };
    return {
      text: formatLinkedIn(
        "• **Headline:** AI Engineer | Python · React · FastAPI | Building GenAI products\n\n• **About:** Lead with impact metrics and your top 5 skills.\n\n• **Featured:** Pin resume, GitHub, and best project.\n\n• **Skills:** List 50 skills; pin your top 3 role keywords.",
      ),
    };
  }

  if (actionType === "Cover Letter Generator" || lower.includes("cover letter")) {
    if (analysis.coverLetter.trim()) {
      return { text: formatCoverLetter(analysis.coverLetter, profileName, profileEmail) };
    }
    return { text: formatCoverLetter(null, profileName, profileEmail) };
  }

  // --- DYNAMIC SMART RESPONSE GENERATOR ---
  const normalizedSkills = parsedSkills.length ? parsedSkills : ["Python", "React", "TypeScript", "SQL"];
  const primeSkill = normalizedSkills[0];

  let dynamicResponse = "";

  if (lower.includes("learn") || lower.includes("how to") || lower.includes("skill") || lower.includes("study") || lower.includes("course")) {
    const targetTopic = lower.includes("docker") ? "Docker & Containerization" :
                        lower.includes("aws") || lower.includes("cloud") ? "AWS Cloud & Deployment" :
                        lower.includes("ai") || lower.includes("ml") ? "AI/ML & Large Language Models" :
                        lower.includes("react") || lower.includes("frontend") ? "Advanced Frontend & React" :
                        lower.includes("backend") || lower.includes("node") ? "Backend Engineering & APIs" : "Modern Software Engineering Tools";

    dynamicResponse = `# 🎓 Skill Development Advice\n\nHello **${profileName}**! You asked about learning and developing skills. Here is a custom guidance plan for **${targetTopic}** mapped to your profile:\n\n## 🛣️ Phased Learning Plan\n\n1. **Foundations (Days 1-15)**\n   - Understand core concepts, install tools locally, and set up your development environment.\n   - Read official documentation and build a simple "Hello World" application.\n\n2. **Practical Practice (Days 16-45)**\n   - Build 2-3 mini-projects using **${targetTopic}** and integrate it with **${primeSkill}**.\n   - Commit your code to GitHub daily and write high-quality README files.\n\n3. **Production & Integration (Days 46-60)**\n   - Deploy your project to a cloud platform (e.g., Vercel, Netlify, Render, or AWS).\n   - Optimize performance, write unit tests, and document configuration settings.\n\n---\n\n## 💡 Pro-Tips for ${profileName}\n- **Integrate with Existing Stack:** Since your profile lists **${normalizedSkills.slice(0, 3).join(", ")}**, try to build projects that bridge these skills with **${targetTopic}**.\n- **Build in Public:** Share your progress on LinkedIn or write a blog post. Recruiters value self-taught engineers who document their journey!`;
  } else if (lower.includes("resume") || lower.includes("cv") || lower.includes("portfolio")) {
    dynamicResponse = `# 📝 Resume & Portfolio Optimization\n\nHello **${profileName}**! Let's talk about polish for your resume and portfolio. Based on your profile, here are high-impact adjustments you should make:\n\n## 📊 Actionable Adjustments\n\n- **Lead with Impact Metrics:** Instead of listing responsibilities (*"Wrote React code"*), focus on achievements and metrics (*"Reduced page load time by 35% using React lazy loading and optimized asset bundles"*).\n- **Match Target Keywords:** Match your skills (**${normalizedSkills.slice(0, 4).join(", ")}**) against specific job descriptions. ATS scanners check for keyword match density.\n- **Clean Project Formatting:** For each project, list the **Tech Stack**, a **Live URL link**, a **GitHub Repository link**, and 3 bullets explaining the architecture.\n\n---\n\n## 🎯 Next Steps\n1. Revise 3 bullet points in your experience section to include action verbs and key metrics.\n2. Ensure your top skills (**${primeSkill}**) are clearly visible in the first half of page 1.\n3. Test your resume by uploading it in the **Job Matcher** tab to check your updated ATS rating!`;
  } else if (lower.includes("interview") || lower.includes("practice") || lower.includes("question") || lower.includes("prep")) {
    dynamicResponse = `# 🚀 Technical Interview Preparation\n\nHello **${profileName}**! Preparing for interviews can feel overwhelming, but structured practice guarantees success. Here is an interview prep blueprint tailored to your background:\n\n## 🛠️ Mock Interview Outline\n\n- **The STAR Method:** Frame your project and experience answers using the *Situation, Task, Action, and Result* structure. Keep it under 2 minutes per answer.\n- **Core Coding Patterns:** Practice algorithms, data structures, and system design. For your profile, expect questions combining **${primeSkill}** and system integration.\n- **System Design Foundations:** Be prepared to explain load balancers, caching, databases (SQL/NoSQL), and client-server communication.\n\n---\n\n## 💡 Top 3 Questions to Practice\n1. *"Tell me about a challenging technical bug you encountered in a project using **${primeSkill}** and how you resolved it."*\n2. *"Explain how you optimize web application performance or database queries for production scale."*\n3. *"How do you handle disagreements on technical architecture or design patterns within a development team?"*\n\n> **Tip:** You can start a live mock interview by clicking **Interview Practice** in the Quick Actions above!`;
  } else if (lower.includes("linkedin") || lower.includes("network") || lower.includes("profile")) {
    dynamicResponse = `# 🌐 LinkedIn Profile & Networking Strategy\n\nHello **${profileName}**! To unlock hidden job market opportunities, your LinkedIn profile must stand out. Here is a strategy tailored to your profile:\n\n## 📈 Profile Checklist\n\n- **Craft a Search-Optimized Headline:** Instead of just *"Student"* or *"Job Seeker"*, use: \`Software Engineer | React · Python · TypeScript | Building high-scale web apps\`.\n- **Write a Compelling 'About' Summary:** Summarize your passion, highlight projects, and explicitly list your core tech stack: **${normalizedSkills.join(", ")}**.\n- **Active Engagement:** Share weekly updates on projects you are building, comment on industry leaders' posts, and publish articles explaining technical concepts.\n\n---\n\n## ✉️ Networking Outreach Template\nUse this template to connect with engineers/managers at companies you love:\n> *"Hi [Name], saw your posts on [Topic]. I'm a developer focusing on **${primeSkill}** and modern web systems. I love what you are building at [Company] — would love to connect and follow your journey!"*`;
  } else if (lower.includes("salary") || lower.includes("worth") || lower.includes("negotiate") || lower.includes("pay")) {
    dynamicResponse = `# 💰 Compensation & Salary Strategy\n\nHello **${profileName}**! Understanding your market value is critical for successful career negotiation. Here is compensation benchmarking for your target roles:\n\n## 📊 Salary Benchmarks (Entry-Mid Level)\n\n- **Software Engineer (Entry-Level):** ₹6 LPA – ₹12 LPA base salary.\n- **Specialized Roles (AI/ML/Data):** ₹8 LPA – ₹15 LPA starting compensation.\n- **Growth Potential (3+ Years Experience):** ₹18 LPA – ₹35 LPA base with stock options.\n\n---\n\n## 🎯 Negotiation Pro-Tips\n1. **Never Give the First Number:** Let the recruiter make the initial offer. If forced, provide a researched range based on industry benchmarks.\n2. **Highlight Specializations:** Emphasize specialized technical skills like **${normalizedSkills.slice(0, 3).join(", ")}** to justify top-of-market compensation.\n3. **Consider Total Rewards:** Evaluate stock options, health benefits, flexible working arrangements, and learning stipends alongside base salary.`;
  } else {
    dynamicResponse = `# 🤖 AI Career Coach\n\nHello **${profileName}**! I'm your premium career companion.\n\n**You asked:** *"${promptText}"*\n\nHere is personalized career intelligence based on your profile skills (**${normalizedSkills.slice(0, 4).join(", ")}**):\n\n---\n\n## 💡 Key Strategy for Success\n\n- **Focus on Deep Projects:** Instead of building generic tutorials, build a unique production-ready app. Integrate databases, state management, and cloud deployments.\n- **Target High-Match Roles:** Your ATS matching score is currently **${score}%**. Focus your applications on roles where you have a 80%+ compatibility rating.\n- **Consistent Outbound Outreach:** Relying purely on applications yields a 2-5% response rate. Combining applications with LinkedIn outreach increases callbacks by 4x.\n\n> **💡 Try Quick Actions:** Click any of the specialized buttons above (like ATS Audit, Resume Review, or Career Roadmap) to fetch your stored backend data instantly!`;
  }

  return { text: dynamicResponse };
}
