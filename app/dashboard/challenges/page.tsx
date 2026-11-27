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
import ChallengeSubmitForm from '@/components/challenge-submit-form'

interface PracticeIdea {
  id: string
  title: string
  academy: string
  description: string
  prompt: string
  courseSlug: string
  tone: string
}

const practiceIdeas: PracticeIdea[] = [
  {
    id: 'practice-1',
    title: 'Write an AI prompt for one task',
    academy: 'AI Foundations',
    description: 'Choose a real task. Tell AI what you need, add key details and ask for a clear format.',
    prompt: 'Think of one task you do regularly (writing a message, researching a topic, planning something). Write the prompt you would give an AI tool to help you do it better. Include: who you are, what you need, the format you want the output in.',
    courseSlug: 'ai-toolkit-practical-start',
    tone: 'coral',
  },
  {
    id: 'practice-2',
    title: 'Plan an original YouTube channel',
    academy: 'Creator Economy and YouTube',
    description: 'Use AI to explore ideas. Choose who the channel is for and outline one original video.',
    prompt: 'Use an AI tool to brainstorm. Then write: (1) the channel name and niche, (2) the target audience in one sentence, (3) the title and 3-line outline of your first original video idea.',
    courseSlug: 'youtube-monetization',
    tone: 'amber',
  },
  {
    id: 'practice-3',
    title: 'Use AI on an everyday task',
    academy: 'AI Foundations',
    description: 'Ask AI for a first draft. Check it for mistakes, then improve it yourself.',
    prompt: 'Pick a real task (a message, a summary, a list). Get a first draft from AI. Paste the AI output here, then write one sentence explaining what you changed or improved and why.',
    courseSlug: 'ai-toolkit-practical-start',
    tone: 'lavender',
  },
  {
    id: 'practice-4',
    title: 'Plan a useful business campaign',
    academy: 'AI Content Marketing for Business',
    description: 'Choose a business, identify one customer need and outline a useful campaign idea with a clear goal.',
    prompt: 'Pick a small business (real or made up). Write: (1) the business name and what it sells, (2) one problem its customers have, (3) a campaign idea with a clear goal, one content type, and one call to action.',
    courseSlug: 'ai-content-marketing-for-business',
    tone: 'peach',
  },
  {
    id: 'practice-5',
    title: 'Define a small app idea',
    academy: 'AI Web App Development',
    description: 'Name a user, a problem they face and one outcome a simple app prototype could help them achieve.',
    prompt: 'Write a one-paragraph app brief: who the user is, the problem they face, and what one screen of the app would let them do. Then write the prompt you would give an AI coding tool to build the first version.',
    courseSlug: 'ai-web-app-development',
    tone: 'blue',
  },
]

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

  const [{ data: rawEnrollments }, { data: rawSubmissions }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('course_id, payment_verified_at, courses(slug)')
      .eq('user_id', user.id),
    supabase
      .from('challenge_submissions')
      .select('practice_id, response, submitted_at')
      .eq('user_id', user.id),
  ])

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
                <div className="challenges-progress-badge" aria-label={`${totalSubmitted} of ${practiceIdeas.length} exercises submitted`}>
                  <CheckCircle size={16} aria-hidden="true" />
                  <span>{totalSubmitted} of {practiceIdeas.length} done</span>
                </div>
              )}
            </div>
          </section>

          {/* Exercise cards */}
          <section className="challenges-section">
            <div className="dash-section-label">CHOOSE AN EXERCISE</div>
            <div className="challenges-grid">
              {practiceIdeas.map((idea) => {
                const product = getCourseProduct(idea.courseSlug)
                const isPaid = !!product?.price
                const isUnlocked =
                  isAdmin ||
                  !isPaid ||
                  verifiedCourseSlugs.has(idea.courseSlug) ||
                  (product?.databaseSlug ? verifiedCourseSlugs.has(product.databaseSlug) : false)
                const existingResponse = submissionsByPracticeId.get(idea.id) ?? null
                const isSubmitted = !!existingResponse

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
                          <p className="challenge-prompt-label">YOUR TASK</p>
                          <p className="challenge-prompt-text">{idea.prompt}</p>
                        </div>
                        <ChallengeSubmitForm
                          practiceId={idea.id}
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
