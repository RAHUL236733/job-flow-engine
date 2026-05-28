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
  Search,
  History,
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

type Job = {
  title: string;
  company: string;
  location: string;
  skills: string;
  url: string;
  score: string;
  description?: string;
  type?: string; // Full-time, Internship, etc.
  experience?: string; // Entry, Mid, Senior
  saved_at?: string;
};

type SearchHistoryItem = {
  id?: string;
  user_id: string;
  query: string | null;
  role: string | null;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  searched_at: string;
};

type FilterOptions = {
  role: string;
  location: string;
  jobType: string;
  experienceLevel: string;
};

type ActiveTab = "search" | "matcher" | "saved" | "history" | "profile";

const STEPS = [
  { label: "Extracting skills from your resume...", at: 0 },
  { label: "Spawning live AI web scrapers across job boards...", at: 3000 },
  { label: "Analyzing company listings against your profile...", at: 7000 },
  { label: "Finalizing your custom recommendation dashboard...", at: 11000 },
];

const ACCEPTED_EXTS = [".pdf", ".doc", ".docx"];

function Dashboard() {
  const { user, profile, isLoading: authLoading, signOut, updateProfile, isMockMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>("matcher");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Resume Matcher State
  const [matcherPhase, setMatcherPhase] = useState<"upload" | "loading" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [atsScore, setAtsScore] = useState<number>(0);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterExperience, setFilterExperience] = useState("All");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);

  // Saved Jobs State
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);

  // Search History State
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Job Detail Modal State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // --- DATABASE HELPERS (WITH DEMO LOCALSTORAGE FALLBACK) ---

  const loadCachedResumeResults = useCallback(async () => {
    if (!user) return;

    // Check profile for existing resume data
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
        } catch {
          // ignore
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
      // No cache found or expired
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
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        // Upsert cache
        await supabase.from("cached_job_results").upsert(
          {
            query_hash: queryHash,
            jobs: jobsList,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: "query_hash" },
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

  const fetchSearchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);

    if (isMockMode) {
      const mockHistory = localStorage.getItem(`mock_search_history_${user.id}`);
      setSearchHistory(mockHistory ? JSON.parse(mockHistory) : []);
      setHistoryLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("searched_at", { ascending: false });

      if (error) throw error;
      setSearchHistory((data as SearchHistoryItem[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to load search history", { description: msg });
    } finally {
      setHistoryLoading(false);
    }
  }, [user, isMockMode]);

  const saveSearchHistory = useCallback(
    async (queryText: string, filters: FilterOptions) => {
      if (!user) return;

      const historyRecord: SearchHistoryItem = {
        user_id: user.id,
        query: queryText || null,
        role: filters.role || null,
        location: filters.location || null,
        job_type: filters.jobType || null,
        experience_level: filters.experienceLevel || null,
        searched_at: new Date().toISOString(),
      };

      if (isMockMode) {
        const saved = localStorage.getItem(`mock_search_history_${user.id}`);
        const list = saved ? JSON.parse(saved) : [];
        const updated = [historyRecord, ...list].slice(0, 50); // limit to 50
        setSearchHistory(updated);
        localStorage.setItem(`mock_search_history_${user.id}`, JSON.stringify(updated));
        return;
      }

      try {
        await supabase.from("search_history").insert(historyRecord);
      } catch (err) {
        console.error("Failed to save search history:", err);
      }
    },
    [user, isMockMode],
  );

  const deleteSearchHistory = useCallback(
    async (id: string, index: number) => {
      if (!user) return;

      if (isMockMode) {
        const list = [...searchHistory];
        list.splice(index, 1);
        setSearchHistory(list);
        localStorage.setItem(`mock_search_history_${user.id}`, JSON.stringify(list));
        toast.success("History item deleted");
        return;
      }

      try {
        const { error } = await supabase
          .from("search_history")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
        setSearchHistory(searchHistory.filter((item) => item.id !== id));
        toast.success("History item deleted");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("Failed to delete history item", { description: msg });
      }
    },
    [user, searchHistory, isMockMode],
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
    setMatcherPhase("loading");
    startLoadingSteps();

    try {
      const fd = new FormData();
      fd.append("resume", file);

      // Use VITE_N8N_WEBHOOK_URL env if present, else fallback
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_N8N_URL;

      const res = await fetch(webhookUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      let parsedData = data;

      // 1. Unpack n8n wrapper if wrapped in an array of execution items [ { json: ... } ]
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (firstItem && typeof firstItem === "object") {
          if ("json" in firstItem) {
            parsedData = firstItem.json;
          } else if ("body" in firstItem) {
            parsedData = firstItem.body;
          } else if (!("title" in firstItem) && !("company" in firstItem)) {
            // It's a wrapped object but not a direct job object
            parsedData = firstItem;
          }
        }
      } else if (data && typeof data === "object" && "json" in data) {
        parsedData = data.json;
      }

      // 2. Extract job list
      let rawJobs: Job[] = [];
      if (Array.isArray(parsedData)) {
        rawJobs = parsedData;
      } else if (parsedData && typeof parsedData === "object") {
        rawJobs = parsedData.topJobs ?? parsedData.jobs ?? parsedData.data ?? [];
      }

      // 3. Normalize job items in case they are wrapped individually e.g. [ { json: { title: "..." } } ]
      if (Array.isArray(rawJobs)) {
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

      // 4. Extract skills
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
        // Fallback to extracting from jobs
        derivedSkills = Array.from(
          new Set(
            rawJobs.flatMap((j) => (j.skills ? j.skills.split(",").map((s) => s.trim()) : [])),
          ),
        ).slice(0, 10);
      }

      // 5. Extract ATS Score
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
      setJobs(rawJobs.slice(0, 8)); // Top 8 matches
      setAtsScore(derivedScore);
      setParsedSkills(derivedSkills);
      setMatcherPhase("results");

      // Save to database cache
      await cacheResumeResults(rawJobs.slice(0, 8), derivedScore, derivedSkills);

      // Update user profile with skills & score
      await updateProfile({
        skills: derivedSkills.join(", "),
        ats_score: derivedScore,
        resume_name: file.name,
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

  // --- JOB SEARCH / FILTER LOGIC ---

  const handleJobSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setSearching(true);

      // Save search to database history
      await saveSearchHistory(searchQuery, {
        role: filterRole,
        location: filterLocation,
        jobType: filterType,
        experienceLevel: filterExperience,
      });

      // Simulated Search - Filters the cached database + mock jobs
      setTimeout(() => {
        // Start with user's recommended jobs, and add some beautiful predefined jobs for diversity
        const baseJobs: Job[] = [
          ...jobs,
          {
            title: "Frontend Developer Internship",
            company: "Vercel Inc.",
            location: "Remote",
            skills: "React, TypeScript, Next.js, CSS, HTML",
            url: "https://vercel.com/careers",
            score: "94%",
            type: "Internship",
            experience: "Entry Level",
            description:
              "Work with the Next.js core team building modern, user-friendly frontend developer tooling.",
          },
          {
            title: "Junior Full Stack Engineer",
            company: "Supabase Corp",
            location: "New York, NY",
            skills: "PostgreSQL, React, TypeScript, Node.js",
            url: "https://supabase.com/careers",
            score: "89%",
            type: "Full-time",
            experience: "Entry Level",
            description:
              "Help build the open source Firebase alternative. Build dashboard and API features.",
          },
          {
            title: "React Native Mobile Developer",
            company: "Airbnb",
            location: "San Francisco, CA",
            skills: "React Native, React, JavaScript, Mobile",
            url: "https://airbnb.com/careers",
            score: "85%",
            type: "Full-time",
            experience: "Mid Level",
            description:
              "Design and implement custom mobile user interfaces and transition animations.",
          },
          {
            title: "Software Engineering Fellow",
            company: "Google LLC",
            location: "Mountain View, CA",
            skills: "Python, C++, Java, Algorithms",
            url: "https://google.com/careers",
            score: "80%",
            type: "Internship",
            experience: "Entry Level",
            description:
              "12-week summer engineering fellowship for university graduates and students.",
          },
          {
            title: "Data Analyst Graduate",
            company: "Netflix",
            location: "Los Angeles, CA",
            skills: "SQL, Python, Excel, Tableau, Analytics",
            url: "https://netflix.com/careers",
            score: "78%",
            type: "Full-time",
            experience: "Entry Level",
            description: "Deep dive into movie recommendation analytics and viewer metrics.",
          },
        ];

        // Remove duplicates by URL
        const uniqueBase = baseJobs.filter(
          (job, idx, self) => self.findIndex((j) => j.url === job.url) === idx,
        );

        // Filter jobs
        const filtered = uniqueBase.filter((job) => {
          // Query match
          const matchesQuery =
            searchQuery === "" ||
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.skills.toLowerCase().includes(searchQuery.toLowerCase());

          // Role Category match
          const matchesRole =
            filterRole === "All" ||
            (filterRole === "Frontend" && job.title.toLowerCase().includes("front")) ||
            (filterRole === "Backend" && job.title.toLowerCase().includes("back")) ||
            (filterRole === "Fullstack" && job.title.toLowerCase().includes("full")) ||
            (filterRole === "Data" &&
              (job.title.toLowerCase().includes("data") ||
                job.title.toLowerCase().includes("analyst")));

          // Location match
          const matchesLocation =
            filterLocation === "All" ||
            (filterLocation === "Remote" && job.location.toLowerCase().includes("remote")) ||
            (filterLocation === "Onsite" && !job.location.toLowerCase().includes("remote"));

          // Job Type match
          const matchesType =
            filterType === "All" ||
            (filterType === "Full-time" && (job.type === "Full-time" || !job.type)) ||
            (filterType === "Internship" && job.type === "Internship");

          // Experience match
          const matchesExp =
            filterExperience === "All" ||
            (filterExperience === "Entry" &&
              (job.experience === "Entry Level" || !job.experience)) ||
            (filterExperience === "Mid" && job.experience === "Mid Level");

          return matchesQuery && matchesRole && matchesLocation && matchesType && matchesExp;
        });

        setSearchResults(filtered);
        setSearching(false);
      }, 800);
    },
    [
      jobs,
      searchQuery,
      filterRole,
      filterLocation,
      filterType,
      filterExperience,
      saveSearchHistory,
    ],
  );

  const loadSearchData = useCallback(async () => {
    handleJobSearch();
  }, [handleJobSearch]);

  const handleApplyHistorySearch = useCallback((item: SearchHistoryItem) => {
    setSearchQuery(item.query || "");
    setFilterRole(item.role || "All");
    setFilterLocation(item.location || "All");
    setFilterType(item.job_type || "All");
    setFilterExperience(item.experience_level || "All");
    setActiveTab("search");
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth/signin" });
    }
  }, [user, authLoading, navigate]);

  // Load saved jobs & search history when tab changes
  useEffect(() => {
    if (user) {
      if (activeTab === "saved") {
        fetchSavedJobs();
      } else if (activeTab === "history") {
        fetchSearchHistory();
      } else if (activeTab === "search") {
        loadSearchData();
      } else if (activeTab === "matcher") {
        loadCachedResumeResults();
      }
    }
  }, [
    user,
    activeTab,
    fetchSavedJobs,
    fetchSearchHistory,
    loadSearchData,
    loadCachedResumeResults,
  ]);

  // --- PROFILE LOGIC ---

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updates = {
      full_name: fd.get("fullName") as string,
      experience_level: fd.get("experienceLevel") as string,
      preferred_role: fd.get("preferredRole") as string,
      preferred_location: fd.get("preferredLocation") as string,
      job_type: fd.get("jobType") as string,
      skills: fd.get("skills") as string,
    };

    const success = await updateProfile(updates);
    if (success) {
      // Reload profile skills in matcher if saved
      setParsedSkills(
        (fd.get("skills") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
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

  // --- COMPONENTS ---

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
          "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground shadow-elegant scale-[1.02]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")}
      >
        <Icon className="h-4.5 w-4.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card/60 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
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
          <NavItem tab="matcher" icon={Sparkles} label="Resume Matcher" />
          <NavItem tab="search" icon={Search} label="Search Jobs" />
          <NavItem tab="saved" icon={Bookmark} label="Saved Jobs" />
          <NavItem tab="history" icon={History} label="Search History" />
          <NavItem tab="profile" icon={UserIcon} label="My Profile" />
        </nav>

        {/* User Card */}
        <div className="border-t border-border p-4 space-y-3">
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg h-9 w-9"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="flex-1 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 text-xs"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* MOBILE SHEETS HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card/80 backdrop-blur-md z-40 flex items-center justify-between px-4">
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
          <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border">
            <div className="flex h-16 items-center border-b border-border px-6">
              <span className="text-base font-bold tracking-tight text-foreground">
                Dashboard Menu
              </span>
            </div>
            <nav className="flex-1 space-y-1.5 p-4">
              <NavItem tab="matcher" icon={Sparkles} label="Resume Matcher" />
              <NavItem tab="search" icon={Search} label="Search Jobs" />
              <NavItem tab="saved" icon={Bookmark} label="Saved Jobs" />
              <NavItem tab="history" icon={History} label="Search History" />
              <NavItem tab="profile" icon={UserIcon} label="My Profile" />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 space-y-3 bg-card/90">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-lg h-9 w-9"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex-1 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 text-xs"
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 mt-16 md:mt-0">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* TAB 1: RESUME MATCHER */}
          {activeTab === "matcher" && (
            <div className="space-y-6">
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
                <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8 space-y-6">
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
                      "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all",
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
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
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
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
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  )}

                  <Button
                    onClick={handleResumeSubmit}
                    disabled={!file}
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-elegant"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze &amp; Find Matches
                  </Button>
                </div>
              )}

              {matcherPhase === "loading" && (
                <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 shadow-elegant text-center space-y-6">
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
                  {/* ATS Analytics Panel */}
                  <div className="grid gap-6 md:grid-cols-3">
                    <Card className="p-6 flex flex-col items-center justify-center text-center shadow-elegant border-primary/10 bg-primary/5">
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

                    <Card className="p-6 md:col-span-2 shadow-elegant flex flex-col justify-between">
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

                  {/* Job Matches */}
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
                      <Card className="p-10 text-center text-muted-foreground shadow-elegant border-dashed">
                        No matches found. Try a resume with different keywords.
                      </Card>
                    ) : (
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {jobs.map((job, i) => {
                          const isBookmarked = savedJobs.some((sj) => sj.url === job.url);
                          return (
                            <Card
                              key={i}
                              className="group flex flex-col justify-between p-5 shadow-elegant hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20"
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
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
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                                    <BookmarkCheck className="h-4.5 w-4.5 text-primary fill-primary" />
                                  ) : (
                                    <Bookmark className="h-4.5 w-4.5" />
                                  )}
                                </Button>
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all h-9"
                                >
                                  Apply Now
                                  <ExternalLink className="h-3.5 w-3.5" />
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

          {/* TAB 2: JOB & INTERNSHIP SEARCH */}
          {activeTab === "search" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Search className="h-6 w-6 text-primary" />
                  Search Jobs &amp; Internships
                </h1>
                <p className="text-sm text-muted-foreground">
                  Filter and search across recently cached job postings and verified opportunities.
                </p>
              </div>

              {/* SEARCH FILTERS CARD */}
              <Card className="p-5 shadow-elegant border-border">
                <form onSubmit={handleJobSearch} className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search roles, keywords, or company names..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={searching}
                      className="h-11 px-5 rounded-xl font-bold"
                    >
                      {searching ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Search"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="filter-role" className="text-xs text-muted-foreground">
                        Role Group
                      </Label>
                      <select
                        id="filter-role"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg h-9 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Categories</option>
                        <option value="Frontend">Frontend Developer</option>
                        <option value="Backend">Backend Developer</option>
                        <option value="Fullstack">Full Stack Developer</option>
                        <option value="Data">Data Analytics/Science</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="filter-loc" className="text-xs text-muted-foreground">
                        Work Location
                      </Label>
                      <select
                        id="filter-loc"
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg h-9 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Locations</option>
                        <option value="Remote">Remote Only</option>
                        <option value="Onsite">On-site / Hybrid</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="filter-type" className="text-xs text-muted-foreground">
                        Job Type
                      </Label>
                      <select
                        id="filter-type"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg h-9 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Types</option>
                        <option value="Full-time">Full-Time Job</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="filter-exp" className="text-xs text-muted-foreground">
                        Experience Level
                      </Label>
                      <select
                        id="filter-exp"
                        value={filterExperience}
                        onChange={(e) => setFilterExperience(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg h-9 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Experience</option>
                        <option value="Entry">Student / Freshers</option>
                        <option value="Mid">Associate / Mid Level</option>
                      </select>
                    </div>
                  </div>
                </form>
              </Card>

              {/* SEARCH RESULTS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Search Results ({searchResults.length})
                  </h3>
                </div>

                {searching ? (
                  <div className="py-20 text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground font-semibold">
                      Filtering jobs matching filters...
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground shadow-elegant border-dashed">
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="font-semibold text-sm">No jobs match your filters</p>
                      <p className="text-xs">
                        Try broadening your search keywords or location filters.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((job, i) => {
                      const isBookmarked = savedJobs.some((sj) => sj.url === job.url);
                      return (
                        <Card
                          key={i}
                          className="group flex flex-col justify-between p-5 shadow-elegant hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
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
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {job.location || "Remote"}
                            </p>

                            {job.type && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0">
                                {job.type}
                              </Badge>
                            )}

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
                                <BookmarkCheck className="h-4.5 w-4.5 text-primary fill-primary" />
                              ) : (
                                <Bookmark className="h-4.5 w-4.5" />
                              )}
                            </Button>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all h-9"
                            >
                              Apply Now
                              <ExternalLink className="h-3.5 w-3.5" />
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

          {/* TAB 3: SAVED JOBS */}
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
                <Card className="p-12 text-center text-muted-foreground shadow-elegant border-dashed">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-sm">No saved jobs yet</p>
                    <p className="text-xs">
                      When you match or search for jobs, click the bookmark icon to save them here.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {savedJobs.map((job, i) => (
                    <Card
                      key={i}
                      className="group flex flex-col justify-between p-5 shadow-elegant hover:-translate-y-1 transition-all duration-300 border-border hover:border-primary/20"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
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
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                          <Trash2 className="h-4.5 w-4.5" />
                        </Button>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all h-9"
                        >
                          Apply Now
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SEARCH HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <History className="h-6 w-6 text-primary" />
                  Search History
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review and re-run your previous job search queries and filter setups.
                </p>
              </div>

              {historyLoading ? (
                <div className="py-20 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground font-semibold">
                    Loading search history...
                  </p>
                </div>
              ) : searchHistory.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground shadow-elegant border-dashed">
                  <div className="max-w-xs mx-auto space-y-2">
                    <History className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-sm">No search history yet</p>
                    <p className="text-xs">
                      Queries you enter in the "Search Jobs" section will be archived here.
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="shadow-elegant border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Search Keywords</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Location</th>
                          <th className="px-6 py-4">Job Type / Exp</th>
                          <th className="px-6 py-4">Searched On</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {searchHistory.map((item, index) => (
                          <tr
                            key={item.id || index}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-foreground">
                              {item.query || (
                                <span className="italic text-muted-foreground">Empty Query</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="px-2 py-0">
                                {item.role || "All"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {item.location || "All"}
                            </td>
                            <td className="px-6 py-4 space-x-1">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {item.job_type || "All"}
                              </span>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {item.experience_level || "All"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {item.searched_at
                                ? new Date(item.searched_at).toLocaleDateString()
                                : ""}
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplyHistorySearch(item)}
                                className="rounded-lg text-primary hover:bg-primary/10 h-8"
                              >
                                Re-run
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (item.id) {
                                    deleteSearchHistory(item.id, index);
                                  } else {
                                    deleteSearchHistory("", index);
                                  }
                                }}
                                className="rounded-lg text-destructive hover:bg-destructive/10 h-8 w-8"
                                title="Delete history item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 5: MY PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <UserIcon className="h-6 w-6 text-primary" />
                  My Profile &amp; Preferences
                </h1>
                <p className="text-sm text-muted-foreground">
                  Update your background, professional experiences, and target preferences to align
                  AI recommendation criteria.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Profile Meta Cards */}
                <Card className="p-6 h-fit text-center space-y-4 shadow-elegant border-border">
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

                {/* Profile Edit Form */}
                <Card className="p-6 md:col-span-2 shadow-elegant border-border">
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
                      className="h-10 px-5 rounded-xl font-bold w-full sm:w-auto shadow-elegant"
                    >
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
                      <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
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
                      <BookmarkCheck className="mr-1.5 h-4.5 w-4.5 text-primary fill-primary" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-1.5 h-4.5 w-4.5" />
                      Save Job
                    </>
                  )}
                </Button>
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all h-10 text-sm shadow-elegant"
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
