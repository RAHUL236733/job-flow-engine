-- Supabase Database Schema for AI Job Matcher
-- Unified architecture cleanly connected through auth.users

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create profiles table
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique not null references auth.users(id) on delete cascade,
    full_name text,
    email text,
    target_location text,
    target_job_title text,
    experience_level text,
    preferred_job_type text,
    skills text[],
    profile_score integer default 0,
    ats_score integer default 0,
    resume_uploaded boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 2. Create saved_jobs table
create table if not exists public.saved_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    job_id text,
    title text,
    company text,
    location text,
    salary text,
    apply_url text,
    created_at timestamp with time zone default now()
);

-- 3. Create applications table
create table if not exists public.applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    job_id text,
    title text,
    company text,
    status text default 'Applied',
    salary text,
    notes text,
    applied_date timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 4. Create resumes table
create table if not exists public.resumes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    resume_name text,
    resume_url text,
    ats_score integer,
    extracted_skills text[],
    uploaded_at timestamp with time zone default now()
);

-- 5. RESUME SESSIONS (Adapted for unified layout)
create table if not exists public.resume_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  resume_name text,
  resume_hash text,
  status text check (status in ('processing', 'generated', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. AI ANALYSIS (Adapted for unified layout)
create table if not exists public.ai_analysis (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.resume_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  
  resume_review jsonb,
  ats_score jsonb,
  skill_gap_analysis jsonb,
  interview_practice jsonb,
  career_roadmap jsonb,
  job_recommendations jsonb,
  salary_insights jsonb,
  linkedin_optimization jsonb,
  cover_letter_generator jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. CAREER ANALYSIS (Adapted for unified layout)
create table if not exists public.career_analysis (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.resume_sessions(id) on delete cascade,
  resume_review jsonb,
  ats_analysis jsonb,
  skill_gap_analysis jsonb,
  interview_practice jsonb,
  career_roadmap jsonb,
  salary_insights jsonb,
  linkedin_optimization jsonb,
  cover_letter jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. COACH CHAT SESSIONS (Adapted for unified layout)
create table if not exists public.coach_chat_sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Career Coach',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. CHAT HISTORY (Adapted for unified layout)
create table if not exists public.chat_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.resume_sessions(id) on delete cascade,
  coach_session_id text,
  action_type text,
  role text check (role in ('user', 'assistant')),
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. CHAT MESSAGES (Adapted for unified layout)
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.applications enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_sessions enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.career_analysis enable row level security;
alter table public.coach_chat_sessions enable row level security;
alter table public.chat_history enable row level security;
alter table public.chat_messages enable row level security;

-- profiles RLS Policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- saved_jobs RLS Policies
drop policy if exists "Users can view their own saved jobs" on public.saved_jobs;
create policy "Users can view their own saved jobs"
  on public.saved_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own saved jobs" on public.saved_jobs;
create policy "Users can insert their own saved jobs"
  on public.saved_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved jobs" on public.saved_jobs;
create policy "Users can delete their own saved jobs"
  on public.saved_jobs for delete
  using (auth.uid() = user_id);

-- applications RLS Policies
drop policy if exists "Users can view their own applications" on public.applications;
create policy "Users can view their own applications"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own applications" on public.applications;
create policy "Users can insert their own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own applications" on public.applications;
create policy "Users can update their own applications"
  on public.applications for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own applications" on public.applications;
create policy "Users can delete their own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- resumes RLS Policies
drop policy if exists "Users can view their own resumes" on public.resumes;
create policy "Users can view their own resumes"
  on public.resumes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own resumes" on public.resumes;
create policy "Users can insert their own resumes"
  on public.resumes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resumes" on public.resumes;
create policy "Users can delete their own resumes"
  on public.resumes for delete
  using (auth.uid() = user_id);

-- resume_sessions RLS Policies
drop policy if exists "Users can manage their own resume sessions" on public.resume_sessions;
create policy "Users can manage their own resume sessions"
  on public.resume_sessions for all
  using (auth.uid() = user_id);

-- ai_analysis RLS Policies
drop policy if exists "Users can manage their own ai analysis" on public.ai_analysis;
create policy "Users can manage their own ai analysis"
  on public.ai_analysis for all
  using (auth.uid() = user_id);

-- career_analysis RLS Policies
drop policy if exists "Users can manage their own career analysis" on public.career_analysis;
create policy "Users can manage their own career analysis"
  on public.career_analysis for all
  using (auth.uid() = user_id);

-- coach_chat_sessions RLS Policies
drop policy if exists "Users manage own coach sessions" on public.coach_chat_sessions;
create policy "Users manage own coach sessions"
  on public.coach_chat_sessions for all
  using (auth.uid() = user_id);

-- chat_history RLS Policies
drop policy if exists "Users can manage their own chat history" on public.chat_history;
create policy "Users can manage their own chat history"
  on public.chat_history for all
  using (auth.uid() = user_id);

-- chat_messages RLS Policies
drop policy if exists "Users can manage their own chat messages" on public.chat_messages;
create policy "Users can manage their own chat messages"
  on public.chat_messages for all
  using (auth.uid() = user_id);


-- Trigger Function to Automatically Create Profiles on User SignUp
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name, experience_level, preferred_job_type, skills)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'Freshman/Student',
    'All',
    array[]::text[]
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11. Create job_matches table
create table if not exists public.job_matches (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    jobs jsonb,
    internships jsonb,
    created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.job_matches enable row level security;

-- job_matches RLS Policies
drop policy if exists "Users can view their own job matches" on public.job_matches;
create policy "Users can view their own job matches"
  on public.job_matches for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own job matches" on public.job_matches;
create policy "Users can insert their own job matches"
  on public.job_matches for insert
  with check (auth.uid() = user_id);

-- 12. Create analysis_results table
create table if not exists public.analysis_results (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    response_json jsonb,
    created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.analysis_results enable row level security;

-- analysis_results RLS Policies
drop policy if exists "Users can view their own analysis results" on public.analysis_results;
create policy "Users can view their own analysis results"
  on public.analysis_results for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analysis results" on public.analysis_results;
create policy "Users can insert their own analysis results"
  on public.analysis_results for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own analysis results" on public.analysis_results;
create policy "Users can update their own analysis results"
  on public.analysis_results for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own analysis results" on public.analysis_results;
create policy "Users can delete their own analysis results"
  on public.analysis_results for delete
  using (auth.uid() = user_id);

