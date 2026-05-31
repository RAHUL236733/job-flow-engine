import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signin")({
  component: SignIn,
});

function SignIn() {
  const { user, signIn, isLoading, isMockMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLoading) return; // Prevent duplicate submissions

    if (!email || !password) {
      toast.error("Missing fields", { description: "Please fill in all fields." });
      return;
    }

    setSubmitting(true);
    const success = await signIn(email, password);
    setSubmitting(false);

    if (success) {
      navigate({ to: "/dashboard" });
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
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Log In</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back! Sign in to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  disabled={submitting || isLoading}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/auth/forgotpassword"
                  className="text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
              className="h-11 w-full rounded-xl text-base font-semibold"
            >
              {submitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              to="/auth/signup"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
