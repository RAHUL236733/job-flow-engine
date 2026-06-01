import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hydrateAnalysisFromDb } from "@/lib/n8n-response";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface AnalysisData {
  resumeReview?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    improvements?: string[];
  };
  atsScore?: {
    score?: number;
    missingKeywords?: string[];
    recommendations?: string[];
    strengths?: string[];
    weaknesses?: string[];
  };
  skillGapAnalysis?: {
    currentSkills?: string[];
    missingSkills?: string[];
    prioritySkills?: string[];
    learningSuggestions?: string[];
  };
  careerRoadmap?: {
    next30Days?: string[];
    next90Days?: string[];
    next6Months?: string[];
  };
  interviewPractice?: {
    technicalQuestions?: string[];
    hrQuestions?: string[];
    preparationTips?: string[];
    questions?: { question?: string; answerTips?: string }[];
  };
  salaryInsights?: {
    entryLevelRange?: string;
    growthPotential?: string;
    growthRanges?: { title?: string; range?: string }[];
    forecasting?: string;
  };
  linkedinOptimization?: {
    headlineSuggestions?: string[];
    aboutSectionSuggestions?: string[];
    profileImprovements?: string[];
    headline?: string;
    summary?: string;
    recruiterSearchTips?: string[];
  };
  coverLetterGenerator?: {
    letter?: string;
  };
  jobs?: {
    title: string;
    company: string;
    location?: string;
    salary?: string;
    matchScore?: number;
    matchReason?: string;
    matchReasons?: string[];
    applyUrl?: string;
    listingKind?: "job" | "internship";
  }[];
  internships?: {
    title: string;
    company: string;
    location?: string;
    salary?: string;
    matchScore?: number;
    matchReason?: string;
    matchReasons?: string[];
    applyUrl?: string;
    listingKind?: "job" | "internship";
  }[];
  skills?: string[];
  roles?: string[];
  keywords?: string[];
  experience?: string;
}

interface AnalysisContextType {
  analysis: AnalysisData | null;
  isLoading: boolean;
  saveAnalysis: (data: AnalysisData) => Promise<boolean>;
  refreshAnalysis: () => Promise<void>;
  clearAnalysis: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  const fetchLatestAnalysis = useCallback(async (userId: string) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("analysis_results")
        .select("response_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching latest analysis results:", error);
      } else if (data && data.length > 0) {
        setAnalysis(hydrateAnalysisFromDb(data[0].response_json));
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (user?.id) {
      fetchLatestAnalysis(user.id);
    } else {
      setAnalysis(null);
      setIsLoading(false);
    }
  }, [user, fetchLatestAnalysis]);

  const saveAnalysis = async (data: AnalysisData & { _n8nFlat?: Record<string, unknown> }): Promise<boolean> => {
    if (!user?.id) {
      toast.error("You must be logged in to save analysis.");
      return false;
    }
    if (!isConfigured) {
      // Local fallbacks if Supabase not configured
      const hydrated = hydrateAnalysisFromDb(data);
      setAnalysis(hydrated);
      return true;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.from("analysis_results").insert({
        user_id: user.id,
        response_json: data,
      });

      if (error) {
        console.error("Error saving analysis:", error);
        toast.error("Failed to save analysis in the database.");
        return false;
      }

      setAnalysis(hydrateAnalysisFromDb(data));
      return true;
    } catch (err) {
      console.error("Exception saving analysis:", err);
      toast.error("An error occurred while saving analysis results.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAnalysis = async () => {
    if (user?.id) {
      await fetchLatestAnalysis(user.id);
    }
  };

  const clearAnalysis = async () => {
    if (!user?.id) return;
    if (!isConfigured) {
      setAnalysis(null);
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("analysis_results")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error clearing analysis results:", error);
        toast.error("Failed to delete analysis history.");
      } else {
        setAnalysis(null);
        toast.success("Analysis history cleared.");
      }
    } catch (err) {
      console.error("Exception clearing analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysis,
        isLoading,
        saveAnalysis,
        refreshAnalysis,
        clearAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
};
