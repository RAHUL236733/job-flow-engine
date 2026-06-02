import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AnalysisProvider, useAnalysis } from "@/hooks/use-analysis";
import {
  isValidN8nPayload,
  N8N_WAIT_PIPELINE_STEPS,
  buildStorageDocument,
  flattenN8nPayload,
  parseN8nResponse,
  SERVICE_UNAVAILABLE_MESSAGE,
  trackedJobsFromAnalysis,
} from "@/lib/n8n-response";
import {
  clearAllTrackerData,
  deleteApplicationFromStore,
  fetchApplications,
  fetchSavedJobs,
  insertApplication,
  normalizeJob,
  removeSavedJobFromStore,
  saveJobToStore,
  updateApplicationStatus,
} from "@/lib/job-tracker";
import {
  consumeResumeTrial,
  RESUME_TRIALS_MAX,
  trialsRemaining,
} from "@/lib/resume-trials";
import { COACH_TOOLS, getCoachToolByTab } from "@/lib/career-tools-config";
import { CoachToolPageView } from "@/components/coach/CoachToolPageView";
import {
  Sparkles,
  LayoutDashboard,
  Zap,
  Bookmark,
  FileText,
  Clock,
  User,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Upload,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  Eye,
  EyeOff,
  TrendingUp,
  Award,
  BookOpen,
  HelpCircle,
  X,
  PlusCircle,
  Check,
  Loader2,
  FileSignature
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AnalysisProvider>
      <DashboardLayout />
    </AnalysisProvider>
  ),
});

// Generic Ripple Card Component for premium click ripples with warm gold overlays
interface RippleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function RippleCard({ children, className = "", onClick, ...props }: RippleCardProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const nextId = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: nextId.current++ };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`ripple-container cursor-pointer select-none ${className}`}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
            backgroundColor: "rgba(139, 92, 246, 0.25)"
          }}
        />
      ))}
      {children}
    </div>
  );
}

// Circular progress ring helper
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  primaryColor = "#8b5cf6",
  secondaryColor = "rgba(255, 255, 255, 0.05)",
  fontSize = "1.5rem",
  showText = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  primaryColor?: string;
  secondaryColor?: string;
  fontSize?: string;
  showText?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={secondaryColor}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="absolute font-black text-foreground" style={{ fontSize }}>
          {value}%
        </span>
      )}
    </div>
  );
}

// Numeric transition counter using requestAnimationFrame
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const prevVal = useRef(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = prevVal.current;
    const diff = value - startValue;
    if (diff === 0) {
      setCurrent(value);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const val = Math.floor(startValue + progress * diff);
      setCurrent(val);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
        prevVal.current = value;
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{current}</>;
}

// Typewriter cycling component
function TypewriterEffect({ phrases }: { phrases: string[] }) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const phrase = phrases[currentPhraseIndex];
    const speed = isDeleting ? 25 : 55;

    const handleTyping = () => {
      if (!isDeleting) {
        setDisplayedText(phrase.substring(0, displayedText.length + 1));
        if (displayedText === phrase) {
          timer = setTimeout(() => setIsDeleting(true), 2500);
        } else {
          timer = setTimeout(handleTyping, speed);
        }
      } else {
        setDisplayedText(phrase.substring(0, displayedText.length - 1));
        if (displayedText === "") {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          timer = setTimeout(handleTyping, 400);
        } else {
          timer = setTimeout(handleTyping, speed);
        }
      }
    };

    timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex, phrases]);

  return (
    <span className="typewriter-cursor pr-1 min-h-[1.5em] inline-block text-[#3b82f6] font-semibold drop-shadow-md">
      {displayedText}
    </span>
  );
}

const PipelineStepCard = ({
  stepNum,
  title,
  description,
  status,
}: {
  stepNum: number;
  title: string;
  description: string;
  status: "pending" | "active" | "success" | "failed";
}) => {
  return (
    <div
      className={`relative rounded-xl p-3 border transition-all duration-300 ${status === "success"
          ? "bg-slate-950/20 border-emerald-500/20 shadow-[0_4px_12px_rgba(16,185,129,0.05)]"
          : status === "active"
            ? "bg-[#8b5cf6]/5 border-[#8b5cf6]/35 shadow-[0_4px_12px_rgba(139,92,246,0.1)] scale-[1.02]"
            : status === "failed"
              ? "bg-red-500/5 border-red-500/25"
              : "bg-slate-950/40 border-white/[0.04] opacity-65"
        }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {status === "success" && (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center animate-in zoom-in-50 duration-300">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
          )}
          {status === "active" && (
            <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6] flex items-center justify-center relative">
              <Loader2 className="w-3 h-3 text-[#8b5cf6] animate-spin" />
            </div>
          )}
          {status === "failed" && (
            <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center animate-pulse">
              <span className="text-[10px] font-extrabold text-red-400">!</span>
            </div>
          )}
          {status === "pending" && (
            <div className="w-5 h-5 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-[10px] font-extrabold text-slate-500">
              {stepNum}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <h5
            className={`text-xs font-black transition-colors duration-300 ${status === "success"
                ? "text-emerald-400"
                : status === "active"
                  ? "text-[#8b5cf6]"
                  : "text-slate-300"
              }`}
          >
            {title}
          </h5>
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed select-none">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

function DashboardLayout() {
  const { user, profile, updateProfile, signOut, signIn, isMockMode, isLoading, incrementTrialsUsed } = useAuth();
  const { analysis, saveAnalysis, refreshAnalysis } = useAnalysis();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveJobQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Active Tab state: Dashboard, Job Matcher, Saved Jobs, Applications, Profile, Settings
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMounted, setIsMounted] = useState(false);

  // Theme transitions & mounting trigger
  useEffect(() => {
    setIsMounted(true);
    if (!localStorage.getItem("theme")) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/" });
    }
  }, [isLoading, user, navigate]);

  // Sync profile details if available - Starts empty/zero by default
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    experienceLevel: "Freshman/Student",
    preferredJobType: "Internship",
    targetJobTitle: "",
    targetCityState: "",
  });
  const [skillsList, setSkillsList] = useState<string[]>([]);

  useEffect(() => {
    const authEmail = user?.email || "";
    const authName =
      (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) || "";

    if (profile) {
      setProfileForm({
        fullName: profile.full_name || authName || "",
        email: profile.email || authEmail,
        experienceLevel: profile.experience_level || "Freshman/Student",
        preferredJobType: profile.job_type || "Internship",
        targetJobTitle: profile.preferred_role || "",
        targetCityState: profile.preferred_location || "",
      });
      if (profile.skills) {
        if (Array.isArray(profile.skills)) {
          setSkillsList(profile.skills);
        } else if (typeof profile.skills === "string") {
          setSkillsList(profile.skills.split(",").map((s) => s.trim()).filter(Boolean));
        }
      }
    } else if (user) {
      setProfileForm((prev) => ({
        ...prev,
        fullName: prev.fullName || authName,
        email: prev.email || authEmail,
      }));
    }
  }, [profile, user]);

  const getTrackerCacheKey = (userId: string) => `tracker_state_v2_${userId}`;

  const readTrackerCache = (userId: string): { apps: any[] } | null => {
    try {
      // Clear old cache format once so stale default/demo saved jobs don't reappear.
      localStorage.removeItem(`tracker_state_${userId}`);
      const raw = localStorage.getItem(getTrackerCacheKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { apps?: any[] };
      return {
        apps: Array.isArray(parsed.apps) ? parsed.apps : [],
      };
    } catch {
      return null;
    }
  };

  const writeTrackerCache = (userId: string, _savedJobs: any[], apps: any[]) => {
    localStorage.setItem(
      getTrackerCacheKey(userId),
      JSON.stringify({
        apps,
        updatedAt: new Date().toISOString(),
      }),
    );
  };

  // Load tracker data from Supabase and fall back to last local cache if needed
  useEffect(() => {
    if (isLoading) return;

    if (!user || isMockMode) {
      setSavedJobsList([]);
      setApplications([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [saved, apps] = await Promise.all([
          fetchSavedJobs(user.id),
          fetchApplications(user.id),
        ]);
        if (cancelled) return;
        setSavedJobsList(saved);
        setApplications(apps);
        writeTrackerCache(user.id, saved, apps);
      } catch (err) {
        console.error("Failed to load job tracker data:", err);
        const cached = readTrackerCache(user.id);
        if (cached && !cancelled) {
          // Saved Jobs should come from Supabase only; if load fails, keep default zero.
          setSavedJobsList([]);
          setApplications(cached.apps);
          toast.warning("Loaded tracker from local cache", {
            description: "Could not sync with Supabase right now. Your latest local tracker data is shown.",
          });
          return;
        }

        if (!cancelled) {
          // Ensure we never show previous user's tracker data.
          setSavedJobsList([]);
          setApplications([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isMockMode, isLoading]);

  // Hydrate matcher lists + skills whenever latest n8n analysis loads from Supabase
  useEffect(() => {
    if (!analysis) return;
    const { jobs, internships } = trackedJobsFromAnalysis(analysis);
    if (jobs.length) setJobsList(jobs);
    if (internships.length) setInternshipsList(internships);
    if (analysis.skills?.length) setSkillsList(analysis.skills);
  }, [analysis]);

  const [resumeFile, setResumeFile] = useState<{ name: string; size: string } | null>(null);

  // Saved Jobs tracking
  const [savedJobsList, setSavedJobsList] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  // Job Matcher Sub-system states
  const [isScraping, setIsScraping] = useState(false);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [internshipsList, setInternshipsList] = useState<any[]>([]);
  const [matcherView, setMatcherView] = useState<"jobs" | "internships">("jobs");

  const [pipelineStatus, setPipelineStatus] = useState<{
    step: "idle" | "analyzing" | "extracting" | "scoring" | "matching" | "complete" | "failed";
    progress: number;
    details?: string;
    isFallback: boolean;
  }>({
    step: "idle",
    progress: 0,
    isFallback: false,
  });

  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [matchesRemaining, setMatchesRemaining] = useState<number>(RESUME_TRIALS_MAX);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const trialsExhausted = matchesRemaining <= 0;

  useEffect(() => {
    if (!user?.id) {
      setMatchesRemaining(RESUME_TRIALS_MAX);
      return;
    }
    setMatchesRemaining(trialsRemaining(user.id, user.user_metadata?.trials_used));
  }, [user?.id, user?.user_metadata?.trials_used]);

  const blockTrialUpload = () => {
    toast.error("Free trial limit reached", {
      description: `You have used all ${RESUME_TRIALS_MAX} resume analyses for this account.`,
    });
  };

  const displayName =
    profileForm.fullName ||
    profile?.full_name ||
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    user?.email?.split("@")[0] ||
    "User";

  const displayEmail = profileForm.email || profile?.email || user?.email || "";

  const ensureTrackerPersistence = () => {
    if (!user) {
      toast.error("Sign in required");
      return false;
    }
    if (isMockMode) {
      toast.error("Supabase required", {
        description: "Saved jobs and applications are stored in your Supabase account, not on this device.",
      });
      return false;
    }
    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (trialsExhausted) {
      blockTrialUpload();
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const validExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    const fileNameLower = file.name.toLowerCase();
    const isValidType = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValidType) {
      toast.error("Invalid file format", {
        description: "Please upload a PDF (.pdf), Word (.doc, .docx) or Excel (.xls, .xlsx) resume.",
      });
      e.target.value = "";
      return;
    }

    // Check size < 2MB (2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size >= maxSize) {
      toast.error("File size exceeded", {
        description: "Resume size must be under 2 MB.",
      });
      e.target.value = "";
      return;
    }

    setStagedFile(file);
    toast.success(`${file.name} staged successfully!`, {
      description: "Click 'Analyze & Find Matches' to begin parsing.",
    });
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (trialsExhausted) {
      blockTrialUpload();
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Check extension
    const validExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    const fileNameLower = file.name.toLowerCase();
    const isValidType = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValidType) {
      toast.error("Invalid file format", {
        description: "Please upload a PDF (.pdf), Word (.doc, .docx) or Excel (.xls, .xlsx) resume.",
      });
      return;
    }

    // Check size < 2MB (2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size >= maxSize) {
      toast.error("File size exceeded", {
        description: "Resume size must be under 2 MB.",
      });
      return;
    }

    setStagedFile(file);
    toast.success(`${file.name} staged successfully!`, {
      description: "Click 'Analyze & Find Matches' to begin parsing.",
    });
  };

  const startAnalysis = async (file: File) => {
    if (!file) return;
    if (trialsExhausted) {
      blockTrialUpload();
      return;
    }

    // Check environment variables (throw warnings/asserts if missing)
    const API_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8n-latest-nnow.onrender.com/webhook/upload-resume";
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!API_URL) {
      toast.error("Service unavailable", {
        description: "Try again later.",
      });
      console.error("[UPLOAD DEBUG] missing env variable: VITE_N8N_WEBHOOK_URL");
      return;
    }
    if (!SUPABASE_URL) {
      toast.error("Service unavailable", {
        description: "Try again later.",
      });
      console.error("[UPLOAD DEBUG] missing env variable: VITE_SUPABASE_URL");
      return;
    }
    if (!SUPABASE_ANON_KEY) {
      toast.error("Service unavailable", {
        description: "Try again later.",
      });
      console.error("[UPLOAD DEBUG] missing env variable: VITE_SUPABASE_ANON_KEY");
      return;
    }

    // Clear staged file so we transition smoothly to stepper status
    setStagedFile(null);

    // Initialize pipeline: Step 1 active
    setPipelineStatus({
      step: "analyzing",
      progress: 10,
      details: "Validating file format and size under 2MB...",
      isFallback: false,
    });

    const formData = new FormData();
    formData.append("resume", file);

    const uploadToastId = toast.loading("Waiting for service…", {
      description: "Stay on this page until the workflow returns your analysis.",
      duration: Infinity,
    });

    let waitStepIndex = 0;
    const progressTimer = setInterval(() => {
      const step = N8N_WAIT_PIPELINE_STEPS[waitStepIndex];
      if (step) {
        setPipelineStatus({
          step: step.step,
          progress: step.progress,
          details: step.details,
          isFallback: false,
        });
        waitStepIndex = Math.min(waitStepIndex + 1, N8N_WAIT_PIPELINE_STEPS.length - 1);
      }
    }, 12_000);

    const failAnalysis = (restoreFile: boolean) => {
      clearInterval(progressTimer);
      setIsScraping(false);
      setPipelineStatus({
        step: "failed",
        progress: 0,
        details: SERVICE_UNAVAILABLE_MESSAGE,
        isFallback: false,
      });
      if (restoreFile) {
        setStagedFile(file);
      }
      toast.error("Service unavailable", {
        id: uploadToastId,
        description: "Try again later.",
      });
    };

    try {
      setPipelineStatus({
        step: "analyzing",
        progress: 8,
        details: N8N_WAIT_PIPELINE_STEPS[0].details,
        isFallback: false,
      });

      // No client timeout — wait until n8n "Respond to Webhook" returns the JSON body
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      console.group("UPLOAD DEBUG");
      console.log("File:", file.name, "Status:", response.status, "URL:", API_URL);
      console.groupEnd();

      if (!response.ok) {
        throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
      }

      const text = await response.text();
      if (!text?.trim()) {
        throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
      }

      let responseData: unknown;
      try {
        responseData = JSON.parse(text);
      } catch {
        throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
      }

      const parsed = parseN8nResponse(responseData);
      if (!isValidN8nPayload(parsed)) {
        console.error("n8n returned 200 but payload was empty or unrecognized:", responseData);
        throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
      }

      // Keep response parsing internal; do not show raw webhook details to users.

      if (parsed.jobs.length) setJobsList(parsed.jobs);
      if (parsed.internships.length) setInternshipsList(parsed.internships);
      if (parsed.analysis.skills?.length) {
        setSkillsList(parsed.analysis.skills);
      }

      const payload = flattenN8nPayload(responseData);
      if (payload.name || payload.fullName) {
        setProfileForm((prev) => ({
          ...prev,
          fullName: String(payload.name || payload.fullName),
        }));
      }

      const document = buildStorageDocument(responseData);

      if (user) {
        const saved = await saveAnalysis(document);
        if (!saved && !isMockMode) {
          throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
        }
      }

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setResumeFile({ name: file.name, size: `${sizeInMB} MB` });

      setPipelineStatus({
        step: "complete",
        progress: 100,
        details: `Done — ${parsed.jobs.length} jobs and ${parsed.internships.length} internships · all career sections saved.`,
        isFallback: false,
      });
      // Strictly consume one credit only after successful analysis output.
      if (user?.id) {
        const remaining = consumeResumeTrial(user.id, user.user_metadata?.trials_used);
        setMatchesRemaining(remaining);
        await incrementTrialsUsed();
      } else {
        setMatchesRemaining((prev) => Math.max(0, prev - 1));
      }

      console.log("n8n analysis applied:", {
        jobs: parsed.jobs.length,
        internships: parsed.internships.length,
        skills: document.skills?.length,
        ats: document.atsScore?.score,
        linkedin: !!document.linkedinOptimization,
        interview: !!document.interviewPractice,
        coverLetter: !!document.coverLetterGenerator?.letter,
      });

      toast.success("Analysis complete", {
        id: uploadToastId,
        description: `${parsed.jobs.length} jobs · ${parsed.internships.length} internships are ready.`,
      });
    } catch (err: unknown) {
      console.error("n8n upload error:", err);
      failAnalysis(true);
    }
  };

  // Computed values that animate from 0
  const jobsMatchedCount = jobsList.length + internshipsList.length;
  const savedJobsCount = savedJobsList.length;
  const appsSentCount = applications.length;

  // Profile Score calculation
  const hasBaseInfo = profileForm.fullName.length > 0 && skillsList.length >= 3;
  const profileScore =
    (hasBaseInfo ? 25 : 0) +
    (resumeFile ? 25 : 0) +
    (savedJobsCount > 0 ? 25 : 0) +
    (appsSentCount > 0 ? 25 : 0);

  const atsScoreDisplay = analysis?.atsScore?.score ?? 0;
  const hasAnyMatches = jobsList.length > 0 || internshipsList.length > 0;

  const handleScrapeTrigger = () => {
    setIsScraping(true);
    toast.loading("Refreshing matching roles from database...", { duration: 1000 });
    setTimeout(() => {
      setIsScraping(false);
      toast.success("Sync completed!");
    }, 1000);
  };

  // Applications Tracker Modal states
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [newAppForm, setNewAppForm] = useState({
    company: "",
    role: "",
    status: "Applied",
    salary: "",
    date: "2026-06-01",
    notes: "",
  });
  const [showAppsBanner, setShowAppsBanner] = useState(true);

  // Profile Save Form states
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ATS ring color transition: gold→green color transition as score increases
  const getAtsColor = (score: number) => {
    if (score > 70) return "#10b981"; // sage green
    if (score >= 40) return "#8b5cf6"; // rich gold
    return "#ef4444"; // terra cotta (red)
  };

  const activeTabItemsClass = (tabId: string) => {
    return activeTab === tabId
      ? "bg-[#8b5cf6]/15 text-[#3b82f6] border-l-[3px] border-l-[#8b5cf6] font-bold"
      : "text-slate-400 hover:text-[#3b82f6] hover:bg-[#8b5cf6]/5 border-l-[3px] border-l-transparent hover:border-l-[#8b5cf6]/50 transition-all";
  };

  // Profile input change triggers
  const handleProfileFieldChange = (key: string, val: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName || !profileForm.targetJobTitle || !profileForm.targetCityState) {
      setShowRequiredErrors(true);
      toast.error("Required fields missing", {
        description: "Please check red glowing outline inputs.",
      });
      return;
    }

    setShowRequiredErrors(false);
    setIsSavingProfile(true);

    const success = await updateProfile({
      full_name: profileForm.fullName,
      experience_level: profileForm.experienceLevel,
      job_type: profileForm.preferredJobType,
      preferred_role: profileForm.targetJobTitle,
      preferred_location: profileForm.targetCityState,
      skills: skillsList.join(","),
    });

    setIsSavingProfile(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skillsList.includes(val)) {
        setSkillsList((prev) => [...prev, val]);
        setSkillInput("");
        toast.success(`Added skill tag: ${val}`);
      }
    }
  };

  const handleRemoveSkill = (index: number) => {
    const val = skillsList[index];
    setSkillsList((prev) => prev.filter((_, i) => i !== index));
    toast.info(`Removed skill tag: ${val}`);
  };

  // Add tracked application manually
  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureTrackerPersistence()) return;
    if (!newAppForm.company || !newAppForm.role) {
      toast.error("Required fields empty", { description: "Please provide Company and Role." });
      return;
    }

    try {
      const created = await insertApplication(user.id, {
        company: newAppForm.company,
        role: newAppForm.role,
        status: newAppForm.status,
        salary: newAppForm.salary || "$90k/yr",
        date: newAppForm.date || new Date().toISOString().split("T")[0],
        notes: newAppForm.notes,
      });

      if (!created) {
        toast.info("This application is already tracked.");
        return;
      }

      setApplications((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setShowTrackModal(false);
      setNewAppForm({
        company: "",
        role: "",
        status: "Applied",
        salary: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      toast.success(`Successfully tracked application at ${created.company}!`);
    } catch (err) {
      console.error(err);
      toast.error("Could not save application", {
        description: "Check your Supabase connection and try again.",
      });
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!ensureTrackerPersistence()) return;
    try {
      await deleteApplicationFromStore(user.id, id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      toast.info("Application deleted");
    } catch (err) {
      console.error(err);
      toast.error("Could not delete application");
    }
  };

  const handleUpdateAppStatus = async (id: string, status: string) => {
    if (!ensureTrackerPersistence()) return;
    try {
      await updateApplicationStatus(user.id, id, status);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app)),
      );
      toast.success(`Updated application status to ${status}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not update status");
    }
  };

  const handleSaveJobToggle = async (job: any) => {
    if (!ensureTrackerPersistence()) return;
    const normalized = normalizeJob(job);

    saveJobQueueRef.current = saveJobQueueRef.current
      .then(async () => {
        const existing = savedJobsList.find((j) => j.id === normalized.id);
        if (existing) {
          await removeSavedJobFromStore(user.id, existing);
          setSavedJobsList((prev) => prev.filter((j) => j.id !== normalized.id));
          toast.info(`Removed ${normalized.title} from Saved Jobs`);
          return;
        }

        const saved = await saveJobToStore(user.id, normalized);
        if (!saved) {
          toast.error("Could not save job. Try again.");
          return;
        }
        setSavedJobsList((prev) => [saved, ...prev.filter((j) => j.id !== saved.id)]);
        toast.success(`Saved ${saved.title} to Saved Jobs!`);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Could not save job", {
          description: "Service unavailable. Try again later.",
        });
      });

    await saveJobQueueRef.current;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleQuickApplyJob = async (job: any) => {
    const normalized = normalizeJob(job);
    const applicationUrl = (normalized.url || "").trim();

    if (!applicationUrl || applicationUrl === "#") {
      toast.error("Application link unavailable", {
        description: "This role does not have a direct apply URL yet.",
      });
      return;
    }

    try {
      window.open(applicationUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening application link");
    } catch (err) {
      console.error(err);
      toast.error("Service unavailable", {
        description: "Try again later.",
      });
    }
  };

  // Navigation Items Mapping
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "matcher", label: "Job Matcher", icon: Search },
    { id: "saved", label: "Saved Jobs", icon: Bookmark },
    { id: "applications", label: "Applications", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#07050f] text-[#f8fafc] flex flex-col md:flex-row overflow-hidden dot-mesh-bg bg-noise-overlay transition-colors duration-500 font-sans relative pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
      />
      {/* Mesh gradients & gold radial glow spots in corners */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(201,168,76,0.06),transparent_50%)] pointer-events-none" />

      {/* Sidebar Navigation - Hidden on Mobile */}
      <aside className="hidden md:flex w-64 bg-[#07050f] border-r border-[#8b5cf6]/20 flex flex-col justify-between shrink-0 relative z-30">
        <div className="p-6 flex-1 flex flex-col">
          {/* Logo Area */}
          <div className="flex items-center gap-2.5 mb-10 select-none cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="relative">
              <div className="absolute -inset-1 rounded bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] opacity-60 blur-sm animate-pulse" />
              <div className="relative rounded bg-slate-900 p-2 border border-white/10 text-[#8b5cf6]">
                <Sparkles className="h-5 w-5 animate-pulse text-[#8b5cf6]" />
              </div>
            </div>
            <span className="text-md font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#8b5cf6]">
              AI JobMatcher
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden group select-none ${activeTabItemsClass(
                    item.id
                  )}`}
                  style={{ minHeight: "48px" }}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? "text-[#3b82f6]" : "text-slate-400 group-hover:text-[#8b5cf6]"
                      }`}
                  />
                  <span className="font-semibold text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile / avatar drawer */}
        <div className="p-4 border-t border-[#8b5cf6]/20 bg-slate-950/20">
          <div className="flex items-center gap-3">
            {/* Avatar with rotating gold gradient ring */}
            <div className="relative w-10 h-10 select-none">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#8b5cf6] animate-rotate-avatar-ring border border-transparent" />
              <div className="absolute inset-[2.5px] rounded-full bg-[#07050f] flex items-center justify-center text-sm font-black text-[#8b5cf6]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-slate-200 truncate select-none">
                {displayName}
              </h5>
              <p className="text-[10px] text-slate-500 truncate select-none">
                {displayEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full mt-3.5 flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-500 hover:text-[#ef4444] hover:bg-[#ef4444]/10 border border-transparent hover:border-[#ef4444]/20 transition-all duration-300 text-xs font-bold"
            style={{ minHeight: "48px" }}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-h-0 md:min-h-screen relative overflow-y-auto overflow-x-hidden custom-scrollbar z-20 w-full">
        {/* Dynamic Tab Switchboard */}
        <div
          className={`flex-1 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 transition-all duration-700 ease-out transform max-w-[100vw] ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[10px]"
            }`}
        >
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Welcome hero — checklist removed; use Career Tools pages */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#15122e] via-[#0f0d20] to-[#07050f] p-5 sm:p-6 md:p-10 border border-[#8b5cf6]/25 shadow-[0_20px_45px_rgba(139,92,246,0.15)] select-none">
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-45">
                  <span className="absolute w-2 h-2 bg-[#8b5cf6] rounded-full animate-float" style={{ left: "8%", top: "25%" }} />
                  <span className="absolute w-3.5 h-3.5 bg-[#f59e0b] rounded-full animate-float" style={{ left: "28%", top: "72%", animationDelay: "1.2s" }} />
                </div>
                <div className="relative z-10 space-y-4 max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#f8fafc] leading-tight break-words">
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
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 w-full">
                    <button
                      onClick={() => setActiveTab("matcher")}
                      className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-sm hover-shimmer shadow-lg active:scale-95 transition-all"
                    >
                      Start Job Matching →
                    </button>
                    <button
                      onClick={() => setActiveTab("tool-ats")}
                      className="w-full sm:w-auto h-12 px-6 rounded-xl border border-[#8b5cf6]/30 text-[#f8fafc] font-bold text-sm hover:bg-[#8b5cf6]/10 active:scale-95 transition-all"
                    >
                      ATS Score Check
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards: 2×2 grid (no horizontal scroll) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 select-none">
                {[
                  { title: "Jobs Matched", value: jobsMatchedCount, icon: Briefcase, color: "text-[#8b5cf6]", iconBorder: "border-[#8b5cf6]/30", glow: "hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)]" },
                  { title: "Applications Sent", value: appsSentCount, icon: FileText, color: "text-[#6366f1]", iconBorder: "border-[#6366f1]/30", glow: "hover:shadow-[0_8px_20px_rgba(99,102,241,0.15)]" },
                  { title: "Saved Jobs", value: savedJobsCount, icon: Bookmark, color: "text-[#10b981]", iconBorder: "border-[#10b981]/30", glow: "hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)]" },
                  { title: "Profile Score", value: profileScore, icon: User, color: "text-[#8b5cf6]", iconBorder: "border-[#8b5cf6]/30", glow: "hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)]", isProfile: true },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`glass-card rounded-2xl p-4 sm:p-5 border border-white/5 ${stat.glow} hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-between gap-2 group w-full min-w-0`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest select-none truncate">
                        {stat.title}
                      </p>
                      {!stat.isProfile ? (
                        <h3 className="text-2xl sm:text-3xl font-black text-[#f8fafc] leading-none">
                          <AnimatedCounter value={stat.value} />
                        </h3>
                      ) : (
                        <p className="text-[9px] sm:text-[10px] text-[#10b981] font-semibold select-none flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shrink-0" />
                          Live Rating
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-center shrink-0">
                      {stat.isProfile ? (
                        <CircularProgress
                          value={stat.value}
                          size={64}
                          strokeWidth={7}
                          primaryColor="#8b5cf6"
                          secondaryColor="rgba(255, 255, 255, 0.05)"
                          fontSize="0.95rem"
                        />
                      ) : (
                        <div className={`p-2.5 sm:p-3 rounded-xl bg-slate-900 border ${stat.iconBorder} group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
                          <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>


              {/* ⚡ Quick Actions Grid section */}
              <div className="space-y-4">
                <div className="relative pb-2 select-none">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    ⚡ Quick Actions
                  </h2>
                  <div className="absolute bottom-0 left-0 w-32 h-[3.5px] bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] rounded-full shadow-[0_0_8px_#8b5cf6]" />
                </div>

                {/* 2×2 grid rows — all 9 cards, no horizontal scroll */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 select-none">
                  {COACH_TOOLS.map((card) => (
                    <QuickActionCard
                      key={card.id}
                      title={card.title}
                      subtitle={card.subtitle}
                      emoji={card.emoji}
                      gradientClass={card.gradient}
                      onClick={() => setActiveTab(card.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOB MATCHER */}
          {activeTab === "matcher" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {pipelineStatus.step === "idle" ? (
                <div className="space-y-6">
                  <div className="space-y-1.5 select-none">
                    <h3 className="text-xl sm:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">Resume Matcher</h3>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Upload your resume to extract skills, calculate an ATS match score, and scrape live entry-level jobs tailored to your skillset.
                    </p>
                  </div>

                  <div className="max-w-3xl mx-auto w-full glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/5 shadow-[0_20px_50px_rgba(139,92,246,0.12)] bg-[#0f0d20]/80 backdrop-blur-xl space-y-5 sm:space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Free Trial Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 select-none gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-200">Free Trial Usage</span>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {trialsExhausted
                              ? "No free analyses left on this account."
                              : `You have ${RESUME_TRIALS_MAX} free resume matches per account.`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-300 whitespace-nowrap shrink-0">
                        <span className="text-[#3b82f6] text-sm font-bold">{matchesRemaining}</span> / {RESUME_TRIALS_MAX} remaining
                      </span>
                    </div>

                    {/* Drag and Drop Box */}
                    <div
                      onDragOver={trialsExhausted ? undefined : handleDragOver}
                      onDragLeave={trialsExhausted ? undefined : handleDragLeave}
                      onDrop={trialsExhausted ? undefined : handleDrop}
                      onClick={() => {
                        if (trialsExhausted) {
                          blockTrialUpload();
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl py-10 sm:py-16 px-4 sm:px-10 flex flex-col items-center justify-center gap-4 sm:gap-5 transition-all duration-300 select-none group relative overflow-hidden ${trialsExhausted
                          ? "border-white/5 bg-slate-950/10 opacity-60 cursor-not-allowed"
                          : isDragging
                            ? "border-[#3b82f6] bg-[#3b82f6]/10 scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.15)] cursor-pointer"
                            : "border-white/10 bg-slate-950/20 hover:border-[#8b5cf6]/30 hover:bg-white/[0.01] cursor-pointer"
                        }`}
                    >
                      <div className="w-18 h-18 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-7 h-7 text-[#3b82f6]" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-black text-slate-200 md:text-base group-hover:text-[#3b82f6] transition-colors">
                          Drag & drop your resume here
                        </p>
                        <p className="text-[11px] md:text-xs text-slate-500 font-bold">
                          or click to browse from files (PDF, DOC, DOCX)
                        </p>
                      </div>
                    </div>

                    {/* Staged File block */}
                    {stagedFile && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-200 truncate leading-none">
                              {stagedFile.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 select-none">
                              {(stagedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStagedFile(null);
                            toast.info("Resume unstaged");
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-red-400 cursor-pointer flex items-center gap-1 bg-white/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-red-500/20 transition-all duration-300 shrink-0 select-none"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}

                    {/* Analyze Action Button */}
                    <button
                      onClick={() => startAnalysis(stagedFile!)}
                      disabled={!stagedFile || trialsExhausted}
                      className={`w-full h-12 rounded-xl text-white font-bold text-xs hover-shimmer shadow-lg flex items-center justify-center gap-2 transition-all duration-300 ${stagedFile && !trialsExhausted
                          ? "bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                          : "bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed"
                        }`}
                      style={{ minHeight: "48px" }}
                    >
                      <Sparkles className="w-4 h-4" />
                      {!trialsExhausted ? "Analyze & Find Matches" : "Free Trial Limit Reached"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 select-none">
                  <h3 className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">Live Job Matcher Index</h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Analyzing resume, extracting engineering attributes, and auditing roles.
                  </p>
                </div>
              )}

              {pipelineStatus.step !== "idle" && (
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300 relative overflow-hidden">
                  {/* Glowing halo */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2 select-none">
                        <Sparkles className="w-4 h-4 text-[#8b5cf6] animate-pulse" />
                        AI Parsing Pipeline
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 select-none">
                        Analyzing resume format, extracting tech stack tags, and auditing ATS score relevance.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 select-none">
                      <div className="flex-1 sm:w-36 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#10b981] transition-all duration-500 ease-out"
                          style={{ width: `${pipelineStatus.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-[#8b5cf6] min-w-[32px] text-right">
                        {pipelineStatus.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Steps Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 select-none">
                    <PipelineStepCard
                      stepNum={1}
                      title="Analyzing Resume"
                      description="Validating file format and size under 2MB, sending to processing service."
                      status={
                        pipelineStatus.step === "analyzing"
                          ? "active"
                          : pipelineStatus.step === "failed" && pipelineStatus.progress < 25
                            ? "failed"
                            : pipelineStatus.step !== "idle"
                              ? "success"
                              : "pending"
                      }
                    />
                    <PipelineStepCard
                      stepNum={2}
                      title="Skills Extraction"
                      description="Extracting technical skills, programming languages, and frame/library keyword tags."
                      status={
                        pipelineStatus.step === "extracting"
                          ? "active"
                          : pipelineStatus.step === "analyzing" || pipelineStatus.step === "idle"
                            ? "pending"
                            : "success"
                      }
                    />
                    <PipelineStepCard
                      stepNum={3}
                      title="ATS Scorer Evaluation"
                      description="Auditing keyword relevance score and compatibility rankings against job targets."
                      status={
                        pipelineStatus.step === "scoring"
                          ? "active"
                          : pipelineStatus.step === "matching" || pipelineStatus.step === "complete"
                            ? "success"
                            : "pending"
                      }
                    />
                    <PipelineStepCard
                      stepNum={4}
                      title="Finding Matched Jobs"
                      description="Scanning live database opportunities and matching customized tech stack openings."
                      status={
                        pipelineStatus.step === "matching"
                          ? "active"
                          : pipelineStatus.step === "complete"
                            ? "success"
                            : "pending"
                      }
                    />
                  </div>

                  {/* Status Bar */}
                  {pipelineStatus.details && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-slate-950/40 px-4 py-2.5 rounded-xl border border-white/5 select-none">
                      <span className="flex items-center gap-2">
                        {pipelineStatus.step !== "complete" && pipelineStatus.step !== "failed" && (
                          <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
                        )}
                        {pipelineStatus.details}
                      </span>
                      {pipelineStatus.isFallback && (
                        <span className="text-amber-400 font-extrabold tracking-wider uppercase bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20 text-[9px] shrink-0">
                          Fallback Active
                        </span>
                      )}
                    </div>
                  )}

                  {pipelineStatus.step === "failed" && (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-[#ef4444] text-center">
                        {SERVICE_UNAVAILABLE_MESSAGE}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPipelineStatus({ step: "idle", progress: 0, isFallback: false });
                        }}
                        className="w-full h-11 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] font-bold text-xs hover:bg-[#ef4444]/25 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Reset button shown upon completion */}
                  {pipelineStatus.step === "complete" && (
                    <button
                      onClick={() => {
                        setPipelineStatus({ step: "idle", progress: 0, isFallback: false });
                        setResumeFile(null);
                        setJobsList([]);
                        setInternshipsList([]);
                        refreshAnalysis();
                      }}
                      className="w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer select-none"
                    >
                      <Upload className="w-4 h-4" />
                      Reset Parser & Upload New Resume
                    </button>
                  )}

                </div>
              )}

              {/* Jobs vs internships from latest processing run */}
              {hasAnyMatches && (
                <div className="flex gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setMatcherView("jobs")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${matcherView === "jobs" ? "bg-[#8b5cf6] text-white" : "bg-white/5 text-slate-400"}`}
                  >
                    Jobs ({jobsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatcherView("internships")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${matcherView === "internships" ? "bg-[#10b981] text-white" : "bg-white/5 text-slate-400"}`}
                  >
                    Internships ({internshipsList.length})
                  </button>
                </div>
              )}

              {/* Matched list */}
              {isScraping ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 select-none">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-[#8b5cf6]/10 animate-ping" />
                    <svg className="w-full h-full absolute inset-0 transform -rotate-90 animate-spin" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="250" strokeDashoffset="120" />
                    </svg>
                    <Search className="w-8 h-8 text-[#8b5cf6] animate-bounce" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Aggregating live API feeds...</h4>
                  <p className="text-xs text-slate-500">Connecting to service worker nodes</p>
                </div>
              ) : !hasAnyMatches ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 border border-white/5 rounded-2xl bg-slate-950/20 select-none animate-in fade-in max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-slate-300">Awaiting Resume Match</h4>
                    <p className="text-xs text-slate-500 max-w-xs px-4">
                      Stage and analyze your PDF, Word or Excel resume above to scan live matching openings against your technical skills list.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(matcherView === "jobs" ? jobsList : internshipsList).map((job) => {
                      const jobKey = normalizeJob(job).id;
                      const isSaved = savedJobsList.some((j) => j.id === jobKey);
                      return (
                        <div
                          key={job.id}
                          className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-lg font-black text-[#8b5cf6] select-none">
                                {job.company.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-white text-sm tracking-tight line-clamp-2">{job.title}</h4>
                                <p className="text-[11px] font-bold text-slate-400 select-none truncate">{job.company}</p>
                              </div>
                            </div>

                            <span
                              className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm flex items-center gap-1 select-none border bg-[#8b5cf6]/10 text-[#3b82f6] border-[#8b5cf6]/20 shrink-0`}
                            >
                              ⚡ {job.score}% match
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs select-none">
                            <div className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                              <span>{job.salary}</span>
                            </div>
                          </div>

                          {/* Match reasons from n8n */}
                          <div className="space-y-1.5 select-none">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Why this match</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(job.matchReasons?.length ? job.matchReasons : job.matchedSkills).map((s: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 text-[9px] font-extrabold text-[#3b82f6]"
                                >
                                  {s}
                                </span>
                              ))}
                              {job.missingSkills.map((s: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/25 text-[9px] font-extrabold text-[#ef4444] animate-pulse"
                                  title="Skill gap identified"
                                >
                                  {s} ✕
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                            <button
                              onClick={() => handleSaveJobToggle(job)}
                              className={`p-2.5 rounded-xl border transition-all duration-300 ${isSaved
                                  ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/30 text-[#3b82f6]"
                                  : "bg-white/5 border-white/[0.08] hover:bg-white/10 text-slate-400 hover:text-white"
                                }`}
                              style={{ minHeight: "48px", minWidth: "48px" }}
                              title={isSaved ? "Saved" : "Save Job"}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleQuickApplyJob(job)}
                              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold hover-shimmer shadow-sm active:scale-95 transition-transform cursor-pointer"
                            >
                              Quick Apply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED JOBS */}
          {activeTab === "saved" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1 select-none">
                <h3 className="text-xl font-bold text-white">Your Bookmarks</h3>
                <p className="text-xs text-slate-400">Review jobs bookmarked from matches.</p>
              </div>

              {savedJobsList.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/20 select-none animate-in fade-in">
                  <Bookmark className="w-12 h-12 text-[#8b5cf6]/40" />
                  <div className="text-center space-y-1">
                    <h4 className="font-bold text-slate-300">Bookmarks Vault Empty</h4>
                    <p className="text-xs text-slate-500">Go to Job Matcher index to save exciting jobs.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("matcher")}
                    className="h-12 px-6 rounded-xl bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Match New Roles
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedJobsList.map((job) => (
                    <div
                      key={job.id}
                      className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-sm font-black text-[#8b5cf6]">
                            {job.company.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-xs tracking-tight">{job.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold select-none">{job.company}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveJobToggle(job)}
                          className="text-slate-500 hover:text-[#ef4444] p-1.5 rounded-lg hover:bg-white/5"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 select-none">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-slate-500" /> {job.salary}
                        </span>
                      </div>

                      <button
                        onClick={() => handleQuickApplyJob(job)}
                        className="w-full h-12 rounded-xl bg-[#8b5cf6] text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                      >
                        Quick Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: APPLICATIONS TRACKER */}
          {activeTab === "applications" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Tracker Banner */}
              {showAppsBanner && (
                <div className="relative glass-card rounded-2xl p-4 sm:p-5 border border-white/5 border-l-4 border-l-[#8b5cf6] overflow-hidden flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 animate-in fade-in duration-300">
                  <div className="space-y-2 select-none min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      📋 What is the Applications Tracker?
                    </h3>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Track every job application from submission to offer. Never miss a follow-up, stay organized, and see your progress at a glance.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[10px] font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2.5 py-1 rounded-full">
                        🎯 Track Status
                      </span>
                      <span className="text-[10px] font-bold text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 px-2.5 py-1 rounded-full">
                        📅 Set Reminders
                      </span>
                      <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2.5 py-1 rounded-full">
                        📈 View Progress
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAppsBanner(false)}
                    className="self-end sm:self-start text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 shrink-0"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}

              {/* Status Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                  { id: "Applied", label: "Applied", color: "text-[#8b5cf6]", borderColor: "border-b-[#8b5cf6]" },
                  { id: "Under Review", label: "Under Review", color: "text-[#6366f1]", borderColor: "border-b-[#6366f1]" },
                  { id: "Interview", label: "Interview", color: "text-[#f59e0b]", borderColor: "border-b-[#f59e0b]" },
                  { id: "Rejected", label: "Rejected", color: "text-[#ef4444]", borderColor: "border-b-[#ef4444]" },
                  { id: "Offer", label: "Offer", color: "text-[#10b981]", borderColor: "border-b-[#10b981]" },
                ].map((status) => {
                  const count = applications.filter((app) => app.status === status.id).length;
                  return (
                    <div
                      key={status.id}
                      className={`glass-card p-4 rounded-xl border border-white/5 border-b-4 ${status.borderColor} text-center space-y-1 select-none`}
                    >
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {status.label}
                      </p>
                      <h4 className="text-2xl font-black text-white">
                        <AnimatedCounter value={count} />
                      </h4>
                    </div>
                  );
                })}
              </div>

              {/* Track CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <h4 className="text-sm font-bold text-slate-300 select-none">Active Trackers</h4>
                <button
                  onClick={() => setShowTrackModal(true)}
                  className="w-full sm:w-auto h-12 px-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Track New Job
                </button>
              </div>

              {/* Applications Content Block */}
              {applications.length === 0 ? (
                <div className="space-y-6 pt-4">
                  {/* 3-Step Guide */}
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4 max-w-xl mx-auto text-center">
                    <h4 className="text-xs font-extrabold text-white tracking-widest uppercase select-none">
                      Tracker Setup Guide
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs select-none">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center items-center space-y-1">
                        <span className="text-xl">1️⃣</span>
                        <span className="font-semibold text-slate-200">Track New Job</span>
                        <p className="text-[10px] text-slate-400">Click the top-right button</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center items-center space-y-1">
                        <span className="text-xl">2️⃣</span>
                        <span className="font-semibold text-slate-200">Add details</span>
                        <p className="text-[10px] text-slate-400">Input role metadata</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center items-center space-y-1">
                        <span className="text-xl">3️⃣</span>
                        <span className="font-semibold text-slate-200">Modify progress</span>
                        <p className="text-[10px] text-slate-400">Click status dropdown</p>
                      </div>
                    </div>
                  </div>

                  {/* Grayed-out Example Preview */}
                  <div className="max-w-xl mx-auto space-y-2 opacity-35 relative pointer-events-none select-none">
                    <span className="absolute -top-3 left-4 bg-slate-800 text-[8px] uppercase font-bold text-[#8b5cf6] px-2 py-0.5 rounded border border-[#8b5cf6]/20 shadow z-10">
                      Example Preview
                    </span>
                    <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-lg">
                          🏢
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs">Example Corp</h5>
                          <p className="text-[10px] text-slate-400">Senior React Engineer • $120k/yr</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-0.5 rounded-full">
                          Interview
                        </span>
                        <span className="text-[10px] text-slate-500">2026-06-01</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#8b5cf6]/10 border border-white/10 rounded-xl flex items-center justify-center text-md font-black text-[#8b5cf6] select-none">
                            {app.company.charAt(0)}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-white text-sm tracking-tight">{app.company}</h5>
                            <p className="text-[11px] text-[#94a3b8] font-bold select-none">{app.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-slate-500 hover:text-[#ef4444] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 select-none">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                          <span>{app.salary || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{app.date}</span>
                        </div>
                      </div>

                      {app.notes && (
                        <p className="text-[10px] text-slate-400 bg-white/5 border border-white/5 rounded-xl p-3 leading-relaxed">
                          📝 {app.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                          Application Stage
                        </span>
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                          className="bg-slate-900 border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#8b5cf6] transition-colors cursor-pointer"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Interview">Interview</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Offer">Offer</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFILE REDESIGN */}

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
                internships={internshipsList}
                savedJobsList={savedJobsList}
                onSaveJob={handleSaveJobToggle}
                onApplyJob={handleQuickApplyJob}
              />
            ) : null,
          )}

          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Profile Panel */}
                <div className="glass-card rounded-3xl p-6 border border-white/5 flex flex-col items-center space-y-6">
                  {/* Rotating Gold Gradient Ring */}
                  <div className="relative w-28 h-28 select-none">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#8b5cf6] animate-rotate-avatar-ring border border-transparent" />
                    <div className="absolute inset-[3.5px] rounded-full bg-[#0f0d20] flex items-center justify-center text-3xl font-black text-[#8b5cf6]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-white text-lg tracking-tight select-none">
                      {displayName}
                    </h3>
                    <p className="text-xs text-slate-400 select-none">
                      {displayEmail}
                    </p>
                  </div>

                  <div className="w-full space-y-3 pt-3 border-t border-white/[0.04]">
                    {/* Resume Chip */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold select-none">Resume Doc:</span>
                      {resumeFile ? (
                        <div className="flex items-center gap-1 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          <FileText className="w-3.5 h-3.5 text-[#10b981]" />
                          <span className="max-w-[80px] truncate">{resumeFile.name}</span>
                          <span className="text-[9px] text-[#10b981]">(Loaded)</span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                          Missing
                        </span>
                      )}
                    </div>

                    {/* ATS Evaluator chip */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold select-none">ATS Evaluator:</span>
                      {atsScoreDisplay > 0 ? (
                        <div className="flex items-center gap-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          <CircularProgress value={atsScoreDisplay} size={16} strokeWidth={2.5} showText={false} primaryColor="#10b981" />
                          <span>Score: {atsScoreDisplay}%</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Not Evaluated
                        </span>
                      )}
                    </div>

                    {/* Profile Completion Bar */}
                    <div className="space-y-1.5 pt-1 select-none">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-400">Profile Completion</span>
                        <span className="text-[#8b5cf6]">{profileScore}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] h-1.5 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${isMounted ? profileScore : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Profile Panel Form */}
                <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/5">
                  <form onSubmit={handleSaveProfileSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-name" className="text-xs font-bold text-slate-300">Full Name *</Label>
                        <Input
                          id="prof-name"
                          type="text"
                          required
                          value={profileForm.fullName}
                          onChange={(e) => handleProfileFieldChange("fullName", e.target.value)}
                          className={`h-12 bg-[#15122e] border-white/10 text-[#f8fafc] rounded-xl text-xs focus:ring-2 focus:ring-[#8b5cf6]/30 focus:border-[#8b5cf6] ${showRequiredErrors && !profileForm.fullName
                              ? "border-[#ef4444]/60 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse"
                              : ""
                            }`}
                        />
                      </div>

                      {/* Email Read-only */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-email" className="text-xs font-bold text-slate-300">Email Address (Read-only)</Label>
                        <Input
                          id="prof-email"
                          type="email"
                          readOnly
                          value={profileForm.email}
                          className="h-12 bg-slate-900 border-white/5 text-slate-400 rounded-xl text-xs cursor-not-allowed select-none"
                        />
                      </div>

                      {/* Password Masked */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-pass" className="text-xs font-bold text-slate-300">Password</Label>
                        <div className="relative">
                          <Input
                            id="prof-pass"
                            type={showPassword ? "text" : "password"}
                            value="••••••••••••••••"
                            readOnly
                            className="h-12 bg-slate-900 border-white/5 text-slate-400 rounded-xl text-xs cursor-not-allowed select-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-4 text-slate-500 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Target City/State */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-city" className="text-xs font-bold text-slate-300">Target Location *</Label>
                        <Input
                          id="prof-city"
                          type="text"
                          required
                          value={profileForm.targetCityState}
                          onChange={(e) => handleProfileFieldChange("targetCityState", e.target.value)}
                          className={`h-12 bg-[#15122e] border-white/10 text-[#f8fafc] rounded-xl text-xs focus:ring-2 focus:ring-[#8b5cf6]/30 focus:border-[#8b5cf6] ${showRequiredErrors && !profileForm.targetCityState
                              ? "border-[#ef4444]/60 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse"
                              : ""
                            }`}
                        />
                      </div>

                      {/* Target Role Title */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="prof-title" className="text-xs font-bold text-slate-300">Target Job Title *</Label>
                        <Input
                          id="prof-title"
                          type="text"
                          required
                          value={profileForm.targetJobTitle}
                          onChange={(e) => handleProfileFieldChange("targetJobTitle", e.target.value)}
                          className={`h-12 bg-[#15122e] border-white/10 text-[#f8fafc] rounded-xl text-xs focus:ring-2 focus:ring-[#8b5cf6]/30 focus:border-[#8b5cf6] ${showRequiredErrors && !profileForm.targetJobTitle
                              ? "border-[#ef4444]/60 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse"
                              : ""
                            }`}
                        />
                      </div>

                      {/* Experience Level Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-exp" className="text-xs font-bold text-slate-300">Experience Level</Label>
                        <select
                          id="prof-exp"
                          value={profileForm.experienceLevel}
                          onChange={(e) => handleProfileFieldChange("experienceLevel", e.target.value)}
                          className="h-12 w-full bg-[#15122e] border border-white/10 text-white rounded-xl text-xs px-3 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 cursor-pointer"
                        >
                          <option value="Freshman/Student">Freshman/Student</option>
                          <option value="Entry Level">Entry Level</option>
                          <option value="Mid Level">Mid Level</option>
                          <option value="Senior Level">Senior Level</option>
                        </select>
                      </div>

                      {/* Job Type Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="prof-job" className="text-xs font-bold text-slate-300">Preferred Job Type</Label>
                        <select
                          id="prof-job"
                          value={profileForm.preferredJobType}
                          onChange={(e) => handleProfileFieldChange("preferredJobType", e.target.value)}
                          className="h-12 w-full bg-[#15122e] border border-white/10 text-white rounded-xl text-xs px-3 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 cursor-pointer"
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                          <option value="Remote">Remote</option>
                        </select>
                      </div>
                    </div>

                    {/* Skill tag inputs style */}
                    <div className="space-y-2 pt-2 select-none">
                      <Label htmlFor="prof-skills" className="text-xs font-bold text-slate-300">Professional Skills Tag-input (Press Enter to add)</Label>
                      <Input
                        id="prof-skills"
                        type="text"
                        placeholder="Type a skill and hit Enter..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        className="h-12 bg-[#15122e] border-white/10 text-[#f8fafc] rounded-xl text-xs focus:ring-2 focus:ring-[#8b5cf6]/30"
                      />

                      {/* Skill tags display */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {skillsList.map((skill, index) => (
                          <span
                            key={index}
                            className="bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 text-[#3b82f6] px-3 h-9 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(index)}
                              className="text-[#3b82f6] hover:text-[#ef4444] font-extrabold focus:outline-none ml-1 transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Save Changes button with SUCCESS checkmark animation */}
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        "Updating database profile..."
                      ) : saveSuccess ? (
                        <span className="flex items-center gap-2 text-[#10b981] font-black">
                          <CheckCircle className="w-5 h-5 animate-draw-tick text-[#10b981]" />
                          Changes Saved Successfully!
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-300 select-none">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">System Settings</h3>
                <p className="text-xs text-slate-400">Configure dashboard mock settings and reset test scenarios.</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
                {/* Reset diagnostics */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-200">Diagnostics & Sandbox resets</h4>
                  <p className="text-xs text-slate-400">
                    Clear your Supabase saved jobs and applications for this account, and reset local profile/resume state.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={async () => {
                        if (user && !isMockMode) {
                          try {
                            await clearAllTrackerData(user.id);
                          } catch (err) {
                            console.error(err);
                            toast.error("Could not clear data from Supabase");
                          }
                        }
                        setResumeFile(null);
                        setSavedJobsList([]);
                        setApplications([]);
                        setProfileForm({
                          fullName: "",
                          email: "",
                          experienceLevel: "Freshman/Student",
                          preferredJobType: "Internship",
                          targetJobTitle: "",
                          targetCityState: "",
                        });
                        setSkillsList([]);
                        toast.success("Tracker data and profile fields reset.");
                      }}
                      className="h-12 px-4 bg-[#ef4444]/15 border border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Reset Sandbox to Absolute 0
                    </button>

                    <button
                      onClick={() => {
                        setResumeFile({ name: "demo_resume.docx", size: "1.2 MB" });
                        setProfileForm({
                          fullName: displayName,
                          email: displayEmail,
                          experienceLevel: "Freshman/Student",
                          preferredJobType: "Internship",
                          targetJobTitle: "Frontend Developer",
                          targetCityState: "Remote",
                        });
                        setSkillsList(["React", "CSS", "TypeScript", "Tailwind"]);
                        toast.success("Demo profile and resume loaded.");
                      }}
                      className="h-12 px-4 bg-[#10b981]/15 border border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Load Demo Profile
                    </button>
                  </div>
                </div>

                {/* Account details schema */}
                <div className="space-y-2 border-t border-white/[0.04] pt-5">
                  <h4 className="text-sm font-bold text-slate-200">Mock Data Settings</h4>
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-white/5 border border-white/5 rounded-xl p-4">
                    <span>Demo Mode Enabled (Supabase configured fallback bypass)</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#8b5cf6]/10 text-[#3b82f6] font-extrabold border border-[#8b5cf6]/20 select-none">
                      Mock Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR - collapses to 5 icons */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 min-h-[4rem] h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-[#07050f]/98 backdrop-blur-xl border-t border-white/[0.08] justify-around items-stretch z-50 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.45)] select-none">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const shortLabel =
            item.id === "applications"
              ? "Apps"
              : item.id === "dashboard"
                ? "Home"
                : item.id === "matcher"
                  ? "Match"
                  : item.id === "saved"
                    ? "Saved"
                    : item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 min-w-0 px-0.5 py-2 relative group cursor-pointer active:scale-95 transition-transform"
              style={{ minHeight: "48px" }}
            >
              <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? "text-[#8b5cf6] scale-110" : "text-slate-400"}`} />
              <span className={`text-[8px] sm:text-[9px] font-bold mt-0.5 truncate max-w-full px-0.5 transition-colors ${isActive ? "text-[#8b5cf6]" : "text-slate-500"}`}>
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* TRACK NEW JOB FORM MODAL */}
      {showTrackModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 space-y-4 pb-safe">
            <button
              onClick={() => setShowTrackModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-extrabold text-white text-base select-none">
              Track New Job Application
            </h3>

            <form onSubmit={handleAddApplication} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="track-comp" className="text-xs font-bold text-slate-300">Company Name *</Label>
                <Input
                  id="track-comp"
                  type="text"
                  required
                  placeholder="e.g. OpenAI"
                  value={newAppForm.company}
                  onChange={(e) => setNewAppForm({ ...newAppForm, company: e.target.value })}
                  className="bg-[#15122e] border-white/10 text-white rounded-xl text-xs h-12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-role" className="text-xs font-bold text-slate-300">Job Title *</Label>
                <Input
                  id="track-role"
                  type="text"
                  required
                  placeholder="e.g. Fullstack Intern"
                  value={newAppForm.role}
                  onChange={(e) => setNewAppForm({ ...newAppForm, role: e.target.value })}
                  className="bg-[#15122e] border-white/10 text-white rounded-xl text-xs h-12"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="track-status" className="text-xs font-bold text-slate-300">Status Stage</Label>
                  <select
                    id="track-status"
                    value={newAppForm.status}
                    onChange={(e) => setNewAppForm({ ...newAppForm, status: e.target.value })}
                    className="h-12 w-full bg-[#15122e] border border-white/10 text-white rounded-xl text-xs px-3 outline-none cursor-pointer"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Interview">Interview</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Offer">Offer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="track-sal" className="text-xs font-bold text-slate-300">Salary Range</Label>
                  <Input
                    id="track-sal"
                    type="text"
                    placeholder="e.g. $45/hr"
                    value={newAppForm.salary}
                    onChange={(e) => setNewAppForm({ ...newAppForm, salary: e.target.value })}
                    className="bg-[#15122e] border-white/10 text-white rounded-xl text-xs h-12"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-date" className="text-xs font-bold text-slate-300">Date Applied</Label>
                <Input
                  id="track-date"
                  type="date"
                  value={newAppForm.date}
                  onChange={(e) => setNewAppForm({ ...newAppForm, date: e.target.value })}
                  className="bg-[#15122e] border-white/10 text-white rounded-xl text-xs h-12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-notes" className="text-xs font-bold text-slate-300">Notes / Remarks</Label>
                <textarea
                  id="track-notes"
                  placeholder="e.g. Referred by recruiter..."
                  value={newAppForm.notes}
                  onChange={(e) => setNewAppForm({ ...newAppForm, notes: e.target.value })}
                  className="w-full bg-[#15122e] border border-white/10 text-white rounded-xl text-xs p-3 h-20 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Track Application
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inner helper component for Quick Action Cards
interface QuickActionCardProps {
  title: string;
  subtitle: string;
  emoji: string;
  gradientClass: string;
  onClick: () => void;
}

function QuickActionCard({ title, subtitle, emoji, gradientClass, onClick }: QuickActionCardProps) {
  return (
    <RippleCard
      onClick={onClick}
      className={`relative min-h-[140px] sm:min-h-[160px] w-full rounded-2xl p-4 sm:p-5 overflow-hidden group transition-all duration-300 bg-gradient-to-br ${gradientClass} border border-white/10 hover:border-white/20 md:hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] flex flex-col justify-between`}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex justify-between items-start select-none">
        <span className="text-3xl filter drop-shadow-md select-none">{emoji}</span>
        <span className="text-[9px] uppercase font-black tracking-wider bg-white/25 text-white px-2 py-0.5 rounded-full hover-shimmer shadow-sm backdrop-blur-sm flex items-center gap-1 border border-white/20 animate-pulse">
          ⚡ AI SPARK
        </span>
      </div>

      <div className="mt-4 space-y-1 relative">
        <h4 className="font-extrabold text-white text-[13px] tracking-tight leading-snug select-none">
          {title}
        </h4>
        <p className="text-[10px] text-white/80 select-none font-medium leading-normal">
          {subtitle}
        </p>

        <div className="absolute right-0 bottom-0.5 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-white text-lg font-bold">
          →
        </div>
      </div>
    </RippleCard>
  );
}
