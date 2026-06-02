import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  user_id?: string;
  email: string;
  full_name?: string | null;
  target_location?: string | null;
  target_job_title?: string | null;
  experience_level?: string | null;
  preferred_job_type?: string | null;
  skills?: string[] | string | null;
  profile_score?: number;
  ats_score?: number;
  resume_uploaded?: boolean;
  created_at?: string;
  updated_at: string;
  trials_used?: number;

  // Backward compatibility fields
  avatar_url?: string | null;
  resume_url?: string | null;
  resume_name?: string | null;
  job_type?: string;
  preferred_role?: string | null;
  preferred_location?: string | null;
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
        console.log("Fetching profile from 'profiles' table for user:", userId);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              const fullName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "New User";
              
              const newProfile = {
                user_id: userId,
                email: currentUser?.email || "",
                full_name: fullName,
                experience_level: "Freshman/Student",
                preferred_job_type: "All",
                skills: []
              };

              console.log("Profile not found in profiles table, auto-creating initial profiles row...");
              const { data: insertedData, error: insertErr } = await supabase
                .from("profiles")
                .insert(newProfile)
                .select("*")
                .single();

              if (insertErr) {
                console.error("Failed to auto-create profile row:", insertErr);
                return {
                  id: userId,
                  ...newProfile,
                  updated_at: new Date().toISOString()
                } as UserProfile;
              }
              console.log("Successfully auto-created profile row in Supabase:", insertedData);
              return insertedData as UserProfile;
            } catch (createErr) {
              console.error("Exception during profile auto-creation:", createErr);
              return {
                id: userId,
                user_id: userId,
                email: "",
                full_name: "New User",
                experience_level: "Freshman/Student",
                preferred_job_type: "All",
                skills: [],
                updated_at: new Date().toISOString()
              } as UserProfile;
            }
          }
          console.error("Error fetching user profile:", error);
          return null;
        }
        
        console.log("Profile successfully loaded from Supabase profiles table:", data);
        
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

          // Added Console Logs for Debugging
          console.log("Current User:", currentSession.user);
          console.log("Profile Data:", p);
          console.log("Session:", currentSession);
        }
      } else {
        setProfile(null);
        setIsLoading(false);
        initialChecked.current = true;

        // Added Console Logs for Debugging
        console.log("Current User:", null);
        console.log("Profile Data:", null);
        console.log("Session:", null);
      }
    };

    // Fetch initial session on mount for persistence across refreshes
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (isMounted) {
          await handleAuthEvent("INITIAL_SESSION", currentSession);
        }
      } catch (err) {
        console.error("Error loading session on mount:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

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
      } as UserProfile;

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
        user_id: "mock-user-uuid",
        email,
        full_name: fullName,
        skills: [],
        experience_level: "Freshman/Student",
        target_job_title: null,
        target_location: null,
        preferred_job_type: "All",
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem(
        "mock_session",
        JSON.stringify({ user: mockUser, profile: mockProfile }),
      );
      toast.success("Account created successfully (Demo Mode)");
      
      console.log("Current User (Mock SignUp):", mockUser);
      console.log("Profile Data (Mock SignUp):", mockProfile);
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

      console.log("Supabase Auth SignUp successful. User object:", data.user);

      if (data.user) {
        console.log("Auth user created. Inserting initial profile row into profiles table...");
        const { error: profileErr } = await supabase
          .from("profiles")
          .insert({
            user_id: data.user.id,
            full_name: fullName,
            email: email,
            experience_level: "Freshman/Student",
            preferred_job_type: "All",
            skills: []
          });

        if (profileErr) {
          console.error("Failed to insert profile row during signup:", profileErr);
        } else {
          console.log("Profile row successfully created for user:", data.user.id);
        }
      }

      // If email confirmation is required by Supabase, notify the user.
      // Otherwise, the session is created automatically.
      if (data.session) {
        toast.success("Registration successful!", { description: "Your account is ready." });
        console.log("Session (SignUp):", data.session);
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
    console.log("Initiating Sign Out...");
    if (isMockMode) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem("mock_session");
      localStorage.clear();
      toast.success("Logged out successfully");
      console.log("Sign out successful (Mock Mode cleared)");
      return;
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        toast.error("Sign out failed", { description: error.message });
      } else {
        toast.success("Logged out", { description: "Come back soon!" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Error signing out", { description: msg });
    } finally {
      // ALWAYS clear local session states and localStorage on client to guarantee logout
      setUser(null);
      setProfile(null);
      sessionRef.current = null;
      userRef.current = null;
      localStorage.clear();
      console.log("Sign out cleanup completed. Local storage cleared.");
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
      
      console.log("Current User (Mock Update):", user);
      console.log("Profile Data (Mock Update):", newProfile);
      return true;
    }

    if (!user) return false;

    try {
      console.log("Updating profile in Supabase profiles table for user:", user.id);
      console.log("Profile updates payload:", updates);

      // Check if user profile already exists in profiles
      const { data: existingProfile, error: fetchErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Error checking existing profile:", fetchErr);
      }

      // Map columns correctly
      const payload: any = {
        full_name: updates.full_name !== undefined ? updates.full_name : profile?.full_name,
        experience_level: updates.experience_level !== undefined ? updates.experience_level : profile?.experience_level,
        preferred_job_type: updates.preferred_job_type !== undefined ? updates.preferred_job_type : (updates.job_type !== undefined ? updates.job_type : profile?.preferred_job_type),
        target_job_title: updates.target_job_title !== undefined ? updates.target_job_title : (updates.preferred_role !== undefined ? updates.preferred_role : profile?.target_job_title),
        target_location: updates.target_location !== undefined ? updates.target_location : (updates.preferred_location !== undefined ? updates.preferred_location : profile?.target_location),
        profile_score: updates.profile_score !== undefined ? updates.profile_score : profile?.profile_score,
        ats_score: updates.ats_score !== undefined ? updates.ats_score : profile?.ats_score,
        resume_uploaded: updates.resume_uploaded !== undefined ? updates.resume_uploaded : profile?.resume_uploaded,
        updated_at: new Date().toISOString(),
      };

      if (updates.skills !== undefined) {
        if (Array.isArray(updates.skills)) {
          payload.skills = updates.skills;
        } else if (typeof updates.skills === "string") {
          payload.skills = updates.skills.split(",").map(s => s.trim()).filter(Boolean);
        } else if (updates.skills === null) {
          payload.skills = [];
        }
      }

      let error;
      if (!existingProfile) {
        console.log("No existing profile row found, inserting new profiles row...");
        const res = await supabase.from("profiles").insert({
          user_id: user.id,
          email: user.email!,
          ...payload,
        });
        error = res.error;
      } else {
        console.log("Existing profile row found, updating profiles row...");
        const res = await supabase.from("profiles").update(payload).eq("user_id", user.id);
        error = res.error;
      }

      if (error) {
        console.error("Supabase Profiles Update Error:", error);
        toast.error("Failed to update profile", { description: error.message });
        return false;
      }

      const updatedProfileState = {
        id: profile?.id || user.id,
        user_id: user.id,
        email: user.email!,
        full_name: payload.full_name,
        experience_level: payload.experience_level,
        preferred_job_type: payload.preferred_job_type,
        target_job_title: payload.target_job_title,
        target_location: payload.target_location,
        profile_score: payload.profile_score || 0,
        ats_score: payload.ats_score || 0,
        resume_uploaded: !!payload.resume_uploaded,
        skills: payload.skills || profile?.skills || [],
        updated_at: payload.updated_at,
        ...updates
      } as UserProfile;

      setProfile(updatedProfileState);
      toast.success("Profile updated successfully!");
      
      console.log("Current User (Post-Update):", user);
      console.log("Profile Data (Post-Update):", updatedProfileState);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Profile update exception:", err);
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
