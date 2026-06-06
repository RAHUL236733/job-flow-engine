import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Briefcase,
  Sparkles,
  Search,
  Bookmark,
  FileText,
  Lock,
  ArrowRight,
  User,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  Globe,
  TrendingUp,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Job Flow Engine - Premium Student & Fresher Job Platform" },
      {
        name: "description",
        content:
          "Instant AI-powered resume analyzer, ATS scorer, and live job scraper built for students and entry-level job seekers.",
      },
    ],
  }),
});

function LandingPage() {
  const { user, signIn, signUp, signOut, isLoading, isMockMode, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup" | "forgot">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forgot password states
  const [cooldown, setCooldown] = useState(0);
  const [successSent, setSuccessSent] = useState(false);

  // Reset modal fields and forgot state on tab or open status change
  useEffect(() => {
    setFullName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setSubmitting(false);
    setSuccessSent(false);

    // Initial check for password reset cooldown on modal open
    if (showAuthModal && authModalTab === "forgot") {
      const lastReset = localStorage.getItem("last_password_reset_time");
      if (lastReset) {
        const elapsed = Date.now() - Number(lastReset);
        if (elapsed < 30000) {
          setCooldown(Math.ceil((30000 - elapsed) / 1000));
        }
      }
    }
  }, [showAuthModal, authModalTab]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLoading) return;

    if (!email || !password) {
      toast.error("Missing fields", { description: "Please fill in all fields." });
      return;
    }

    setSubmitting(true);
    const success = await signIn(email, password);
    setSubmitting(false);

    if (success) {
      setShowAuthModal(false);
      navigate({ to: "/dashboard" });
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLoading) return;

    if (!fullName || !email || !password) {
      toast.error("Missing fields", { description: "Please fill in all fields." });
      return;
    }

    if (password.length < 6) {
      toast.error("Weak password", { description: "Password must be at least 6 characters." });
      return;
    }

    setSubmitting(true);
    const success = await signUp(email, password, fullName);
    setSubmitting(false);

    if (success) {
      setShowAuthModal(false);
      navigate({ to: "/dashboard" });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || cooldown > 0) return;

    if (!email) {
      toast.error("Missing fields", { description: "Please enter your email address." });
      return;
    }

    setSubmitting(true);
    const success = await resetPassword(email);
    setSubmitting(false);

    if (success) {
      setSuccessSent(true);
      setCooldown(30);
      localStorage.setItem("last_password_reset_time", Date.now().toString());
    }
  };

  return (
    <>
      {/* Main Landing Page Container with optional blur when Modal is open */}
      <div className={`min-h-screen bg-gradient-hero flex flex-col justify-between transition-all duration-300 ${showAuthModal ? "blur-sm pointer-events-none select-none scale-[0.99]" : ""}`}>
        {/* Navigation Header */}
        <header className="border-b border-border/40 bg-card/40 backdrop-blur-md sticky top-0 z-50 pt-safe">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-14 sm:h-16 flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => navigate({ to: "/" })}
            >
              <div className="rounded-lg bg-primary p-1.5 text-primary-foreground transition-transform group-hover:scale-105">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                Job Flow<span className="text-primary font-extrabold">Engine</span>
              </span>
            </div>

            <nav className="flex items-center gap-1.5 sm:gap-4 shrink-0">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button variant="ghost" className="text-xs sm:text-sm font-semibold h-9 sm:h-10 px-2 sm:px-4">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => signOut()}
                    className="text-xs sm:text-sm font-semibold text-destructive border-destructive/20 hover:bg-destructive/10 h-9 sm:h-10 px-2 sm:px-4"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-xs sm:text-sm font-semibold h-9 sm:h-10 px-2 sm:px-4"
                    onClick={() => {
                      setAuthModalTab("signin");
                      setShowAuthModal(true);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="text-xs sm:text-sm font-semibold rounded-xl px-3 sm:px-4 py-2 h-9 sm:h-10"
                    onClick={() => {
                      setAuthModalTab("signup");
                      setShowAuthModal(true);
                    }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-20 text-center space-y-6 sm:space-y-8 flex-1 flex flex-col justify-center items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            The future of student job discovery is here
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] max-w-4xl px-2">
            Supercharge Your Student Job Search with{" "}
            <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-primary/80">
              AI Matcher
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Upload your resume to instantly check your ATS compatibility, extract skills, and scrape
            live entry-level jobs and internships tailored exactly to your background.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 w-full max-w-md">
            {user ? (
              <Link to="/dashboard" className="w-full">
                <Button className="h-12 w-full rounded-xl text-base font-semibold shadow-elegant flex items-center justify-center gap-2 group">
                  Enter Workspace Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  className="h-12 w-full sm:flex-1 rounded-xl text-base font-semibold shadow-elegant flex items-center justify-center gap-2 group"
                  onClick={() => {
                    setAuthModalTab("signup");
                    setShowAuthModal(true);
                  }}
                >
                  Get Started (Free)
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full sm:flex-1 rounded-xl text-base font-semibold border-border bg-card/60 backdrop-blur-md"
                  onClick={() => {
                    setAuthModalTab("signin");
                    setShowAuthModal(true);
                  }}
                >
                  Access Account
                </Button>
              </>
            )}
          </div>

          {/* Dashboard Preview Representation */}
          <div className="w-full max-w-4xl border border-border bg-card/50 rounded-2xl p-4 shadow-elegant mt-12 overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 font-medium">demo_workspace_dashboard.tsx</span>
            </div>

            <div className="grid gap-6 md:grid-cols-3 pt-4 text-left">
              <div className="border border-border/80 bg-background/80 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  ATS Rank
                </span>
                <div className="relative mt-2 flex items-center justify-center h-20 w-20 rounded-full border-4 border-primary border-r-transparent">
                  <span className="text-lg font-extrabold text-foreground">85%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Excellent skill validation</p>
              </div>

              <div className="md:col-span-2 border border-border/80 bg-background/80 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Extracted Skills
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "React",
                    "TypeScript",
                    "JavaScript",
                    "HTML",
                    "CSS",
                    "TailwindCSS",
                    "Node.js",
                    "SQL",
                  ].map((s, i) => (
                    <span
                      key={i}
                      className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="border-t border-border/60 pt-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Matched Roles
                  </span>
                  <div className="flex items-center justify-between text-xs border border-border bg-card p-2 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">Frontend Engineer Intern</p>
                      <p className="text-[10px] text-muted-foreground">Vercel Inc. • Remote</p>
                    </div>
                    <span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[9px]">
                      94% score
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Detail */}
        <section className="bg-card py-20 border-t border-border/40">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Platform Features
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Everything students and freshers need to streamline their initial tech internship and
                job applications.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pt-12">
              {/* Feature 1 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">AI Resume Parser</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload your PDF or Word doc. Our AI extracts core programming skills and experience
                  fields to build a clean profile.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Live Web Scrapers</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connects to our processing service. Scrapes online job postings matching your resume
                  automatically.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">ATS Match Rating</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Provides an instant compatibility score out of 100, advising which skills you should
                  add to bypass resume filters.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Smart Filters</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Filter jobs by role type (Frontend, Backend, Fullstack, Data), location preference
                  (remote, onsite), and job style.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <Bookmark className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Saved Jobs Vault</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bookmark exciting job opportunities. Track application statuses, open detailed
                  listings, and apply with ease.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="border border-border bg-background p-6 rounded-2xl shadow-elegant space-y-4 hover:-translate-y-0.5 transition-all">
                <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Secure Persistence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Integrates with Supabase Database and Supabase Auth. Safe password handling and
                  database protection for your profile data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-card py-8 text-center text-xs text-muted-foreground">
          <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground">Job Flow Engine</span>
              <span>© {new Date().getFullYear()}. All rights reserved.</span>
            </div>
            <div className="flex gap-4">
              <span className="hover:text-foreground cursor-pointer">Privacy Policy</span>
              <span className="hover:text-foreground cursor-pointer">Terms of Service</span>
              <span className="hover:text-foreground cursor-pointer">Support</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Blurred overlay and crisp centered auth modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[4px] p-0 sm:p-4 transition-all duration-300 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 max-h-[92dvh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200 pb-safe">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/80"
            >
              <X className="h-5 w-5" />
            </button>

            {authModalTab === "signup" ? (
              <form className="space-y-4" onSubmit={handleSignUpSubmit}>
                <div className="text-center space-y-1 mb-4">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h3>
                  <p className="text-xs text-muted-foreground">Join Job Flow Engine to start your journey.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-name">Full Name</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      id="modal-name"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-10"
                      disabled={submitting || isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-email">Email Address</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="modal-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10"
                      disabled={submitting || isLoading}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-password">Password</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="modal-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-10"
                      disabled={submitting || isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                      disabled={submitting || isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground leading-normal space-y-0.5">
                  <p className="font-semibold text-foreground">Password requirements:</p>
                  <p>• Minimum 6 characters</p>
                  <p>• At least one number (0-9)</p>
                  <p>• At least one special character (!@#$...)</p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full h-10 rounded-xl font-semibold mt-2"
                >
                  {submitting || isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthModalTab("signin")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Log in
                  </button>
                </div>
              </form>
            ) : authModalTab === "signin" ? (
              <form className="space-y-4" onSubmit={handleSignInSubmit}>
                <div className="text-center space-y-1 mb-4">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">Log In</h3>
                  <p className="text-xs text-muted-foreground">Welcome back! Sign in to continue.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-email-signin">Email Address</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="modal-email-signin"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10"
                      disabled={submitting || isLoading}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="modal-password-signin">Password</Label>
                    <button
                      type="button"
                      onClick={() => setAuthModalTab("forgot")}
                      className="text-[10px] font-semibold text-primary hover:underline transition-colors"
                      disabled={submitting || isLoading}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="modal-password-signin"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-10"
                      disabled={submitting || isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                      disabled={submitting || isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full h-10 rounded-xl font-semibold mt-4"
                >
                  {submitting || isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Logging In...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthModalTab("signup")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            ) : (
              // Forgot Password Panel
              <div className="space-y-4">
                {successSent ? (
                  <div className="text-center space-y-4 py-4 animate-in fade-in duration-200">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/30">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Recovery Link Sent</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      We've sent a password reset email to <strong>{email}</strong>. Please check your inbox and follow the instructions to reset your password.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setSuccessSent(false);
                        setAuthModalTab("signin");
                      }}
                      className="w-full h-10 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Log In
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleResetPasswordSubmit}>
                    <div className="text-center space-y-1 mb-4">
                      <h3 className="text-2xl font-bold tracking-tight text-foreground">Reset Password</h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        Enter your email and we'll send you a password recovery code.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="modal-email-reset">Email Address</Label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          id="modal-email-reset"
                          type="email"
                          placeholder="you@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-10"
                          disabled={submitting || cooldown > 0}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting || cooldown > 0}
                      className="w-full h-10 rounded-xl font-semibold mt-4"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending Instructions...
                        </>
                      ) : cooldown > 0 ? (
                        `Wait ${cooldown}s before retrying`
                      ) : (
                        "Reset Password"
                      )}
                    </Button>

                    <div className="text-center text-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setAuthModalTab("signin")}
                        className="font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Log In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
