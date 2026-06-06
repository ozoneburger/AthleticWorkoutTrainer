create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  program jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.readiness_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  date date,
  readiness jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.readiness_logs enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using ((select auth.uid()) = user_id);

create policy "Users can read their own program"
  on public.programs for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own program"
  on public.programs for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own program"
  on public.programs for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own program"
  on public.programs for delete
  using ((select auth.uid()) = user_id);

create policy "Users can read their own readiness logs"
  on public.readiness_logs for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own readiness logs"
  on public.readiness_logs for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own readiness logs"
  on public.readiness_logs for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own readiness logs"
  on public.readiness_logs for delete
  using ((select auth.uid()) = user_id);
