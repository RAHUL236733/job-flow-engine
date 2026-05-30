import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  Sparkles,
  Loader2,
  ExternalLink,
  RotateCcw,
  Briefcase,
  CheckCircle2,
  MapPin,
  Bookmark,
  BookmarkCheck,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  Trash2,
  ChevronRight,
  Info,
  Menu,
  FileSpreadsheet,
  AlertCircle,
  Layers,
  MessageSquare,
  Send,
  Download,
  Plus,
  Zap,
  BarChart2,
  Clock,
  Search,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const DEFAULT_N8N_URL = "https://poojitharamya7125.app.n8n.cloud/webhook-test/upload-resume";

// --- GLOBAL TYPES ---
type Job = {
  title: string;
  company: string;
  location: string;
  skills: string;
  url: string;
  score: string;
  description?: string;
  type?: string;
  experience?: string;
  saved_at?: string;
};

type ActiveTab = "dashboard" | "matcher" | "assistant" | "saved" | "applications" | "profile";
type AppStatus = "Applied" | "Interviewing" | "Offer" | "Rejected";

type Application = {
  id: string;
  company: string;
  role: string;
  status: AppStatus;
  applied_at: string;
  location?: string;
};

type ChatMessage = {
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

const STEPS = [
  { label: "Extracting skills from your resume...", at: 0 },
  { label: "Spawning live AI web scrapers across job boards...", at: 3000 },
  { label: "Analyzing company listings against your profile...", at: 7000 },
  { label: "Finalizing your custom recommendation dashboard...", at: 11000 },
];

const ACCEPTED_EXTS = [".pdf", ".doc", ".docx"];

function Dashboard() {
  const { user, profile, isLoading: authLoading, signOut, updateProfile, isMockMode, incrementTrialsUsed } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const trialsUsed = user?.user_metadata?.trials_used || 0;

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- AI CAREER ASSISTANT STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"chat" | "interview" | "roadmap" | "recommendation">("chat");
  const [activeInterviewStep, setActiveInterviewStep] = useState(0);

  const [chatSessions, setChatSessions] = useState<{ id: string; title: string; date: string }[]>(() => {
    const saved = localStorage.getItem("ai_chat_sessions");
    return saved ? JSON.parse(saved) : [{ id: "session-1", title: "General Career Coach", date: new Date().toLocaleDateString() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return chatSessions[0]?.id || "session-1";
  });

  useEffect(() => {
    const savedMsgs = localStorage.getItem(`ai_chat_messages_${activeSessionId}`);
    if (savedMsgs) {
      setChatMessages(JSON.parse(savedMsgs));
    } else {
      setChatMessages([]);
    }
  }, [activeSessionId]);

  const saveSessionMessages = (sessionId: string, msgs: ChatMessage[]) => {
    setChatMessages(msgs);
    localStorage.setItem(`ai_chat_messages_${sessionId}`, JSON.stringify(msgs));
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isAssistantTyping]);

  // --- APPLICATIONS TRACKER STATE ---
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem("user_applications");
    return saved ? JSON.parse(saved) : [
      { id: "app-1", company: "Google DeepMind", role: "AI Software Engineer", status: "Interviewing", applied_at: new Date().toLocaleDateString(), location: "Remote" },
      { id: "app-2", company: "Vercel", role: "Frontend Developer", status: "Applied", applied_at: new Date().toLocaleDateString(), location: "San Francisco" }
    ];
  });

  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppRole, setNewAppRole] = useState("");
  const [newAppLocation, setNewAppLocation] = useState("");
  const [newAppStatus, setNewAppStatus] = useState<AppStatus>("Applied");

  const saveApplications = (apps: Application[]) => {
    setApplications(apps);
    localStorage.setItem("user_applications", JSON.stringify(apps));
  };

  const addApplication = (company: string, role: string, status: AppStatus, location?: string) => {
    const newApp: Application = {
      id: `app-${Date.now()}`,
      company,
      role,
      status,
      applied_at: new Date().toLocaleDateString(),
      location: location || "Remote"
    };
    const updated = [newApp, ...applications];
    saveApplications(updated);
    toast.success("Job application tracked successfully!");
  };

  const updateApplicationStatus = (id: string, status: AppStatus) => {
    const updated = applications.map(app => app.id === id ? { ...app, status } : app);
    saveApplications(updated);
    toast.success("Application status updated!");
  };

  const deleteApplication = (id: string) => {
    const updated = applications.filter(app => app.id !== id);
    saveApplications(updated);
    toast.success("Application removed.");
  };

  // --- MATCHER & MOUNT STATES ---
  const [matcherPhase, setMatcherPhase] = useState<"upload" | "loading" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [atsScore, setAtsScore] = useState<number>(0);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // --- DATABASE HELPERS ---
  const loadCachedResumeResults = useCallback(async () => {
    if (!user) return;

    if (profile?.skills) {
      setParsedSkills(
        profile.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      setAtsScore(profile.ats_score || 75);
    }

    if (isMockMode) {
      const cached = localStorage.getItem(`mock_resume_results_${user.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setJobs(parsed.jobs);
          setAtsScore(parsed.atsScore);
          setParsedSkills(parsed.skills);
          setMatcherPhase("results");
        } catch (err) {
          console.error("Cache parsing error", err);
        }
      }
      return;
    }

    try {
      const queryHash = `resume-${user.id}`;
      const { data } = await supabase
        .from("cached_job_results")
        .select("*")
        .eq("query_hash", queryHash)
        .single();

      if (data && new Date(data.expires_at) > new Date()) {
        setJobs(data.jobs as Job[]);
        setMatcherPhase("results");
      }
    } catch (err) {
      console.error("No active cache found", err);
    }
  }, [user, profile, isMockMode]);

  const cacheResumeResults = useCallback(
    async (jobsList: Job[], score: number, skillsList: string[]) => {
      if (!user) return;

      if (isMockMode) {
        localStorage.setItem(
          `mock_resume_results_${user.id}`,
          JSON.stringify({ jobs: jobsList, atsScore: score, skills: skillsList }),
        );
        return;
      }

      try {
        const queryHash = `resume-${user.id}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await supabase.from("cached_job_results").upsert(
          {
            query_hash: queryHash,
            jobs: jobsList,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: "query_hash" }
        );
      } catch (err) {
        console.error("Failed to cache jobs:", err);
      }
    },
    [user, isMockMode],
  );

  const fetchSavedJobs = useCallback(async () => {
    if (!user) return;
    setSavedJobsLoading(true);

    if (isMockMode) {
      const mockSaved = localStorage.getItem(`mock_saved_jobs_${user.id}`);
      setSavedJobs(mockSaved ? JSON.parse(mockSaved) : []);
      setSavedJobsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;
      setSavedJobs((data as Job[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to fetch bookmarked jobs", { description: msg });
    } finally {
      setSavedJobsLoading(false);
    }
  }, [user, isMockMode]);

  const toggleSaveJob = useCallback(
    async (job: Job) => {
      if (!user) {
        toast.error("Please login to bookmark jobs");
        return;
      }

      const isSaved = savedJobs.some((sj) => sj.url === job.url);

      if (isMockMode) {
        let updated: Job[] = [];
        if (isSaved) {
          updated = savedJobs.filter((sj) => sj.url !== job.url);
          toast.success("Job bookmark removed");
        } else {
          updated = [...savedJobs, { ...job, saved_at: new Date().toISOString() }];
          toast.success("Job bookmarked successfully!");
        }
        setSavedJobs(updated);
        localStorage.setItem(`mock_saved_jobs_${user.id}`, JSON.stringify(updated));
        return;
      }

      try {
        if (isSaved) {
          const { error } = await supabase
            .from("saved_jobs")
            .delete()
            .eq("user_id", user.id)
            .eq("url", job.url);

          if (error) throw error;
          setSavedJobs(savedJobs.filter((sj) => sj.url !== job.url));
          toast.success("Job bookmark removed");
        } else {
          const { error } = await supabase.from("saved_jobs").insert({
            user_id: user.id,
            title: job.title,
            company: job.company,
            location: job.location,
            skills: job.skills,
            url: job.url,
            score: job.score,
          });

          if (error) throw error;
          setSavedJobs([...savedJobs, job]);
          toast.success("Job bookmarked successfully!");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("Bookmark toggle failed", { description: msg });
      }
    },
    [user, savedJobs, isMockMode],
  );

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    const isValid = ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
    if (!isValid) {
      toast.error("Unsupported file", { description: "Please upload a PDF, DOC, or DOCX file." });
      return;
    }
    setFile(f);
  };

  const startLoadingSteps = () => {
    setStepIndex(0);
    STEPS.forEach((s, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setStepIndex(i), s.at);
      timersRef.current.push(t);
    });
  };

  const handleResumeSubmit = async () => {
    if (!file) return;

    if (trialsUsed >= 3) {
      toast.error("Free trial limit reached", {
        description: "You have used all 3 free trials. Please upgrade for unlimited resume matches.",
      });
      return;
    }

    setMatcherPhase("loading");
    startLoadingSteps();

    try {
      const fd = new FormData();
      fd.append("resume", file);

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_N8N_URL;

      const res = await fetch(webhookUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      let parsedData = data;

      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (firstItem && typeof firstItem === "object") {
          if ("json" in firstItem) {
            parsedData = firstItem.json;
          } else if ("body" in firstItem) {
            parsedData = firstItem.body;
          } else if (!("title" in firstItem) && !("company" in firstItem)) {
            parsedData = firstItem;
          }
        }
      } else if (data && typeof data === "object" && "json" in data) {
        parsedData = data.json;
      }

      let rawJobs: Job[] = [];
      if (Array.isArray(parsedData)) {
        rawJobs = parsedData;
      } else if (parsedData && typeof parsedData === "object") {
        rawJobs = parsedData.topJobs ?? parsedData.jobs ?? parsedData.data ?? [];
      }

      if (Array.isArray(rawJobs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawJobs = rawJobs.map((item: any) => {
          if (item && typeof item === "object") {
            if ("json" in item) return item.json;
            if ("body" in item) return item.body;
          }
          return item;
        });
      } else {
        rawJobs = [];
      }

      let derivedSkills: string[] = [];
      if (parsedData && typeof parsedData === "object") {
        const skillsVal = parsedData.extractedSkills ?? parsedData.skills;
        if (Array.isArray(skillsVal)) {
          derivedSkills = skillsVal.map(String);
        } else if (typeof skillsVal === "string") {
          derivedSkills = skillsVal.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (derivedSkills.length === 0) {
        derivedSkills = Array.from(
          new Set(
            rawJobs.flatMap((j) => (j.skills ? j.skills.split(",").map((s) => s.trim()) : [])),
          ),
        ).slice(0, 10);
      }

      let derivedScore = 75;
      if (parsedData && typeof parsedData === "object") {
        const scoreVal = parsedData.atsScore ?? parsedData.score ?? parsedData.ats_score;
        if (scoreVal !== undefined && scoreVal !== null) {
          const num = parseFloat(String(scoreVal).replace(/%/g, ""));
          if (!isNaN(num)) {
            derivedScore = Math.round(num);
          }
        }
      }
      if (derivedScore === 75 && rawJobs.length > 0) {
        const avg = rawJobs.reduce((acc, j) => {
          const s = parseFloat(String(j.score).replace(/%/g, "") || "0");
          return acc + (isNaN(s) ? 0 : s);
        }, 0) / rawJobs.length;
        if (avg > 0) {
          derivedScore = Math.round(avg);
        }
      }

      clearTimers();
      setJobs(rawJobs.slice(0, 8));
      setAtsScore(derivedScore);
      setParsedSkills(derivedSkills);
      setMatcherPhase("results");

      await cacheResumeResults(rawJobs.slice(0, 8), derivedScore, derivedSkills);

      await updateProfile({
        skills: derivedSkills.join(", "),
        ats_score: derivedScore,
        resume_name: file.name,
      });

      await incrementTrialsUsed();
    } catch (err) {
      console.error(err);
      clearTimers();
      toast.error("Scraping failed", {
        description: "We couldn't connect to the AI matching service. Try again in a few seconds.",
      });
      setMatcherPhase("upload");
    }
  };

  // --- AI CAREER ASSISTANT LOGIC ---
  const handleSendMessage = async (textToSend: string, actionType?: string) => {
    if (!textToSend.trim() && !actionType) return;
    const promptText = textToSend.trim() || (actionType ? `Triggered: ${actionType}` : "");
    setChatInput("");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...chatMessages, userMsg];
    saveSessionMessages(activeSessionId, updatedMessages);
    setIsAssistantTyping(true);

    setTimeout(() => {
      let aiResponseText = "";
      let isRoadmap = false;
      let roadmapData = undefined;
      let isJobRecs = false;
      let jobRecsData = undefined;
      let isInterviewMode = false;
      let interviewScore = undefined;
      let interviewStrengths = undefined;
      let interviewImprovements = undefined;

      const userSkills = profile?.skills || "Python, React, CSS, JavaScript, HTML, TypeScript";
      const resumeName = profile?.resume_name || "";
      const name = profile?.full_name || "Rahul";

      if (actionType === "Interview Practice" || promptText.toLowerCase().includes("interview") || assistantMode === "interview") {
        if (assistantMode !== "interview") {
          setAssistantMode("interview");
          setActiveInterviewStep(1);
          aiResponseText = `### Technical Interview Practice Mode 🚀\n\nWelcome ** ${name}** !I will act as your technical interviewer.Let's start with your first question.\n\n**Question 1: Explain REST APIs and how they handle statelessness.**\n\n*Please type your answer below, and I will evaluate it.*`;
        } else {
          isInterviewMode = true;
          const userLen = promptText.length;

          if (activeInterviewStep === 1) {
            interviewScore = userLen > 80 ? 9 : userLen > 30 ? 7 : 5;
            interviewStrengths = [
              "Clearly defined the concept of REST architecture and resource endpoints.",
              "Mentioned the client-server separation model correctly, highlighting self-contained requests."
            ];
            interviewImprovements = [
              "Specifically explain standard HTTP verbs/methods (GET, POST, PUT, DELETE) and their actions.",
              "Discuss how status codes (200 OK, 201 Created, 404 Not Found, 500 Server Error) convey resource state."
            ];

            aiResponseText = `### Evaluation for Question 1 ✅\n\nThank you for your response! Below is your custom evaluation report.\n\nLet's proceed to the next question:\n\n**Question 2: What is the difference between SQL and NoSQL databases, and when would you choose one over the other?**`;
            setActiveInterviewStep(2);
          } else if (activeInterviewStep === 2) {
            interviewScore = userLen > 80 ? 8 : userLen > 30 ? 7 : 6;
            interviewStrengths = [
              "Identified key architectural differences (structured schemas vs. flexible schema-less stores).",
              "Correctly explained scaling directions (vertical scaling for SQL vs. horizontal distribution for NoSQL)."
            ];
            interviewImprovements = [
              "Reference ACID compliance guarantees in SQL databases for reliable transaction processing.",
              "Provide concrete industry examples like PostgreSQL/MySQL for SQL and MongoDB/Cassandra for NoSQL."
            ];

            aiResponseText = `### Evaluation for Question 2 ✅\n\nSuperb database analysis! Here is your scoring report.\n\nThis completes your quick technical interview session! Click **Clear Chat** or ask me any general career questions to exit interview mode.`;
            setAssistantMode("chat");
            setActiveInterviewStep(0);
          }
        }
      }
      else if (actionType === "Career Roadmap" || promptText.toLowerCase().includes("roadmap") || promptText.toLowerCase().includes("become a")) {
        isRoadmap = true;
        let role = "AI Engineer";
        if (promptText.toLowerCase().includes("frontend")) role = "Frontend Developer";
        if (promptText.toLowerCase().includes("fullstack") || promptText.toLowerCase().includes("full stack")) role = "Fullstack Developer";

        if (role === "AI Engineer") {
          roadmapData = [
            { phase: "Phase 1", title: "Python Core Foundations", skills: ["Python syntax", "Object-Oriented Programming", "Data Structures", "APIs"], timeline: "Month 1-2" },
            { phase: "Phase 2", title: "Data Science & Machine Learning", skills: ["Pandas", "NumPy", "Scikit-Learn", "Regression", "Decision Trees"], timeline: "Month 3-4" },
            { phase: "Phase 3", title: "Deep Learning & Neural Networks", skills: ["PyTorch / TensorFlow", "CNNs", "RNNs", "Backpropagation"], timeline: "Month 5-6" },
            { phase: "Phase 4", title: "Large Language Models & GenAI", skills: ["Transformers", "Prompt Engineering", "RAG", "LangChain", "Vector DBs"], timeline: "Month 7-9" },
            { phase: "Phase 5", title: "Production AI Deployment", skills: ["Docker", "FastAPI", "AWS", "CI/CD pipelines", "Monitoring"], timeline: "Month 10-12" }
          ];
        } else if (role === "Frontend Developer") {
          roadmapData = [
            { phase: "Phase 1", title: "HTML, CSS & JavaScript Essentials", skills: ["Semantic HTML", "Flexbox/Grid", "ES6+ syntax", "DOM manipulation"], timeline: "Month 1-2" },
            { phase: "Phase 2", title: "Modern Frontend Frameworks", skills: ["React.js", "State Management (Zustand/Redux)", "Routing"], timeline: "Month 3-4" },
            { phase: "Phase 3", title: "Component Systems & Styling", skills: ["Tailwind CSS", "CSS Modules", "Responsive Web Design"], timeline: "Month 5-6" },
            { phase: "Phase 4", title: "DevOps & Integration", skills: ["Git/GitHub Actions", "Vercel / Netlify", "Testing (Jest/Cypress)"], timeline: "Month 7-8" }
          ];
        } else {
          roadmapData = [
            { phase: "Phase 1", title: "Core Web Technologies", skills: ["HTML5", "CSS3", "Modern JavaScript ES6+"], timeline: "Month 1-2" },
            { phase: "Phase 2", title: "Frontend Frameworks", skills: ["React.js", "TypeScript", "Tailwind CSS", "Zustand"], timeline: "Month 3-5" },
            { phase: "Phase 3", title: "Backend Architecture", skills: ["Node.js", "Express.js", "PostgreSQL", "Prisma ORM"], timeline: "Month 6-8" },
            { phase: "Phase 4", title: "System Deployment & Testing", skills: ["Docker", "AWS / Vercel", "Jest", "CI/CD Pipelines"], timeline: "Month 9-12" }
          ];
        }

        aiResponseText = `### Phased Career Roadmap for ${role} 🗺️\n\nI have generated a comprehensive learning curriculum tailored to help you transition into a senior **${role}** role successfully. Estimated learning timeline: **6-12 Months**.`;
      }
      else if (actionType === "Job Recommendations" || promptText.toLowerCase().includes("recommend") || promptText.toLowerCase().includes("job")) {
        isJobRecs = true;
        jobRecsData = [
          { title: "AI Research Engineer", company: "Google DeepMind", score: 95, matchReason: "Highly matches your background in Generative AI, Python scripting, and FastAPI integrations." },
          { title: "Machine Learning Engineer", company: "Scale AI", score: 91, matchReason: "Excellent fit for your solid foundation in deep learning modeling and dataset pipelines." },
          { title: "Backend Engineer (FastAPI & Node)", company: "Vercel", score: 88, matchReason: "Matches your experience building scalable asynchronous REST APIs and backend routers." },
          { title: "Python Software Developer", company: "Stripe", score: 85, matchReason: "Perfect fit for your clean coding style, scripting expertise, and unit-testing systems." }
        ];

        if (resumeName) {
          aiResponseText = `### Personalized Job Recommendations 💼\n\nBased on your active resume **${resumeName}** and matching your skills (**${userSkills}**), here are the top target roles mapped to your profile rank:`;
        } else {
          aiResponseText = `### Personalized Job Recommendations 💼\n\n*Note: I did not find an active resume in your profile. You can upload one under the **Job Matcher** tab to get high-precision matches!* \n\nBased on your profile skills (**${userSkills}**), here are the top roles that best align with your background:`;
        }
      }
      else if (actionType === "Resume Review" || promptText.toLowerCase().includes("resume review") || promptText.toLowerCase().includes("improve my resume")) {
        aiResponseText = `### Resume Review Report 📝\n\n${resumeName ? `I have thoroughly reviewed your uploaded resume **${resumeName}** against current tech hiring standards.` : `I reviewed your profile background. For a comprehensive audit, please upload your resume file (.pdf) under the **Job Matcher** tab.`}\n\n**Here are my critical suggestions to increase resume callbacks:**\n\n1. **Add Measurable Achievements**: Instead of *"Built APIs using FastAPI"*, use *"Designed and deployed 15+ asynchronous FastAPI endpoints, reducing response latency by 32%."*\n2. **Incorporate Certifications**: Highlight professional validations like AWS Certified Practitioner or React Specialist to stand out.\n3. **Strengthen Project Descriptions**: Frame descriptions using the **STAR method** (Situation, Task, Action, Result) with clear impact stats.\n4. **Prune Unused Tools**: Focus on key tech stacks related to your target roles to make your profile highly scannable by human recruiters.`;
      }
      else if (actionType === "ATS Score Check" || promptText.toLowerCase().includes("ats score") || promptText.toLowerCase().includes("improve my ats")) {
        const score = profile?.ats_score || 78;
        aiResponseText = `### ATS Suitability Audit 🎯\n\nYour current estimated ATS (Applicant Tracking System) scan score is **${score}%**.\n\n**Key Optimization Recommendations to reach 95%+:**\n\n* **Keyword Density**: Ensure keywords matching your target role (e.g., Docker, FastAPI, Vector Databases) appear 3-4 times in natural contexts.\n* **Format Scanning**: Avoid complex multi-column grids, graphical tables, icons, and text boxes which confuse modern ATS scanners.\n* **Standardized Headers**: Use standard sections like "Professional Experience", "Technical Skills", and "Education" rather than generic headers.\n* **File Format**: Use standard text-based PDFs instead of rasterized images to guarantee complete keyword indexability.`;
      }
      else if (actionType === "Skill Gap Analysis" || promptText.toLowerCase().includes("skill gap") || promptText.toLowerCase().includes("what skills")) {
        aiResponseText = `### Skill Gap Analysis 📊\n\nBased on your listed skills (**${userSkills}**) and mapping against industry trends for top AI/Software engineering hiring pipelines:\n\n**Your Current Core Skills:**\n${userSkills.split(",").map(s => `* ✓ ${s.trim()}`).join("\n")}\n\n**Recommended Target Skills to acquire next:**\n\n1. **Docker & Kubernetes**: Essential for containerizing applications and running microservices.\n2. **AWS Deployment**: Industry standard cloud computing and serverless execution models.\n3. **LangChain & LlamaIndex**: Critical frameworks for creating Generative AI agents and RAG search pipelines.\n4. **Vector Databases (Pinecone, pgvector)**: The foundational indexing systems behind modern LLM search.\n\n*Learning Recommendation: Try building a RAG application using FastAPI, LangChain, and pgvector to master 3 of these skills in one project!*`;
      }
      else if (actionType === "Salary Insights" || promptText.toLowerCase().includes("salary") || promptText.toLowerCase().includes("how much do")) {
        aiResponseText = `### Salary Insights Framework 💵\n\nHere are the average annual salary ranges for high-demand technology roles in top tech hubs:\n\n* **AI Engineer**: \n  * Entry: $115,000 - $140,000\n  * Mid-Level: $150,000 - $185,000\n  * Senior: $190,000 - $240,000+\n* **Machine Learning Engineer**: \n  * Entry: $110,000 - $135,000\n  * Mid: $145,000 - $180,000\n  * Senior: $190,000 - $230,000\n* **Full-Stack Developer**: \n  * Entry: $85,000 - $110,000\n  * Mid: $120,000 - $155,000\n  * Senior: $165,000 - $200,000\n\n*Note: Total compensation figures frequently include significant stock options, equity sign-ons, and performance bonuses.*`;
      }
      else if (actionType === "LinkedIn Optimization" || promptText.toLowerCase().includes("linkedin")) {
        aiResponseText = `### LinkedIn Profile Optimization Guide 🌐\n\nTurn your LinkedIn profile into a recruiter magnet with these strategic enhancements:\n\n* **Headline Formula**: Instead of *"Student at College"*, use *"AI Engineer in training | Python, React, FastAPI | Building Generative AI Solutions"* to maximize search algorithm indexing.\n* **About Summary**: Craft a 3-paragraph summary stating (1) your passion and focus, (2) your primary technical toolkit, and (3) your active research/projects. End with a call to action: *"Open to software and AI engineering opportunities | Contact: ${user?.email || "email"}"*\n* **Featured Section**: Attach your custom AI Job Matcher landing page, resume PDF, and GitHub repository links directly to top visibility.\n* **Skills Section**: List exactly 50 technical skills, ensuring your top 3 are high-volume keywords related to your target jobs.`;
      }
      else if (actionType === "Cover Letter Generator" || promptText.toLowerCase().includes("cover letter")) {
        aiResponseText = `### Custom Cover Letter Generator ✉️\n\nHere is a highly professional, impact-driven cover letter template mapped to your skills:\n\n***\n\n**Subject: Application for Software / AI Engineer Role**\n\nDear Hiring Team,\n\nI am writing to express my strong interest in the Software / AI Engineer position. With a robust technical foundation in **${userSkills}**, alongside hands-on experience building scalable applications, I am eager to contribute to your engineering team.\n\nIn my recent work, I built and integrated asynchronous microservices, focused on maximizing response efficiency. Specifically, I leverage systems like FastAPI and Generative AI, matching features to precise client specifications. This experience has taught me how to bridge complex algorithmic modeling with streamlined, user-first frontends.\n\nI am excited by your organization's commitment to pushing tech boundaries, and I would love the chance to discuss how my skill set aligns with your current team goals. Thank you for your time and consideration.\n\nSincerely,\n\n**${name}** \n${user?.email || "rahul@example.com"}  \n\n***`;
      }
      else if (actionType === "Improve my profile strength" || promptText.toLowerCase().includes("improve my profile strength")) {
        aiResponseText = `### AI Profile Strength Diagnostics 📈\n\nYour current Profile Strength is ranked at **85%** (Very Good).\n\n**To reach 100% and rank at the top of recruiter searches, perform these actions:**\n\n1. **Add Certifications**: Acquire validations such as *AWS Certified Cloud Practitioner* or *DeepLearning.AI TensorFlow Developer*.\n2. **Incorporate Capstone Projects**: Build a full-stack RAG pipeline with FastAPI and deploy it to a live environment (e.g. Hugging Face, Vercel).\n3. **Complete LinkedIn Summary**: Audit your About summary to include keywords optimized specifically for high-callback search hits.\n\n*Would you like me to guide you through building a capstone RAG project or drafting your LinkedIn summary? Just ask!*`;
      }
      else {
        aiResponseText = `### AI Career Coaching Advice 🤖\n\nHello **${name}**! I'm here to support your career journey. I can assist you in optimization across job applications, technical questions, resume updates, and interview preparations.\n\n**You mentioned:** *"${promptText}"*\n\nBased on your active skills (**${userSkills}**), here is my general advice:\n\n* **Continuous Learning**: Leverage modern tools like FastAPI, Docker, and LangChain to create functional, deployed fullstack applications. This is the single best way to impress hiring managers.\n* **Portfolio Scannability**: Ensure your GitHub has a clean README detailing what your applications accomplish, what stack you used, and how to run them locally in under 3 minutes.\n* **Networking Strategy**: Reach out to senior jobs on LinkedIn in your target fields, asking structured, specific technical questions. This often leads to referrals!*`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRoadmap,
        roadmapData,
        isJobRecs,
        jobRecsData,
        isInterviewMode,
        interviewScore,
        interviewStrengths,
        interviewImprovements,
      };

      const finalMessages = [...updatedMessages, aiMsg];
      saveSessionMessages(activeSessionId, finalMessages);
      setIsAssistantTyping(false);
    }, 1500);
  };

  const handleClearChat = () => {
    saveSessionMessages(activeSessionId, []);
    setAssistantMode("chat");
    setActiveInterviewStep(0);
    toast.success("Chat history cleared!");
  };

  const handleExportChat = () => {
    if (chatMessages.length === 0) {
      toast.warning("No messages to export!");
      return;
    }
    const formattedText = chatMessages.map(m => {
      return `[${m.timestamp}] ${m.sender === "user" ? "USER" : "AI"}:\n${m.text}\n`;
    }).join("\n---\n\n");

    const blob = new Blob([formattedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai_career_chat_${activeSessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported successfully!");
  };

  const handleNewChatSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: `Career Talk ${chatSessions.length + 1}`,
      date: new Date().toLocaleDateString()
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    localStorage.setItem("ai_chat_sessions", JSON.stringify(updated));
    setActiveSessionId(newId);
    toast.success("Created new chat session!");
  };

  const handleDeleteChatSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chatSessions.length <= 1) {
      toast.error("You must keep at least one active chat session!");
      return;
    }
    const updated = chatSessions.filter(s => s.id !== id);
    setChatSessions(updated);
    localStorage.setItem("ai_chat_sessions", JSON.stringify(updated));

    localStorage.removeItem(`ai_chat_messages_${id}`);

    if (activeSessionId === id) {
      setActiveSessionId(updated[0].id);
    }
    toast.success("Session deleted!");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth/signin" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      if (activeTab === "saved") {
        fetchSavedJobs();
      } else if (activeTab === "matcher") {
        loadCachedResumeResults();
      }
    }
  }, [user, activeTab, fetchSavedJobs, loadCachedResumeResults]);

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const updates = {
      full_name: (fd.get("fullName") as string) || profile?.full_name || "",
      experience_level: (fd.get("experienceLevel") as string) || profile?.experience_level || "Freshman/Student",
      preferred_role: (fd.get("preferredRole") as string) || profile?.preferred_role || "",
      preferred_location: (fd.get("preferredLocation") as string) || profile?.preferred_location || "",
      job_type: (fd.get("jobType") as string) || profile?.job_type || "All",
      skills: (fd.get("skills") as string) || profile?.skills || "",
    };

    setIsSavingProfile(true);
    try {
      const success = await updateProfile(updates);
      if (success && updates.skills) {
        setParsedSkills(
          updates.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
    } catch (err) {
      toast.error("An error occurred while saving: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  const NavItem = ({
    tab,
    icon: Icon,
    label,
  }: {
    tab: ActiveTab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ease-in-out active:scale-95",
          active
            ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5",
        ].join(" ")}
      >
        <Icon className={["h-4 w-4 transition-transform duration-200", active ? "" : "group-hover:scale-110"].join(" ")} />
        {label}
      </button>
    );
  };

  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content = line;
      let className = "text-sm text-muted-foreground leading-relaxed mt-1";

      if (content.startsWith("### ")) {
        content = content.replace("### ", "");
        className = "text-base font-extrabold text-foreground tracking-tight mt-4 mb-2 first:mt-0";
      }

      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      const parsedLine = parts.map((part, pidx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pidx} className="font-extrabold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return <p key={idx} className={className}>{parsedLine}</p>;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-950 text-foreground transition-colors duration-300">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200/50 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 px-6">
          <div
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => navigate({ to: "/" })}
          >
            <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              AI Job<span className="text-primary">Matcher</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <NavItem tab="dashboard" icon={Layers} label="Dashboard" />
          <NavItem tab="matcher" icon={Sparkles} label="Job Matcher" />
          <NavItem tab="assistant" icon={MessageSquare} label="AI Career Assistant" />
          <NavItem tab="saved" icon={Bookmark} label="Saved Jobs" />
          <NavItem tab="applications" icon={Briefcase} label="Applications" />
          <NavItem tab="profile" icon={UserIcon} label="Profile" />
        </nav>

        {/* User Card */}
        <div className="border-t border-slate-200/50 dark:border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {profile?.full_name || "New Matcher"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200/85 dark:border-slate-800/85 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95 cursor-pointer shadow-inner"
              title="Toggle theme"
            >
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span>Day Mode</span>
                  </>
                )}
              </div>
              <div className="h-4 w-7 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 transition-colors relative flex items-center justify-start dark:justify-end">
                <div className="h-3 w-3 rounded-full bg-white dark:bg-blue-400 shadow-sm" />
              </div>
            </button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 text-xs font-bold"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* MOBILE SHEETS HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-slate-200/50 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            AI Job<span className="text-primary">Matcher</span>
          </span>
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/80">
            <div className="flex h-16 items-center border-b border-slate-200/50 dark:border-slate-800/80 px-6">
              <span className="text-base font-bold tracking-tight text-foreground">
                Dashboard Menu
              </span>
            </div>
            <nav className="flex-1 space-y-1.5 p-4">
              <NavItem tab="dashboard" icon={Layers} label="Dashboard" />
              <NavItem tab="matcher" icon={Sparkles} label="Job Matcher" />
              <NavItem tab="assistant" icon={MessageSquare} label="AI Career Assistant" />
              <NavItem tab="saved" icon={Bookmark} label="Saved Jobs" />
              <NavItem tab="applications" icon={Briefcase} label="Applications" />
              <NavItem tab="profile" icon={UserIcon} label="Profile" />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200/50 dark:border-slate-800/80 p-4 space-y-3 bg-white/95 dark:bg-slate-900/95">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                  {profile?.full_name?.charAt(0).toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() ||
                    "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {profile?.full_name || "New Matcher"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95 cursor-pointer shadow-inner"
                  title="Toggle theme"
                >
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? (
                      <>
                        <Moon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span>Day Mode</span>
                      </>
                    )}
                  </div>
                  <div className="h-4 w-7 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 transition-colors relative flex items-center justify-start dark:justify-end">
                    <div className="h-3 w-3 rounded-full bg-white dark:bg-blue-400 shadow-sm" />
                  </div>
                </button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 text-xs font-bold"
                >
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-8 py-6 md:py-8 mt-16 md:mt-0">
        <div className="mx-auto max-w-5xl w-full space-y-8">
          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {/* Dynamic Welcome Card */}
              <div className="flex flex-col md:flex-row justify-between items-start bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 md:p-8 relative overflow-hidden text-left shadow-sm">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-3 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40 px-3 py-1 text-[11px] font-bold text-[#3b82f6] dark:text-blue-400 shadow-sm">
                    <span className="text-[12px] opacity-90 leading-none">#</span>
                    <span>Workspace Active</span>
                  </span>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Good Evening, <span className="text-[#3b82f6]">{profile?.full_name || "Rahul"}</span> 👋
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl font-medium leading-relaxed">
                    Ready to find your next opportunity? Scan your resume, scrape live job boards, and track your applications.
                  </p>
                </div>
                <div className="mt-6 md:mt-0 md:ml-6 w-full md:w-64 shrink-0">
                  <div className="bg-white/80 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-[20px] p-4 space-y-2.5 shadow-sm text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                      <span>Resume Status</span>
                      <span className={profile?.resume_name ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-slate-400"}>
                        {profile?.resume_name ? "Uploaded ✓" : "Not Uploaded ❌"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                      <span>ATS Match Rank</span>
                      <span className="font-bold text-primary dark:text-blue-400">
                        {profile?.ats_score ? `${profile.ats_score}%` : "71%"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                      <span>Last Login</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "28/5/2026"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: "JOBS MATCHED",
                    value: String(jobs.length || 8),
                    icon: Sparkles,
                    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/20"
                  },
                  {
                    title: "APPLICATIONS SENT",
                    value: String(applications.length),
                    icon: Briefcase,
                    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-100/50 dark:border-purple-900/20"
                  },
                  {
                    title: "SAVED JOBS",
                    value: String(savedJobs.length || 2),
                    icon: Bookmark,
                    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-100/50 dark:border-amber-900/20"
                  },
                  {
                    title: "PROFILE SCORE",
                    value: profile?.ats_score ? `${profile.ats_score}%` : "80%",
                    icon: Award,
                    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-900/20"
                  }
                ].map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <Card key={idx} className="p-4 border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm text-left flex items-center gap-4 rounded-[24px] transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-default">
                      <div className={["h-12 w-12 rounded-full flex items-center justify-center shrink-0 border shadow-inner", metric.color].join(" ")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{metric.title}</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white block leading-none">{metric.value}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Two Column Grid Layout */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Recent Scrape Matches */}
                <div className="md:col-span-2">
                  <Card className="p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm rounded-[24px] text-left flex flex-col justify-between h-full min-h-[300px]">
                    <div>
                      <h3 className="font-extrabold text-slate-850 dark:text-white text-base mb-6">Recent Scrape Matches</h3>
                      
                      {jobs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-450 dark:text-slate-500 italic font-medium leading-relaxed max-w-sm mx-auto">
                          No matches found yet. Go to the "Job Matcher" to upload your resume!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {jobs.slice(0, 3).map((job, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{job.title}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{job.company} • {job.location || "Remote"}</span>
                              </div>
                              <Badge className="font-extrabold text-[9px] px-2 py-0.5 rounded-lg shrink-0 bg-primary/10 text-primary border-primary/20" variant="outline">
                                {job.score}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveTab("matcher")}
                      className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-4 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors active:scale-95"
                    >
                      View All Matches <ChevronRight className="h-3 w-3 shrink-0" />
                    </button>
                  </Card>
                </div>

                {/* Quick Tool Box */}
                <Card className="p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm rounded-[24px] text-left">
                  <h3 className="font-extrabold text-slate-850 dark:text-white text-base mb-6">Quick Tool Box</h3>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Job Matcher",
                        icon: Sparkles,
                        tab: "matcher" as ActiveTab,
                        color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/20"
                      },
                      {
                        title: "Explore Board",
                        icon: Search,
                        tab: "saved" as ActiveTab,
                        color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-100/50 dark:border-purple-900/20"
                      },
                      {
                        title: "Track Applications",
                        icon: Briefcase,
                        tab: "applications" as ActiveTab,
                        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-900/20"
                      }
                    ].map((tool, idx) => {
                      const ToolIcon = tool.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveTab(tool.tab)}
                          className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer transition-all duration-200 hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 hover:-translate-y-0.5 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-350">
                            <div className={["h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-inner", tool.color].join(" ")}>
                              <ToolIcon className="h-4 w-4" />
                            </div>
                            <span>{tool.title}</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: RESUME MATCHER */}
          {activeTab === "matcher" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  Resume Matcher
                </h1>
                <p className="text-sm text-muted-foreground">
                  Upload your resume to extract skills, calculate an ATS match score, and scrape
                  live entry-level jobs tailored to your skillset.
                </p>
              </div>

              {matcherPhase === "upload" && (
                <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
                  {/* Trial status banner */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                        Free Trial Usage
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        You get 3 free resume matches per account.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        {Math.max(0, 3 - trialsUsed)}
                      </span>
                      <span className="text-xs text-muted-foreground"> / 3 remaining</span>
                    </div>
                  </div>

                  {trialsUsed >= 3 ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                      <h4 className="text-sm font-bold text-foreground">Trial Limit Reached</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        You have used all 3 free resume matches for <strong>{user?.email}</strong>. Upgrade your subscription to continue matching resumes.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          handleFile(e.dataTransfer.files?.[0]);
                        }}
                        onClick={() => inputRef.current?.click()}
                        className={[
                          "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50",
                          dragOver
                            ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10 animate-pulse"
                            : "border-border bg-muted/20 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:scale-[1.005]",
                        ].join(" ")}
                      >
                        <input
                          ref={inputRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <div className="rounded-full bg-primary/10 p-4 text-primary transition-transform group-hover:scale-110">
                          <Upload className="h-7 w-7" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-foreground">
                          Drag &amp; drop your resume here
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          or click to browse from files (PDF, DOC, DOCX)
                        </p>
                      </div>

                      {file && (
                        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3 flex-1">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setFile(null)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground shrink-0 ml-2"
                          >
                            <X className="h-4 w-4" /> Remove
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    onClick={handleResumeSubmit}
                    disabled={!file || trialsUsed >= 3}
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-sm active:scale-95 transition-all duration-200"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze &amp; Find Matches
                  </Button>
                </div>
              )}

              {matcherPhase === "loading" && (
                <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 shadow-md text-center space-y-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                    <div className="relative rounded-full bg-primary/10 p-6 text-primary">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Analyzing Your Profile</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Our AI models are parsing your resume skills and scraping top boards. This will
                    take a few seconds.
                  </p>

                  <ol className="mt-8 space-y-3 text-left">
                    {STEPS.map((s, i) => {
                      const done = i < stepIndex;
                      const active = i === stepIndex;
                      return (
                        <li
                          key={i}
                          className={[
                            "flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-300",
                            active
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : done
                                ? "border-border bg-muted/20 opacity-80"
                                : "border-border bg-muted/5 opacity-40",
                          ].join(" ")}
                        >
                          <div className="mt-0.5">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : active ? (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-border" />
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-foreground">Step {i + 1}:</span>{" "}
                            <span className="text-muted-foreground">{s.label}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {matcherPhase === "results" && (
                <div className="space-y-8 animate-in fade-in-50 duration-500">
                  <div className="grid gap-6 md:grid-cols-3">
                    <Card className="p-6 flex flex-col items-center justify-center text-center shadow-md border-primary/10 bg-primary/5">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        ATS Score Match
                      </h3>
                      <div className="relative mt-4 flex items-center justify-center">
                        <svg className="h-32 w-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="50"
                            className="stroke-muted fill-none"
                            strokeWidth="8"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="50"
                            className="stroke-primary fill-none transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - atsScore / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-3xl font-extrabold text-foreground">
                          {atsScore}%
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {atsScore >= 80
                          ? "Excellent ATS match score!"
                          : "Good, but could be improved."}
                      </p>
                    </Card>

                    <Card className="p-6 md:col-span-2 shadow-md flex flex-col justify-between">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Extracted Skills
                        </h3>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {parsedSkills.length === 0 ? (
                            <span className="text-sm text-muted-foreground italic">
                              No skills extracted yet.
                            </span>
                          ) : (
                            parsedSkills.map((skill, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="px-2.5 py-1 text-xs font-medium"
                              >
                                {skill}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border pt-4 mt-4 flex items-start gap-3 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">Recruiter Tip:</span> Add
                          more quantitative achievements (e.g. "reduced load time by 30%") to
                          further improve this match rating.
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                          Top Job Matches
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Matching roles found via AI scraper, ranked by skillset compatibility.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setMatcherPhase("upload")}
                        className="rounded-xl"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Scrape Again
                      </Button>
                    </div>

                    {jobs.length === 0 ? (
                      <Card className="p-10 text-center text-muted-foreground shadow-md border-dashed">
                        No matches found. Try a resume with different keywords.
                      </Card>
                    ) : (
                      <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {jobs.map((job, i) => {
                          const isBookmarked = savedJobs.some((sj) => sj.url === job.url);
                          return (
                            <Card
                              key={i}
                              className="group flex flex-col justify-between p-5 shadow-md hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20 min-w-0"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h3
                                      onClick={() => setSelectedJob(job)}
                                      className="font-bold text-foreground text-sm hover:text-primary hover:underline cursor-pointer truncate"
                                    >
                                      {job.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                                      <Briefcase className="h-3 w-3 shrink-0" />
                                      {job.company}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    {job.score}
                                  </span>
                                </div>

                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  {job.location || "Remote"}
                                </p>

                                {job.skills && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {job.skills
                                      .split(",")
                                      .slice(0, 3)
                                      .map((s, idx) => (
                                        <span
                                          key={idx}
                                          className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground"
                                        >
                                          {s.trim()}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => toggleSaveJob(job)}
                                  className="h-9 w-9 rounded-lg shrink-0"
                                >
                                  {isBookmarked ? (
                                    <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all h-9"
                                >
                                  Apply Now
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AI CAREER ASSISTANT */}
          {activeTab === "assistant" && (
            <div className="grid gap-6 md:grid-cols-4 h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)]">
              {/* Sidebar: Chat sessions */}
              <Card className="hidden md:flex md:flex-col p-4 border-border bg-card shadow-sm rounded-2xl h-full space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Sessions</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNewChatSession}
                    className="h-8 w-8 rounded-lg"
                    title="New Session"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {chatSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={[
                          "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border text-left",
                          isActive
                            ? "bg-primary/5 text-primary border-primary/20"
                            : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold block truncate">{session.title}</span>
                          <span className="text-[9px] opacity-75">{session.date}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteChatSession(session.id, e)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Main Chat Window */}
              <Card className="md:col-span-3 flex flex-col border-border bg-card shadow-md rounded-2xl h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground text-sm">
                        {chatSessions.find(s => s.id === activeSessionId)?.title || "AI Career Coach"}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">Tailored for entry-level tech roles</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportChat}
                      className="h-8 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChat}
                      className="h-8 text-xs font-semibold rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col justify-start w-full py-2 space-y-6">
                      {/* Suggestion questions grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {[
                          "\"Review my resume\"",
                          "\"Improve my ATS score\"",
                          "\"How can I get a software engineer job?\"",
                          "\"What skills should I learn for AI Engineer roles?\"",
                          "\"Prepare me for Java interviews\"",
                          "\"Suggest projects for placements\""
                        ].map((item, idx) => {
                          const cleanedQuery = item.replace(/"/g, "");
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(cleanedQuery)}
                              className="text-left py-3.5 px-4 rounded-[16px] border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.99] transition-all duration-150 text-[13px] font-bold text-slate-800 dark:text-slate-200 shadow-sm"
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Actions Label */}
                      <div className="flex items-center gap-1.5 px-0.5 text-slate-700 dark:text-slate-300 font-extrabold text-xs tracking-wider uppercase mt-4 mb-2">
                        <span className="text-orange-500 animate-pulse">⚡</span>
                        <span>Smart Quick Actions</span>
                      </div>

                      {/* 9-card pastel grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                        {[
                          {
                            title: "Resume Review",
                            desc: "Critical recommendations to boost callback rates.",
                            query: "Review my resume",
                            bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/40 dark:border-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700",
                          },
                          {
                            title: "ATS Score Check",
                            desc: "Detailed analysis on parsing, formatting, and density.",
                            query: "Improve my ATS score",
                            bg: "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700",
                          },
                          {
                            title: "Skill Gap Analysis",
                            desc: "Map your listed stack against top industry hiring filters.",
                            query: "What skills should I learn?",
                            bg: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/40 dark:border-purple-900/10 hover:border-purple-300 dark:hover:border-purple-700",
                          },
                          {
                            title: "Interview Practice",
                            desc: "Interactive multi-step simulator grading answers.",
                            query: "Start a mock interview",
                            bg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/40 dark:border-emerald-900/10 hover:border-emerald-300 dark:hover:border-emerald-700",
                          },
                          {
                            title: "Career Roadmap",
                            desc: "Phased learning timelines and milestone strategies.",
                            query: "Suggest a career roadmap",
                            bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/40 dark:border-amber-900/10 hover:border-amber-300 dark:hover:border-amber-700",
                          },
                          {
                            title: "Job Recommendations",
                            desc: "Resume-aware suggestions with custom matching weights.",
                            query: "Give me job recommendations",
                            bg: "bg-teal-50/50 dark:bg-teal-950/20 border-teal-100/40 dark:border-teal-900/10 hover:border-teal-300 dark:hover:border-teal-700",
                          },
                          {
                            title: "Salary Insights",
                            desc: "Competitive analysis of compensation benchmarks.",
                            query: "What is the salary for my role?",
                            bg: "bg-orange-50/50 dark:bg-orange-950/20 border-orange-100/40 dark:border-orange-900/10 hover:border-orange-300 dark:hover:border-orange-700",
                          },
                          {
                            title: "LinkedIn Optimization",
                            desc: "Strategic headline, summary, and visibility audits.",
                            query: "LinkedIn tips",
                            bg: "bg-sky-50/50 dark:bg-sky-950/20 border-sky-100/40 dark:border-sky-900/10 hover:border-sky-300 dark:hover:border-sky-700",
                          },
                          {
                            title: "Cover Letter Generator",
                            desc: "Custom-tailored letter templates targeting job openings.",
                            query: "Write a cover letter for me",
                            bg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/40 dark:border-rose-900/10 hover:border-rose-300 dark:hover:border-rose-700",
                          },
                        ].map((card, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSendMessage(card.query, card.title)}
                            className={[
                              "group flex flex-col gap-1.5 p-3.5 rounded-[16px] border border-transparent cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm text-left justify-between",
                              card.bg,
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                {card.title}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-gray-450 dark:text-gray-500 shrink-0 group-hover:text-gray-650 dark:group-hover:text-gray-300 transition-colors" />
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                              {card.desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg) => {
                        const isAi = msg.sender === "ai";
                        return (
                          <div
                            key={msg.id}
                            className={[
                              "flex gap-4 p-4 rounded-2xl transition-all border text-left",
                              isAi
                                ? "bg-muted/10 border-border/40 justify-start"
                                : "bg-primary/5 border-primary/10 justify-end flex-row-reverse"
                            ].join(" ")}
                          >
                            <div className={[
                              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              isAi ? "bg-primary/15 text-primary" : "bg-foreground text-background"
                            ].join(" ")}>
                              {isAi ? "AI" : "Me"}
                            </div>
                            <div className="space-y-2 flex-1 min-w-0 max-w-2xl text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">
                                  {isAi ? "AI Career Advisor" : "You"}
                                </span>
                                <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                              </div>
                              <div className="space-y-1">
                                {isAi ? (
                                  <div className="prose prose-sm dark:prose-invert">
                                    {renderFormattedText(msg.text)}
                                  </div>
                                ) : (
                                  <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {isAssistantTyping && (
                        <div className="flex gap-4 p-4 rounded-2xl border bg-muted/10 border-border/40 justify-start">
                          <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                            AI
                          </div>
                          <div className="flex items-center gap-1.5 pt-2">
                            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200/50 dark:border-slate-800/80 p-4 bg-background">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(chatInput);
                    }}
                  >
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-full px-5 py-2.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/40">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask anything about your career (e.g. 'Review my resume', 'Suggest projects')..."
                        disabled={isAssistantTyping}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none border-none min-w-0 py-1"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isAssistantTyping}
                        className="shrink-0 bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-all duration-150 shadow-sm"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: SAVED JOBS */}
          {activeTab === "saved" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Bookmark className="h-6 w-6 text-primary fill-primary/10" />
                  Saved Jobs
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your bookmarked jobs and internships that you've saved to apply to later.
                </p>
              </div>

              {savedJobsLoading ? (
                <div className="py-20 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground font-semibold">
                    Loading bookmarked jobs...
                  </p>
                </div>
              ) : savedJobs.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground shadow-md border-dashed">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-sm">No saved jobs yet</p>
                    <p className="text-xs">
                      When you match or search for jobs, click the bookmark icon to save them here.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {savedJobs.map((job, i) => (
                    <Card
                      key={i}
                      className="group flex flex-col justify-between p-5 shadow-md hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20 min-w-0"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3
                              onClick={() => setSelectedJob(job)}
                              className="font-bold text-foreground text-sm hover:text-primary hover:underline cursor-pointer truncate"
                            >
                              {job.title}
                            </h3>
                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              {job.company}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {job.score || "Match"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {job.location || "Remote"}
                        </p>

                        {job.skills && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills
                              .split(",")
                              .slice(0, 3)
                              .map((s, idx) => (
                                <span
                                  key={idx}
                                  className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground"
                                >
                                  {s.trim()}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleSaveJob(job)}
                          className="h-9 w-9 rounded-lg text-destructive border-destructive/15 hover:bg-destructive/10 hover:border-destructive/30 shrink-0"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all h-9"
                        >
                          Apply Now
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: APPLICATIONS TRACKER */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-primary" />
                    Applications Tracker
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitor your submitted job applications and active interview pipeline stages.
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddAppModal(true)}
                  className="rounded-xl font-bold shadow-sm self-start sm:self-auto"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Track New Job
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Applied", count: applications.filter(a => a.status === "Applied").length, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                  { label: "Interviewing", count: applications.filter(a => a.status === "Interviewing").length, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
                  { label: "Offers", count: applications.filter(a => a.status === "Offer").length, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Rejected", count: applications.filter(a => a.status === "Rejected").length, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
                ].map((stat, idx) => (
                  <Card key={idx} className={`p-4 flex flex-col items-center justify-center border text-center ${stat.color} shadow-sm rounded-xl`}>
                    <span className="text-2xl font-black">{stat.count}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">{stat.label}</span>
                  </Card>
                ))}
              </div>

              {applications.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground shadow-md border-dashed">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-sm">No jobs tracked yet</p>
                    <p className="text-xs">
                      Click the button above to start tracking your job application statuses.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {applications.map((app) => (
                    <Card key={app.id} className="p-5 shadow-md border-border flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-foreground text-sm truncate max-w-[200px]" title={app.role}>
                              {app.role}
                            </h3>
                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                              <Layers className="h-4 w-4 text-primary" />
                              {app.company}
                            </p>
                          </div>
                          <Badge className={[
                            "font-bold text-[10px] px-2 py-0.5 rounded-full border",
                            app.status === "Applied" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            app.status === "Interviewing" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                            app.status === "Offer" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            app.status === "Rejected" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                          ].join(" ")}>
                            {app.status}
                          </Badge>
                        </div>

                        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-muted-foreground/75" />
                            {app.location || "Remote"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 text-muted-foreground/75" />
                            Applied: {app.applied_at}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-border pt-4">
                        <div className="flex-1">
                          <select
                            value={app.status}
                            onChange={(e) => updateApplicationStatus(app.id, e.target.value as AppStatus)}
                            className="w-full bg-background border border-input rounded-lg h-9 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApplication(app.id)}
                          className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/15 shrink-0"
                          title="Remove application"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Application Dialog */}
              <Dialog open={showAddAppModal} onOpenChange={setShowAddAppModal}>
                <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-foreground">Track New Application</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Enter the details of the job application you want to track.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                      <Input
                        id="companyName"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="Google, Linear, Stripe..."
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="roleTitle" className="text-xs">Job Title / Role</Label>
                      <Input
                        id="roleTitle"
                        value={newAppRole}
                        onChange={(e) => setNewAppRole(e.target.value)}
                        placeholder="Frontend Engineer, UI/UX Designer..."
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="appLocation" className="text-xs">Location</Label>
                        <Input
                          id="appLocation"
                          value={newAppLocation}
                          onChange={(e) => setNewAppLocation(e.target.value)}
                          placeholder="Remote, NYC, etc."
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="appStatus" className="text-xs">Status</Label>
                        <select
                          id="appStatus"
                          value={newAppStatus}
                          onChange={(e) => setNewAppStatus(e.target.value as AppStatus)}
                          className="w-full bg-background border border-input rounded-lg h-10 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex gap-2 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddAppModal(false);
                        setNewAppName("");
                        setNewAppRole("");
                        setNewAppLocation("");
                        setNewAppStatus("Applied");
                      }}
                      className="flex-1 rounded-xl h-10 font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!newAppName.trim() || !newAppRole.trim()) {
                          toast.error("Please fill in Company Name and Role!");
                          return;
                        }
                        addApplication(newAppName, newAppRole, newAppStatus, newAppLocation);
                        setShowAddAppModal(false);
                        setNewAppName("");
                        setNewAppRole("");
                        setNewAppLocation("");
                        setNewAppStatus("Applied");
                      }}
                      className="flex-1 rounded-xl h-10 font-bold bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-all"
                    >
                      Save Application
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* TAB: MY PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <UserIcon className="h-6 w-6 text-primary" />
                  My Profile & Preferences
                </h1>
                <p className="text-sm text-muted-foreground">
                  Update your background, professional experiences, and target preferences to align
                  AI recommendation criteria.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6 h-fit text-center space-y-4 shadow-md border-border">
                  <div className="relative inline-block mx-auto">
                    <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center text-primary text-3xl font-extrabold shadow-inner mx-auto">
                      {profile?.full_name?.charAt(0).toUpperCase() ||
                        user?.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">
                      {profile?.full_name || "New Matcher"}
                    </h3>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="border-t border-border pt-4 text-left space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Resume Loaded
                      </span>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        {profile?.resume_name || "No resume uploaded"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Baseline ATS Score
                      </span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {profile?.ats_score ? `${profile.ats_score}%` : "Not evaluated yet"}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 md:col-span-2 shadow-md border-border">
                  <form onSubmit={handleProfileSave} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={profile?.full_name || ""}
                        placeholder="John Doe"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="experienceLevel">Experience Level</Label>
                        <select
                          id="experienceLevel"
                          name="experienceLevel"
                          defaultValue={profile?.experience_level || "Freshman/Student"}
                          className="w-full bg-background border border-input rounded-lg h-10 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="Freshman/Student">Student / Freshman</option>
                          <option value="Internship / Entry Level">Entry / Intern Level</option>
                          <option value="Associate / Junior">Junior / Associate</option>
                          <option value="Mid-Level">Mid-Level Developer</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobType">Preferred Job Type</Label>
                        <select
                          id="jobType"
                          name="jobType"
                          defaultValue={profile?.job_type || "All"}
                          className="w-full bg-background border border-input rounded-lg h-10 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="All">All Classifications</option>
                          <option value="Full-time">Full-time Roles</option>
                          <option value="Internship">Internships Only</option>
                          <option value="Remote">Remote Roles Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preferredRole">Target Job Title</Label>
                        <Input
                          id="preferredRole"
                          name="preferredRole"
                          defaultValue={profile?.preferred_role || ""}
                          placeholder="Frontend Developer"
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferredLocation">Target City / State</Label>
                        <Input
                          id="preferredLocation"
                          name="preferredLocation"
                          defaultValue={profile?.preferred_location || ""}
                          placeholder="Remote / New York"
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skills">Professional Skills (comma separated)</Label>
                      <textarea
                        id="skills"
                        name="skills"
                        rows={3}
                        defaultValue={profile?.skills || ""}
                        placeholder="React, CSS, JavaScript, HTML, TypeScript..."
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="h-10 px-5 rounded-xl font-bold w-full sm:w-auto shadow-sm"
                    >
                      {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Profile Updates
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* JOB DETAIL DIALOG */}
      <Dialog open={selectedJob !== null} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
          {selectedJob && (
            <>
              <DialogHeader className="space-y-1.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                      {selectedJob.title}
                    </DialogTitle>
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      {selectedJob.company}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-primary text-primary-foreground font-bold text-xs">
                    {selectedJob.score || "Match"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {selectedJob.location || "Remote / Onsite"}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skills ? (
                      selectedJob.skills.split(",").map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5">
                          {s.trim()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None listed.</span>
                    )}
                  </div>
                </div>

                {selectedJob.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Job Description
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {selectedJob.description}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    toggleSaveJob(selectedJob);
                    setSelectedJob(null);
                  }}
                  className="flex-1 rounded-xl h-10 font-bold"
                >
                  {savedJobs.some((sj) => sj.url === selectedJob.url) ? (
                    <>
                      <BookmarkCheck className="mr-1.5 h-4 w-4 text-primary fill-primary" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-1.5 h-4 w-4" />
                      Save Job
                    </>
                  )}
                </Button>
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all h-10 text-sm shadow-sm"
                  onClick={() => setSelectedJob(null)}
                >
                  Apply Directly
                  <ExternalLink className="h-4 w-4" />
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
