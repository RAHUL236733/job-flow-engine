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
  matchReasons?: string[];
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

type UserStats = {
  user_id: string;
  jobs_matched: number;
  applications_sent: number;
  saved_jobs: number;
  profile_score: number;
  ats_match_rank: number;
  resume_uploaded: boolean;
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

const normalizeResumeData = (raw: any): any => {
  if (!raw) return { skills: [], roles: [], experience: "", keywords: [] };
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse resumeData string:", e);
      return { skills: [], roles: [], experience: "", keywords: [] };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { skills: [], roles: [], experience: "", keywords: [] };
  }

  const getArr = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const getStr = (val: any): string => {
    if (!val) return "";
    if (Array.isArray(val)) return val.join("\n");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return {
    skills: getArr(parsed.skills || []),
    roles: getArr(parsed.roles || parsed.targetRoles || []),
    experience: getStr(parsed.experience || parsed.experienceProfile || parsed.workHistory || ""),
    keywords: getArr(parsed.keywords || [])
  };
};

const normalizeCareerAnalysis = (raw: any): any => {
  if (!raw) {
    return {
      resumeReview: "",
      atsScore: { score: 0, feedback: "" },
      skillGapAnalysis: "",
      salaryInsights: "",
      careerRoadmap: "",
      linkedinOptimization: "",
      interviewPractice: "",
      coverLetter: "",
      keywords: []
    };
  }
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse careerAnalysis string:", e);
      return {
        resumeReview: "",
        atsScore: { score: 0, feedback: "" },
        skillGapAnalysis: "",
        salaryInsights: "",
        careerRoadmap: "",
        linkedinOptimization: "",
        interviewPractice: "",
        coverLetter: "",
        keywords: []
      };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      resumeReview: "",
      atsScore: { score: 0, feedback: "" },
      skillGapAnalysis: "",
      salaryInsights: "",
      careerRoadmap: "",
      linkedinOptimization: "",
      interviewPractice: "",
      coverLetter: "",
      keywords: []
    };
  }

  const getStr = (val: any): string => {
    if (!val) return "";
    if (Array.isArray(val)) return val.join("\n");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const getArr = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const atsScoreObj = parsed.atsScore || {};
  let atsScoreScore = 0;
  let atsScoreFeedback = "";

  if (typeof atsScoreObj === "object" && atsScoreObj !== null) {
    atsScoreScore = atsScoreObj.score !== undefined ? atsScoreObj.score : 0;
    atsScoreFeedback = getStr(atsScoreObj.feedback);
  } else if (typeof atsScoreObj === "number") {
    atsScoreScore = atsScoreObj;
  } else if (typeof atsScoreObj === "string") {
    atsScoreScore = parseInt(atsScoreObj, 10) || 0;
  }

  return {
    resumeReview: getStr(parsed.resumeReview || parsed.review),
    atsScore: {
      score: typeof atsScoreScore === "number" && !isNaN(atsScoreScore) ? atsScoreScore : 0,
      feedback: atsScoreFeedback
    },
    skillGapAnalysis: getStr(parsed.skillGapAnalysis || parsed.skillGap || parsed.gaps),
    salaryInsights: getStr(parsed.salaryInsights || parsed.salaries || parsed.salary),
    careerRoadmap: getStr(parsed.careerRoadmap || parsed.roadmap || parsed.milestones),
    linkedinOptimization: getStr(parsed.linkedinOptimization || parsed.linkedin || parsed.profileTips),
    interviewPractice: getStr(parsed.interviewPractice || parsed.interviewQuestions || parsed.prep),
    coverLetter: getStr(parsed.coverLetter || parsed.coverLetterTemplate || parsed.letter),
    keywords: getArr(parsed.keywords || [])
  };
};

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
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
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
    return saved ? JSON.parse(saved) : [];
  });

  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppRole, setNewAppRole] = useState("");
  const [newAppLocation, setNewAppLocation] = useState("");
  const [newAppStatus, setNewAppStatus] = useState<AppStatus>("Applied");

  const saveApplications = (apps: Application[]) => {
    setApplications(apps);
    localStorage.setItem("user_applications", JSON.stringify(apps));

    if (user) {
      setUserStats(prev => {
        if (!prev) return prev;
        const updatedStats = { ...prev, applications_sent: apps.length };
        if (isMockMode) {
          localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
        } else {
          supabase
            .from("user_stats")
            .update({ applications_sent: apps.length })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync applications count:", error);
            });
        }
        return updatedStats;
      });
    }
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
  const [internships, setInternships] = useState<Job[]>([]);
  const [resumeData, setResumeData] = useState<any>(normalizeResumeData(null));
  const [careerAnalysis, setCareerAnalysis] = useState<any>(normalizeCareerAnalysis(null));
  const [resultsSubTab, setResultsSubTab] = useState<"jobs" | "resume" | "career" | "tools">("jobs");
  const [atsScore, setAtsScore] = useState<number>(0);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // --- USER STATISTICS STATE ---
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const initialLoadsRef = useRef({ userStatsFetched: false });

  const fetchUserStats = useCallback(async (force = false) => {
    if (!user) return;
    if (initialLoadsRef.current.userStatsFetched && !force) return;

    setUserStatsLoading(true);

    if (isMockMode) {
      const cached = localStorage.getItem(`mock_user_stats_${user.id}`);
      if (cached) {
        setUserStats(JSON.parse(cached));
      } else {
        const defaultStats: UserStats = {
          user_id: user.id,
          jobs_matched: 0,
          applications_sent: 0,
          saved_jobs: 0,
          profile_score: 0,
          ats_match_rank: 0,
          resume_uploaded: false,
        };
        setUserStats(defaultStats);
        localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(defaultStats));
      }
      setUserStatsLoading(false);
      initialLoadsRef.current.userStatsFetched = true;
      return;
    }

    try {
      let { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const defaultStats = {
          user_id: user.id,
          jobs_matched: 0,
          applications_sent: 0,
          saved_jobs: 0,
          profile_score: 0,
          ats_match_rank: 0,
          resume_uploaded: false,
        };
        const { data: inserted, error: insertError } = await supabase
          .from("user_stats")
          .insert(defaultStats)
          .select("*")
          .single();

        if (insertError) {
          console.error("Failed to auto-insert user stats row:", insertError);
          data = defaultStats;
        } else {
          data = inserted;
        }
      }

      setUserStats(data as UserStats);
      initialLoadsRef.current.userStatsFetched = true;
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    } finally {
      setUserStatsLoading(false);
    }
  }, [user, isMockMode]);

  const syncProfileScore = useCallback(async () => {
    if (!user) return;

    const hasName = !!(profile?.full_name?.trim());
    const hasEmail = !!(user?.email?.trim());
    const hasSkills = !!(profile?.skills?.trim() || parsedSkills.length > 0);

    setUserStats(prev => {
      if (!prev) return prev;
      const hasResume = !!(prev.resume_uploaded || profile?.resume_name || profile?.resume_url);

      let calculatedScore = 0;
      if (hasName) calculatedScore += 20;
      if (hasEmail) calculatedScore += 20;
      if (hasResume) calculatedScore += 30;
      if (hasSkills) calculatedScore += 30;

      if (calculatedScore !== prev.profile_score) {
        const updatedStats = { ...prev, profile_score: calculatedScore };

        if (isMockMode) {
          localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
        } else {
          supabase
            .from("user_stats")
            .update({ profile_score: calculatedScore })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync profile score:", error);
            });
        }
        return updatedStats;
      }
      return prev;
    });
  }, [user, profile, parsedSkills, isMockMode]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // --- DATABASE HELPERS ---
  const loadCachedResumeResults = useCallback(async () => {
    if (!user) return;

    // Load comprehensive data from localStorage first
    const extendedCached = localStorage.getItem(`ai_job_matcher_extended_results_${user.id}`);
    if (extendedCached) {
      try {
        const parsed = JSON.parse(extendedCached);
        const normResumeData = normalizeResumeData(parsed.resumeData);
        const normCareerAnalysis = normalizeCareerAnalysis(parsed.careerAnalysis);
        setJobs(parsed.jobs || []);
        setInternships(parsed.internships || []);
        setResumeData(normResumeData);
        setCareerAnalysis(normCareerAnalysis);
        setAtsScore(Number(parsed.atsScore) || normCareerAnalysis.atsScore?.score || 0);
        setParsedSkills(parsed.skills || normResumeData.skills || []);
        setMatcherPhase("results");

        setUserStats(prev => {
          if (!prev) return prev;
          const updatedStats = {
            ...prev,
            resume_uploaded: true,
            ats_match_rank: Number(parsed.atsScore) || normCareerAnalysis.atsScore?.score || 0,
            jobs_matched: (parsed.jobs || []).length,
          };
          return updatedStats;
        });
        return;
      } catch (err) {
        console.error("Extended cache parsing error:", err);
      }
    }

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
          const normResumeData = normalizeResumeData(parsed.resumeData);
          const normCareerAnalysis = normalizeCareerAnalysis(parsed.careerAnalysis);
          setJobs(parsed.jobs || []);
          setInternships(parsed.internships || []);
          setResumeData(normResumeData);
          setCareerAnalysis(normCareerAnalysis);
          setAtsScore(Number(parsed.atsScore) || normCareerAnalysis.atsScore?.score || 75);
          setParsedSkills(parsed.skills || normResumeData.skills || []);
          setMatcherPhase("results");

          setUserStats(prev => {
            if (!prev) return prev;
            const updatedStats = {
              ...prev,
              resume_uploaded: true,
              ats_match_rank: Number(parsed.atsScore) || normCareerAnalysis.atsScore?.score || 75,
              jobs_matched: (parsed.jobs || []).length,
            };
            localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
            return updatedStats;
          });
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
        const cachedJobs = data.jobs as Job[];
        setJobs(cachedJobs);
        setMatcherPhase("results");

        // Retrieve latest ai_analysis from Supabase to populate resumeData & careerAnalysis states
        supabase
          .from("ai_analysis")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: analysisData, error: analysisErr }) => {
            if (!analysisErr && analysisData) {
              const reconstructedCareerAnalysis = {
                resumeReview: analysisData.resume_review?.content || "",
                atsScore: {
                  score: analysisData.ats_score?.score || 0,
                  feedback: analysisData.ats_score?.feedback || ""
                },
                skillGapAnalysis: analysisData.skill_gap_analysis?.content || "",
                salaryInsights: analysisData.salary_insights?.content || "",
                careerRoadmap: analysisData.career_roadmap?.content || "",
                linkedinOptimization: analysisData.linkedin_optimization?.content || "",
                interviewPractice: analysisData.interview_practice?.content || "",
                coverLetter: analysisData.cover_letter_generator?.content || "",
                keywords: []
              };
              
              setCareerAnalysis(reconstructedCareerAnalysis);
              setAtsScore(reconstructedCareerAnalysis.atsScore.score || profile?.ats_score || 75);
              
              // Also reconstruct resumeData
              const reconstructedResumeData = {
                skills: profile?.skills ? profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
                roles: [],
                experience: analysisData.resume_review?.content || "",
                keywords: []
              };
              setResumeData(reconstructedResumeData);
              if (reconstructedResumeData.skills.length > 0) {
                setParsedSkills(reconstructedResumeData.skills);
              }
            }
          });

        setUserStats(prev => {
          if (!prev) return prev;
          const updatedStats = {
            ...prev,
            resume_uploaded: true,
            ats_match_rank: profile?.ats_score || 75,
            jobs_matched: cachedJobs.length,
          };
          supabase
            .from("user_stats")
            .update({
              resume_uploaded: true,
              ats_match_rank: profile?.ats_score || 75,
              jobs_matched: cachedJobs.length,
            })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync resume cached stats:", error);
            });
          return updatedStats;
        });
      }
    } catch (err) {
      console.error("No active cache found", err);
    }
  }, [user, profile, isMockMode]);

  const cacheResumeResults = useCallback(
    async (
      jobsList: Job[],
      score: number,
      skillsList: string[],
      internshipsList?: Job[],
      rData?: any,
      cAnalysis?: any
    ) => {
      if (!user) return;

      const payload = {
        jobs: jobsList,
        atsScore: score,
        skills: skillsList,
        internships: internshipsList || [],
        resumeData: rData || {},
        careerAnalysis: cAnalysis || {}
      };

      // Store in localStorage for comprehensive retrieval on reload
      localStorage.setItem(`ai_job_matcher_extended_results_${user.id}`, JSON.stringify(payload));

      if (isMockMode) {
        localStorage.setItem(`mock_resume_results_${user.id}`, JSON.stringify(payload));
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
      const parsed = mockSaved ? JSON.parse(mockSaved) : [];
      setSavedJobs(parsed);
      setSavedJobsLoading(false);

      setUserStats(prev => {
        if (prev && prev.saved_jobs !== parsed.length) {
          const updatedStats = { ...prev, saved_jobs: parsed.length };
          localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
          return updatedStats;
        }
        return prev;
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;
      const parsed = (data as Job[]) || [];
      setSavedJobs(parsed);

      setUserStats(prev => {
        if (prev && prev.saved_jobs !== parsed.length) {
          const updated = { ...prev, saved_jobs: parsed.length };
          supabase
            .from("user_stats")
            .update({ saved_jobs: parsed.length })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync saved jobs count:", error);
            });
          return updated;
        }
        return prev;
      });
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

        setUserStats(prev => {
          if (!prev) return prev;
          const newSavedCount = Math.max(0, prev.saved_jobs + (isSaved ? -1 : 1));
          const updatedStats = { ...prev, saved_jobs: newSavedCount };
          localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
          return updatedStats;
        });
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

        setUserStats(prev => {
          if (!prev) return prev;
          const newSavedCount = Math.max(0, prev.saved_jobs + (isSaved ? -1 : 1));
          const updated = { ...prev, saved_jobs: newSavedCount };
          supabase
            .from("user_stats")
            .update({ saved_jobs: newSavedCount })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync saved job toggle stats:", error);
            });
          return updated;
        });
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
    if (!file || !user) return;

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

      // Debugging logs requested in requirement 9
      console.log("Raw API Response:", data);
      const apiData = Array.isArray(data) ? data[0] : data;
      console.log("Normalized Data:", apiData);

      let rawJobs: Job[] = apiData.topJobs || apiData.jobs || [];
      let rawInternships: Job[] = apiData.internships || [];

      // Map rawJobs to standard structure
      if (Array.isArray(rawJobs)) {
        rawJobs = rawJobs.map((item: any) => {
          let actualItem = item;
          if (item && typeof item === "object") {
            if ("json" in item) actualItem = item.json;
            else if ("body" in item) actualItem = item.body;
          }
          const reasons = Array.isArray(actualItem.matchReasons) ? actualItem.matchReasons : [];
          return {
            title: actualItem.title || "",
            company: actualItem.company || "",
            location: actualItem.location || "",
            skills: actualItem.skills || "",
            url: actualItem.applyLink || actualItem.url || "#",
            score: actualItem.matchScore !== undefined
              ? String(actualItem.matchScore)
              : (actualItem.score !== undefined ? String(actualItem.score) : "75"),
            description: actualItem.description || "",
            matchReasons: reasons
          };
        });
      } else {
        rawJobs = [];
      }

      // Map rawInternships to standard structure
      if (Array.isArray(rawInternships)) {
        rawInternships = rawInternships.map((item: any) => {
          let actualItem = item;
          if (item && typeof item === "object") {
            if ("json" in item) actualItem = item.json;
            else if ("body" in item) actualItem = item.body;
          }
          const reasons = Array.isArray(actualItem.matchReasons) ? actualItem.matchReasons : [];
          return {
            title: actualItem.title || "",
            company: actualItem.company || "",
            location: actualItem.location || "",
            skills: actualItem.skills || "",
            url: actualItem.applyLink || actualItem.url || "#",
            score: actualItem.matchScore !== undefined
              ? String(actualItem.matchScore)
              : (actualItem.score !== undefined ? String(actualItem.score) : "75"),
            description: actualItem.description || "",
            matchReasons: reasons
          };
        });
      } else {
        rawInternships = [];
      }

      const normResumeData = normalizeResumeData(apiData.resumeData);
      const normCareerAnalysis = normalizeCareerAnalysis(apiData.careerAnalysis);
      const derivedScore = normCareerAnalysis.atsScore?.score || 0;
      const derivedSkills = normResumeData.skills || [];

      clearTimers();
      setJobs(rawJobs);
      setInternships(rawInternships);
      setResumeData(normResumeData);
      setCareerAnalysis(normCareerAnalysis);
      setAtsScore(derivedScore);
      setParsedSkills(derivedSkills);
      setMatcherPhase("results");

      await cacheResumeResults(rawJobs, derivedScore, derivedSkills, rawInternships, normResumeData, normCareerAnalysis);

      if (!isMockMode) {
        try {
          // 1. Insert a resume session first
          const sessionPayload = {
            user_id: user.id,
            resume_name: file.name,
            status: "generated"
          };
          const { data: sessionData, error: sessionErr } = await supabase
            .from("resume_sessions")
            .insert(sessionPayload)
            .select("id")
            .single();

          if (sessionErr) {
            console.error("Failed to insert resume session:", sessionErr);
          } else if (sessionData) {
            // 2. Insert into ai_analysis
            const analysisPayload = {
              session_id: sessionData.id,
              user_id: user.id,
              resume_review: normCareerAnalysis.resumeReview ? { content: normCareerAnalysis.resumeReview } : null,
              ats_score: normCareerAnalysis.atsScore ? { score: normCareerAnalysis.atsScore.score, feedback: normCareerAnalysis.atsScore.feedback } : null,
              skill_gap_analysis: normCareerAnalysis.skillGapAnalysis ? { content: normCareerAnalysis.skillGapAnalysis } : null,
              interview_practice: normCareerAnalysis.interviewPractice ? { content: normCareerAnalysis.interviewPractice } : null,
              career_roadmap: normCareerAnalysis.careerRoadmap ? { content: normCareerAnalysis.careerRoadmap } : null,
              salary_insights: normCareerAnalysis.salaryInsights ? { content: normCareerAnalysis.salaryInsights } : null,
              linkedin_optimization: normCareerAnalysis.linkedinOptimization ? { content: normCareerAnalysis.linkedinOptimization } : null,
              cover_letter_generator: normCareerAnalysis.coverLetter ? { content: normCareerAnalysis.coverLetter } : null
            };

            const { error: analysisErr } = await supabase
              .from("ai_analysis")
              .insert(analysisPayload);

            if (analysisErr) {
              console.error("Failed to insert ai_analysis:", analysisErr);
            } else {
              console.log("Successfully stored AI analysis in database!");
            }
          }
        } catch (dbErr) {
          console.error("Database persistence error:", dbErr);
        }
      }

      await updateProfile({
        skills: derivedSkills.join(", "),
        ats_score: derivedScore,
        resume_name: file.name,
      });

      await incrementTrialsUsed();

      setUserStats(prev => {
        if (!prev) return prev;
        const updatedStats = {
          ...prev,
          resume_uploaded: true,
          ats_match_rank: derivedScore,
          jobs_matched: rawJobs.length,
        };
        if (isMockMode) {
          localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
        } else {
          supabase
            .from("user_stats")
            .update({
              resume_uploaded: true,
              ats_match_rank: derivedScore,
              jobs_matched: rawJobs.length,
            })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to update scan statistics:", error);
            });
        }
        return updatedStats;
      });
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

    // Build full response text based on action type
    const buildResponseText = () => {
      let aiResponseText = "";
      let isRoadmap = false;
      let roadmapData: ChatMessage["roadmapData"] = undefined;
      let isJobRecs = false;
      let jobRecsData: ChatMessage["jobRecsData"] = undefined;
      let isInterviewMode = false;
      let interviewScore: number | undefined = undefined;
      let interviewStrengths: string[] | undefined = undefined;
      let interviewImprovements: string[] | undefined = undefined;

      const userSkills = (parsedSkills && parsedSkills.length > 0)
        ? parsedSkills.join(", ")
        : (profile?.skills || "Python, React, CSS, JavaScript, HTML, TypeScript");
      const resumeName = profile?.resume_name || "";
      const name = profile?.full_name || "there";

      if (actionType === "Interview Practice" || promptText.toLowerCase().includes("interview") || assistantMode === "interview") {
        if (assistantMode !== "interview") {
          setAssistantMode("interview");
          setActiveInterviewStep(1);
          aiResponseText = `# 🚀 Technical Interview Practice Mode\n\nWelcome **${name}**! I will act as your technical interviewer today.\n\n---\n\n## Question 1\n\n**Explain REST APIs and how they handle statelessness.**\n\n> Please type your detailed answer below and I will evaluate it with a score, strengths, and improvement notes.`;
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
            aiResponseText = `# ✅ Evaluation — Question 1\n\nThank you for your response! Here is your custom evaluation report.\n\n---\n\n## Question 2\n\n**What is the difference between SQL and NoSQL databases, and when would you choose one over the other?**`;
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
            aiResponseText = `# ✅ Evaluation — Question 2\n\nSuperb database analysis! Here is your scoring report.\n\n---\n\n🎉 **You have completed your quick technical interview session!**\n\nClick **Clear Chat** or ask me any career questions to continue.`;
            setAssistantMode("chat");
            setActiveInterviewStep(0);
          }
        }
      } else if (actionType === "Career Roadmap" || promptText.toLowerCase().includes("roadmap") || promptText.toLowerCase().includes("become a")) {
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
        aiResponseText = `# 🗺️ Phased Career Roadmap — ${role}\n\nHere is a comprehensive learning curriculum tailored to help you transition into a **${role}** role. Estimated timeline: **6–12 Months**.`;
      } else if (actionType === "Job Recommendations" || promptText.toLowerCase().includes("recommend") || promptText.toLowerCase().includes("job")) {
        isJobRecs = true;
        jobRecsData = [
          { title: "AI Research Engineer", company: "Google DeepMind", score: 95, matchReason: "Highly matches your background in Generative AI, Python scripting, and FastAPI integrations." },
          { title: "Machine Learning Engineer", company: "Scale AI", score: 91, matchReason: "Excellent fit for your solid foundation in deep learning modeling and dataset pipelines." },
          { title: "Backend Engineer (FastAPI & Node)", company: "Vercel", score: 88, matchReason: "Matches your experience building scalable asynchronous REST APIs and backend routers." },
          { title: "Python Software Developer", company: "Stripe", score: 85, matchReason: "Perfect fit for your clean coding style, scripting expertise, and unit-testing systems." }
        ];
        aiResponseText = resumeName
          ? `# 💼 Personalized Job Recommendations\n\nBased on your resume **${resumeName}** and skills (**${userSkills}**), here are your top matched roles:`
          : `# 💼 Personalized Job Recommendations\n\n> ⚠️ No resume found. Upload one under **Job Matcher** for precision matching.\n\nBased on your profile skills (**${userSkills}**), here are the top roles for your background:`;
      } else if (actionType === "Resume Review" || promptText.toLowerCase().includes("resume")) {
        const reviewText = careerAnalysis?.resumeReview;
        if (reviewText && reviewText.trim().length > 0) {
          aiResponseText = `# 📝 Resume Review Report\n\nBased on your resume **${resumeName || "uploaded resume"}**, here is your personalized AI audit:\n\n---\n\n${reviewText}`;
        } else {
          aiResponseText = `# 📝 Resume Review Report\n\n${resumeName ? `I've thoroughly reviewed **${resumeName}** against current tech hiring standards.` : `Upload your resume under **Job Matcher** for a full audit.`}\n\n---\n\n## 🔑 Key Recommendations\n\n**1. Add Measurable Achievements**\nInstead of *"Built APIs using FastAPI"*, use *"Deployed 15+ asynchronous FastAPI endpoints, cutting response latency by 32%"*.\n\n**2. Incorporate Certifications**\nHighlight AWS Certified Cloud Practitioner, TensorFlow Developer, or similar validations prominently.\n\n**3. Use the STAR Framework**\nFrame all experience bullets using Situation → Task → Action → Result for maximum impact.\n\n**4. Optimize Keyword Density**\nEnsure your target tech stack (Docker, FastAPI, Kubernetes) appears 3–4× throughout the document.`;
        }
      } else if (actionType === "ATS Score Check" || promptText.toLowerCase().includes("ats")) {
        const score = atsScore || profile?.ats_score || 78;
        const feedbackText = careerAnalysis?.atsScore?.feedback;
        if (feedbackText && feedbackText.trim().length > 0) {
          aiResponseText = `# 🎯 ATS Suitability Audit\n\nYour current ATS scan score: **${score}%**\n\n---\n\n## Custom Optimization Recommendations\n\n${feedbackText}`;
        } else {
          aiResponseText = `# 🎯 ATS Suitability Audit\n\nYour current ATS (Applicant Tracking System) scan score: **${score}%**\n\n---\n\n## 🔧 Key Optimizations to Reach 95%+\n\n**• Keyword Density** — Target keywords (Docker, FastAPI, Vector DBs) should appear 3–4× in natural context.\n\n**• Format Compliance** — Avoid multi-column layouts, icons, and text boxes which confuse ATS parsers.\n\n**• Section Headers** — Use standard labels: "Professional Experience", "Technical Skills", "Education".\n\n**• File Format** — Submit text-based PDFs only. Avoid scanned image formats that skip indexing entirely.`;
        }
      } else if (actionType === "Skill Gap Analysis" || promptText.toLowerCase().includes("skill") || promptText.toLowerCase().includes("learn")) {
        const gapText = careerAnalysis?.skillGapAnalysis;
        if (gapText && gapText.trim().length > 0) {
          aiResponseText = `# 📊 Skill Gap Analysis\n\nHere is your personalized AI gap assessment:\n\n---\n\n${gapText}`;
        } else {
          aiResponseText = `# 📊 Skill Gap Analysis\n\nMapping your skills against top AI/Software engineering hiring standards:\n\n---\n\n## ✅ Your Current Strengths\n\n${userSkills.split(",").map(s => `- **${s.trim()}**`).join("\n")}\n\n---\n\n## 🚀 Priority Skills to Acquire Next\n\n**1. Docker & Kubernetes** — Essential for containerizing and deploying modern microservices.\n\n**2. AWS / Cloud Deployment** — Industry-standard platform for serverless and scalable architectures.\n\n**3. LangChain & LlamaIndex** — Critical for building Generative AI agents and RAG pipelines.\n\n**4. Vector Databases (Pinecone, pgvector)** — The backbone of modern LLM-powered search systems.\n\n> 💡 *Build a RAG app with FastAPI + LangChain + pgvector to master 3 of these in one project!*`;
        }
      } else if (actionType === "Salary Insights" || promptText.toLowerCase().includes("salary") || promptText.toLowerCase().includes("how much")) {
        const salaryText = careerAnalysis?.salaryInsights;
        if (salaryText && salaryText.trim().length > 0) {
          aiResponseText = `# 💵 Salary Insights\n\nBased on your profile and target roles:\n\n---\n\n${salaryText}`;
        } else {
          aiResponseText = `# 💵 Salary Insights Framework\n\nAverage annual compensation for top tech roles (US market):\n\n---\n\n## 🤖 AI / ML Engineer\n- **Entry:** $115,000 – $140,000\n- **Mid-Level:** $150,000 – $185,000\n- **Senior:** $190,000 – $240,000+\n\n## 💻 Full-Stack Developer\n- **Entry:** $85,000 – $110,000\n- **Mid-Level:** $120,000 – $155,000\n- **Senior:** $165,000 – $200,000\n\n## ☁️ DevOps / Cloud Engineer\n- **Entry:** $95,000 – $120,000\n- **Mid-Level:** $130,000 – $165,000\n- **Senior:** $175,000 – $220,000\n\n> 📌 *Total comp often includes equity, bonuses, and stock grants — negotiate for the full package!*`;
        }
      } else if (actionType === "LinkedIn Optimization" || promptText.toLowerCase().includes("linkedin")) {
        const linkedinText = careerAnalysis?.linkedinOptimization;
        if (linkedinText && linkedinText.trim().length > 0) {
          aiResponseText = `# 🌐 LinkedIn Profile Optimization\n\nYour personalized recruiter-magnet strategy:\n\n---\n\n${linkedinText}`;
        } else {
          aiResponseText = `# 🌐 LinkedIn Profile Optimization Guide\n\nTransform your LinkedIn into a recruiter magnet with these power moves:\n\n---\n\n**• Headline Formula**\nDon't write *"Student at University"*. Write: *"AI Engineer | Python · React · FastAPI | Building GenAI Solutions"*\n\n**• About Summary Structure**\nParagraph 1: Your passion and mission. Paragraph 2: Your primary tech stack. Paragraph 3: What you're building + CTA.\n\n**• Featured Section**\nPin your best project, resume PDF, or GitHub profile at the very top for instant visibility.\n\n**• Skills Section**\nList 50 skills — ensure your top 3 are high-volume keywords matched to your target roles.\n\n**• Consistency**\nYour LinkedIn headline, resume headline, and portfolio bio should all tell the same story.`;
        }
      } else if (actionType === "Cover Letter Generator" || promptText.toLowerCase().includes("cover letter")) {
        const letterText = careerAnalysis?.coverLetter;
        if (letterText && letterText.trim().length > 0) {
          aiResponseText = `# ✉️ Custom Cover Letter\n\nHere is your tailored cover letter, ready to personalize and send:\n\n---\n\n${letterText}\n\n---`;
        } else {
          aiResponseText = `# ✉️ Custom Cover Letter Generator\n\nHere is a professional, impact-driven cover letter template:\n\n---\n\n**Subject: Application for Software / AI Engineer Role**\n\nDear Hiring Team,\n\nI am writing to express my strong interest in this engineering role. With a robust foundation in **${userSkills}**, and hands-on experience delivering scalable applications, I am excited to contribute to your team's mission.\n\nIn my recent work, I designed and shipped asynchronous API systems with FastAPI, integrated Generative AI components, and collaborated across frontend and backend layers. This cross-functional experience allows me to bridge technical complexity with user-first delivery.\n\nI'd love the opportunity to discuss how my background aligns with your current roadmap. Thank you for your time and consideration.\n\nWarm regards,\n**${name}**\n${user?.email || ""}\n\n---`;
        }
      } else {
        aiResponseText = `# 🤖 AI Career Coach\n\nHello **${name}**! I'm here to accelerate your career journey.\n\n---\n\n**You asked:** *"${promptText}"*\n\n## 💡 General Career Advice\n\n**• Build Deployed Projects** — Deployed apps with live URLs impress hiring managers far more than local demos.\n\n**• Optimize Your GitHub** — Clean READMEs, consistent commits, and pinned repos signal professionalism immediately.\n\n**• Network Strategically** — Send 3–5 targeted LinkedIn messages weekly to engineers in your target field. This is how most referrals happen.\n\n**• Track Everything** — Use the **Applications Tracker** tab to monitor your pipeline and follow up consistently.\n\n> Ask me anything — resume feedback, salary negotiation, interview prep, or career planning!`;
      }

      return { aiResponseText, isRoadmap, roadmapData, isJobRecs, jobRecsData, isInterviewMode, interviewScore, interviewStrengths, interviewImprovements };
    };

    // Short artificial thinking delay, then stream word by word
    setTimeout(() => {
      const { aiResponseText, isRoadmap, roadmapData, isJobRecs, jobRecsData, isInterviewMode, interviewScore, interviewStrengths, interviewImprovements } = buildResponseText();

      const msgId = `msg-${Date.now()}-ai`;
      const words = aiResponseText.split(" ");
      let wordIdx = 0;
      let streamedText = "";

      // Initial typing indicator
      setIsAssistantTyping(false);

      // Insert placeholder message
      const placeholderMsg: ChatMessage = {
        id: msgId,
        sender: "ai",
        text: "",
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

      setChatMessages(prev => {
        const msgs = [...prev, placeholderMsg];
        localStorage.setItem(`ai_chat_messages_${activeSessionId}`, JSON.stringify(msgs));
        return msgs;
      });

      // Clear any previous streaming interval
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }

      streamingIntervalRef.current = setInterval(() => {
        if (wordIdx >= words.length) {
          clearInterval(streamingIntervalRef.current!);
          streamingIntervalRef.current = null;
          return;
        }
        streamedText += (wordIdx === 0 ? "" : " ") + words[wordIdx];
        wordIdx++;
        setChatMessages(prev => {
          const msgs = prev.map(m =>
            m.id === msgId ? { ...m, text: streamedText } : m
          );
          localStorage.setItem(`ai_chat_messages_${activeSessionId}`, JSON.stringify(msgs));
          return msgs;
        });
      }, 28);
    }, 600);
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

  const handleApplyClick = async (job: Job) => {
    if (!user) return;

    setUserStats(prev => {
      if (!prev) return prev;
      const newSentCount = prev.applications_sent + 1;
      const updatedStats = { ...prev, applications_sent: newSentCount };

      if (isMockMode) {
        localStorage.setItem(`mock_user_stats_${user.id}`, JSON.stringify(updatedStats));
      } else {
        supabase
          .from("user_stats")
          .update({ applications_sent: newSentCount })
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) console.error("Failed to increment applications sent:", error);
          });
      }
      return updatedStats;
    });

    const alreadyTracked = applications.some(app => app.company.toLowerCase() === job.company.toLowerCase() && app.role.toLowerCase() === job.title.toLowerCase());
    if (!alreadyTracked) {
      addApplication(job.company, job.title, "Applied", job.location);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user, fetchUserStats]);

  useEffect(() => {
    if (user && userStats) {
      syncProfileScore();
    }
  }, [user, !!userStats, profile, parsedSkills, syncProfileScore]);

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
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    const parseInline = (content: string, keyPrefix: string) => {
      // Parse bold (**text**) and italic (*text*) inline
      const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
      return parts.map((part, pidx) => {
        const k = `${keyPrefix}-${pidx}`;
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={k} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return <em key={k} className="italic text-muted-foreground">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={k} className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-primary">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // H1: # heading
      if (line.startsWith("# ")) {
        elements.push(
          <h2 key={idx} className="text-[22px] font-black text-foreground tracking-tight mt-5 mb-3 first:mt-1 leading-tight">
            {line.replace(/^# /, "")}
          </h2>
        );
        continue;
      }
      // H2: ## heading
      if (line.startsWith("## ")) {
        elements.push(
          <h3 key={idx} className="text-[16px] font-extrabold text-foreground tracking-tight mt-4 mb-2 border-b border-border/30 pb-1">
            {line.replace(/^## /, "")}
          </h3>
        );
        continue;
      }
      // H3: ### heading
      if (line.startsWith("### ")) {
        elements.push(
          <h4 key={idx} className="text-[14px] font-bold text-foreground mt-3 mb-1.5">
            {line.replace(/^### /, "")}
          </h4>
        );
        continue;
      }
      // Horizontal rule
      if (line.trim() === "---") {
        elements.push(<hr key={idx} className="border-border/40 my-3" />);
        continue;
      }
      // Blockquote: > text
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={idx} className="border-l-4 border-primary/40 pl-3 py-1 my-2 bg-primary/5 rounded-r-lg">
            <p className="text-sm text-muted-foreground italic">{parseInline(line.replace(/^> /, ""), `bq-${idx}`)}</p>
          </blockquote>
        );
        continue;
      }
      // Ordered list: 1. item
      if (/^\d+\.\s/.test(line)) {
        elements.push(
          <div key={idx} className="flex gap-2 items-start mt-1.5">
            <span className="text-primary font-bold text-xs mt-0.5 shrink-0">{line.match(/^(\d+)\./)![1]}.</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{parseInline(line.replace(/^\d+\.\s/, ""), `ol-${idx}`)}</p>
          </div>
        );
        continue;
      }
      // Unordered list: - item or • item or * item
      if (/^[-•*]\s/.test(line)) {
        elements.push(
          <div key={idx} className="flex gap-2 items-start mt-1.5">
            <span className="text-primary font-black text-sm mt-0 shrink-0">•</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{parseInline(line.replace(/^[-•*]\s/, ""), `ul-${idx}`)}</p>
          </div>
        );
        continue;
      }
      // Empty line
      if (line.trim() === "") {
        elements.push(<div key={idx} className="h-1" />);
        continue;
      }
      // Default paragraph
      elements.push(
        <p key={idx} className="text-sm text-muted-foreground leading-relaxed mt-1">
          {parseInline(line, `p-${idx}`)}
        </p>
      );
    }

    return elements;
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
                    Welcome, <span className="text-[#3b82f6]">{profile?.full_name || "Rahul"}</span> 👋
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl font-medium leading-relaxed">
                    Ready to find your next opportunity? Scan your resume, scrape live job boards, and track your applications.
                  </p>
                </div>
                <div className="mt-6 md:mt-0 md:ml-6 w-full md:w-64 shrink-0">
                  <div className="bg-white/80 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-[20px] p-4 space-y-2.5 shadow-sm text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                      <span>Resume Status</span>
                      <span className={userStats?.resume_uploaded ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-slate-400"}>
                        {userStats?.resume_uploaded ? "Uploaded ✓" : "Not Uploaded ❌"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                      <span>ATS Match Rank</span>
                      <span className="font-bold text-primary dark:text-blue-400">
                        {userStats?.ats_match_rank ? `${userStats.ats_match_rank}%` : "0%"}
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
                    value: String(userStats?.jobs_matched ?? 0),
                    icon: Sparkles,
                    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/20"
                  },
                  {
                    title: "APPLICATIONS SENT",
                    value: String(userStats?.applications_sent ?? 0),
                    icon: Briefcase,
                    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-100/50 dark:border-purple-900/20"
                  },
                  {
                    title: "SAVED JOBS",
                    value: String(userStats?.saved_jobs ?? 0),
                    icon: Bookmark,
                    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-100/50 dark:border-amber-900/20"
                  },
                  {
                    title: "PROFILE SCORE",
                    value: `${userStats?.profile_score ?? 0}%`,
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

                {/* AI Career Coach Launcher */}
                <Card className="p-6 border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm rounded-[24px] text-left flex flex-col gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">AI Career Coach</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Click any tool to chat instantly</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "ATS Audit", icon: "🎯", action: "ATS Score Check", query: "Check my ATS score" },
                      { label: "Resume Review", icon: "📝", action: "Resume Review", query: "Review my resume" },
                      { label: "Skill Gap", icon: "📊", action: "Skill Gap Analysis", query: "Analyze my skill gaps" },
                      { label: "Roadmap", icon: "🗺️", action: "Career Roadmap", query: "Give me a career roadmap" },
                      { label: "Interview Prep", icon: "🚀", action: "Interview Practice", query: "Start a mock interview" },
                      { label: "Salary Info", icon: "💵", action: "Salary Insights", query: "What is the salary for my role?" },
                    ].map((tool, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab("assistant");
                          setTimeout(() => handleSendMessage(tool.query, tool.action), 50);
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-sm text-left"
                      >
                        <span className="text-base shrink-0">{tool.icon}</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{tool.label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab("assistant")}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Open AI Coach
                    <ChevronRight className="h-3 w-3" />
                  </button>
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
                  {/* Results Header with AI Coach Banner */}
                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-foreground">Get Deeper AI Analysis</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Your resume data is ready — ask the AI Coach for ATS audit, skill gaps, salary insights, and more.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("assistant")}
                        className="shrink-0 flex items-center gap-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-3 py-2 hover:opacity-90 transition-all active:scale-95"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        AI Coach
                      </button>
                    </div>
                  </div>

                  {/* TAB 1 PANEL: JOBS & INTERNSHIPS */}
                  {resultsSubTab === "jobs" && (
                    <div className="space-y-8 animate-in fade-in-50 duration-300">
                      {/* Top Jobs Matches Section */}
                      <div className="space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                              <Briefcase className="h-5 w-5 text-primary" />
                              Top Job Matches ({jobs.length})
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              Matching roles found via AI scraper, ranked by skillset compatibility.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setMatcherPhase("upload")}
                            className="rounded-xl shrink-0"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Scrape Again
                          </Button>
                        </div>

                        {jobs.length === 0 ? (
                          <Card className="p-10 text-center text-muted-foreground shadow-sm border-dashed">
                            No job matches found yet. Try uploading a different resume.
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
                                        {job.score}%
                                      </span>
                                    </div>

                                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      {job.location || "Remote"}
                                    </p>

                                    {job.matchReasons && job.matchReasons.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5 text-left">
                                        <h4 className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1">
                                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                                          Match Insights
                                        </h4>
                                        <ul className="space-y-1">
                                          {job.matchReasons.slice(0, 2).map((reason, idx) => (
                                            <li key={idx} className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1.5">
                                              <span className="text-primary shrink-0 mt-0.5">•</span>
                                              <span className="line-clamp-2">{reason}</span>
                                            </li>
                                          ))}
                                        </ul>
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
                                      onClick={() => handleApplyClick(job)}
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

                      {/* Top Internship Matches Section */}
                      <div className="space-y-4 pt-6 border-t border-border/60 text-left animate-in fade-in-50 duration-300">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-purple-500" />
                            Top Internship Matches ({internships.length})
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Live internship opportunities mapped to your skillset.
                          </p>
                        </div>

                        {internships.length === 0 ? (
                          <Card className="p-10 text-center text-muted-foreground shadow-sm border-dashed">
                            No internship matches found in this scan.
                          </Card>
                        ) : (
                          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {internships.map((internship, i) => {
                              const isBookmarked = savedJobs.some((sj) => sj.url === internship.url);
                              return (
                                <Card
                                  key={i}
                                  className="group flex flex-col justify-between p-5 shadow-md hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20 min-w-0"
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <h3
                                          onClick={() => setSelectedJob(internship)}
                                          className="font-bold text-foreground text-sm hover:text-primary hover:underline cursor-pointer truncate"
                                        >
                                          {internship.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                                          <Briefcase className="h-3 w-3 shrink-0" />
                                          {internship.company}
                                        </p>
                                      </div>
                                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                        {internship.score}%
                                      </span>
                                    </div>

                                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      {internship.location || "Remote"}
                                    </p>

                                    {internship.matchReasons && internship.matchReasons.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5 text-left">
                                        <h4 className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1">
                                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                                          Match Insights
                                        </h4>
                                        <ul className="space-y-1">
                                          {internship.matchReasons.slice(0, 2).map((reason, idx) => (
                                            <li key={idx} className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1.5">
                                              <span className="text-primary shrink-0 mt-0.5">•</span>
                                              <span className="line-clamp-2">{reason}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => toggleSaveJob(internship)}
                                      className="h-9 w-9 rounded-lg shrink-0"
                                    >
                                      {isBookmarked ? (
                                        <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                                      ) : (
                                        <Bookmark className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <a
                                      href={internship.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => handleApplyClick(internship)}
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

                  {/* TAB 2 PANEL: RESUME AUDIT */}
                  {resultsSubTab === "resume" && (
                    <div className="grid gap-6 md:grid-cols-3 text-left animate-in fade-in-50 duration-300">
                      {/* ATS SCORE CARD */}
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
                            ? "Excellent ATS suitability scan!"
                            : "Solid match, review the optimization suggestions below."}
                        </p>
                      </Card>

                      {/* SKILLS AND ROLES CARD */}
                      <Card className="p-6 md:col-span-2 shadow-md space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Extracted Skills
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedSkills.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No skills listed.</span>
                            ) : (
                              parsedSkills.map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold">
                                  {skill}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        {resumeData?.roles && Array.isArray(resumeData.roles) && resumeData.roles.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Target Roles
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              {resumeData.roles.map((role: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary font-bold">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {resumeData?.experience && (
                          <div className="space-y-1.5 pt-2 border-t border-border/40">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Experience Profile
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {typeof resumeData.experience === "string"
                                ? resumeData.experience
                                : Array.isArray(resumeData.experience)
                                  ? resumeData.experience.join(" | ")
                                  : JSON.stringify(resumeData.experience)}
                            </p>
                          </div>
                        )}

                        {((resumeData?.keywords && Array.isArray(resumeData.keywords) && resumeData.keywords.length > 0) ||
                          (careerAnalysis?.keywords && Array.isArray(careerAnalysis.keywords) && careerAnalysis.keywords.length > 0)) && (
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Important Keywords Added
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                ...(Array.isArray(resumeData?.keywords) ? resumeData.keywords : []),
                                ...(Array.isArray(careerAnalysis?.keywords) ? careerAnalysis.keywords : [])
                              ].map((keyword: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5 bg-muted/65 text-foreground/80 font-medium">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* RESUME REVIEW CARD */}
                      <Card className="p-6 md:col-span-3 shadow-md border-t border-primary/20 bg-muted/10">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          ATS Suitability &amp; Resume Review
                        </h3>
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-card p-4 rounded-xl border border-border/60">
                          {careerAnalysis?.resumeReview || careerAnalysis?.atsScore?.feedback || (
                            `Suggestions for improvement:
                            • Ensure keyword density represents target roles (e.g. FastAPI, Vector Databases, Python) 3-4 times.
                            • Convert generic bullet descriptions into quantitative statements showing impact (e.g., "improved query speeds by 30%").
                            • Avoid graphs, graphical tables, or colored columns to ensure scanner readability.`
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* TAB 3 PANEL: AI CAREER STRATEGY */}
                  {resultsSubTab === "career" && (
                    <div className="grid gap-6 md:grid-cols-2 text-left animate-in fade-in-50 duration-300">
                      {/* SKILL GAP ANALYSIS */}
                      <Card className="p-6 shadow-md border-t border-border flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
                            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 animate-pulse" />
                            Skill Gap Analysis
                          </h3>
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/40">
                            {careerAnalysis?.skillGapAnalysis || careerAnalysis?.skillGap || (
                              `No significant gaps detected! To boost call-backs for top-tier roles:
                              1. Focus on hands-on deployment (e.g., Vercel, AWS or Docker containers).
                              2. Build end-to-end portfolio projects that demonstrate database integrations.`
                            )}
                          </div>
                        </div>
                      </Card>

                      {/* SALARY INSIGHTS */}
                      <Card className="p-6 shadow-md border-t border-border flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
                            <Sparkles className="h-4 w-4 text-green-500 shrink-0" />
                            Salary Insights
                          </h3>
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/40">
                            {careerAnalysis?.salaryInsights || careerAnalysis?.salaries || (
                              `Average Industry Annual Expectations:
                              • AI / Machine Learning Engineer: $115,000 - $180,000+
                              • Full-Stack Engineer (React/FastAPI): $90,000 - $150,000
                              • Backend Developer (Node/Python): $85,000 - $140,000`
                            )}
                          </div>
                        </div>
                      </Card>

                      {/* CAREER ROADMAP */}
                      <Card className="p-6 md:col-span-2 shadow-md border-t border-border">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
                          <RotateCcw className="h-4 w-4 text-blue-500 shrink-0" />
                          AI Career Roadmap &amp; Milestones
                        </h3>
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-card p-4 rounded-xl border border-border/60">
                          {careerAnalysis?.careerRoadmap || careerAnalysis?.roadmap || (
                            `Milestones for career progression:
                            • Phase 1: Deepen foundational frameworks (React, FastAPI/Python, SQL databases).
                            • Phase 2: Create a live deployed full-stack project utilizing modern vector indexes.
                            • Phase 3: Optimize resume with parsed statistics and build outreach referrals on LinkedIn.`
                          )}
                        </div>
                      </Card>

                      {/* LINKEDIN OPTIMIZATION */}
                      <Card className="p-6 md:col-span-2 shadow-md border-t border-border">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
                          <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
                          LinkedIn Profile Optimization
                        </h3>
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-card p-4 rounded-xl border border-border/60">
                          {careerAnalysis?.linkedinOptimization || careerAnalysis?.linkedin || (
                            `Voted strategic tips to capture recruiter searches:
                            • Headline: "AI / Full-Stack Engineer | React, FastAPI, SQL | Building Scalable RAG Pipelines"
                            • Summary Section: Focus on quantitative capstone impact and standard technology keyword indexes.
                            • Skill Section: Add exact keyword targets (FastAPI, React, SQL, Vector Index, Python).`
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* TAB 4 PANEL: PREP & TOOLS */}
                  {resultsSubTab === "tools" && (
                    <div className="grid gap-6 md:grid-cols-2 text-left animate-in fade-in-50 duration-300">
                      {/* INTERVIEW PRACTICE */}
                      <Card className="p-6 shadow-md border-t border-border flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
                            <MessageSquare className="h-4 w-4 text-purple-500 shrink-0" />
                            Interview Practice Questions
                          </h3>
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/40 h-80 overflow-y-auto">
                            {careerAnalysis?.interviewPractice || careerAnalysis?.interviewQuestions || (
                              `Focus on these common technical interview targets:
                              1. Explain the stateless nature of REST APIs and how systems manage session data.
                              2. How do you implement database caching to speed up high-volume API requests?
                              3. Walk me through a full-stack project architecture and your favorite state-management patterns.`
                            )}
                          </div>
                        </div>
                      </Card>

                      {/* COVER LETTER GENERATOR */}
                      <Card className="p-6 shadow-md border-t border-border flex flex-col justify-between">
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-foreground flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              Custom Cover Letter Generator
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] font-bold rounded-lg"
                              onClick={() => {
                                const letter = careerAnalysis?.coverLetter || careerAnalysis?.coverLetterTemplate || "Dear Hiring Team...";
                                navigator.clipboard.writeText(letter);
                                toast.success("Cover letter copied to clipboard!");
                              }}
                            >
                              Copy Letter
                            </Button>
                          </h3>
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/40 h-80 overflow-y-auto font-mono">
                            {careerAnalysis?.coverLetter || careerAnalysis?.coverLetterTemplate || (
                              `Dear Hiring Manager,

                              I am writing to express my eager interest in the Engineering / AI developer position. With a strong background in frameworks like React, Node.js, and Python/FastAPI, I am confident in my capacity to add value to your codebase.

                              I look forward to discussing how my experience aligns with your current team projects.

                              Sincerely,
                              ${profile?.full_name || "Applicant"}`
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
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
                    <div className="space-y-5">
                      {chatMessages.map((msg) => {
                        const isAi = msg.sender === "ai";
                        return (
                          <div
                            key={msg.id}
                            className={[
                              "flex gap-3 text-left",
                              isAi ? "justify-start items-start" : "justify-end items-end flex-row-reverse"
                            ].join(" ")}
                          >
                            {/* Avatar */}
                            <div className={[
                              "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5 ring-2",
                              isAi
                                ? "bg-gradient-to-br from-primary/80 to-blue-500/80 text-white ring-primary/20"
                                : "bg-gradient-to-br from-slate-700 to-slate-900 text-white ring-slate-500/20 dark:from-slate-600 dark:to-slate-800"
                            ].join(" ")}>
                              {isAi ? "✦" : (profile?.full_name?.charAt(0).toUpperCase() || "U")}
                            </div>

                            {/* Bubble */}
                            <div className={[
                              "max-w-[82%] rounded-2xl px-5 py-4 space-y-1 shadow-sm",
                              isAi
                                ? "bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-tl-sm"
                                : "bg-primary text-primary-foreground rounded-tr-sm"
                            ].join(" ")}>
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={["text-[10px] font-extrabold tracking-wide", isAi ? "text-primary" : "text-primary-foreground/80"].join(" ")}>
                                  {isAi ? "✦ AI Career Coach" : "You"}
                                </span>
                                <span className={["text-[9px]", isAi ? "text-muted-foreground" : "text-primary-foreground/60"].join(" ")}>{msg.timestamp}</span>
                              </div>

                              {/* Content */}
                              {isAi ? (
                                <div className="space-y-0.5">
                                  {msg.text ? renderFormattedText(msg.text) : (
                                    <div className="flex items-center gap-1.5 py-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></span>
                                    </div>
                                  )}
                                  {/* Roadmap Cards */}
                                  {msg.isRoadmap && msg.roadmapData && (
                                    <div className="mt-4 space-y-2">
                                      {msg.roadmapData.map((phase, pIdx) => (
                                        <div key={pIdx} className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                          <div className="flex flex-col items-center gap-1 shrink-0">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold flex items-center justify-center">{pIdx + 1}</div>
                                            {pIdx < (msg.roadmapData?.length ?? 0) - 1 && <div className="w-0.5 flex-1 bg-primary/10 mt-1 min-h-[12px]" />}
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-foreground">{phase.title}</p>
                                            {phase.timeline && <p className="text-[10px] text-primary font-semibold">{phase.timeline}</p>}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {phase.skills.map((skill, sIdx) => (
                                                <span key={sIdx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">{skill}</span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Job Rec Cards */}
                                  {msg.isJobRecs && msg.jobRecsData && (
                                    <div className="mt-4 space-y-2">
                                      {msg.jobRecsData.map((job, jIdx) => (
                                        <div key={jIdx} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                                          <div className="min-w-0 space-y-0.5">
                                            <p className="text-[12px] font-bold text-foreground truncate">{job.title}</p>
                                            <p className="text-[10px] text-muted-foreground font-semibold">{job.company}</p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">{job.matchReason}</p>
                                          </div>
                                          <span className="shrink-0 text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{job.score}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Interview Score */}
                                  {msg.isInterviewMode && msg.interviewScore !== undefined && (
                                    <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-emerald-600">{msg.interviewScore}/10</span>
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Interview Score</span>
                                      </div>
                                      {msg.interviewStrengths && (
                                        <div>
                                          <p className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wider">✅ Strengths</p>
                                          {msg.interviewStrengths.map((s, i) => <p key={i} className="text-[11px] text-muted-foreground">• {s}</p>)}
                                        </div>
                                      )}
                                      {msg.interviewImprovements && (
                                        <div className="mt-1">
                                          <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wider">💡 Improvements</p>
                                          {msg.interviewImprovements.map((s, i) => <p key={i} className="text-[11px] text-muted-foreground">• {s}</p>)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed text-primary-foreground">{msg.text}</p>
                              )}
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
                          onClick={() => handleApplyClick(job)}
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

                {selectedJob.matchReasons && selectedJob.matchReasons.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      AI Match Analysis
                    </h4>
                    <ul className="space-y-2 bg-muted/40 dark:bg-muted/10 p-3 rounded-xl border border-border/40 text-left">
                      {selectedJob.matchReasons.map((reason, idx) => (
                        <li key={idx} className="text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
                          <span className="text-primary font-bold mt-0.5 shrink-0">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
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
                  onClick={() => {
                    handleApplyClick(selectedJob);
                    setSelectedJob(null);
                  }}
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
