-- Supabase Database Schema for AI Job Matcher
-- Execute this script in your Supabase SQL Editor.
-- Fully idempotent: can be safely executed multiple times.

-- Enable UUID generation extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. USERS (Target Table requested for persistence)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for users
alter table public.users enable row level security;

-- Policies for users
drop policy if exists "Users can view their own record" on public.users;
create policy "Users can view their own record" 
  on public.users for select 
  using (auth.uid() = id);

drop policy if exists "Users can update their own record" on public.users;
create policy "Users can update their own record" 
  on public.users for update 
  using (auth.uid() = id);

drop policy if exists "Users can insert their own record" on public.users;
create policy "Users can insert their own record" 
  on public.users for insert 
  with check (auth.uid() = id);


-- 2. USER PROFILES
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  skills text,
  ats_score integer default 0,
  resume_url text,
  resume_name text,
  experience_level text default 'Freshman/Student',
  preferred_role text,
  preferred_location text,
  job_type text default 'All',
  trials_used integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_profiles
alter table public.user_profiles enable row level security;

-- Policies for user_profiles
drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile" 
  on public.user_profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile" 
  on public.user_profiles for update 
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile" 
  on public.user_profiles for insert 
  with check (auth.uid() = id);


-- 3. RESUME SESSIONS
create table if not exists public.resume_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  resume_name text,
  resume_hash text,
  status text check (status in ('processing', 'generated', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for resume_sessions
alter table public.resume_sessions enable row level security;

-- Policies for resume_sessions
drop policy if exists "Users can manage their own resume sessions" on public.resume_sessions;
create policy "Users can manage their own resume sessions" 
  on public.resume_sessions for all 
  using (auth.uid() = user_id);


-- 4. AI ANALYSIS
create table if not exists public.ai_analysis (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.resume_sessions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  
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

-- Enable RLS for ai_analysis
alter table public.ai_analysis enable row level security;

-- Policies for ai_analysis
drop policy if exists "Users can manage their own ai analysis" on public.ai_analysis;
create policy "Users can manage their own ai analysis" 
  on public.ai_analysis for all 
  using (auth.uid() = user_id);


-- 5. CHAT HISTORY
create table if not exists public.chat_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  session_id uuid references public.resume_sessions(id) on delete cascade, -- Nullable if chat occurs outside specific sessions
  
  role text check (role in ('user', 'assistant')),
  message text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for chat_history
alter table public.chat_history enable row level security;

-- Policies for chat_history
drop policy if exists "Users can manage their own chat history" on public.chat_history;
create policy "Users can manage their own chat history" 
  on public.chat_history for all 
  using (auth.uid() = user_id);


-- 6. SAVED JOBS
create table if not exists public.saved_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  company text not null,
  location text,
  skills text,
  url text not null,
  score text,
  saved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_job_url unique (user_id, url)
);

-- Enable RLS for saved_jobs
alter table public.saved_jobs enable row level security;

-- Policies for saved_jobs
drop policy if exists "Users can manage their saved jobs" on public.saved_jobs;
create policy "Users can manage their saved jobs" 
  on public.saved_jobs for all 
  using (auth.uid() = user_id);


-- 7. CACHED JOB RESULTS
create table if not exists public.cached_job_results (
  id uuid primary key default uuid_generate_v4(),
  query_hash text not null unique,
  jobs jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- Enable RLS for cached_job_results
alter table public.cached_job_results enable row level security;

-- Policies for cached_job_results
drop policy if exists "Anyone can read cached job results" on public.cached_job_results;
create policy "Anyone can read cached job results" 
  on public.cached_job_results for select 
  using (true);

drop policy if exists "Authenticated users can insert cached job results" on public.cached_job_results;
create policy "Authenticated users can insert cached job results" 
  on public.cached_job_results for insert 
  with check (auth.role() = 'authenticated');


-- 8. RESUME ANALYSIS (Supabase-powered Caching System)
create table if not exists public.resume_analysis (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  session_id uuid references public.resume_sessions(id) on delete cascade,
  resume_hash text not null,
  career_analysis jsonb not null,
  jobs jsonb not null default '[]'::jsonb,
  internships jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for resume_analysis
alter table public.resume_analysis enable row level security;

-- Policies for resume_analysis
drop policy if exists "Users can manage their own resume analysis" on public.resume_analysis;
create policy "Users can manage their own resume analysis"
  on public.resume_analysis for all
  using (auth.uid() = user_id);


-- 9. TRIGGER FOR NEW USER SIGNUP (Auto-syncs auth.users details to public.users, public.user_profiles & public.user_stats)
create table if not exists public.user_stats (
  user_id uuid references auth.users on delete cascade primary key,
  jobs_matched integer default 0,
  applications_sent integer default 0,
  saved_jobs integer default 0,
  profile_score integer default 0,
  ats_match_rank integer default 0,
  resume_uploaded boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_stats
alter table public.user_stats enable row level security;

-- Policies for user_stats
drop policy if exists "Users can manage their own stats" on public.user_stats;
create policy "Users can manage their own stats"
  on public.user_stats for all
  using (auth.uid() = user_id);


create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into public.users
  insert into public.users (id, email, name, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(excluded.name, users.name);

  -- Insert into public.user_profiles
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, user_profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, user_profiles.avatar_url);

  -- Insert into public.user_stats
  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger to sync users safely
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
