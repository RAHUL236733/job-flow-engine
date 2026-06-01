-- Coach chat sessions & extended chat_history columns
create table if not exists public.coach_chat_sessions (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default 'Career Coach',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coach_chat_sessions enable row level security;

drop policy if exists "Users manage own coach sessions" on public.coach_chat_sessions;
create policy "Users manage own coach sessions"
  on public.coach_chat_sessions for all
  using (auth.uid() = user_id);

alter table public.chat_history
  add column if not exists coach_session_id text,
  add column if not exists action_type text;
