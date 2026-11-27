import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  BookOpen,
  CheckCircle,
  LayoutDashboard,
  Lock,
  LogOut,
  PenLine,
  User,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import Brand from '@/components/brand'
import AppBottomNav from '@/components/app-bottom-nav'
import { getCourseProduct } from '@/lib/course-products'
import { PRACTICE_IDEAS } from '@/lib/practice-ideas'
import ChallengeSubmitForm from '@/components/challenge-submit-form'

export default async function ChallengesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .maybeSingle()) as { data: import('@/lib/database.types').Profile | null; error: unknown }

  const practiceDbSlugs = Array.from(
    new Set(
      PRACTICE_IDEAS.map((idea) => getCourseProduct(idea.courseSlug)?.databaseSlug ?? idea.courseSlug)
    )
  )
  const practiceLessonSlugs = Array.from(new Set(PRACTICE_IDEAS.map((idea) => idea.lessonSlug)))

  const [{ data: rawEnrollments }, { data: rawSubmissions }, { data: rawPublishedCourses }] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select('course_id, payment_verified_at, courses(slug)')
        .eq('user_id', user.id),
      supabase
        .from('challenge_submissions')
        .select('practice_id, response, submitted_at')
        .eq('user_id', user.id),
      supabase
        .from('courses')
        .select('id, slug')
        .in('slug', practiceDbSlugs)
        .eq('status', 'published'),
    ])

  const publishedCourses = (rawPublishedCourses ?? []) as Array<{ id: string; slug: string }>
  const courseIdBySlug = new Map<string, string>(publishedCourses.map((c) => [c.slug, c.id]))
  const publishedCourseIds = publishedCourses.map((c) => c.id)

  type LessonContext = { course_id: string; slug: string; title: string; takeaway: string | null }
  const lessonByCourseAndSlug = new Map<string, LessonContext>()

  if (publishedCourseIds.length > 0 && practiceLessonSlugs.length > 0) {
    const { data: rawLessons } = await supabase
      .from('lessons')
      .select('course_id, slug, title, takeaway')
      .in('course_id', publishedCourseIds)
      .in('slug', practiceLessonSlugs)
      .eq('status', 'published')

    for (const row of (rawLessons ?? []) as LessonContext[]) {
      lessonByCourseAndSlug.set(`${row.course_id}:${row.slug}`, row)
    }
  }

  const verifiedCourseSlugs = new Set<string>()
  type RawEnrollmentItem = {
    course_id: string
    payment_verified_at: string | null
    courses: { slug: string } | null
  }
  const enrollmentsList = (rawEnrollments ?? []) as unknown as RawEnrollmentItem[]
  enrollmentsList.forEach((en) => {
    if (en.payment_verified_at && en.courses?.slug) {
      verifiedCourseSlugs.add(en.courses.slug)
    }
  })

  type SubmissionRow = { practice_id: string; response: string; submitted_at: string }
  const submissionsList = (rawSubmissions ?? []) as SubmissionRow[]
  const submissionsByPracticeId = new Map<string, string>(
    submissionsList.map((s) => [s.practice_id, s.response])
  )
  const totalSubmitted = submissionsList.length

  const isAdmin = profile?.role === 'admin'

  const firstName =
    profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Learner'

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar-top">
          <Brand />
          <nav className="app-sidebar-nav">
            <Link href="/dashboard" className="app-sidebar-item">
              <LayoutDashboard size={18} aria-hidden="true" /> Dashboard
            </Link>
            <Link href="/courses" className="app-sidebar-item">
              <BookOpen size={18} aria-hidden="true" /> Browse courses
            </Link>
            <Link
              href="/dashboard/challenges"
              className="app-sidebar-item app-sidebar-item--active"
            >
              <PenLine size={18} aria-hidden="true" /> Practice
            </Link>
            <Link href="/dashboard/profile" className="app-sidebar-item">
              <User size={18} aria-hidden="true" /> Profile
            </Link>
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

      {/* Main content */}
      <div className="app-content">
        {/* Mobile top chrome */}
        <header className="app-topbar" aria-label="App header">
          <Brand />
          <div className="app-topbar-right">
            <button className="app-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <Link href="/dashboard/profile" className="app-avatar" aria-label="Your profile">
              {(profile?.full_name ?? user.email ?? 'L')[0].toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="app-main" id="main-content">
          {/* Hero */}
          <section className="challenges-hero">
            <div className="challenges-title-row">
              <div>
                <p className="app-greeting-sub">PICK ONE TASK TO TRY</p>
                <h1 className="app-greeting-h1">Practice a skill, {firstName}</h1>
                <p className="challenges-subtext">
                  Read the prompt, write your response and hit submit. Your work is saved here so you can build on it.
                </p>
              </div>
              {totalSubmitted > 0 && (
                <div className="challenges-progress-badge" aria-label={`${totalSubmitted} of ${PRACTICE_IDEAS.length} exercises submitted`}>
                  <CheckCircle size={16} aria-hidden="true" />
                  <span>{totalSubmitted} of {PRACTICE_IDEAS.length} done</span>
                </div>
              )}
            </div>
          </section>

          {/* Exercise cards */}
          <section className="challenges-section">
            <div className="dash-section-label">CHOOSE AN EXERCISE</div>
            <div className="challenges-grid">
              {PRACTICE_IDEAS.map((idea) => {
                const product = getCourseProduct(idea.courseSlug)
                const isPaid = !!product?.price
                const isUnlocked =
                  isAdmin ||
                  !isPaid ||
                  verifiedCourseSlugs.has(idea.courseSlug) ||
                  (product?.databaseSlug ? verifiedCourseSlugs.has(product.databaseSlug) : false)
                const existingResponse = submissionsByPracticeId.get(idea.id) ?? null
                const isSubmitted = !!existingResponse
                const dbSlug = product?.databaseSlug ?? idea.courseSlug
                const dbCourseId = courseIdBySlug.get(dbSlug)
                const linkedLesson = dbCourseId
                  ? lessonByCourseAndSlug.get(`${dbCourseId}:${idea.lessonSlug}`)
                  : undefined

                return (
                  <article
                    key={idea.id}
                    className={`challenge-card challenge-tone--${idea.tone}${isUnlocked ? '' : ' challenge-card--locked'}${isSubmitted ? ' challenge-card--done' : ''}`}
                  >
                    <div className="challenge-card-top">
                      {isSubmitted ? (
                        <span className="challenge-done-pill">
                          <CheckCircle size={13} aria-hidden="true" />
                          <span>Submitted</span>
                        </span>
                      ) : isUnlocked ? (
                        <span className="challenge-tag">PRACTICE IDEA</span>
                      ) : (
                        <span className="challenge-card-lock-badge">
                          <Lock size={12} aria-hidden="true" />
                          <span>PAID COURSE</span>
                        </span>
                      )}
                    </div>

                    <h2 className="challenge-card-title">{idea.title}</h2>
                    <p className="challenge-card-academy">{idea.academy}</p>
                    <p className="challenges-subtext">{idea.description}</p>

                    {isUnlocked ? (
                      <>
                        <div className="challenge-prompt-box">
                          {linkedLesson && (
                            <div className="challenge-lesson-context">
                              <div className="challenge-lesson-link-row">
                                <span className="challenge-lesson-source">
                                  Lesson: {linkedLesson.title}
                                </span>
                                <Link
                                  href={`/learn/${idea.courseSlug}/${linkedLesson.slug}`}
                                  className="challenge-lesson-review-link"
                                >
                                  Review lesson
                                </Link>
                              </div>
                              {linkedLesson.takeaway && (
                                <p className="challenge-lesson-takeaway">
                                  Key takeaway: {linkedLesson.takeaway}
                                </p>
                              )}
                            </div>
                          )}
                          <p className="challenge-prompt-label">YOUR TASK</p>
                          <p className="challenge-prompt-text">{idea.prompt}</p>
                        </div>
                        <ChallengeSubmitForm
                          practiceId={idea.id}
                          practiceTitle={idea.title}
                          initialResponse={existingResponse}
                        />
                        <div className="challenge-card-footer">
                          <Link href={`/courses/${idea.courseSlug}`} className="challenge-action-btn">
                            <span>Open the course</span>
                            <ArrowRight size={15} />
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="challenge-locked-hint">
                          Enroll in the course to unlock this practice exercise.
                        </p>
                        <div className="challenge-card-footer">
                          <Link
                            href={`/courses/${idea.courseSlug}`}
                            className="challenge-action-btn challenge-action-btn--unlock"
                          >
                            <span>Unlock course</span>
                            <ArrowRight size={15} />
                          </Link>
                        </div>
                      </>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <div className="app-bottom-spacer" aria-hidden="true" />
        </main>
      </div>

      <AppBottomNav active="challenges" />
    </div>
  )
}
