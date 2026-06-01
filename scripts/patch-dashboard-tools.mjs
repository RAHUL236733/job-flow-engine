import fs from "fs";

const path = "src/routes/dashboard.tsx";
let s = fs.readFileSync(path, "utf8");

// Imports
if (!s.includes("CoachToolPageView")) {
  s = s.replace(
    `} from "@/lib/job-tracker";`,
    `} from "@/lib/job-tracker";
import { COACH_TOOLS, getCoachToolByTab } from "@/lib/career-tools-config";
import { CoachToolPageView } from "@/components/coach/CoachToolPageView";`,
  );
}

// Remove checklist state block
s = s.replace(
  /  \/\/ Checklist interactive states[\s\S]*?const \[resumeFile, setResumeFile\]/,
  `  const [resumeFile, setResumeFile]`,
);

// Profile score without checklist
s = s.replace(
  /  const profileScore =[\s\S]*?const atsScore = checklist\.atsAudit \? 85 : 0;/,
  `  const profileScore =
    (hasBaseInfo ? 25 : 0) +
    (resumeFile ? 25 : 0) +
    (savedJobsCount > 0 ? 25 : 0) +
    (appsSentCount > 0 ? 25 : 0);

  const atsScoreDisplay = analysis?.atsScore?.score ?? 0;`,
);

// Remove handleStepToggle block
s = s.replace(
  /  \/\/ Handle checklist step completes[\s\S]*?  \};\n\n  \/\/ Computed values/,
  `  // Computed values`,
);

// Remove modal state
s = s.replace(
  /  \/\/ Checklist tooltip hover state[\s\S]*?const \[activeModal, setActiveModal\][^\n]+\n\n/,
  "",
);

// Remove setChecklist calls
s = s.replace(/\s*setChecklist\([^;]+\);/g, "");

// Replace hero + checklist panel with simplified hero
const heroStart = "              {/* Welcome back hero section with integrated Status Checklist */}";
const heroEnd = "              {/* Stats Cards grid: snap scroll row on mobile */}";
const i0 = s.indexOf(heroStart);
const i1 = s.indexOf(heroEnd);
if (i0 !== -1 && i1 !== -1) {
  const newHero = `              {/* Welcome hero — checklist removed; use Career Tools pages */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#15122e] via-[#0f0d20] to-[#07050f] p-6 md:p-10 border border-[#8b5cf6]/25 shadow-[0_20px_45px_rgba(139,92,246,0.15)] select-none">
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-45">
                  <span className="absolute w-2 h-2 bg-[#8b5cf6] rounded-full animate-float" style={{ left: "8%", top: "25%" }} />
                  <span className="absolute w-3.5 h-3.5 bg-[#f59e0b] rounded-full animate-float" style={{ left: "28%", top: "72%", animationDelay: "1.2s" }} />
                </div>
                <div className="relative z-10 space-y-4 max-w-2xl">
                  <h1 className="text-2.5xl md:text-4xl font-extrabold text-[#f8fafc] leading-tight">
                    Welcome Back, {displayName}! 👋
                  </h1>
                  <div className="h-8 flex items-center">
                    <TypewriterEffect
                      phrases={[
                        "Your dream role is closer than you think",
                        "AI is scanning thousands of jobs for you",
                        "Let's land your next opportunity",
                      ]}
                    />
                  </div>
                  <p className="text-sm text-slate-400 font-medium max-w-lg">
                    Open any Career Tool below for ATS, resume review, salary insights, and more — all powered by your Supabase-stored analysis.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("matcher")}
                      className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-sm hover-shimmer shadow-lg active:scale-95 transition-all"
                    >
                      Start Job Matching →
                    </button>
                    <button
                      onClick={() => setActiveTab("tool-ats")}
                      className="h-12 px-6 rounded-xl border border-[#8b5cf6]/30 text-[#f8fafc] font-bold text-sm hover:bg-[#8b5cf6]/10 active:scale-95 transition-all"
                    >
                      ATS Score Check
                    </button>
                  </div>
                </div>
              </div>

`;
  s = s.slice(0, i0) + newHero + s.slice(i1);
}

// Replace quick actions grid content
const qaStart = "                  {[\n                    {\n                      id: \"ats\",";
const qaEnd = "                  ].map((card) => (\n                    <QuickActionCard";
const j0 = s.indexOf(qaStart);
const j1 = s.indexOf(qaEnd);
if (j0 !== -1 && j1 !== -1) {
  s = s.slice(0, j0) + "                  {COACH_TOOLS.map((card) => (" + s.slice(j1);
  s = s.replace(
    /onClick=\{card\.action\}/,
    "onClick={() => setActiveTab(card.id)}",
  );
  // Fix QuickActionCard props - card has title, subtitle, emoji, gradient
  s = s.replace(
    /gradientClass=\{card\.gradient\}/g,
    "gradientClass={card.gradient}",
  );
}

// Header title for tool pages
s = s.replace(
  `                  : activeTab === "applications"
                    ? "Tracked Applications"
                    : activeTab}`,
  `                  : activeTab === "applications"
                    ? "Tracked Applications"
                    : getCoachToolByTab(activeTab)?.title ?? activeTab}`,
);

// Insert coach tool pages before profile tab
const profileTab = `          {activeTab === "profile" && (`;
if (!s.includes("activeTab === \"tool-ats\"")) {
  const toolPages = `
          {COACH_TOOLS.map((tool) =>
            activeTab === tool.id ? (
              <CoachToolPageView
                key={tool.id}
                tool={tool}
                onBack={() => setActiveTab("dashboard")}
                onOpenMatcher={() => setActiveTab("matcher")}
                displayName={displayName}
                profileEmail={displayEmail}
                resumeName={profile?.resume_name}
                parsedSkills={skillsList}
                jobs={jobsList}
              />
            ) : null,
          )}

`;
  s = s.replace(profileTab, toolPages + profileTab);
}

// Remove modals section
s = s.replace(
  /\s*\{\/\* QUICK ACTIONS MODALS DIALOG OVERLAYS \*\/\}[\s\S]*?\{\/\* TRACK NEW JOB FORM MODAL \*\/\}/,
  "\n\n      {/* TRACK NEW JOB FORM MODAL */}",
);

// Profile ATS chip
s = s.replace(
  /checklist\.atsAudit \? \(/,
  "atsScoreDisplay > 0 ? (",
);
s = s.replace(
  /<span>Audited: \{atsScore\}%<\/span>/,
  "<span>Score: {atsScoreDisplay}%</span>",
);
s = s.replace(
  /value=\{atsScore\}/g,
  "value={atsScoreDisplay}",
);

// Reset sandbox - remove setChecklist from reset buttons
s = s.replace(
  /setChecklist\(\{[\s\S]*?applyRoles: false,\s*\}\);/g,
  "",
);
s = s.replace(
  /setChecklist\(\{[\s\S]*?applyRoles: true,\s*\}\);/g,
  "",
);

// Remove setChecklist from load effect
s = s.replace(
  /if \(saved\.length > 0\) \{\s*\}/g,
  "",
);

fs.writeFileSync(path, s);
console.log("Dashboard patched");
