-- ituwaAfrica : full schema (single-file, idempotent)
-- Run this once in the Supabase SQL editor on a fresh project.
-- Covers: auth, profiles, courses, modules, lessons,
--         enrollments, lesson_progress, RLS, triggers, seed data.

-- ════════════════════════════════════════════════════════════════
-- 0. EXTENSIONS
-- ════════════════════════════════════════════════════════════════
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ════════════════════════════════════════════════════════════════
do $$ begin
  create type user_role     as enum ('learner', 'instructor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_access as enum ('free', 'paid', 'preview');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_access as enum ('free', 'paid', 'preview');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_type   as enum ('video', 'text', 'mixed');
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════════
-- 2. HELPER FUNCTIONS (table-independent only)
-- ════════════════════════════════════════════════════════════════

-- updated_at stamp (no table dependency : safe to create early)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: get_user_role() references public.profiles and is created
-- in section 3B, after the profiles table exists.

-- ════════════════════════════════════════════════════════════════
-- 3. PROFILES
-- ════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text,
  avatar_url  text,
  role        user_role   not null default 'learner',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'learner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── 3B. Role lookup helper (needs profiles to exist first) ───────
-- security definer avoids RLS recursion when policies call this fn
create or replace function public.get_user_role(user_id uuid)
returns user_role
language sql
security definer set search_path = public
stable as $$
  select role from public.profiles where id = user_id;
$$;

-- Prevent non-admins from escalating their own account role
create or replace function public.prevent_untrusted_role_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and public.get_user_role(auth.uid()) is distinct from 'admin'::public.user_role
  then
    raise exception 'Only an administrator can change account roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_untrusted_role_changes on public.profiles;
create trigger prevent_untrusted_role_changes
  before update on public.profiles
  for each row execute procedure public.prevent_untrusted_role_changes();

-- Admins can read every profile (used by /admin page)
-- Must be created after get_user_role exists
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.get_user_role(auth.uid()) = 'admin');

-- ════════════════════════════════════════════════════════════════
-- 4. COURSES
-- ════════════════════════════════════════════════════════════════
create table if not exists public.courses (
  id            uuid          primary key default gen_random_uuid(),
  title         text          not null,
  slug          text          not null unique,
  description   text,
  academy       text,
  status        course_status not null default 'draft',
  access        course_access not null default 'free',
  thumbnail_url text,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create index if not exists courses_slug_idx   on public.courses(slug);
create index if not exists courses_status_idx on public.courses(status);

alter table public.courses enable row level security;

drop policy if exists "Published courses are publicly readable"         on public.courses;
drop policy if exists "Admins and instructors can read all courses"     on public.courses;
drop policy if exists "Admins and instructors can insert courses"       on public.courses;
drop policy if exists "Admins and instructors can update courses"       on public.courses;

create policy "Published courses are publicly readable"
  on public.courses for select
  using (status = 'published');

create policy "Admins and instructors can read all courses"
  on public.courses for select
  using (public.get_user_role(auth.uid()) in ('admin', 'instructor'));

create policy "Admins and instructors can insert courses"
  on public.courses for insert
  with check (public.get_user_role(auth.uid()) in ('admin', 'instructor'));

create policy "Admins and instructors can update courses"
  on public.courses for update
  using (public.get_user_role(auth.uid()) in ('admin', 'instructor'));

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 5. MODULES
-- ════════════════════════════════════════════════════════════════
create table if not exists public.modules (
  id          uuid        primary key default gen_random_uuid(),
  course_id   uuid        not null references public.courses(id) on delete cascade,
  title       text        not null,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists modules_course_idx on public.modules(course_id);

alter table public.modules enable row level security;

drop policy if exists "Published course modules are publicly readable"  on public.modules;
drop policy if exists "Admins and instructors can manage modules"       on public.modules;

create policy "Published course modules are publicly readable"
  on public.modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
  );

create policy "Admins and instructors can manage modules"
  on public.modules for all
  using (public.get_user_role(auth.uid()) in ('admin', 'instructor'));

drop trigger if exists set_modules_updated_at on public.modules;
create trigger set_modules_updated_at
  before update on public.modules
  for each row execute procedure public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 6. LESSONS
-- ════════════════════════════════════════════════════════════════
create table if not exists public.lessons (
  id               uuid          primary key default gen_random_uuid(),
  course_id        uuid          not null references public.courses(id) on delete cascade,
  module_id        uuid          references public.modules(id) on delete set null,
  slug             text          not null,
  title            text          not null,
  position         integer       not null default 0,
  lesson_type      lesson_type   not null default 'text',
  access_level     lesson_access not null default 'free',
  -- YouTube
  youtube_video_id text,
  video_duration   text,
  -- Text content
  body             text,
  takeaway         text,
  -- Metadata
  read_time_min    integer,
  status           text          not null default 'draft'
                   check (status in ('draft', 'published')),
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  unique (course_id, slug)
);

create index if not exists lessons_course_idx  on public.lessons(course_id);
create index if not exists lessons_module_idx  on public.lessons(module_id);
create index if not exists lessons_status_idx  on public.lessons(status);

alter table public.lessons enable row level security;

drop policy if exists "Free published lessons readable by authenticated users" on public.lessons;
drop policy if exists "Paid lessons readable by enrolled users"                on public.lessons;
drop policy if exists "Preview lessons are publicly readable"                  on public.lessons;
drop policy if exists "Admins and instructors can manage lessons"              on public.lessons;

-- Free lessons: any authenticated user
create policy "Free published lessons readable by authenticated users"
  on public.lessons for select
  using (
    status = 'published'
    and access_level = 'free'
    and auth.uid() is not null
  );

-- Preview lessons: publicly readable (no auth required)
create policy "Preview lessons are publicly readable"
  on public.lessons for select
  using (
    status = 'published'
    and access_level = 'preview'
  );

create policy "Admins and instructors can manage lessons"
  on public.lessons for all
  using (public.get_user_role(auth.uid()) in ('admin', 'instructor'));

-- NOTE: "Paid lessons readable by enrolled users" references public.enrollments
-- and is added in section 7B, after the enrollments table is created.

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
  before update on public.lessons
  for each row execute procedure public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 7. ENROLLMENTS
-- ════════════════════════════════════════════════════════════════
create table if not exists public.enrollments (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  course_id    uuid        not null references public.courses(id)  on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists enrollments_user_idx   on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);

alter table public.enrollments enable row level security;

drop policy if exists "Users can read own enrollments"      on public.enrollments;
drop policy if exists "Authenticated users can enroll"      on public.enrollments;
drop policy if exists "Users can update own enrollment"     on public.enrollments;
drop policy if exists "Admins can read all enrollments"     on public.enrollments;

create policy "Users can read own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Authenticated users can enroll"
  on public.enrollments for insert
  with check (auth.uid() = user_id);

-- Users can mark a course completed (update completed_at)
create policy "Users can update own enrollment"
  on public.enrollments for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can read all enrollments"
  on public.enrollments for select
  using (public.get_user_role(auth.uid()) = 'admin');

-- ── 7B. Paid-lesson policy (enrollments table now exists) ────────
drop policy if exists "Paid lessons readable by enrolled users" on public.lessons;
create policy "Paid lessons readable by enrolled users"
  on public.lessons for select
  using (
    status = 'published'
    and access_level = 'paid'
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lessons.course_id
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 8. LESSON PROGRESS
-- ════════════════════════════════════════════════════════════════
-- lesson_id is a uuid FK to lessons : consistent with database.types.ts
create table if not exists public.lesson_progress (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  lesson_id    uuid        not null references public.lessons(id)  on delete cascade,
  course_id    uuid        not null references public.courses(id)  on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx   on public.lesson_progress(user_id);
create index if not exists lesson_progress_course_idx on public.lesson_progress(course_id);

alter table public.lesson_progress enable row level security;

drop policy if exists "Users can read own progress"    on public.lesson_progress;
drop policy if exists "Users can insert own progress"  on public.lesson_progress;
drop policy if exists "Users can upsert own progress"  on public.lesson_progress;
drop policy if exists "Admins can read all progress"   on public.lesson_progress;

create policy "Users can read own progress"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

-- Allow upsert (on conflict do update) from the client
create policy "Users can upsert own progress"
  on public.lesson_progress for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can read all progress"
  on public.lesson_progress for select
  using (public.get_user_role(auth.uid()) = 'admin');

-- ════════════════════════════════════════════════════════════════
-- 9. SEED DATA
--    All courses, modules and lessons the app currently shows.
--    Idempotent: uses INSERT … ON CONFLICT DO NOTHING.
-- ════════════════════════════════════════════════════════════════

-- ── 9A. Courses ─────────────────────────────────────────────────
insert into public.courses (id, title, slug, description, academy, status, access)
values
  -- AI Foundations
  (
    '11111111-0000-0000-0000-000000000001',
    'Your AI Toolkit: A Practical Start',
    'ai-toolkit-practical-start',
    'New to AI and tired of the buzzwords? Learn what these tools can do, where they fall short, and how to use one on a task you already have.',
    'AI Foundations',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'Prompting for Better Work',
    'prompting-better-work',
    'Getting answers that sound right but do not help? Learn how to give a tool the details it needs and check its work.',
    'AI Foundations',
    'published',
    'free'
  ),

  -- AI Content Creation
  (
    '11111111-0000-0000-0000-000000000003',
    'The Freelance AI Content Studio',
    'freelance-ai-content-studio',
    'Turn a client brief into clear content and build samples you can show when pitching.',
    'AI Content Creation',
    'draft',
    'paid'
  ),

  -- AI Automation
  (
    '11111111-0000-0000-0000-000000000004',
    'Build Your First AI Workflow',
    'build-first-ai-workflow',
    'Stop repeating the same task by hand. Pick one routine job and build a simple workflow.',
    'AI Automation',
    'draft',
    'paid'
  ),

  -- AI Freelancing
  (
    '11111111-0000-0000-0000-000000000005',
    'AI for Your Freelance Business',
    'ai-freelance-business',
    'Not sure what to sell? Find one problem you can solve and turn it into a clear offer.',
    'AI Freelancing',
    'draft',
    'paid'
  ),

  -- AI App Development
  (
    '11111111-0000-0000-0000-000000000006',
    'Build a Helpful AI App',
    'build-helpful-ai-app',
    'Have an idea but not sure how to build it? Make a first version you can test with people.',
    'AI App Development',
    'draft',
    'paid'
  ),

  -- Creator Economy & YouTube
  (
    '11111111-0000-0000-0000-000000000007',
    'YouTube Business Fundamentals',
    'youtube-business-fundamentals',
    'Want to start a channel but unsure how it earns? Learn the basics, costs, and realistic ways creators make money.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000008',
    'Starting a Faceless YouTube Channel',
    'starting-a-faceless-youtube-channel',
    'Want to make videos but not appear on camera? Plan a channel with its own clear point of view.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000009',
    'YouTube Automation & Monetization Masterclass',
    'youtube-automation-monetization-masterclass',
    'Save time on repeat tasks without handing over your creative decisions.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000010',
    'AI-Powered YouTube Content Production',
    'ai-powered-youtube-content-production',
    'Use AI to get past the blank page, then shape the final video in your own voice.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000011',
    'YouTube Shorts Growth Strategy',
    'youtube-shorts-growth-strategy',
    'Make short videos around what your audience cares about. Views are never guaranteed.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000012',
    'YouTube SEO and Analytics',
    'youtube-seo-and-analytics',
    'See what people search for, read your channel stats, and decide what to try next.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000013',
    'YouTube Monetization Policies and Copyright',
    'youtube-monetization-policies-and-copyright',
    'Know what you can use, what needs credit, and where to check the latest rules.',
    'Creator Economy & YouTube',
    'published',
    'free'
  ),
  (
    '11111111-0000-0000-0000-000000000014',
    'Building a Creator Business Beyond Ad Revenue',
    'building-a-creator-business-beyond-ad-revenue',
    'Ad income can be unpredictable. Explore services, products, and partnerships that fit your audience.',
    'Creator Economy & YouTube',
    'published',
    'free'
  )
on conflict (slug) do nothing;


-- ── 9B. Modules : AI Toolkit course ─────────────────────────────
insert into public.modules (id, course_id, title, position)
values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Getting oriented',      1),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Working with prompts',  2),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Put it into practice',  3)
on conflict do nothing;

-- Modules : Prompting for Better Work
insert into public.modules (id, course_id, title, position)
values
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'The shape of a prompt',    1),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Make it more useful',      2),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'A repeatable practice',    3)
on conflict do nothing;

-- Modules : YouTube Business Fundamentals (single module)
insert into public.modules (id, course_id, title, position)
values
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'Strategy and foundations',    1),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000007', 'Make and publish',            2),
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000007', 'Review and grow responsibly', 3)
on conflict do nothing;


-- ── 9C. Lessons : AI Toolkit (8 lessons) ────────────────────────
insert into public.lessons (id, course_id, module_id, slug, title, position, lesson_type, access_level, status, read_time_min)
values
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'lesson-1', 'What AI can (and cannot) do',          1, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'lesson-2', 'A practical AI toolkit',              2, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'lesson-3', 'Use AI with care and good judgement', 3, 'text', 'free', 'published', 5),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'lesson-4', 'Give your prompt a purpose',          4, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'lesson-5', 'Add context that matters',            5, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'lesson-6', 'Improve a first response',            6, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'lesson-7', 'Build a personal workflow',           7, 'text', 'free', 'published', 8),
  ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'lesson-8', 'Your first AI-assisted project',      8, 'text', 'free', 'published', 10)
on conflict (course_id, slug) do nothing;

-- Lessons : Prompting for Better Work (12 lessons)
insert into public.lessons (id, course_id, module_id, slug, title, position, lesson_type, access_level, status, read_time_min)
values
  ('33333333-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 'lesson-1',  'Start with the task',               1, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 'lesson-2',  'Add context and constraints',       2, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 'lesson-3',  'Describe the output you need',      3, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 'lesson-4',  'Work in small iterations',          4, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 'lesson-5',  'Ask for alternatives',              5, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 'lesson-6',  'Check what matters',                6, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000017', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-7',  'Create your prompt brief',          7, 'text', 'free', 'published', 8),
  ('33333333-0000-0000-0000-000000000018', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-8',  'Build a reusable template',         8, 'text', 'free', 'published', 9),
  ('33333333-0000-0000-0000-000000000019', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-9',  'Combining prompts into a workflow',  9, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000020', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-10', 'Spotting weak answers',             10, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000021', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-11', 'Fact-checking your output',         11, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000022', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', 'lesson-12', 'Your prompting practice review',    12, 'text', 'free', 'published', 8)
on conflict (course_id, slug) do nothing;

-- Lessons : YouTube Business Fundamentals (8 lessons)
insert into public.lessons (id, course_id, module_id, slug, title, position, lesson_type, access_level, status, read_time_min)
values
  ('33333333-0000-0000-0000-000000000031', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', 'lesson-1', 'Define your audience and channel promise',    1, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000032', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', 'lesson-2', 'Research topics and validate demand',         2, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000033', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', 'lesson-3', 'Build a distinctive channel identity',        3, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000034', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000008', 'lesson-4', 'Plan a useful publishing rhythm',             4, 'text', 'free', 'published', 6),
  ('33333333-0000-0000-0000-000000000035', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000008', 'lesson-5', 'Create an original video outline',            5, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000036', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000008', 'lesson-6', 'Produce and package your video',              6, 'text', 'free', 'published', 8),
  ('33333333-0000-0000-0000-000000000037', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000009', 'lesson-7', 'Review audience signals and analytics',       7, 'text', 'free', 'published', 7),
  ('33333333-0000-0000-0000-000000000038', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000009', 'lesson-8', 'Evaluate rights, policy, and next steps',     8, 'text', 'free', 'published', 8)
on conflict (course_id, slug) do nothing;

-- Lessons shared by the remaining 7 Creator Economy courses (8 lessons each)
-- They use the same lesson titles as youtube-business-fundamentals because
-- the LessonPreview component serves them all identically until real content is added.
-- Courses: 08–14 each get lessons seeded with the same titles.

do $$
declare
  cids uuid[] := array[
    '11111111-0000-0000-0000-000000000008',
    '11111111-0000-0000-0000-000000000009',
    '11111111-0000-0000-0000-000000000010',
    '11111111-0000-0000-0000-000000000011',
    '11111111-0000-0000-0000-000000000012',
    '11111111-0000-0000-0000-000000000013',
    '11111111-0000-0000-0000-000000000014'
  ];
  titles text[] := array[
    'Define your audience and channel promise',
    'Research topics and validate demand',
    'Build a distinctive channel identity',
    'Plan a useful publishing rhythm',
    'Create an original video outline',
    'Produce and package your video',
    'Review audience signals and analytics',
    'Evaluate rights, policy, and next steps'
  ];
  cid uuid;
  i   int;
begin
  foreach cid in array cids loop
    -- ensure a module exists for this course
    insert into public.modules (course_id, title, position)
    values (cid, 'Course content', 1)
    on conflict do nothing;

    for i in 1..8 loop
      insert into public.lessons (course_id, module_id, slug, title, position, lesson_type, access_level, status, read_time_min)
      select
        cid,
        m.id,
        'lesson-' || i,
        titles[i],
        i,
        'text',
        'free',
        'published',
        7
      from public.modules m
      where m.course_id = cid
      limit 1
      on conflict (course_id, slug) do nothing;
    end loop;
  end loop;
end;
$$;


-- ════════════════════════════════════════════════════════════════
-- DONE
-- After running this script:
--   1. All tables, enums, functions, triggers and RLS policies exist.
--   2. 14 courses are seeded (2 AI Foundations, 4 coming-soon,
--      8 Creator Economy) with modules and lessons.
--   3. lesson_progress.lesson_id is a uuid FK to lessons.
--   4. Enrollments and lesson_progress support user updates (upsert).
--   5. Admin panel can read all profiles, enrollments and courses.
-- ════════════════════════════════════════════════════════════════
