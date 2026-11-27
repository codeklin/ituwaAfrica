import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  LogOut,
  Mail,
  PenLine,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import Brand from '@/components/brand'
import AppBottomNav from '@/components/app-bottom-nav'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: import('@/lib/database.types').Profile | null; error: unknown }

  const { count: enrollmentsCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: completedLessonsCount } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const fullName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Learner'
  const email = profile?.email ?? user.email ?? ''
  const role = profile?.role ?? 'learner'
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar ── */}
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
            <Link href="/dashboard/challenges" className="app-sidebar-item">
              <PenLine size={18} aria-hidden="true" /> Practice
            </Link>
            <Link
              href="/dashboard/profile"
              className="app-sidebar-item app-sidebar-item--active"
            >
              <User size={18} aria-hidden="true" /> Profile
            </Link>
            {role === 'admin' && (
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
        {/* Mobile top chrome */}
        <header className="app-topbar" aria-label="App header">
          <Brand />
          <div className="app-topbar-right">
            {role === 'admin' && (
              <Link href="/admin" className="super-admin-topbar-chip" aria-label="Admin portal">
                <ShieldCheck size={14} />
                <span>ADMIN</span>
              </Link>
            )}
            <button className="app-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="app-avatar" aria-label="Your profile">
              {fullName[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="app-main" id="main-content">
          {/* Profile Card Header */}
          <section className="profile-hero-card">
            <div className="profile-hero-header">
              <div className="profile-avatar-large">
                <span>{fullName[0].toUpperCase()}</span>
              </div>
              <div className="profile-identity">
                <div className="profile-name-row">
                  <h1>{fullName}</h1>
                  <span className={`profile-role-tag role--${role}`}>
                    {role.toUpperCase()}
                  </span>
                </div>
                <p className="profile-email-text">
                  <Mail size={14} /> {email}
                </p>
                {joinedDate && (
                  <p className="profile-joined-text">
                    <Calendar size={14} /> Joined {joinedDate}
                  </p>
                )}
              </div>
            </div>

            <div className="profile-hero-actions">
              <Link href="/courses" className="button button-light profile-action-btn">
                <span>Browse courses</span>
                <ArrowRight size={15} />
              </Link>
              <form action={signOut}>
                <button type="submit" className="profile-signout-btn">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </div>
          </section>

          {/* Learning Metrics Grid */}
          <section className="profile-stats-grid">
            <div className="profile-stat-box">
              <div className="profile-stat-icon-wrap icon-terracotta">
                <BookOpen size={20} />
              </div>
              <div>
                <span className="profile-stat-number">{enrollmentsCount ?? 0}</span>
                <span className="profile-stat-label">Enrolled Courses</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="profile-stat-icon-wrap icon-jade">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="profile-stat-number">{completedLessonsCount ?? 0}</span>
                <span className="profile-stat-label">Lessons Finished</span>
              </div>
            </div>

          </section>

          {/* Account Details & Settings Section */}
          <section className="profile-settings-section">
            <div className="dash-section-label">ACCOUNT & LEARNING GOALS</div>
            <div className="profile-cards-col">
              <div className="profile-setting-card">
                <div className="setting-card-header">
                  <div className="setting-icon-box">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3>Security & Authentication</h3>
                    <p>Your sign-in and password updates are managed with Supabase Auth.</p>
                  </div>
                </div>
                <div className="setting-card-body">
                  <div className="setting-row">
                    <span>Account Email</span>
                    <b>{email}</b>
                  </div>
                  <div className="setting-row">
                    <span>Password</span>
                    <Link href="/auth/reset-password" className="setting-link">
                      Change password →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="profile-setting-card">
                <div className="setting-card-header">
                  <div className="setting-icon-box">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3>Choose your next learning goal</h3>
                    <p>Explore the courses or take the skill assessment to find a place to start.</p>
                  </div>
                </div>
                <div className="setting-card-body">
                  <div className="setting-row">
                    <span>Browse learning areas</span>
                    <Link href="/courses" className="setting-link">
                      Explore courses →
                    </Link>
                  </div>
                  <div className="setting-row">
                    <span>Find a starting point</span>
                    <Link href="/quiz" className="setting-link">
                      Take the skill assessment →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom allowance spacer so bottom nav never overshadows details */}
          <div className="app-bottom-spacer" aria-hidden="true" />
        </main>
      </div>

      {/* Fixed mobile navigation */}
      <AppBottomNav active="profile" />
    </div>
  )
}
