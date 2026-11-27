-- ============================================================
--  013_challenge_submissions.sql
--  Stores learner practice submissions for each challenge card.
--  One row per user per practice idea (identified by practice_id).
-- ============================================================

create table if not exists public.challenge_submissions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  practice_id  text        not null,
  response     text        not null check (char_length(trim(response)) >= 10),
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint challenge_submissions_user_practice_unique unique (user_id, practice_id)
);

create index if not exists challenge_submissions_user_idx
  on public.challenge_submissions(user_id);

alter table public.challenge_submissions enable row level security;

drop policy if exists "Users can read own challenge submissions" on public.challenge_submissions;
create policy "Users can read own challenge submissions"
  on public.challenge_submissions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own challenge submissions" on public.challenge_submissions;
create policy "Users can insert own challenge submissions"
  on public.challenge_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own challenge submissions" on public.challenge_submissions;
create policy "Users can update own challenge submissions"
  on public.challenge_submissions for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can read all challenge submissions" on public.challenge_submissions;
create policy "Admins can read all challenge submissions"
  on public.challenge_submissions for select
  using (public.get_user_role(auth.uid()) = 'admin');

revoke all on public.challenge_submissions from anon, authenticated;
grant select, insert, update on public.challenge_submissions to authenticated;
grant all on public.challenge_submissions to service_role;

drop trigger if exists set_challenge_submissions_updated_at on public.challenge_submissions;
create trigger set_challenge_submissions_updated_at
  before update on public.challenge_submissions
  for each row execute procedure public.set_updated_at();
