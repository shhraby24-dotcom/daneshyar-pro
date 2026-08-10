-- ============================================================
-- دانش‌یار پرو - اسکیمای Supabase (ماه ۴: Sync + اشتراک)
-- ============================================================

-- جداول sync با payload jsonb + LWW
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create table if not exists public.flashcards (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create table if not exists public.quiz_results (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create table if not exists public.study_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- اشتراک پریمیوم
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'monthly',
  expires_at timestamptz not null,
  updated_at timestamptz not null
);

-- RLS: هر کاربر فقط داده‌ی خودش
alter table public.notes enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_results enable row level security;
alter table public.study_sessions enable row level security;
alter table public.subscriptions enable row level security;

create policy "own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own flashcards" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quiz_results" on public.quiz_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own study_sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own subscription" on public.subscriptions for select using (auth.uid() = user_id);