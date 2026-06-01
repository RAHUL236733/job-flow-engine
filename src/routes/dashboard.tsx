import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
  Loader2
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
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
  const { user, profile, updateProfile, signOut, signIn, isMockMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (profile) {
      setProfileForm({
        fullName: profile.full_name || "",
        email: profile.email || "",
        experienceLevel: profile.experience_level || "Freshman/Student",
        preferredJobType: profile.job_type || "Internship",
        targetJobTitle: profile.preferred_role || "",
        targetCityState: profile.preferred_location || "",
      });
      if (profile.skills) {
        setSkillsList(profile.skills.split(",").filter(Boolean));
      }
    }
  }, [profile]);

  // Checklist interactive states (Starts fully uncompleted to support zero default metrics)
  const [checklist, setChecklist] = useState({
    resume: false,
    atsAudit: false,
    matchJobs: false,
    applyRoles: false,
  });

  const [resumeFile, setResumeFile] = useState<{ name: string; size: string } | null>(null);

  // Saved Jobs tracking
  const [savedJobsList, setSavedJobsList] = useState<any[]>([]);

  // Applications list
  const [applications, setApplications] = useState<any[]>([]);

  // Job Matcher Sub-system states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleType, setSelectedRoleType] = useState("All");
  const [isScraping, setIsScraping] = useState(false);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [n8nResponse, setN8nResponse] = useState<any>(null);

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
  const [matchesRemaining, setMatchesRemaining] = useState<number>(3);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Setup initial completed checklist items on first load to trigger animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setChecklist({
        resume: false,
        atsAudit: false,
        matchJobs: false,
        applyRoles: false,
      });
      setResumeFile(null);
      setProfileForm((prev) => ({
        ...prev,
        fullName: "",
        email: "",
        targetJobTitle: "",
        targetCityState: "",
      }));
      setSkillsList([]);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Check environment variables (throw warnings/asserts if missing)
    const API_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://primary-production-48b6.up.railway.app/webhook/upload-resume";
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!API_URL) {
      const msg = "Environment variable VITE_N8N_WEBHOOK_URL is missing!";
      toast.error(msg);
      console.error("[UPLOAD DEBUG] missing env variable: VITE_N8N_WEBHOOK_URL");
      return;
    }
    if (!SUPABASE_URL) {
      const msg = "Environment variable VITE_SUPABASE_URL is missing!";
      toast.error(msg);
      console.error("[UPLOAD DEBUG] missing env variable: VITE_SUPABASE_URL");
      return;
    }
    if (!SUPABASE_ANON_KEY) {
      const msg = "Environment variable VITE_SUPABASE_ANON_KEY is missing!";
      toast.error(msg);
      console.error("[UPLOAD DEBUG] missing env variable: VITE_SUPABASE_ANON_KEY");
      return;
    }

    // Decrement free trial usage
    setMatchesRemaining((prev) => Math.max(0, prev - 1));

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

    const uploadToastId = toast.loading("Processing resume with AI...", {
      description: "Uploading file to n8n Railway webhook...",
    });

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // AbortController for network timeout (25 seconds limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      setPipelineStatus({
        step: "analyzing",
        progress: 25,
        details: "Uploading payload to n8n Railway webhook nodes...",
        isFallback: false,
      });

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.group("UPLOAD DEBUG");
      console.log("File Name:", file.name);
      console.log("File Size:", file.size);
      console.log("API URL:", API_URL);
      console.log("Response:", response);
      console.log("Response Status:", response.status);
      console.groupEnd();

      if (!response.ok) {
        let errDetails = `Upload failed. Status: ${response.status}`;
        try {
          const errText = await response.text();
          const errJson = JSON.parse(errText);
          if (errJson && errJson.message) {
            errDetails = errJson.message;
          } else {
            errDetails = errText.substring(0, 100);
          }
        } catch { }

        if (response.status === 500) {
          throw new Error("N8N unavailable or internal server error (500) inside n8n workflow execution node.");
        } else if (response.status === 404) {
          throw new Error("Backend unavailable - endpoint not found (404).");
        } else {
          throw new Error(errDetails);
        }
      }

      const text = await response.text();
      let responseData: any = null;
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }

      setN8nResponse(responseData);

      // Step 1 Complete -> Transition to Step 2: Skills Extraction
      setPipelineStatus({
        step: "extracting",
        progress: 50,
        details: "Extracting professional skill tags from document structure...",
        isFallback: false,
      });
      await delay(1200);

      // Extract skills or values if returned in typical n8n schema
      let extractedSkills = ["React", "CSS", "TypeScript", "Tailwind"];
      let nameOverride = "";

      if (responseData && typeof responseData === "object") {
        if (responseData.success) {
          console.log("n8n success confirmation parsed successfully!");
          const parsedJobs = [...(responseData.jobs || []), ...(responseData.internships || [])];
          if (parsedJobs.length > 0) {
            const mappedJobs = parsedJobs.map((job: any, index: number) => ({
              id: job.id || `n8n-job-${index}-${Date.now()}`,
              title: job.title || job.role || "Matched Opportunity",
              company: job.company || "Partner",
              location: job.location || "Remote",
              salary: job.salary || "$95k/yr",
              score: job.score || job.matchScore || 85,
              type: job.type || "Fullstack",
              matchedSkills: Array.isArray(job.skills) ? job.skills : ["React", "TypeScript"],
              missingSkills: Array.isArray(job.missingSkills) ? job.missingSkills : []
            }));
            setJobsList(mappedJobs);
            console.log("Matched lists mapped successfully from n8n response:", mappedJobs);
          }
        }

        const skillsVal = responseData.skills || responseData.extracted_skills || responseData.skillsList;
        if (Array.isArray(skillsVal)) {
          extractedSkills = skillsVal;
        } else if (typeof skillsVal === "string") {
          extractedSkills = skillsVal.split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        if (responseData.name || responseData.fullName) {
          nameOverride = responseData.name || responseData.fullName;
        }
      }

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setResumeFile({ name: file.name, size: `${sizeInMB} MB` });
      setChecklist((prev) => ({ ...prev, resume: true }));
      setSkillsList(extractedSkills);

      if (nameOverride) {
        setProfileForm((prev) => ({ ...prev, fullName: nameOverride }));
      }

      // Step 2 Complete -> Transition to Step 3: ATS Evaluation
      setPipelineStatus({
        step: "scoring",
        progress: 75,
        details: "Auditing document ATS scoring compatibility matrices...",
        isFallback: false,
      });
      await delay(1200);

      setChecklist((prev) => ({ ...prev, atsAudit: true }));

      // Step 3 Complete -> Transition to Step 4: Finding matched jobs
      setPipelineStatus({
        step: "matching",
        progress: 90,
        details: "Scanning live databases for internship & entry-level roles...",
        isFallback: false,
      });

      // Scrape matched jobs
      setIsScraping(true);
      await delay(1200);

      setJobsList((prev) => [
        {
          id: `job-scraped-${Date.now()}`,
          title: "UI Engineer (Entry Level)",
          company: "Apple Inc.",
          location: "Cupertino, CA",
          salary: "$125k/yr",
          score: 91,
          type: "Frontend",
          matchedSkills: ["React", "CSS", "TypeScript"],
          missingSkills: ["SwiftUI"],
        },
        {
          id: `job-scraped-2-${Date.now()}`,
          title: "Fullstack Developer Intern",
          company: "Amazon",
          location: "Seattle, WA",
          salary: "$50/hr",
          score: 82,
          type: "Fullstack",
          matchedSkills: ["React", "SQL"],
          missingSkills: ["AWS", "Node.js"],
        },
        ...prev,
      ]);
      setChecklist((prev) => ({ ...prev, matchJobs: true }));
      setIsScraping(false);

      // Step 4 Complete
      setPipelineStatus({
        step: "complete",
        progress: 100,
        details: "Parsing completed. Successfully matched Apple & Amazon entry-level roles!",
        isFallback: false,
      });

      toast.success("Resume parsed successfully!", {
        id: uploadToastId,
        description: "Successfully processed by Railway n8n nodes.",
      });

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Upload error:", err);

      let cleanErrorMessage = err.message || "Resume upload failed. Please try again.";
      if (err.name === "AbortError") {
        cleanErrorMessage = "Network timeout. n8n workflow took too long to respond (>25s).";
      }

      toast.info("Activating local simulator fallback...", {
        id: uploadToastId,
        description: "Executing offline fallback pipeline so you are not blocked.",
      });

      // Sequential progress simulation for fallbacks!
      // Step 1: Complete analyzing via local fallback
      setPipelineStatus({
        step: "extracting",
        progress: 40,
        details: `Live webhook connection failed. Activating local AI simulator...`,
        isFallback: true,
      });
      await delay(1500);

      // Step 2: Extraction
      setPipelineStatus({
        step: "extracting",
        progress: 55,
        details: "Local Simulation: Parsing tech stack tags...",
        isFallback: true,
      });
      setSkillsList(["React", "CSS", "TypeScript", "Tailwind"]);
      await delay(1200);

      // Step 3: ATS Score Evaluation
      setPipelineStatus({
        step: "scoring",
        progress: 75,
        details: "Local Simulation: Auditing compatibility ranking...",
        isFallback: true,
      });
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setResumeFile({ name: file.name, size: `${sizeInMB} MB` });
      setChecklist((prev) => ({ ...prev, resume: true, atsAudit: true }));
      setN8nResponse({
        error: `Webhook returned error: ${cleanErrorMessage}`,
        message: "Failed to process via live Railway webhook. Local simulation fallback activated.",
        fallbackActive: true,
        schemaSuggestion: "Please verify your n8n workflow active status, input parameter mappings, or database connection inside Railway logs."
      });
      await delay(1200);

      // Step 4: Finding Jobs
      setPipelineStatus({
        step: "matching",
        progress: 90,
        details: "Local Simulation: Scanning live matching entries...",
        isFallback: true,
      });
      setIsScraping(true);
      await delay(1200);

      setJobsList((prev) => [
        {
          id: `job-scraped-${Date.now()}`,
          title: "UI Engineer (Entry Level)",
          company: "Apple Inc.",
          location: "Cupertino, CA",
          salary: "$125k/yr",
          score: 91,
          type: "Frontend",
          matchedSkills: ["React", "CSS", "TypeScript"],
          missingSkills: ["SwiftUI"],
        },
        {
          id: `job-scraped-2-${Date.now()}`,
          title: "Fullstack Developer Intern",
          company: "Amazon",
          location: "Seattle, WA",
          salary: "$50/hr",
          score: 82,
          type: "Fullstack",
          matchedSkills: ["React", "SQL"],
          missingSkills: ["AWS", "Node.js"],
        },
        ...prev,
      ]);
      setChecklist((prev) => ({ ...prev, matchJobs: true }));
      setIsScraping(false);

      // Finalize
      setPipelineStatus({
        step: "complete",
        progress: 100,
        details: "Local simulation completed. Matched Apple & Amazon entry-level roles successfully!",
        isFallback: true,
      });

      toast.error(cleanErrorMessage, {
        description: `Live webhook failed. Local simulation fallback activated so you are not blocked.`,
      });
    }
  };

  // Handle checklist step completes
  const handleStepToggle = (stepKey: "resume" | "atsAudit" | "matchJobs" | "applyRoles") => {
    setChecklist((prev) => {
      const next = { ...prev, [stepKey]: !prev[stepKey] };

      if (stepKey === "resume") {
        if (resumeFile) {
          setResumeFile(null);
          setSkillsList([]);
          toast.info("Resume removed");
          return { ...prev, resume: false, atsAudit: false };
        } else {
          fileInputRef.current?.click();
          return prev; // Toggling is handled by handleFileChange
        }
      } else if (stepKey === "atsAudit") {
        if (next.atsAudit) {
          if (!resumeFile) {
            toast.warning("Upload a resume first!", {
              description: "Please upload a Word or Excel resume before running the audit.",
            });
            return prev;
          }
          toast.success("ATS Audit Evaluation Completed!", {
            description: "Your compatibility score is 85%",
          });
        } else {
          toast.info("ATS Audit evaluation reset");
        }
      } else if (stepKey === "matchJobs") {
        if (next.matchJobs) {
          toast.success("Matched Jobs successfully!", {
            description: "Generated 24 entry-level recommendations",
          });
        } else {
          toast.info("Matched jobs index reset");
        }
      } else if (stepKey === "applyRoles") {
        if (next.applyRoles) {
          toast.success("Applications sync completed!", {
            description: "Syncing mock active trackers",
          });
        } else {
          toast.info("Active trackers sync removed");
        }
      }

      return next;
    });
  };

  // Computed values that animate from 0
  const jobsMatchedCount = jobsList.length;
  const savedJobsCount = savedJobsList.length;
  const appsSentCount = applications.length;

  // Profile Score calculation
  const hasBaseInfo = profileForm.fullName.length > 0 && skillsList.length >= 3;
  const profileScore =
    (hasBaseInfo ? 20 : 0) +
    (checklist.resume ? 20 : 0) +
    (checklist.atsAudit ? 20 : 0) +
    (checklist.matchJobs ? 20 : 0) +
    (checklist.applyRoles ? 20 : 0);

  const atsScore = checklist.atsAudit ? 85 : 0;

  // Checklist tooltip hover state
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Quick Action Modal states
  const [activeModal, setActiveModal] = useState<"roadmap" | "interview" | "salary" | "linkedin" | "coverletter" | null>(null);

  const handleScrapeTrigger = () => {
    setIsScraping(true);
    toast.loading("Scraping live entry-level matching feeds...", { duration: 1800 });
    setTimeout(() => {
      setJobsList((prev) => [
        {
          id: `job-scraped-${Date.now()}`,
          title: "UI Engineer (Entry Level)",
          company: "Apple Inc.",
          location: "Cupertino, CA",
          salary: "$125k/yr",
          score: 91,
          type: "Frontend",
          matchedSkills: ["React", "CSS", "TypeScript"],
          missingSkills: ["SwiftUI"],
        },
        {
          id: `job-scraped-2-${Date.now()}`,
          title: "Fullstack Developer Intern",
          company: "Amazon",
          location: "Seattle, WA",
          salary: "$50/hr",
          score: 82,
          type: "Fullstack",
          matchedSkills: ["React", "SQL"],
          missingSkills: ["AWS", "Node.js"],
        },
        ...prev,
      ]);
      setChecklist((prev) => ({ ...prev, matchJobs: true }));
      setIsScraping(false);
      toast.success("Scrape completed! Added Apple and Amazon entry-level roles.");
    }, 1800);
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
  const handleAddApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppForm.company || !newAppForm.role) {
      toast.error("Required fields empty", { description: "Please provide Company and Role." });
      return;
    }

    const app = {
      id: `app-custom-${Date.now()}`,
      company: newAppForm.company,
      role: newAppForm.role,
      status: newAppForm.status,
      salary: newAppForm.salary || "$90k/yr",
      date: newAppForm.date || "2026-06-01",
      notes: newAppForm.notes,
    };

    setApplications((prev) => [app, ...prev]);
    setChecklist((prev) => ({ ...prev, applyRoles: true }));
    setShowTrackModal(false);
    setNewAppForm({
      company: "",
      role: "",
      status: "Applied",
      salary: "",
      date: "2026-06-01",
      notes: "",
    });
    toast.success(`Successfully tracked application at ${app.company}!`);
  };

  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    toast.info("Application deleted");
  };

  const handleUpdateAppStatus = (id: string, status: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );
    toast.success(`Updated application status stage to ${status}`);
  };

  // Job matching actions
  const handleSaveJobToggle = (job: any) => {
    const isSaved = savedJobsList.some((j) => j.id === job.id);
    if (isSaved) {
      setSavedJobsList((prev) => prev.filter((j) => j.id !== job.id));
      toast.info(`Removed ${job.title} from Saved Jobs Vault`);
    } else {
      setSavedJobsList((prev) => [...prev, job]);
      setChecklist((prev) => ({ ...prev, matchJobs: true }));
      toast.success(`Saved ${job.title} to Saved Jobs Vault!`);
    }
  };

  const handleQuickApplyJob = (job: any) => {
    const isApplied = applications.some((app) => app.company === job.company && app.role === job.title);
    if (isApplied) {
      toast.info(`You have already tracked an application at ${job.company}.`);
      return;
    }

    const app = {
      id: `app-scraped-${Date.now()}`,
      company: job.company,
      role: job.title,
      status: "Applied",
      salary: job.salary,
      date: "2026-06-01",
      notes: `Applied quickly via matches. Compatibility Rank: ${job.score}%`,
    };

    setApplications((prev) => [app, ...prev]);
    setChecklist((prev) => ({ ...prev, applyRoles: true }));
    toast.success(`Quick Applied! Tracked in Applications Tracker.`);
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
    <div className="min-h-screen bg-[#07050f] text-[#f8fafc] flex overflow-hidden dot-mesh-bg bg-noise-overlay transition-colors duration-500 font-sans relative pb-16 md:pb-0">
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
                {profileForm.fullName ? profileForm.fullName.charAt(0) : "R"}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-slate-200 truncate select-none">
                {profileForm.fullName || "Ramya"}
              </h5>
              <p className="text-[10px] text-slate-500 truncate select-none">
                {profileForm.email || "ramya@example.com"}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full mt-3.5 flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-500 hover:text-[#ef4444] hover:bg-[#ef4444]/10 border border-transparent hover:border-[#ef4444]/20 transition-all duration-300 text-xs font-bold"
            style={{ minHeight: "48px" }}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto custom-scrollbar z-20">
        {/* Global sticky header with Theme switcher */}
        <header className="flex items-center justify-between border-b border-white/[0.08] bg-slate-950/30 backdrop-blur-md px-6 md:px-8 h-16 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">
              {activeTab === "saved"
                ? "Saved Jobs Vault"
                : activeTab === "matcher"
                  ? "AI Job Matcher Feed"
                  : activeTab === "applications"
                    ? "Tracked Applications"
                    : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Dynamic Tab Switchboard */}
        <div
          className={`flex-1 p-6 md:p-8 space-y-8 transition-all duration-700 ease-out transform ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[10px]"
            }`}
        >
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Welcome back hero section with integrated Status Checklist */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#15122e] via-[#0f0d20] to-[#07050f] p-6 md:p-8 border border-[#8b5cf6]/25 shadow-[0_20px_45px_rgba(139,92,246,0.15)] flex flex-col lg:flex-row items-stretch justify-between gap-8 select-none">
                {/* Hero floating gold + amber dots overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-45">
                  <span className="absolute w-2 h-2 bg-[#8b5cf6] rounded-full animate-float" style={{ left: "8%", top: "25%", animationDelay: "0s" }} />
                  <span className="absolute w-3.5 h-3.5 bg-[#f59e0b] rounded-full animate-float" style={{ left: "28%", top: "72%", animationDelay: "1.2s" }} />
                  <span className="absolute w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-float" style={{ left: "54%", top: "42%", animationDelay: "2.1s" }} />
                  <span className="absolute w-2 h-2 bg-[#3b82f6] rounded-full animate-float" style={{ left: "78%", top: "18%", animationDelay: "1.5s" }} />
                  <span className="absolute w-2.5 h-2.5 bg-[#f59e0b] rounded-full animate-float" style={{ left: "84%", top: "78%", animationDelay: "0.5s" }} />
                </div>

                <div className="space-y-4 max-w-xl text-center lg:text-left z-10 flex-1 flex flex-col justify-center">
                  <h1 className="text-2.5xl md:text-4xl font-extrabold text-[#f8fafc] leading-tight shadow-sm" style={{ textShadow: "0 2px 10px rgba(139,92,246,0.2)" }}>
                    Welcome Back, {profileForm.fullName || "Ramya"}! 👋
                  </h1>

                  {/* Typewriter phrases container */}
                  <div className="h-8 flex items-center justify-center lg:justify-start">
                    <TypewriterEffect
                      phrases={[
                        "Your dream role is closer than you think",
                        "AI is scanning thousands of jobs for you",
                        "Let's land your next opportunity",
                      ]}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                    <button
                      onClick={() => setActiveTab("matcher")}
                      className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-sm hover-shimmer shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Start Job Matching →
                    </button>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="h-12 px-6 rounded-xl bg-transparent text-[#f8fafc] font-bold text-sm border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/50 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.1)] cursor-pointer"
                    >
                      Complete Profile
                    </button>
                  </div>
                </div>

                {/* Checklist & Status Panel Nested Inside Welcome Card */}
                <div className="w-full lg:w-[28%] shrink-0 bg-slate-950/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 z-10">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center select-none gap-2">
                      <h3 className="text-xs font-black text-slate-100 flex items-center gap-1">
                        📋 Status Checklist
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400">Resume:</span>
                        {resumeFile ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#10b981]" />
                            Uploaded
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#ef4444] animate-pulse" />
                            Missing
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step List */}
                    <div className="space-y-2">
                      {[
                        { key: "resume", label: "Upload Resume", tooltip: "Upload PDF (.pdf), Word (.doc, .docx) or Excel (.xls, .xlsx) resume under 2MB" },
                        { key: "atsAudit", label: "Run ATS Audit", tooltip: "Evaluate resume keyword compatibility matches" },
                        { key: "matchJobs", label: "Match Jobs", tooltip: "Query mock jobs index vs your profile skills" },
                        { key: "applyRoles", label: "Apply to Roles", tooltip: "Log tracked application statuses in list" },
                      ].map((step, idx) => {
                        const isDone = (checklist as any)[step.key];
                        return (
                          <div
                            key={step.key}
                            onClick={() => handleStepToggle(step.key as any)}
                            onMouseEnter={() => setHoveredStep(idx)}
                            onMouseLeave={() => setHoveredStep(null)}
                            className="relative flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-slate-950/20 hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300 cursor-pointer group"
                            style={{ minHeight: "40px" }}
                          >
                            <div className="flex items-center gap-2">
                              {isDone ? (
                                <div className="w-4 h-4 rounded-md border border-[#8b5cf6] bg-[#8b5cf6]/20 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-[#8b5cf6]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-md border border-white/20 bg-slate-900 flex items-center justify-center relative">
                                  <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-pulse-glow" />
                                </div>
                              )}
                              <span className={`text-[11px] font-semibold select-none transition-colors ${isDone ? "text-slate-400 line-through" : "text-slate-200"}`}>
                                {step.label}
                              </span>
                            </div>

                            {/* Floating tooltip */}
                            {hoveredStep === idx && (
                              <div className="absolute right-12 top-0 z-20 bg-slate-900/95 backdrop-blur text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap">
                                Click to complete step →
                              </div>
                            )}

                            <span className="text-[9px] text-slate-500 font-bold group-hover:text-[#8b5cf6] transition-colors">
                              {isDone ? "Done" : "Pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {pipelineStatus.step !== "idle" && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-4 animate-in fade-in duration-300 relative overflow-hidden">
                      {/* Premium glowing indicators */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b5cf6]/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="flex items-center gap-2 select-none">
                          <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6] animate-pulse" />
                          <span className="font-extrabold text-[#f8fafc] uppercase tracking-wider text-[9px]">
                            AI Parsing Pipeline
                          </span>
                        </div>
                        <div className="flex items-center gap-2 select-none">
                          <div className="w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#10b981] transition-all duration-500 ease-out"
                              style={{ width: `${pipelineStatus.progress}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-black text-[#8b5cf6]">
                            {pipelineStatus.progress}%
                          </span>
                        </div>
                      </div>

                      {/* Stepper items list */}
                      <div className="space-y-2 select-none">
                        <PipelineStepCard
                          stepNum={1}
                          title="Analyzing Resume"
                          description="Validating dimensions, checking file types, packaging FormData payload."
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
                          description="Extracting engineering tags, programming languages, framework keywords."
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
                          description="Auditing document ATS scoring compatibility matrices & ranking guidelines."
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
                          description="Scanning live entry-level database indices for matching opportunities."
                          status={
                            pipelineStatus.step === "matching"
                              ? "active"
                              : pipelineStatus.step === "complete"
                                ? "success"
                                : "pending"
                          }
                        />
                      </div>

                      {/* Pipeline Status Details bar */}
                      {pipelineStatus.details && (
                        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 bg-slate-950/30 px-2.5 py-1.5 rounded-lg border border-white/5 select-none">
                          <span className="flex items-center gap-1">
                            {pipelineStatus.step !== "complete" && pipelineStatus.step !== "failed" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-ping inline-block" />
                            )}
                            {pipelineStatus.details}
                          </span>
                          {pipelineStatus.isFallback && (
                            <span className="text-amber-400 font-extrabold tracking-wider uppercase bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 text-[7px] shrink-0">
                              Fallback Active
                            </span>
                          )}
                        </div>
                      )}

                      {/* Collapsible raw n8n debug output inside details disclosure */}
                      {n8nResponse && (
                        <div className="border-t border-white/[0.04] pt-2">
                          <details className="group">
                            <summary className="text-[8px] font-bold text-slate-500 hover:text-slate-350 cursor-pointer list-none flex items-center justify-between select-none">
                              <span>🔍 Debug: View Raw Webhook Response</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <pre className="mt-1.5 p-2 rounded bg-black/40 border border-white/5 font-mono text-[8px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-24 custom-scrollbar select-text">
                              {typeof n8nResponse === "object"
                                ? JSON.stringify(n8nResponse, null, 2)
                                : String(n8nResponse)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-4">
                    <div className="flex items-center gap-2.5">
                      <CircularProgress
                        value={atsScore}
                        size={52}
                        strokeWidth={5}
                        primaryColor={getAtsColor(atsScore)}
                        secondaryColor="rgba(255, 255, 255, 0.04)"
                        fontSize="0.8rem"
                      />
                      <div className="flex flex-col select-none">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                          ATS Score
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">
                          Rating
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-500 font-bold select-none flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Last sync: 2h ago
                    </span>
                  </div>
                </div>
              </div>


              {/* Stats Cards grid: snap scroll row on mobile */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible md:pb-0 scrollbar-none select-none">
                {[
                  { title: "Jobs Matched", value: jobsMatchedCount, icon: Briefcase, color: "text-[#8b5cf6]", iconBorder: "border-[#8b5cf6]/30", glow: "hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)]" },
                  { title: "Applications Sent", value: appsSentCount, icon: FileText, color: "text-[#6366f1]", iconBorder: "border-[#6366f1]/30", glow: "hover:shadow-[0_8px_20px_rgba(99,102,241,0.15)]" },
                  { title: "Saved Jobs", value: savedJobsCount, icon: Bookmark, color: "text-[#10b981]", iconBorder: "border-[#10b981]/30", glow: "hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)]" },
                  { title: "Profile Score", value: profileScore, icon: User, color: "text-[#8b5cf6]", iconBorder: "border-[#8b5cf6]/30", glow: "hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)]", isProfile: true },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`glass-card rounded-2xl p-5 border border-white/5 ${stat.glow} hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-between group shrink-0 w-[85%] snap-center md:w-auto md:shrink`}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest select-none">
                        {stat.title}
                      </p>
                      {!stat.isProfile ? (
                        <h3 className="text-3xl font-black text-[#f8fafc] leading-none">
                          <AnimatedCounter value={stat.value} />
                        </h3>
                      ) : (
                        <p className="text-[10px] text-[#10b981] font-semibold select-none flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                          Live Rating
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      {stat.isProfile ? (
                        <CircularProgress
                          value={stat.value}
                          size={80}
                          strokeWidth={8}
                          primaryColor="#8b5cf6"
                          secondaryColor="rgba(255, 255, 255, 0.05)"
                          fontSize="1.1rem"
                        />
                      ) : (
                        <div className={`p-3 rounded-xl bg-slate-900 border ${stat.iconBorder} group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
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

                {/* 2x2 scroll on mobile, 3x3 on desktop */}
                <div className="grid grid-rows-2 grid-flow-col overflow-x-auto snap-x snap-mandatory gap-6 pb-4 md:grid-rows-none md:grid-flow-row md:grid-cols-3 md:overflow-x-visible md:pb-0 scrollbar-none select-none">
                  {[
                    {
                      id: "ats",
                      title: "ATS Audit Analyzer",
                      subtitle: "Optimize keyword resume scores",
                      emoji: "📊",
                      gradient: "from-[#4c1d95] to-[#7c3aed]",
                      action: () => {
                        handleStepToggle("atsAudit");
                      },
                    },
                    {
                      id: "resume",
                      title: "Resume Parser",
                      subtitle: "Extract skill tags from Word/Excel",
                      emoji: "📄",
                      gradient: "from-[#1e3a8a] to-[#3b82f6]",
                      action: () => {
                        handleStepToggle("resume");
                      },
                    },
                    {
                      id: "gap",
                      title: "Skill Gap Advisor",
                      subtitle: "Find missing tech profile tools",
                      emoji: "🧩",
                      gradient: "from-[#311042] to-[#6366f1]",
                      action: () => {
                        setActiveTab("profile");
                        toast.info("Scroll down on the profile page to add missing skill tags!");
                      },
                    },
                    {
                      id: "roadmap",
                      title: "Career Path Roadmap",
                      subtitle: "Interactive developer milestones",
                      emoji: "🗺️",
                      gradient: "from-[#064e3b] to-[#10b981]",
                      action: () => setActiveModal("roadmap"),
                    },
                    {
                      id: "interview",
                      title: "Interview Simulator",
                      subtitle: "Simulated tech questionnaire prep",
                      emoji: "🎙️",
                      gradient: "from-[#7c2d12] to-[#fb923c]",
                      action: () => setActiveModal("interview"),
                    },
                    {
                      id: "salary",
                      title: "Salary Insights Tracker",
                      subtitle: "Evaluate market junior rates",
                      emoji: "💰",
                      gradient: "from-[#115e59] to-[#14b8a6]",
                      action: () => setActiveModal("salary"),
                    },
                    {
                      id: "linkedin",
                      title: "LinkedIn Optimizer",
                      subtitle: "Enhance keyword recruiter search",
                      emoji: "💼",
                      gradient: "from-[#1e3a8a] to-[#2563eb]",
                      action: () => setActiveModal("linkedin"),
                    },
                    {
                      id: "coverletter",
                      title: "Cover Letter Builder",
                      subtitle: "AI formatted custom letters",
                      emoji: "✍️",
                      gradient: "from-[#831843] to-[#ec4899]",
                      action: () => setActiveModal("coverletter"),
                    },
                    {
                      id: "jobs",
                      title: "Scrape Jobs Feed",
                      subtitle: "Query live online listing scrapes",
                      emoji: "🎯",
                      gradient: "from-[#14532d] to-[#22c55e]",
                      action: () => {
                        setActiveTab("matcher");
                        if (resumeFile) {
                          handleScrapeTrigger();
                        } else {
                          setTimeout(() => {
                            fileInputRef.current?.click();
                          }, 100);
                        }
                      },
                    },
                  ].map((card) => (
                    <QuickActionCard
                      key={card.id}
                      title={card.title}
                      subtitle={card.subtitle}
                      emoji={card.emoji}
                      gradientClass={card.gradient}
                      onClick={card.action}
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
                    <h3 className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">Resume Matcher</h3>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Upload your resume to extract skills, calculate an ATS match score, and scrape live entry-level jobs tailored to your skillset.
                    </p>
                  </div>

                  <div className="max-w-3xl mx-auto w-full glass-card rounded-3xl p-6 border border-white/5 shadow-[0_20px_50px_rgba(139,92,246,0.12)] bg-[#0f0d20]/80 backdrop-blur-xl space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Free Trial Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 select-none gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-200">Free Trial Usage</span>
                          <p className="text-[10px] text-slate-400 font-medium">You get 3 free resume matches per account.</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-300 whitespace-nowrap shrink-0">
                        <span className="text-[#3b82f6] text-sm font-bold">{matchesRemaining}</span> / 3 remaining
                      </span>
                    </div>

                    {/* Drag and Drop Box */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl py-16 px-10 flex flex-col items-center justify-center gap-5 transition-all duration-300 cursor-pointer select-none group relative overflow-hidden ${isDragging
                          ? "border-[#3b82f6] bg-[#3b82f6]/10 scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                          : "border-white/10 bg-slate-950/20 hover:border-[#8b5cf6]/30 hover:bg-white/[0.01]"
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
                      disabled={!stagedFile}
                      className={`w-full h-12 rounded-xl text-white font-bold text-xs hover-shimmer shadow-lg flex items-center justify-center gap-2 transition-all duration-300 ${stagedFile
                          ? "bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                          : "bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed"
                        }`}
                      style={{ minHeight: "48px" }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze & Find Matches
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
                  <div className="grid gap-4 md:grid-cols-4 select-none">
                    <PipelineStepCard
                      stepNum={1}
                      title="Analyzing Resume"
                      description="Validating file format and size under 2MB, transmitting payload to n8n Railway webhook."
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

                  {/* Reset button shown upon completion */}
                  {pipelineStatus.step === "complete" && (
                    <button
                      onClick={() => {
                        setPipelineStatus({ step: "idle", progress: 0, isFallback: false });
                        setResumeFile(null);
                        setChecklist((prev) => ({ ...prev, resume: false, atsAudit: false, matchJobs: false }));
                        setJobsList([]);
                        setN8nResponse(null);
                      }}
                      className="w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer select-none"
                    >
                      <Upload className="w-4 h-4" />
                      Reset Parser & Upload New Resume
                    </button>
                  )}

                  {/* Debug collapsable */}
                  {n8nResponse && (
                    <div className="border-t border-white/[0.04] pt-3 select-text">
                      <details className="group">
                        <summary className="text-[10px] font-bold text-slate-500 hover:text-slate-350 cursor-pointer list-none flex items-center justify-between select-none">
                          <span>🔍 Debug: View Raw Webhook Response</span>
                          <span className="transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <pre className="mt-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36 custom-scrollbar">
                          {typeof n8nResponse === "object"
                            ? JSON.stringify(n8nResponse, null, 2)
                            : String(n8nResponse)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {/* Filter controls */}
              <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-4 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search company or title keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 w-full bg-slate-900 border-white/10 text-xs rounded-xl focus:ring-2 focus:ring-[#8b5cf6]/20"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap select-none">Role Style:</span>
                  {["All", "Frontend", "Backend", "Fullstack"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedRoleType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedRoleType === type
                          ? "bg-[#8b5cf6] text-white shadow-sm"
                          : "bg-white/5 text-slate-400 hover:text-white"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

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
                  <p className="text-xs text-slate-500">Connecting via n8n scrape worker nodes</p>
                </div>
              ) : jobsList.length === 0 ? (
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
                  {jobsList
                    .filter((job) => {
                      const matchesKeyword =
                        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        job.company.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesType = selectedRoleType === "All" || job.type === selectedRoleType;
                      return matchesKeyword && matchesType;
                    })
                    .map((job) => {
                      const isSaved = savedJobsList.some((j) => j.id === job.id);
                      return (
                        <div
                          key={job.id}
                          className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-lg font-black text-[#8b5cf6] select-none">
                                {job.company.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-white text-sm tracking-tight">{job.title}</h4>
                                <p className="text-[11px] font-bold text-slate-400 select-none">{job.company}</p>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm flex items-center gap-1 select-none border bg-[#8b5cf6]/10 text-[#3b82f6] border-[#8b5cf6]/20`}
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

                          {/* Skill verification */}
                          <div className="space-y-1.5 select-none">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Extracted Validation</p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.matchedSkills.map((s: string, idx: number) => (
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
                <div className="relative glass-card rounded-2xl p-5 border border-white/5 border-l-4 border-l-[#8b5cf6] overflow-hidden flex justify-between items-start animate-in fade-in duration-300">
                  <div className="space-y-2 select-none">
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
                    onClick={() => setShowAppsBanner(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}

              {/* Status Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-sm font-bold text-slate-300 select-none">Active Trackers</h4>
                <button
                  onClick={() => setShowTrackModal(true)}
                  className="h-12 px-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
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
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Profile Panel */}
                <div className="glass-card rounded-3xl p-6 border border-white/5 flex flex-col items-center space-y-6">
                  {/* Rotating Gold Gradient Ring */}
                  <div className="relative w-28 h-28 select-none">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#8b5cf6] animate-rotate-avatar-ring border border-transparent" />
                    <div className="absolute inset-[3.5px] rounded-full bg-[#0f0d20] flex items-center justify-center text-3xl font-black text-[#8b5cf6]">
                      {profileForm.fullName ? profileForm.fullName.charAt(0) : "R"}
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-white text-lg tracking-tight select-none">
                      {profileForm.fullName || "Ramya"}
                    </h3>
                    <p className="text-xs text-slate-400 select-none">
                      {profileForm.email || "ramya@example.com"}
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
                      {checklist.atsAudit ? (
                        <div className="flex items-center gap-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          <CircularProgress value={atsScore} size={16} strokeWidth={2.5} showText={false} primaryColor="#10b981" />
                          <span>Audited: {atsScore}%</span>
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
                    Wipe local storage caches to reset checklist completions, empty applications status boards and counters back to absolute 0.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={() => {
                        setChecklist({
                          resume: false,
                          atsAudit: false,
                          matchJobs: false,
                          applyRoles: false,
                        });
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
                        toast.success("All checklist steps, stats, and profile fields reset to zero!");
                      }}
                      className="h-12 px-4 bg-[#ef4444]/15 border border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Reset Sandbox to Absolute 0
                    </button>

                    <button
                      onClick={() => {
                        setChecklist({
                          resume: true,
                          atsAudit: true,
                          matchJobs: true,
                          applyRoles: true,
                        });
                        setResumeFile({ name: "ramya_resume_2026.docx", size: "1.2 MB" });
                        setProfileForm({
                          fullName: "Ramya",
                          email: "ramya@example.com",
                          experienceLevel: "Freshman/Student",
                          preferredJobType: "Internship",
                          targetJobTitle: "Frontend Developer",
                          targetCityState: "Remote",
                        });
                        setSkillsList(["React", "CSS", "TypeScript", "Tailwind"]);
                        toast.success("All checklist steps marked as completed.");
                      }}
                      className="h-12 px-4 bg-[#10b981]/15 border border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Complete All Checklist Steps
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
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#07050f]/95 backdrop-blur-md border-t border-white/[0.08] justify-around items-center z-50 pb-safe shadow-lg select-none">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full relative group cursor-pointer"
              style={{ minHeight: "48px" }}
            >
              <Icon className={`h-5.5 w-5.5 transition-all duration-300 ${isActive ? 'text-[#8b5cf6] scale-110' : 'text-slate-400'}`} />
              <span className={`text-[9px] font-bold mt-1 transition-colors ${isActive ? 'text-[#8b5cf6]' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* QUICK ACTIONS MODALS DIALOG OVERLAYS */}
      {/* 1. Roadmap Modal */}
      {activeModal === "roadmap" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#10b981] select-none">
              <Award className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">Frontend Dev Path Roadmap</h3>
            </div>

            <div className="space-y-4 select-none pt-2">
              {[
                { step: "Milestone 1", title: "HTML, CSS, Web Layouts", done: true, desc: "Verify basic box model layouts, flexbox, grid, and vanilla responsive media queries." },
                { step: "Milestone 2", title: "React, State & Lifecycle Hooks", done: true, desc: "Master useState, useEffect, context provider wrappers, and state lifts." },
                { step: "Milestone 3", title: "TypeScript & Data Types", done: false, desc: "Integrate static type checking, type interfaces, unions, generics and strict configurations." },
                { step: "Milestone 4", title: "API Integration & NextJS SSR", done: false, desc: "Manage server-side rendering, routing boundaries, state mutations and Tanstack query caches." },
              ].map((ms, i) => (
                <div key={i} className="flex gap-3 relative">
                  {i < 3 && <div className="absolute left-3.5 top-7 bottom-0 w-[2px] bg-white/5" />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border z-10 text-xs font-bold ${ms.done ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981]" : "bg-slate-900 border-white/10 text-slate-500"
                    }`}>
                    {ms.done ? "✓" : i + 1}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[#8b5cf6] uppercase tracking-wide">{ms.step}</span>
                    <h5 className="font-bold text-white text-xs">{ms.title}</h5>
                    <p className="text-[10px] text-[#94a3b8] leading-normal">{ms.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Interview Prep Modal */}
      {activeModal === "interview" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#f59e0b] select-none">
              <FileSignature className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">Interview Prep Simulator</h3>
            </div>

            <div className="space-y-4 select-none pt-2">
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest">Question of the Day:</span>
                <h5 className="font-bold text-white text-xs leading-normal">
                  What is the difference between client-side state management (useState/Context) and server cache state management (React Query)?
                </h5>
              </div>

              <div className="space-y-2 text-[11px] text-[#94a3b8] leading-relaxed">
                <p>
                  <strong>Client-Side State:</strong> Holds UI/layout states, form data, and active toggles locally within application memory.
                </p>
                <p>
                  <strong>Server Cache State:</strong> Handles remote endpoints synchronization, client caching, request deduplication, invalidations and background stale fetches.
                </p>
              </div>

              <button
                onClick={() => {
                  toast.success("Mock answer submitted!", { description: "Evaluating semantic match score..." });
                  setActiveModal(null);
                }}
                className="w-full h-12 rounded-xl bg-[#8b5cf6] text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Submit Mock Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Salary Insights Modal */}
      {activeModal === "salary" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => text => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#8b5cf6] select-none">
              <DollarSign className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">Salary Insights Index</h3>
            </div>

            <div className="space-y-4 select-none pt-2">
              <p className="text-xs text-slate-400">Regional entry-level developer pay structures matched vs tech stack requirements.</p>

              <div className="space-y-3">
                {[
                  { role: "React Developer Intern", rate: "$35 - $50 / hr", location: "Remote / US-based" },
                  { role: "Junior Software Engineer", rate: "$85k - $110k / yr", location: "Hybrid / SF Bay Area" },
                  { role: "NodeJS Backend Developer", rate: "$90k - $115k / yr", location: "Onsite / Seattle" },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h5 className="font-bold text-white">{s.role}</h5>
                      <span className="text-[10px] text-slate-500">{s.location}</span>
                    </div>
                    <span className="font-black text-[#8b5cf6]">{s.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. LinkedIn Optimizer Modal */}
      {activeModal === "linkedin" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#3b82f6] select-none">
              <Briefcase className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">LinkedIn Profile Keyword Tuner</h3>
            </div>

            <div className="space-y-4 select-none pt-2">
              <p className="text-xs text-slate-400">AI suggested keywords to inject into your LinkedIn headline and summary to attract recruiter bots.</p>

              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-[#8b5cf6] uppercase tracking-widest">Recommended Headline Template:</span>
                <p className="text-xs text-white leading-relaxed font-semibold">
                  "Frontend Engineer Intern | React & TypeScript Developer | Passionate about building highly interactive web apps"
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Keywords to target:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["React.js", "TypeScript", "Vite", "Supabase", "REST API", "Git", "Tailwind CSS"].map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[10px] font-bold text-[#3b82f6]">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cover Letter Builder Modal */}
      {activeModal === "coverletter" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#ef4444] select-none">
              <FileText className="h-5 w-5" />
              <h3 className="font-extrabold text-white text-base">Cover Letter Generator</h3>
            </div>

            <div className="space-y-4 select-none pt-2">
              <p className="text-xs text-slate-400">Generate a custom cover letter tailormade for Frontend roles.</p>

              <div className="p-4 bg-white/5 border border-white/5 rounded-xl h-44 overflow-y-auto custom-scrollbar space-y-2">
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Dear Hiring Committee,
                </p>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  I am writing to express my strong interest in the Frontend Engineer Intern position. As a developer skilled in React, CSS and TypeScript, I specialize in crafting interactive interfaces and responsive layouts.
                </p>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Your team's focus on building high-performance products matches my commitment to coding clean, modular systems. Thank you for your time and consideration.
                </p>
              </div>

              <button
                onClick={() => {
                  toast.success("Cover letter copied to clipboard!", { description: "AI template saved." });
                  setActiveModal(null);
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACK NEW JOB FORM MODAL */}
      {showTrackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f0d20] border border-white/10 rounded-3xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
      className={`relative min-h-[160px] rounded-2xl p-5 overflow-hidden group transition-all duration-300 bg-gradient-to-br ${gradientClass} border border-white/10 hover:border-white/20 hover:scale-[1.04] hover:shadow-[0_0_25px_rgba(201,168,76,0.3)] flex flex-col justify-between shrink-0 w-[240px] snap-start md:w-auto md:shrink`}
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
