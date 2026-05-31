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
  trials_used?: number;
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
  incrementTrialsUsed: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
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
          if (error.code === "PGRST116") {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              const fullName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "New User";
              
              const newProfile = {
                id: userId,
                email: currentUser?.email || "",
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
                updated_at: new Date().toISOString()
              };

              const { data: insertedData, error: insertErr } = await supabase
                .from("user_profiles")
                .insert(newProfile)
                .select("*")
                .single();

              if (insertErr) {
                console.error("Failed to auto-create profile row:", insertErr);
                return newProfile as UserProfile;
              }
              return insertedData as UserProfile;
            } catch (createErr) {
              console.error("Exception during profile auto-creation:", createErr);
              return {
                id: userId,
                email: "",
                full_name: "New User",
                avatar_url: null,
                skills: "",
                ats_score: 0,
                resume_url: null,
                resume_name: null,
                experience_level: "Freshman/Student",
                preferred_role: null,
                preferred_location: null,
                job_type: "All",
                updated_at: new Date().toISOString()
              } as UserProfile;
            }
          }
          console.error("Error fetching user profile:", error);
          return null;
        }
        
        // Merge rich profile extras if present in local cache
        const resData = data as UserProfile;
        const extras = localStorage.getItem(`profile_extras_${userId}`);
        if (extras) {
          try {
            return {
              ...resData,
              ...JSON.parse(extras)
            } as UserProfile;
          } catch {
            // ignore
          }
        }
        return resData;
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
          // Set mock trials
          const mockTrials = Number(localStorage.getItem(`mock_trials_${parsed.user.id}`) || "0");
          parsed.user.user_metadata = {
            ...parsed.user.user_metadata,
            trials_used: mockTrials
          };
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

    let isMounted = true;
    const initialChecked = { current: false };

    const handleAuthEvent = async (event: string, currentSession: Session | null) => {
      if (!isMounted) return;

      const prevSession = sessionRef.current;
      const prevUser = userRef.current;

      // Prevent duplicate event handling for same session state
      if (
        initialChecked.current &&
        currentSession?.access_token === prevSession?.access_token &&
        currentSession?.user?.id === prevUser?.id
      ) {
        return;
      }

      sessionRef.current = currentSession;
      userRef.current = currentSession?.user ?? null;

      // Update session and user states immediately
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setIsLoading(true);
        const p = await fetchProfile(currentSession.user.id);
        if (isMounted) {
          setProfile(p);
          setIsLoading(false);
          initialChecked.current = true;
        }
      } else {
        setProfile(null);
        setIsLoading(false);
        initialChecked.current = true;
      }
    };

    // Listen for subsequent auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      handleAuthEvent(event, currentSession);
    });

    return () => {
      isMounted = false;
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
      toast.success("Successfully logged in (Demo Mode)");
      return true;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Email not confirmed", {
            description: "Please check your inbox to confirm your address, or turn off 'Confirm email' in your Supabase Auth settings to log in instantly.",
          });
        } else {
          toast.error("Authentication failed", { description: error.message });
        }
        setIsLoading(false);
        return false;
      }
      toast.success("Welcome back!", { description: "Successfully logged in." });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("An error occurred", { description: msg });
      setIsLoading(false);
      return false;
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
        setIsLoading(false);
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
        setIsLoading(false);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("An error occurred", { description: msg });
      setIsLoading(false);
      return false;
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Sign out failed", { description: error.message });
      } else {
        toast.success("Logged out", { description: "Come back soon!" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Error signing out", { description: msg });
    } finally {
      // ALWAYS clear local session states on client to guarantee logout
      setUser(null);
      setProfile(null);
      sessionRef.current = null;
      userRef.current = null;
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
      // Check if user profile already exists
      const { data: existingProfile, error: fetchErr } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Error checking existing profile:", fetchErr);
      }

      let error;
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const runUpdate = async (fields: any) => {
        if (!existingProfile) {
          return await supabase.from("user_profiles").insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || null,
            ...fields,
          });
        } else {
          return await supabase.from("user_profiles").update(fields).eq("id", user.id);
        }
      };

      const res = await runUpdate(payload);
      error = res.error;

      // Handle missing DB columns error (fallback by saving extras in localStorage)
      if (error && (error.message.includes("column") || error.code === "42703")) {
        console.warn("Missing database columns for rich profile fields, falling back to local storage backup.");
        const basicFields = {
          full_name: updates.full_name,
          experience_level: updates.experience_level,
          preferred_role: updates.preferred_role,
          preferred_location: updates.preferred_location,
          job_type: updates.job_type,
          skills: updates.skills,
          updated_at: new Date().toISOString(),
        };
        const extraFields = {
          education_school: (updates as any).education_school,
          education_degree: (updates as any).education_degree,
          education_year: (updates as any).education_year,
          experience_title: (updates as any).experience_title,
          experience_company: (updates as any).experience_company,
          experience_duration: (updates as any).experience_duration,
          experience_desc: (updates as any).experience_desc,
          certifications: (updates as any).certifications,
        };
        localStorage.setItem(`profile_extras_${user.id}`, JSON.stringify(extraFields));
        
        const fallbackRes = await runUpdate(basicFields);
        error = fallbackRes.error;
      }

      if (error) {
        toast.error("Failed to update profile", { description: error.message });
        return false;
      }

      setProfile((prev) => (prev ? { ...prev, ...updates } : {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: null,
        skills: null,
        ats_score: 0,
        resume_url: null,
        resume_name: null,
        experience_level: "Freshman/Student",
        preferred_role: null,
        preferred_location: null,
        job_type: "All",
        updated_at: new Date().toISOString(),
        ...updates
      }));
      toast.success("Profile updated successfully!");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Profile update failed", { description: msg });
      return false;
    }
  };

  const incrementTrialsUsed = async (): Promise<boolean> => {
    if (isMockMode) {
      const currentTrials = Number(localStorage.getItem(`mock_trials_${user?.id}`) || "0");
      const nextTrials = currentTrials + 1;
      localStorage.setItem(`mock_trials_${user?.id}`, String(nextTrials));
      
      if (user) {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            trials_used: nextTrials
          }
        };
        setUser(updatedUser);
        
        const savedMockSession = localStorage.getItem("mock_session");
        if (savedMockSession) {
          try {
            const parsed = JSON.parse(savedMockSession);
            parsed.user = updatedUser;
            localStorage.setItem("mock_session", JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }
      }
      return true;
    }

    if (!user) return false;

    try {
      const currentTrials = user.user_metadata?.trials_used || 0;
      const nextTrials = currentTrials + 1;

      const { data, error } = await supabase.auth.updateUser({
        data: {
          trials_used: nextTrials,
        },
      });

      if (error) {
        console.error("Error updating user metadata trials:", error);
        return false;
      }

      if (data?.user) {
        setUser(data.user);
      }

      try {
        await supabase
          .from("user_profiles")
          .update({
            trials_used: nextTrials,
          } as any)
          .eq("id", user.id);
      } catch (profileErr) {
        // ignore if database column does not exist
      }

      return true;
    } catch (err) {
      console.error("Exception incrementing trials:", err);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    if (isMockMode) {
      toast.success("Demo Recovery Code sent!", {
        description: "Password reset link simulated for demo email successfully.",
      });
      return true;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/resetpassword`,
      });

      if (error) {
        toast.error("Password reset failed", { description: error.message });
        return false;
      }

      toast.success("Check your inbox!", {
        description: "A password recovery link has been sent to your email address.",
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Error sending reset request", { description: msg });
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
        incrementTrialsUsed,
        resetPassword,
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
