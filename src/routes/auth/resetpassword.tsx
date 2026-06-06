import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/resetpassword")({
  component: ResetPassword,
});

function ResetPassword() {
  const { user, isLoading: authLoading, isMockMode } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Keep the component in a loading state if we see recovery parameters in the URL on mount
  const [verifyingSession, setVerifyingSession] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash.substring(1);
    const hasHashToken = hash.includes("access_token=");
    const hasCodeParam = window.location.search.includes("code=");
    return hasHashToken || hasCodeParam;
  });

  useEffect(() => {
    const handleRecovery = async () => {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      try {
        if (accessToken && refreshToken) {
          console.log("Detected recovery tokens in hash. Manually setting session...");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("Error setting session from hash:", error);
            toast.error("Verification failed", { description: error.message });
          } else {
            toast.success("Recovery session verified!");
          }
        } else if (code) {
          console.log("Detected PKCE code in query. Manually exchanging code for session...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Error exchanging code for session:", error);
            toast.error("Verification failed", { description: error.message });
          } else {
            toast.success("Recovery session verified!");
          }
        }
      } catch (err: any) {
        console.error("Exception in manual session recovery:", err);
      } finally {
        setVerifyingSession(false);
      }
    };

    const hash = window.location.hash.substring(1);
    const hasHashToken = hash.includes("access_token=");
    const hasCodeParam = window.location.search.includes("code=");

    if (hasHashToken || hasCodeParam) {
      handleRecovery();
    } else {
      setVerifyingSession(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!password || !confirmPassword) {
      toast.error("Missing fields", { description: "Please enter and confirm your new password." });
      return;
    }

    if (password.length < 6) {
      toast.error("Weak password", { description: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mismatch", { description: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      if (isMockMode) {
        // Mock flow
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success("Password reset simulated successfully!");
        setSuccess(true);
      } else {
        // Supabase update flow
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error("Password update failed", { description: error.message });
        } else {
          toast.success("Password updated!", { description: "Your new password is now active." });
          setSuccess(true);
        }
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground transition-transform group-hover:scale-105">
              <Briefcase className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Job Flow Engine<span className="text-primary font-extrabold">Matcher</span>
            </span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Create New Password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please enter your new secure password below.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/30">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Password Reset Complete</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your password has been successfully updated. You can now log in using your new credentials.
              </p>
              <Link to="/auth/signin" className="block pt-2">
                <Button className="w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (authLoading || verifyingSession) ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying recovery session...</p>
            </div>
          ) : !user && !isMockMode ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Session Found</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We couldn't detect an active recovery session. This link may have expired or is invalid. Please request a new recovery link.
              </p>
              <Link to="/auth/forgotpassword" className="block pt-2">
                <Button className="w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Request Recovery Link
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={submitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-xl text-base font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Save Password
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
