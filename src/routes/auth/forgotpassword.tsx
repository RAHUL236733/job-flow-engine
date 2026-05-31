import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Mail, Sparkles, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgotpassword")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const { user, resetPassword, isMockMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successSent, setSuccessSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Initialize and check password reset cooldown on mount
  useEffect(() => {
    const lastReset = localStorage.getItem("last_password_reset_time");
    if (lastReset) {
      const elapsed = Date.now() - Number(lastReset);
      if (elapsed < 30000) {
        setCooldown(Math.ceil((30000 - elapsed) / 1000));
      }
    }
  }, []);

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

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || cooldown > 0) return; // Prevent double-clicks and bypass of cooldown

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground transition-transform group-hover:scale-105">
              <Briefcase className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              AI Job<span className="text-primary font-extrabold">Matcher</span>
            </span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Reset Password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we'll send you a password recovery code.
          </p>
        </div>

        {isMockMode && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">Demo Mode Enabled</span>
                Supabase credentials not configured in `.env`. Resets will be cleanly simulated!
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8">
          {successSent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/30">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Recovery Link Sent</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We've sent a password reset email to <strong>{email}</strong>. Please check your inbox and follow the instructions to reset your password.
              </p>
              <Link to="/auth/signin" className="block pt-2">
                <Button className="w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    disabled={submitting || cooldown > 0}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || cooldown > 0}
                className="h-11 w-full rounded-xl text-base font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Instructions...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    Wait {cooldown}s before retrying
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>

              <div className="text-center text-sm pt-2">
                <Link
                  to="/auth/signin"
                  className="font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
