import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BookOpen, LayoutDashboard, LogOut, PenLine, ShieldCheck, Trophy, User, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import Brand from '@/components/brand'
import AppBottomNav from '@/components/app-bottom-nav'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .maybeSingle()) as { data: import('@/lib/database.types').Profile | null; error: unknown }

  const { data: rawEnrollments } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  type EnrollmentWithCourse = import('@/lib/database.types').Enrollment & {
    courses: import('@/lib/database.types').Course | null
  }
  let enrollments = (rawEnrollments ?? []) as EnrollmentWithCourse[]

  const { data: rawProgress } = await supabase
    .from('lesson_progress')
    .select('course_id, lesson_id')
    .eq('user_id', user.id)

  const { data: rawChallengeSubmissions } = await supabase
    .from('challenge_submissions')
    .select('practice_id')
    .eq('user_id', user.id)

  const progressRows = rawProgress as Array<{ course_id: string; lesson_id: string }> | null
  const progressByCourse: Record<string, number> = {}
  progressRows?.forEach((row) => {
    progressByCourse[row.course_id] = (progressByCourse[row.course_id] ?? 0) + 1
  })

  // Self-healing: if the learner has progress records for courses not yet in enrollments, include them
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id))
  const missingCourseIds = Object.keys(progressByCourse).filter((id) => !enrolledCourseIds.has(id))
  if (missingCourseIds.length > 0) {
    const { data: missingCourses } = await supabase
      .from('courses')
      .select('*')
      .in('id', missingCourseIds)

    if (missingCourses && missingCourses.length > 0) {
      // Backfill missing enrollment records in database
      await supabase.from('enrollments').upsert(
        missingCourses.map((c) => ({
          user_id: user.id,
          course_id: c.id,
          enrolled_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,course_id', ignoreDuplicates: true }
      )

      const backfilled: EnrollmentWithCourse[] = missingCourses.map((c) => ({
        id: `auto-${c.id}`,
        user_id: user.id,
        course_id: c.id,
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        payment_verified_at: null,
        payment_verified_by: null,
        courses: c,
      }))
      enrollments = [...enrollments, ...backfilled]
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Learner'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const continueEnrollment = enrollments?.[0]
  const totalLessons = progressRows?.length ?? 0
  const totalChallenges = rawChallengeSubmissions?.length ?? 0
  const isAdmin = profile?.role === 'admin'
  const continueCourse = continueEnrollment?.courses
  const continueCourseId = continueCourse?.id
  const continueCompleted = continueCourseId ? progressByCourse[continueCourseId] ?? 0 : 0

  // Find the next incomplete lesson slug for the continue-learning card
  let continueLessonSlug = 'lesson-1'
  if (continueCourseId) {
    const completedForCourse = new Set(
      (rawProgress as Array<{ course_id: string; lesson_id?: string }> | null)
        ?.filter((r) => r.course_id === continueCourseId && r.lesson_id)
        .map((r) => r.lesson_id) ?? []
    )
    const { data: rawCourseLessons } = await supabase
      .from('lessons')
      .select('slug, position')
      .eq('course_id', continueCourseId)
      .eq('status', 'published')
      .order('position', { ascending: true })
    const courseLessons = (rawCourseLessons ?? []) as Array<{ slug: string; position: number }>
    const nextLesson = courseLessons.find((l) => !completedForCourse.has(l.slug))
    continueLessonSlug = nextLesson?.slug ?? courseLessons[courseLessons.length - 1]?.slug ?? 'lesson-1'
  }

  // Academy colour map for course art
  const academyColours: Record<string, string> = {
    'AI Foundations':          '#F5EDFA',
    'AI Content Marketing':    '#FDEEE9',
    'AI Freelancing':          '#EEF7EE',
    'AI App Development':      '#EEF3FC',
    'AI Video Creation':       '#FDF5E8',
    'AI Graphic Design':      '#FDEEE9',
    'Creator Economy & YouTube': '#F3EDF9',
  }

  return (
    <div className="app-shell">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar-top">
          <Brand />
          <nav className="app-sidebar-nav">
            <Link href="/dashboard" className="app-sidebar-item app-sidebar-item--active">
              <LayoutDashboard size={18} aria-hidden="true" /> Dashboard
            </Link>
            <Link href="/courses" className="app-sidebar-item">
              <BookOpen size={18} aria-hidden="true" /> Browse courses
            </Link>
            <Link href="/dashboard/challenges" className="app-sidebar-item">
              <PenLine size={18} aria-hidden="true" /> Practice
            </Link>
            <Link href="/dashboard/profile" className="app-sidebar-item">
              <User size={18} aria-hidden="true" /> Profile
            </Link>
            {isAdmin && (
              <Link href="/admin" className="app-sidebar-item app-sidebar-item--admin">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>Admin Console</span>
                <span className="super-admin-sidebar-tag">ADMIN</span>
              </Link>
            )}
          </nav>
        </div>
        <div className="app-sidebar-foot">
          <form action={signOut}>
            <button type="submit" className="app-sidebar-signout">
              <LogOut size={15} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="app-content">

        {/* Mobile-only top chrome */}
        <header className="app-topbar" aria-label="App header">
          <Brand />
          <div className="app-topbar-right">
            {isAdmin && (
              <Link href="/admin" className="super-admin-topbar-chip" aria-label="Admin portal">
                <ShieldCheck size={14} />
                <span>ADMIN</span>
              </Link>
            )}
            <button className="app-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <Link href="/dashboard/profile" className="app-avatar" aria-label="Your profile">
              {(profile?.full_name ?? user.email ?? 'L')[0].toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="app-main" id="main-content">
          {/* Greeting band */}
          <section className="app-greeting-band">
            <div className="app-greeting-text">
              <p className="app-greeting-sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1 className="app-greeting-h1">{greeting}, {firstName}</h1>
            </div>
            <div className="app-streak-chip">
              <span>Learn at your own pace</span>
            </div>
          </section>

          {/* Stats row */}
          <section className="app-stats-row" aria-label="Your stats">
            <div className="app-stat">
              <span className="app-stat-num">{enrollments?.length ?? 0}</span>
              <span className="app-stat-label">Courses</span>
            </div>
            <div className="app-stat-divider" aria-hidden="true" />
            <div className="app-stat">
              <span className="app-stat-num">{totalLessons}</span>
              <span className="app-stat-label">Lessons done</span>
            </div>
            <div className="app-stat-divider" aria-hidden="true" />
            <div className="app-stat">
              <span className="app-stat-num">{totalChallenges}</span>
              <span className="app-stat-label">Challenges</span>
            </div>
          </section>

          {/* Continue learning */}
          {continueCourse ? (
            <section className="app-section">
              <div className="app-section-label">CONTINUE LEARNING</div>
              <Link
                href={`/learn/${continueCourse.slug}/${continueLessonSlug}`}
                className="app-continue-card"
                aria-label={`Continue: ${continueCourse.title}`}
              >
                <div
                  className="app-continue-art"
                  style={{ background: academyColours[continueCourse.academy ?? ''] ?? '#eeecff' }}
                  aria-hidden="true"
                >
                  <span className="app-continue-num">01</span>
                </div>
                <div className="app-continue-body">
                  <span className="app-academy-chip">{continueCourse.academy}</span>
                  <h2 className="app-continue-title">{continueCourse.title}</h2>
                  <span className="app-progress-label">
                    Completed lessons: {continueCompleted}
                  </span>
                </div>
                <ArrowRight size={18} className="app-continue-arrow" aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          {/* My courses */}
          <section className="app-section">
            <div className="app-section-header">
              <div className="app-section-label">MY COURSES</div>
              <Link href="/courses" className="app-section-see-all">See all</Link>
            </div>

            {enrollments && enrollments.length > 0 ? (
              <div className="app-course-tiles">
                {enrollments.map((en, i) => {
                  if (!en.courses) return null
                  const c = en.courses
                  const done = progressByCourse[c.id] ?? 0
                  const bg = academyColours[c.academy ?? ''] ?? '#eeecff'
                  return (
                    <Link
                      key={en.id}
                      href={`/learn/${c.slug}/lesson-1`}
                      className="app-course-tile"
                      aria-label={`${c.title} : ${done} completed lessons`}
                    >
                      <div className="app-tile-art" style={{ background: bg }} aria-hidden="true">
                        <span className="app-tile-num">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="app-tile-body">
                        {c.academy && <span className="app-academy-chip app-academy-chip--xs">{c.academy}</span>}
                        <h3 className="app-tile-title">{c.title}</h3>
                        <span className="app-progress-label">Completed lessons: {done}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="app-empty-state">
                <Trophy size={32} className="app-empty-icon" aria-hidden="true" />
                <p>Choose a course to start. Your enrolled courses will appear here.</p>
                <Link href="/courses" className="button button-dark">
                  Choose a course <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </section>

          {/* Explore CTA */}
          <section className="app-explore-banner">
            <div>
              <p className="app-explore-label">DISCOVER MORE</p>
              <h3 className="app-explore-title">Choose a skill to learn next</h3>
            </div>
            <Link href="/courses" className="button button-dark" style={{ flexShrink: 0 }}>
              View courses <ArrowRight size={15} />
            </Link>
          </section>

          {/* Bottom padding so content clears the mobile nav bar */}
          <div className="app-bottom-spacer" aria-hidden="true" />
        </main>
      </div>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <AppBottomNav active="dashboard" />
    </div>
  )
}
