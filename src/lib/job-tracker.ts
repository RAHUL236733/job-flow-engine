import { supabase } from "@/lib/supabase";

export type TrackedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  score: number | string;
  type?: string;
  url?: string;
  matchedSkills: string[];
  missingSkills: string[];
  matchReasons?: string[];
  listingKind?: "job" | "internship";
  /** Supabase row id for saved_jobs delete */
  _savedRowId?: string;
};

export type TrackedApplication = {
  id: string;
  company: string;
  role: string;
  status: string;
  salary?: string;
  date: string;
  notes?: string;
  location?: string;
};

/** Stable id so bookmark survives refresh and remount */
export function buildJobId(
  job: {
    id?: string;
    title?: string;
    role?: string;
    company?: string;
    url?: string;
    applyLink?: string;
    location?: string;
  },
  index = 0,
): string {
  if (job.id && !job.id.startsWith("n8n-job-")) return job.id;
  const title = (job.title || job.role || "role").trim().toLowerCase();
  const company = (job.company || "company").trim().toLowerCase();
  const url = (job.url || job.applyLink || job.location || "").trim().toLowerCase();
  const raw = `${company}::${title}::${url}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `job-${Math.abs(hash)}-${index}`;
}

export function normalizeJob(job: Record<string, unknown>, index = 0): TrackedJob {
  const title = String(job.title || job.role || "Matched Opportunity");
  const company = String(job.company || "Partner");
  const id = buildJobId(
    {
      id: job.id as string | undefined,
      title,
      company,
      url: job.url as string | undefined,
      applyLink: job.applyLink as string | undefined,
      location: job.location as string | undefined,
    },
    index,
  );

  return {
    id,
    title,
    company,
    location: String(job.location || "Remote"),
    salary: String(job.salary || job.compensation || "—"),
    score: (job.score as number | string) ?? (job.matchScore as number | string) ?? 85,
    type: String(job.type || "Fullstack"),
    url: String(job.url || job.applyLink || ""),
    matchedSkills: Array.isArray(job.matchedSkills)
      ? (job.matchedSkills as string[])
      : Array.isArray(job.skills)
        ? (job.skills as string[])
        : [],
    missingSkills: Array.isArray(job.missingSkills) ? (job.missingSkills as string[]) : [],
    _savedRowId: job._savedRowId as string | undefined,
  };
}

function rowToJob(row: Record<string, unknown>): TrackedJob {
  return normalizeJob({
    id: row.job_id || row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    salary: row.salary,
    url: row.apply_url || row.apply_link || row.url,
    _savedRowId: row.id,
  });
}

function rowToApplication(row: Record<string, unknown>): TrackedApplication {
  const applied = row.applied_date
    ? String(row.applied_date)
    : row.date
      ? String(row.date)
      : row.created_at
        ? String(row.created_at)
        : "";
  return {
    id: String(row.id),
    company: String(row.company || ""),
    role: String(row.title || row.role || ""),
    status: String(row.status || "Applied"),
    salary: row.salary ? String(row.salary) : undefined,
    date: applied.includes("T") ? applied.split("T")[0] : applied || new Date().toISOString().split("T")[0],
    notes: row.notes ? String(row.notes) : undefined,
    location: row.location ? String(row.location) : undefined,
  };
}

function isTransientSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; message?: string };
  const status = Number(e.status || 0);
  const msg = String(e.message || "").toLowerCase();
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500 ||
    msg.includes("timeout") ||
    msg.includes("temporar") ||
    msg.includes("network")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchSavedJobs(userId: string): Promise<TrackedJob[]> {
  const primary = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return (primary.data || []).map((row) => rowToJob(row as Record<string, unknown>));
  }

  // Fallback for legacy schemas that may not have created_at
  const fallback = await supabase.from("saved_jobs").select("*").eq("user_id", userId);
  if (fallback.error) {
    console.error("fetchSavedJobs:", fallback.error);
    throw fallback.error;
  }
  return (fallback.data || []).map((row) => rowToJob(row as Record<string, unknown>));
}

export async function saveJobToStore(userId: string, job: TrackedJob): Promise<TrackedJob | null> {
  const normalized = normalizeJob(job);
  const safeUrl = (normalized.url || "").trim() || "#";

  const { data: existing, error: existingErr } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", normalized.id)
    .maybeSingle();

  if (existingErr) {
    // Legacy schemas may not have job_id. Fall back to title+company duplicate check.
    const fallbackLookup = await supabase
      .from("saved_jobs")
      .select("*")
      .eq("user_id", userId)
      .ilike("title", normalized.title)
      .ilike("company", normalized.company)
      .maybeSingle();

    if (fallbackLookup.error) {
      console.error("saveJobToStore lookup:", fallbackLookup.error);
    } else if (fallbackLookup.data) {
      return rowToJob(fallbackLookup.data as Record<string, unknown>);
    }
  } else if (existing) {
    return rowToJob(existing as Record<string, unknown>);
  }

  // Try multiple payload shapes to support schema variants across environments.
  const payloadVariants: Array<Record<string, unknown>> = [
    {
      user_id: userId,
      job_id: normalized.id,
      title: normalized.title,
      company: normalized.company,
      location: normalized.location || "Remote",
      salary: String(normalized.salary || "—"),
      apply_url: safeUrl,
      url: safeUrl,
    },
    {
      user_id: userId,
      title: normalized.title,
      company: normalized.company,
      location: normalized.location || "Remote",
      salary: String(normalized.salary || "—"),
      apply_url: safeUrl,
      url: safeUrl,
    },
    {
      user_id: userId,
      title: normalized.title,
      company: normalized.company,
      location: normalized.location || "Remote",
      salary: String(normalized.salary || "—"),
      url: safeUrl,
    },
    {
      user_id: userId,
      title: normalized.title,
      company: normalized.company,
      url: safeUrl,
    },
  ];

  let lastError: unknown = null;
  for (const payload of payloadVariants) {
    // Retry write failures with small backoff to avoid random mid-list save drops.
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabase.from("saved_jobs").insert(payload);
      if (!result.error) {
        return normalized;
      }
      lastError = result.error;
      if (isTransientSupabaseError(result.error)) {
        await sleep(200 * (attempt + 1));
      }
    }
  }

  // Recovery path: if insert failed but row exists, treat it as saved.
  const existingByTitleCompany = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", normalized.title)
    .ilike("company", normalized.company)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!existingByTitleCompany.error && (existingByTitleCompany.data || []).length > 0) {
    return rowToJob((existingByTitleCompany.data || [])[0] as Record<string, unknown>);
  }

  // If created_at is unavailable in older schemas, retry without ordering.
  const fallbackExisting = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", normalized.title)
    .ilike("company", normalized.company)
    .limit(1);

  if (!fallbackExisting.error && (fallbackExisting.data || []).length > 0) {
    return rowToJob((fallbackExisting.data || [])[0] as Record<string, unknown>);
  }

  // Additional recovery for schemas keyed by URL.
  const existingByUrl = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .ilike("url", safeUrl)
    .limit(1);

  if (!existingByUrl.error && (existingByUrl.data || []).length > 0) {
    return rowToJob((existingByUrl.data || [])[0] as Record<string, unknown>);
  }

  console.error("saveJobToStore:", lastError);
  throw lastError;
}

export async function removeSavedJobFromStore(userId: string, job: TrackedJob): Promise<void> {
  if (job._savedRowId) {
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("id", job._savedRowId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", userId)
    .eq("job_id", job.id);

  if (!error) return;

  // Fallback delete for schemas without `job_id`.
  const fallback = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", userId)
    .ilike("title", job.title)
    .ilike("company", job.company);

  if (fallback.error) throw fallback.error;
}

export async function fetchApplications(userId: string): Promise<TrackedApplication[]> {
  const primary = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("applied_date", { ascending: false });

  if (!primary.error) {
    return (primary.data || []).map((row) => rowToApplication(row as Record<string, unknown>));
  }

  // Fallback for legacy schemas that may not have applied_date
  const fallback = await supabase.from("applications").select("*").eq("user_id", userId);
  if (fallback.error) {
    console.error("fetchApplications:", fallback.error);
    throw fallback.error;
  }
  return (fallback.data || []).map((row) => rowToApplication(row as Record<string, unknown>));
}

export async function insertApplication(
  userId: string,
  app: Omit<TrackedApplication, "id"> & { id?: string },
): Promise<TrackedApplication | null> {
  const payload = {
    company: app.company,
    role: app.role,
    status: app.status || "Applied",
    salary: app.salary,
    date: app.date || new Date().toISOString().split("T")[0],
    notes: app.notes,
  };

  let existingRes = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .ilike("company", payload.company)
    .ilike("title", payload.role)
    .maybeSingle();

  // Fallback duplicate lookup for schemas using `role` instead of `title`
  if (existingRes.error) {
    existingRes = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .ilike("company", payload.company)
      .ilike("role", payload.role)
      .maybeSingle();
  }

  if (existingRes.error) {
    console.error("insertApplication lookup:", existingRes.error);
    throw existingRes.error;
  }

  if (existingRes.data) return null;

  const primaryInsert = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_id: app.id || `app-${Date.now()}`,
      title: payload.role,
      company: payload.company,
      status: payload.status,
      salary: payload.salary || null,
      notes: payload.notes || null,
      applied_date: payload.date,
    });

  if (!primaryInsert.error) {
    return {
      id: app.id || `app-${Date.now()}`,
      company: payload.company,
      role: payload.role,
      status: payload.status,
      salary: payload.salary,
      date: payload.date,
      notes: payload.notes,
    };
  }

  // Fallback for schemas using `role` and/or `date` columns.
  const fallbackInsert = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_id: app.id || `app-${Date.now()}`,
      role: payload.role,
      company: payload.company,
      status: payload.status,
      salary: payload.salary || null,
      notes: payload.notes || null,
      date: payload.date,
    });

  if (fallbackInsert.error) {
    console.error("insertApplication:", fallbackInsert.error);
    throw fallbackInsert.error;
  }

  return {
    id: app.id || `app-${Date.now()}`,
    company: payload.company,
    role: payload.role,
    status: payload.status,
    salary: payload.salary,
    date: payload.date,
    notes: payload.notes,
  };
}

export async function updateApplicationStatus(
  userId: string,
  id: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("updateApplicationStatus:", error);
    throw error;
  }
}

export async function deleteApplicationFromStore(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id).eq("user_id", userId);

  if (error) {
    console.error("deleteApplicationFromStore:", error);
    throw error;
  }
}

export async function clearAllTrackerData(userId: string): Promise<void> {
  const [savedErr, appsErr] = await Promise.all([
    supabase.from("saved_jobs").delete().eq("user_id", userId),
    supabase.from("applications").delete().eq("user_id", userId),
  ]);

  if (savedErr.error) throw savedErr.error;
  if (appsErr.error) throw appsErr.error;
}
