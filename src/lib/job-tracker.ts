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
    id: row.job_id,
    title: row.title,
    company: row.company,
    location: row.location,
    salary: row.salary,
    url: row.apply_url,
    _savedRowId: row.id,
  });
}

function rowToApplication(row: Record<string, unknown>): TrackedApplication {
  const applied = row.applied_date ? String(row.applied_date) : "";
  return {
    id: String(row.id),
    company: String(row.company || ""),
    role: String(row.title || ""),
    status: String(row.status || "Applied"),
    salary: row.salary ? String(row.salary) : undefined,
    date: applied.includes("T") ? applied.split("T")[0] : applied || new Date().toISOString().split("T")[0],
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export async function fetchSavedJobs(userId: string): Promise<TrackedJob[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSavedJobs:", error);
    throw error;
  }

  return (data || []).map((row) => rowToJob(row as Record<string, unknown>));
}

export async function saveJobToStore(userId: string, job: TrackedJob): Promise<TrackedJob | null> {
  const normalized = normalizeJob(job);

  const { data: existing, error: existingErr } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", normalized.id)
    .maybeSingle();

  if (existingErr) {
    console.error("saveJobToStore lookup:", existingErr);
    throw existingErr;
  }

  if (existing) {
    return rowToJob(existing as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .insert({
      user_id: userId,
      job_id: normalized.id,
      title: normalized.title,
      company: normalized.company,
      location: normalized.location,
      salary: String(normalized.salary),
      apply_url: normalized.url || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("saveJobToStore:", error);
    throw error;
  }

  return rowToJob(data as Record<string, unknown>);
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

  if (error) throw error;
}

export async function fetchApplications(userId: string): Promise<TrackedApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("applied_date", { ascending: false });

  if (error) {
    console.error("fetchApplications:", error);
    throw error;
  }

  return (data || []).map((row) => rowToApplication(row as Record<string, unknown>));
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

  const { data: existing, error: existingErr } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .ilike("company", payload.company)
    .ilike("title", payload.role)
    .maybeSingle();

  if (existingErr) {
    console.error("insertApplication lookup:", existingErr);
    throw existingErr;
  }

  if (existing) return null;

  const { data, error } = await supabase
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
    })
    .select("*")
    .single();

  if (error) {
    console.error("insertApplication:", error);
    throw error;
  }

  return rowToApplication(data as Record<string, unknown>);
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
