import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  skills: string | null;
  ats_score: number;
  resume_url: string | null;
  resume_name: string | null;
  experience_level: string;
  preferred_role: string | null;
  preferred_location: string | null;
  job_type: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isMockMode: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);

  const checkConfig = isSupabaseConfigured();

  // Load profile details from database
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      if (!checkConfig) return null;
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          return null;
        }
        return data as UserProfile;
      } catch (err) {
        console.error("Exception fetching profile:", err);
        return null;
      }
    },
    [checkConfig],
  );

  // Sync profile details
  const refreshProfile = useCallback(async () => {
    if (user && !isMockMode) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  }, [user, isMockMode, fetchProfile]);

  useEffect(() => {
    if (!checkConfig) {
      console.warn(
        "Supabase is not configured. Falling back to Mock Auth Mode for showcase purposes.",
      );
      setIsMockMode(true);

      // Load mock session from localStorage if exists
      const savedMockSession = localStorage.getItem("mock_session");
      if (savedMockSession) {
        try {
          const parsed = JSON.parse(savedMockSession);
          setUser(parsed.user);
          setProfile(parsed.profile);
          userRef.current = parsed.user;
          sessionRef.current = null;
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      sessionRef.current = initialSession;
      userRef.current = initialSession?.user ?? null;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const p = await fetchProfile(initialSession.user.id);
        setProfile(p);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      const prevSession = sessionRef.current;
      const prevUser = userRef.current;

      // Prevent infinite loop if session state has not changed
      if (
        currentSession?.access_token === prevSession?.access_token &&
        currentSession?.user?.id === prevUser?.id
      ) {
        setIsLoading(false);
        return;
      }

      sessionRef.current = currentSession;
      userRef.current = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const p = await fetchProfile(currentSession.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkConfig, fetchProfile]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    if (isMockMode) {
      const mockUser = {
        id: "mock-user-uuid",
        email,
        user_metadata: { full_name: "John Doe (Demo)" },
      } as unknown as User;

      const mockProfile: UserProfile = {
        id: "mock-user-uuid",
        email,
        full_name: "John Doe (Demo)",
        avatar_url: null,
        skills: "React, JavaScript, CSS, HTML, TypeScript",
        ats_score: 82,
        resume_url: null,
        resume_name: "Demo_Resume.pdf",
        experience_level: "Internship / Entry Level",
        preferred_role: "Frontend Developer",
        preferred_location: "Remote / New York",
        job_type: "Full-time / Internship",
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem(
        "mock_session",
        JSON.stringify({ user: mockUser, profile: mockProfile }),
      );
      toast.success("Successfully logged in (Demo Mode)");
      return true;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Authentication failed", { description: error.message });
        return false;
      }
      toast.success("Welcome back!", { description: "Successfully logged in." });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("An error occurred", { description: msg });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<boolean> => {
    if (isMockMode) {
      const mockUser = {
        id: "mock-user-uuid",
        email,
        user_metadata: { full_name: fullName },
      } as unknown as User;

      const mockProfile: UserProfile = {
        id: "mock-user-uuid",
        email,
        full_name: fullName,
        avatar_url: null,
        skills: "",
        ats_score: 0,
        resume_url: null,
        resume_name: null,
        experience_level: "Freshman/Student",
        preferred_role: null,
        preferred_location: null,
        job_type: "All",
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem(
        "mock_session",
        JSON.stringify({ user: mockUser, profile: mockProfile }),
      );
      toast.success("Account created successfully (Demo Mode)");
      return true;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error("Failed to create account", { description: error.message });
        return false;
      }

      // If email confirmation is required by Supabase, notify the user.
      // Otherwise, the session is created automatically.
      if (data.session) {
        toast.success("Registration successful!", { description: "Your account is ready." });
      } else {
        toast.success("Verification email sent!", {
          description: "Please check your inbox to confirm your account.",
        });
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("An error occurred", { description: msg });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (isMockMode) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem("mock_session");
      toast.success("Logged out successfully");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Sign out failed", { description: error.message });
        return;
      }
      toast.success("Logged out", { description: "Come back soon!" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Error signing out", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (isMockMode) {
      const newProfile = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      } as UserProfile;
      setProfile(newProfile);
      const sessionData = localStorage.getItem("mock_session");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.profile = newProfile;
        localStorage.setItem("mock_session", JSON.stringify(parsed));
      }
      toast.success("Profile updated locally (Demo Mode)");
      return true;
    }

    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update profile", { description: error.message });
        return false;
      }

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success("Profile updated successfully!");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Profile update failed", { description: msg });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isMockMode,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
