-- New migration to create career_analysis and chat_messages tables

-- 1. Create career_analysis table
create table if not exists public.career_analysis (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
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

-- Enable RLS for career_analysis
alter table public.career_analysis enable row level security;

-- Policy for career_analysis
drop policy if exists "Users can manage their own career analysis" on public.career_analysis;
create policy "Users can manage their own career analysis"
  on public.career_analysis for all
  using (auth.uid() = user_id);

-- 2. Create chat_messages table
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for chat_messages
alter table public.chat_messages enable row level security;

-- Policy for chat_messages
drop policy if exists "Users can manage their own chat messages" on public.chat_messages;
create policy "Users can manage their own chat messages"
  on public.chat_messages for all
  using (auth.uid() = user_id);
