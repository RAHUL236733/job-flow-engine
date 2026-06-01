/** Converts raw API/DB content into polished markdown — never exposes raw JSON. */

function tryParseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function bulletList(items: string[]): string {
  return items.filter(Boolean).map((i) => `• ${i}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.filter(Boolean).map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function extractStringList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "object" && v !== null) {
        const o = v as Record<string, unknown>;
        return String(o.text ?? o.name ?? o.title ?? o.skill ?? o.label ?? "");
      }
      return String(v);
    }).filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(/[\n,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function formatObjectAsMarkdown(obj: Record<string, unknown>, title: string): string {
  const lines: string[] = [`# ${title}`, ""];

  const section = (heading: string, body: string) => {
    if (!body.trim()) return;
    lines.push(`## ${heading}`, "", body, "", "---", "");
  };

  if (obj.score !== undefined || obj.overallScore !== undefined || obj.atsScore !== undefined) {
    const score = obj.score ?? obj.overallScore ?? obj.atsScore;
    section("📊 Overall ATS Score", `**${score}% Match**`);
  }

  const strengths = extractStringList(
    obj.strengths ?? obj.strongPoints ?? obj.positives ?? obj.matches,
  );
  if (strengths.length) section("✅ Strengths", bulletList(strengths));

  const improvements = extractStringList(
    obj.improvements ?? obj.weaknesses ?? obj.gaps ?? obj.areasForImprovement ?? obj.missing,
  );
  if (improvements.length) section("⚠️ Areas for Improvement", bulletList(improvements));

  const nextSteps = extractStringList(
    obj.nextSteps ?? obj.recommendations ?? obj.suggestions ?? obj.actions,
  );
  if (nextSteps.length) section("🎯 Recommended Next Steps", numberedList(nextSteps));

  const skills = extractStringList(obj.skills ?? obj.missingSkills ?? obj.toLearn);
  if (skills.length) section("📚 Skills to Develop", bulletList(skills));

  const roadmap = obj.roadmap ?? obj.phases ?? obj.milestones ?? obj.timeline;
  if (roadmap) {
    if (Array.isArray(roadmap)) {
      const blocks = roadmap.map((phase, i) => {
        const p = phase as Record<string, unknown>;
        const label = String(p.phase ?? p.title ?? p.period ?? `Phase ${i + 1}`);
        const items = extractStringList(p.tasks ?? p.skills ?? p.items ?? p.goals ?? p.content);
        return `### ${label}\n${items.length ? bulletList(items) : String(p.description ?? "")}`;
      });
      section("🛣 Career Roadmap", blocks.join("\n\n"));
    } else if (typeof roadmap === "object" && roadmap !== null) {
      const blocks = Object.entries(roadmap as Record<string, unknown>).map(([key, val]) => {
        const items = extractStringList(val);
        return `### 📅 ${key.replace(/_/g, " ")}\n${items.length ? bulletList(items) : String(val)}`;
      });
      section("🛣 Career Roadmap", blocks.join("\n\n"));
    }
  }

  const salary = obj.salary ?? obj.salaries ?? obj.compensation ?? obj.ranges;
  if (salary && typeof salary === "object" && !Array.isArray(salary)) {
    const blocks = Object.entries(salary as Record<string, unknown>).map(([k, v]) => {
      return `**${k}:** ${typeof v === "object" ? JSON.stringify(v) : String(v)}`;
    });
    section("💰 Salary Insights", blocks.join("\n"));
  }

  if (obj.entryLevel || obj.midLevel || obj.senior) {
    const parts: string[] = [];
    if (obj.entryLevel) parts.push(`**🎓 Entry-Level Range**\n${obj.entryLevel}`);
    if (obj.midLevel) parts.push(`**📈 Mid-Level Range**\n${obj.midLevel}`);
    if (obj.senior) parts.push(`**🏆 Senior Range**\n${obj.senior}`);
    if (obj.growthPotential) parts.push(`**📈 Growth Potential**\n${obj.growthPotential}`);
    section("💰 Salary Insights", parts.join("\n\n"));
  }

  const roles = extractStringList(obj.topRoles ?? obj.roles ?? obj.highestPayingRoles);
  if (roles.length) section("🔥 Highest Paying Roles", bulletList(roles));

  const content =
    obj.content ?? obj.text ?? obj.summary ?? obj.feedback ?? obj.message ?? obj.review;
  if (typeof content === "string" && content.trim() && !content.trim().startsWith("{")) {
    lines.push(content.trim());
  }

  const remaining = Object.keys(obj).filter(
    (k) =>
      ![
        "score",
        "overallScore",
        "atsScore",
        "strengths",
        "improvements",
        "gaps",
        "nextSteps",
        "skills",
        "roadmap",
        "salary",
        "content",
        "text",
        "feedback",
      ].includes(k),
  );
  for (const key of remaining) {
    const val = obj[key];
    if (typeof val === "string" && val.length > 20 && !val.trim().startsWith("{")) {
      lines.push(`## ${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}`, "", val, "");
    }
  }

  return lines.join("\n").replace(/---\n\n$/g, "").trim();
}

/** Main entry: normalize any stored value to user-facing markdown. */
export function formatAnalysisContent(raw: unknown, fallbackTitle: string): string {
  if (raw === null || raw === undefined) return "";

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.content && typeof obj.content === "string") {
      return formatAnalysisContent(obj.content, fallbackTitle);
    }
    if (obj.feedback && typeof obj.feedback === "string" && obj.score !== undefined) {
      const score = obj.score;
      return formatAnalysisContent(
        { score, strengths: [], improvements: [], nextSteps: [], feedback: obj.feedback },
        fallbackTitle,
      );
    }
    return formatObjectAsMarkdown(obj, fallbackTitle);
  }

  if (typeof raw === "string") {
    const parsed = tryParseJson(raw);
    if (parsed && typeof parsed === "object") {
      return formatObjectAsMarkdown(parsed as Record<string, unknown>, fallbackTitle);
    }
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("#") || trimmed.includes("\n## ") || trimmed.includes("\n•")) {
      return trimmed;
    }
    return `# ${fallbackTitle}\n\n${trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).join("\n\n")}`;
  }

  return "";
}

export function formatAtsResponse(score: number, feedbackRaw: unknown): string {
  const body = formatAnalysisContent(
    feedbackRaw || { score, improvements: [], strengths: [] },
    "🚀 ATS Score Analysis",
  );
  if (body.includes("Overall ATS Score") || body.includes("% Match")) return body;
  return `# 🚀 ATS Score Analysis\n\n## 📊 Overall ATS Score\n**${score}% Match**\n\n---\n\n${body.replace(/^# [^\n]+\n\n/, "")}`;
}

export function formatResumeReview(content: unknown, resumeName?: string): string {
  if (!content) {
    return `# 📄 Resume Review\n\nNo resume review data found. Please upload a resume first.`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const summary = parsed.summary || parsed.summaryText || parsed.professionalSummary || parsed.content || "";
    const strengths = extractStringList(parsed.strengths || parsed.strongPoints || []);
    const improvements = extractStringList(parsed.improvements || parsed.areasForImprovement || parsed.weaknesses || []);
    const actions = extractStringList(parsed.recommendedActions || parsed.recommended_actions || parsed.nextSteps || []);
    
    return `# 📄 Resume Review\n\n${resumeName ? `Based on your resume **${resumeName}**:\n\n` : ""}${summary ? `## 🌟 Summary\n\n${summary}\n\n` : ""}## ✅ Strengths\n\n${strengths.length ? bulletList(strengths) : "• Strong alignment with key requirements."}\n\n## ⚠️ Areas for Improvement\n\n${improvements.length ? bulletList(improvements) : "• Clear presentation of achievements."}\n\n## 🎯 Recommended Actions\n\n${actions.length ? numberedList(actions) : "1. Keep skills updated\n2. Highlight leadership roles"}`;
  }
  return formatAnalysisContent(content, "📄 Resume Review");
}

export function formatSkillGap(content: unknown, skillsFallback: string[]): string {
  if (!content) {
    const strengths = bulletList(skillsFallback.map((s) => `**${s}**`));
    return `# 🧠 Skill Gap Analysis\n\n## ✅ Current Skills\n\n${strengths}\n\n## ⚠️ Missing Skills\n\n• Docker\n• Cloud Platforms\n• System Design\n\n## 🔥 Priority Skills\n\n1. Docker\n2. AWS\n3. System Design\n\n## 📚 Learning Suggestions\n\n• Take online certification courses\n• Build hands-on projects`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const current = extractStringList(parsed.currentSkills || parsed.current_skills || parsed.skills || skillsFallback || []);
    const missing = extractStringList(parsed.missingSkills || parsed.missing_skills || parsed.missing || []);
    const priority = extractStringList(parsed.prioritySkills || parsed.priority_skills || parsed.priority || []);
    const suggestions = extractStringList(parsed.learningSuggestions || parsed.learning_suggestions || parsed.suggestions || []);
    
    return `# 🧠 Skill Gap Analysis\n\n## ✅ Current Skills\n\n${current.length ? bulletList(current) : "• Mapped skills not specified"}\n\n## ⚠️ Missing Skills\n\n${missing.length ? bulletList(missing) : "• No critical missing skills identified"}\n\n## 🔥 Priority Skills\n\n${priority.length ? numberedList(priority) : "1. Learn containerization\n2. Learn cloud deployment"}\n\n## 📚 Learning Suggestions\n\n${suggestions.length ? bulletList(suggestions) : "• Build a project incorporating target technologies"}`;
  }
  return formatAnalysisContent(content, "🧠 Skill Gap Analysis");
}

export function formatSalary(content: unknown): string {
  if (!content) {
    return `# 💰 Salary Insights\n\n## 🎓 Entry Level Salary\n\n₹6.5 LPA - ₹10 LPA\n\n## 📈 Growth Potential\n\nExcellent growth potential up to ₹18 LPA - ₹30 LPA within 3 years.\n\n## 🚀 Career Outlook\n\nHighly positive outlook for skilled modern engineers in the tech market.`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const entry = parsed.entryLevel || parsed.entry_level || parsed.entryLevelSalary || parsed.entry || "₹6.5 LPA - ₹12 LPA";
    const growth = parsed.growthPotential || parsed.growth_potential || parsed.growth || "Excellent";
    const outlook = parsed.careerOutlook || parsed.career_outlook || parsed.outlook || "Positive outlook";
    
    return `# 💰 Salary Insights\n\n## 🎓 Entry Level Salary\n\n${entry}\n\n## 📈 Growth Potential\n\n${growth}\n\n## 🚀 Career Outlook\n\n${outlook}`;
  }
  return formatAnalysisContent(content, "💰 Salary Insights");
}

export function formatRoadmap(content: unknown): string {
  if (!content) {
    return `# 🛣 Career Roadmap\n\n## 📅 Next 30 Days\n\n• Set up Docker on local projects\n• Master Git workflow and repository organization\n\n## 📅 Next 90 Days\n\n• Learn AWS cloud foundations\n• Deploy portfolio projects to live environments\n\n## 📅 Next 6 Months\n\n• Contribute to open source projects\n• Target entry-mid level product company roles`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const next30 = extractStringList(parsed.next30Days || parsed.next_30_days || parsed.phase1 || []);
    const next90 = extractStringList(parsed.next90Days || parsed.next_90_days || parsed.phase2 || []);
    const next6m = extractStringList(parsed.next6Months || parsed.next_6_months || parsed.phase3 || []);
    
    return `# 🛣 Career Roadmap\n\n## 📅 Next 30 Days\n\n${next30.length ? bulletList(next30) : "• Learn foundations"}\n\n## 📅 Next 90 Days\n\n${next90.length ? bulletList(next90) : "• Build production projects"}\n\n## 📅 Next 6 Months\n\n${next6m.length ? bulletList(next6m) : "• Apply for roles"}`;
  }
  return formatAnalysisContent(content, "🛣 Career Roadmap");
}

export function formatLinkedIn(content: unknown): string {
  if (!content) {
    return `# 🔗 LinkedIn Optimization\n\n## 🏷 Recommended Headlines\n\n• Software Engineer | React · Python · FastAPI | Building modern web apps\n• Frontend Developer | JavaScript · TypeScript · UI/UX Design\n\n## 📝 About Section\n\nI am a passionate software engineer specializing in building high-scale web systems. Let's connect!\n\n## ✅ Profile Improvements\n\n• Complete all experience bullets with impact metrics\n• Feature top portfolio repositories\n• Add 3-5 endorsements for core tech skills`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const headlines = extractStringList(parsed.recommendedHeadlines || parsed.recommended_headlines || parsed.headlines || []);
    const about = parsed.aboutSection || parsed.about_section || parsed.about || "";
    const improvements = extractStringList(parsed.profileImprovements || parsed.profile_improvements || parsed.improvements || []);
    
    return `# 🔗 LinkedIn Optimization\n\n## 🏷 Recommended Headlines\n\n${headlines.length ? bulletList(headlines) : "• Software Engineer | Focus Stack"}\n\n## 📝 About Section\n\n${about ? about : "Include top achievements and core skills."}\n\n## ✅ Profile Improvements\n\n${improvements.length ? bulletList(improvements) : "• Add details to experience sections"}`;
  }
  return formatAnalysisContent(content, "🔗 LinkedIn Optimization");
}

export function formatCoverLetter(content: unknown, name: string, email: string): string {
  const intro = `# 📄 Custom Cover Letter\n\n`;
  if (!content) {
    return `${intro}Dear Hiring Manager,\n\nI am excited to apply for this engineering role. With hands-on experience and a strong foundation in modern tech stacks, I am ready to contribute to your team immediately.\n\nSincerely,\n**${name}**\n${email}`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const letter = parsed.letter || parsed.coverLetterText || parsed.content || "";
    return `${intro}${letter || "No cover letter template text found."}`;
  }
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("#")) return trimmed;
    return `${intro}${trimmed}`;
  }
  return `${intro}Dear Hiring Team,\n\nI am excited to apply. Let's build together.\n\nWarm regards,\n**${name}**`;
}

export function formatInterview(content: unknown): string {
  if (!content) {
    return `# 🎤 Interview Practice\n\n## Technical Questions\n\n1. Explain REST APIs and statelessness.\n2. SQL vs NoSQL database use cases.\n3. How to optimize web performance.\n\n## HR Questions\n\n1. Tell me about yourself.\n2. Explain a challenging situation and how you handled it.\n3. What are your long-term career goals?\n\n## Preparation Tips\n\n• Practice the STAR method.\n• Write clean, documented code.\n• Do mock interviews weekly.`;
  }
  const parsed = tryParseJson(content) as any;
  if (parsed && typeof parsed === "object") {
    const technical = extractStringList(parsed.technicalQuestions || parsed.technical_questions || parsed.technical || []);
    const hr = extractStringList(parsed.hrQuestions || parsed.hr_questions || parsed.hr || []);
    const tips = extractStringList(parsed.preparationTips || parsed.preparation_tips || parsed.tips || []);
    
    return `# 🎤 Interview Practice\n\n## Technical Questions\n\n${technical.length ? numberedList(technical) : "1. Explain MVC pattern\n2. SQL vs NoSQL\n3. Describe git flow"}\n\n## HR Questions\n\n${hr.length ? numberedList(hr) : "1. Tell me about yourself\n2. What is your greatest strength?\n3. Why do you want this role?"}\n\n## Preparation Tips\n\n${tips.length ? bulletList(tips) : "• Review job descriptions\n• Practice mock questions"}`;
  }
  return formatAnalysisContent(content, "🎤 Interview Practice");
}

export function formatJobRecommendations(
  jobs: { title: string; company: string; score: string; matchReasons?: string[]; location?: string; salary?: string; url?: string }[],
  resumeName?: string,
  skills?: string,
): string {
  if (!jobs || jobs.length === 0) {
    return `# 💼 Job Recommendations\n\n> ⚠️ Upload your resume under **Job Matcher** to unlock personalized matches.`;
  }
  const lines = [
    `# 💼 Personalized Job Recommendations`,
    "",
    resumeName
      ? `Based on **${resumeName}**${skills ? ` and skills (${skills})` : ""}:`
      : `Top roles matched to your profile:`,
    "",
    "---",
    "",
  ];
  jobs.slice(0, 5).forEach((j, i) => {
    const score = j.score?.toString().replace("%", "") || "85";
    lines.push(
      `## ${i + 1}. ${j.title}`,
      "",
      `🏢 **Company:** ${j.company}`,
      `💼 **Role:** ${j.title}`,
      `📍 **Location:** ${j.location || "Remote"}`,
      j.salary ? `💰 **Salary:** ${j.salary}` : "💰 **Salary:** Not Specified",
      j.url ? `🔗 **Apply:** [Apply Now](${j.url})` : "🔗 **Apply:** Contact HR",
      "",
      j.matchReasons?.length
        ? bulletList(j.matchReasons.slice(0, 2))
        : "• Matches your core technical skills and experience level.",
      "",
    );
  });
  return lines.join("\n");
}
