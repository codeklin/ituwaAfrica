import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Play } from 'lucide-react'
import Brand from '@/components/brand'
import AppBottomNav from '@/components/app-bottom-nav'
import YouTubeEmbed from '@/components/youtube-embed'
import CalendarReminder from '@/components/calendar-reminder'
import CreatorProjectStudio from '@/components/creator-project-studio'
import { createClient } from '@/lib/supabase/server'
import { getCourseProduct, formatDualPrice, getActivePrice } from '@/lib/course-products'
import CoursePurchaseButton from '@/components/course-purchase-button'
import CourseModuleAccordion from '@/components/course-module-accordion'
import AccessCodeRedeemer from '@/components/access-code-redeemer'

const creatorCourses: Record<string, { title: string; description: string }> = {
  'youtube-business-fundamentals': { title: 'YouTube Business Fundamentals', description: 'Understand the creator business model, audience value, rights, and realistic revenue paths.' },
  'starting-a-faceless-youtube-channel': { title: 'Starting a Faceless YouTube Channel', description: 'Develop an original channel concept without appearing on camera.' },
  'youtube-monetization': { title: 'YouTube Monetization', description: 'Understand creator revenue paths, current YouTube requirements, copyright, and how to build original audience value.' },
  'youtube-automation-monetization-masterclass': { title: 'YouTube Monetization', description: 'Understand creator revenue paths, current YouTube requirements, copyright, and how to build original audience value.' },
  'ai-powered-youtube-content-production': { title: 'AI-Powered YouTube Content Production', description: 'Use AI responsibly for ideation and production while creating meaningfully original work.' },
  'youtube-shorts-growth-strategy': { title: 'YouTube Shorts Growth Strategy', description: 'Plan short-form experiments around audience needs without promising reach or growth.' },
  'youtube-seo-and-analytics': { title: 'YouTube SEO and Analytics', description: 'Use search intent and channel analytics to make evidence-informed creative decisions.' },
  'youtube-monetization-policies-and-copyright': { title: 'YouTube Monetization Policies and Copyright', description: 'Understand policy, copyright, disclosure, and how to review official updates.' },
  'building-a-creator-business-beyond-ad-revenue': { title: 'Building a Creator Business Beyond Ad Revenue', description: 'Explore audience-aligned services, products, partnerships, and other diversified models.' },
}

const courses: Record<string, {
  title: string
  academy: string
  level: string
  duration: string
  lessons: number
  description: string
  outcomes: string[]
  modules: Array<{ title: string; lessons: string[] }>
  youtubeVideoId?: string
}> = {
  'ai-toolkit-practical-start': {
    title: 'AI Foundations',
    academy: 'AI Academy',
    level: 'Beginner',
    duration: '45m',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Build a practical understanding of AI tools, write clearer prompts, and apply what you learn to a real task.',
    outcomes: ['Know what AI can and cannot do in simple words', 'Write structured prompts with role, action and constraints', 'Add relevant context to get accurate, tailored answers', 'Apply the 3-step human review rule and complete a real project'],
    modules: [
      { title: 'Understanding What AI Can and Cannot Do', lessons: ['What AI Is in Simple Everyday Words', 'What AI Does Well and Where It Fails', 'Setting Up Your Free AI Assistant on Phone or Laptop'] },
      { title: 'The Shape of a Clear Prompt', lessons: ['Give the AI One Specific Job', 'Adding Context That Changes the Answer', 'Setting Constraints and Output Format'] },
      { title: 'Fixing Poor Answers and Reviewing Work', lessons: ['How to Improve a First Draft Without Starting Over', 'Spotting AI Hallucinations and Fact-Checking', 'Keeping Your Private Information Safe'] },
      { title: 'Putting AI to Work on a Real Task', lessons: ['Using AI for Daily Communication and Work Tasks', 'The 3-Step Human Review Rule', 'Preparing Your Final Foundations Project'] },
    ],
  },
  'ai-video-creation': {
    title: 'AI Video Creation',
    academy: 'AI Video',
    level: 'Beginner to Intermediate',
    duration: '40m',
    lessons: 10,
    youtubeVideoId: '',
    description: 'Plan and produce original AI-assisted videos, with attention to storytelling, audience value, and disclosure.',
    outcomes: ['Plan a 45-second vertical hook-and-hold script', 'Prompt for clean cinematic scene visuals', 'Generate natural voiceover with proper pacing', 'Assemble, subtitle and disclose AI media in CapCut'],
    modules: [
      { title: 'Planning an Original Video', lessons: ['The Purpose of Your Video and Who It Is For', 'Writing a Short 45-Second Hook-and-Hold Script', 'Storyboarding and Scene Planning'] },
      { title: 'Creating Visuals and Audio', lessons: ['Generating Clean Scene Visuals with AI', 'Maintaining Visual Consistency Across Scenes', 'Generating Natural Voice Narration'] },
      { title: 'Assembly, Subtitling, and Packaging', lessons: ['Bringing Clips and Voice Together in CapCut', 'Adding Dynamic, Readable Subtitles', 'Adding Sound Effects and Background Music Responsibly', 'Reviewing Rights, Originality, and AI Content Disclosures'] },
    ],
  },
  'ai-graphic-design': {
    title: 'AI Graphic Design',
    academy: 'AI Design',
    level: 'Beginner to Intermediate',
    duration: '45m',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Create original, useful visual assets with AI-assisted design techniques and prepare them for real projects.',
    outcomes: ['Establish visual hierarchy and mobile readability', 'Generate clean AI elements without garbled text', 'Design marketing flyers, square posts and price cards in Canva', 'Apply pre-flight quality checks and build a 3-piece portfolio'],
    modules: [
      { title: 'Design Fundamentals and Visual Hierarchy', lessons: ['The Purpose of Every Design: Information First', 'Visual Hierarchy: What the Eye Sees First, Second, and Last', 'Typography and High-Contrast Readability'] },
      { title: 'AI Visual Generation and Element Sourcing', lessons: ['Prompting AI for Specific Graphic Elements and Backgrounds', 'Removing Backgrounds and Cleaning AI Artifacts', 'Understanding Image Commercial Rights and Licenses'] },
      { title: 'Crafting Real Marketing Assets in Canva', lessons: ['Designing a Clean Promotional Event/Service Flyer', 'Designing an Instagram / WhatsApp Square Post', 'Creating a Product or Price Announcement Graphic'] },
      { title: 'Polish, Export, and Portfolio', lessons: ['The 5-Point Quality Check: Spacing, Alignment, and Spelling', 'Choosing the Right File Formats and Sizes', 'Assembling Your 3-Piece Client Design Portfolio'] },
    ],
  },
  'youtube-monetization': {
    title: 'YouTube Monetization',
    academy: 'Creator Economy & YouTube',
    level: 'Beginner to Intermediate',
    duration: '52m',
    lessons: 13,
    youtubeVideoId: '',
    description: 'Understand creator revenue paths, current YouTube requirements, copyright, and how to build original audience value.',
    outcomes: ['Formulate a clear channel promise and research audience demand', 'Design high-contrast mobile thumbnails and write retention scripts', 'Understand YouTube Partner Program, copyright and reused content rules', 'Build diversified revenue streams beyond AdSense'],
    modules: [
      { title: 'Channel Foundations and Audience Value', lessons: ['How the YouTube Platform Actually Works', 'Choosing a Specific Channel Topic and Audience Promise', 'Researching Demand and Validating Video Topics'] },
      { title: 'Video Ideation, Scripting, and Packaging', lessons: ['Crafting Titles That Spark Curiosity Honestly', 'Designing High-Contrast, Legible Mobile Thumbnails', 'Writing Video Scripts That Retain Viewers'] },
      { title: 'Policies, Copyright, and Synthetic Content Rules', lessons: ['The YouTube Partner Program (YPP) Requirements', 'Copyright, Fair Use, and Avoiding Content Strikes', 'Reused Content and Inauthentic/Spam Policies', 'Disclosing AI-Generated and Altered Content'] },
      { title: 'Monetization Beyond AdSense and Channel Growth', lessons: ['Diversified Revenue: Sponsorships, Digital Products, and Services', 'Reading YouTube Analytics as Learning Feedback', 'Building a Sustainable 30-Day Publishing Rhythm'] },
    ],
  },
  'prompting-better-work': {
    title: 'Prompting for Better Work',
    academy: 'AI Academy',
    level: 'Beginner',
    duration: '3h 10m',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Getting answers that sound right but do not help? Learn how to give a tool the details it needs and check its work.',
    outcomes: ['Break a task into clear steps', 'Share the details that change the answer', 'Improve a first draft without starting over', 'Check answers before you rely on them'],
    modules: [
      { title: 'The shape of a prompt', lessons: ['Start with the task', 'Add context and constraints', 'Describe the output you need'] },
      { title: 'Make it more useful', lessons: ['Work in small iterations', 'Ask for alternatives', 'Check what matters'] },
      { title: 'A repeatable practice', lessons: ['Create your prompt brief', 'Build a reusable template'] },
    ],
  },
  'ai-content-marketing-for-business': {
    title: 'AI Content Marketing for Business',
    academy: 'AI Content Marketing',
    level: 'Beginner to Intermediate',
    duration: '4h',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Turn a client brief into useful, audience-focused social captions, ad copy, and email campaigns. Use AI to support research and drafting, then refine the content through a repeatable workflow and build portfolio-ready samples.',
    outcomes: ['Research an audience and turn a client brief into a focused content plan', 'Write social media captions, ad copy, and email campaigns with AI assistance', 'Build a repeatable content workflow with checks for accuracy, rights, originality, and tone', 'Review campaign signals and assemble portfolio-ready samples'],
    modules: [
      { title: 'Understand the brief and audience', lessons: ['Research customer questions and needs', 'Choose an audience, goal, and offer', 'Turn a client brief into a content plan'] },
      { title: 'Plan and draft campaign content', lessons: ['Choose channels and plan content formats', 'Draft social media captions for an audience', 'Write ad copy with a clear, supportable message'] },
      { title: 'Create and review with AI', lessons: ['Write email campaigns with a useful next step', 'Use AI to draft in a consistent brand voice', 'Check facts, rights, originality, and tone'] },
      { title: 'Build a workflow and portfolio', lessons: ['Create a repeatable content workflow', 'Review campaign signals and revise content', 'Package campaign work into a portfolio sample'] },
    ],
  },
  'ai-web-app-development': {
    title: 'AI Web App Development',
    academy: 'AI App Development',
    level: 'Beginner to Intermediate',
    duration: '50m',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Learn how to build a simple, useful web app with AI assistance, from problem definition and interface planning to testing and deployment.',
    outcomes: ['Define a focused utility problem and map user inputs/outputs', 'Prompt AI coding assistants with clean specifications', 'Handle API keys, secrets and database records securely', 'Deploy a mobile-responsive live web app on Vercel'],
    modules: [
      { title: 'Problem Definition and Minimal Scope', lessons: ['Finding One Small, Real Problem to Solve', 'Defining Inputs, Outputs, and User Flow', 'The MVP Rule: What to Leave Out of Version 1'] },
      { title: 'Prompting AI Coding Assistants', lessons: ['Writing Build Instructions for AI Coding Assistants', 'Generating a Mobile-Responsive Interface', 'Adding State and Interactive Logic'] },
      { title: 'Data, APIs, and Safe Secret Handling', lessons: ['Connecting a Basic Data Store or Supabase Table', 'Safe API Key Handling: Protecting Secrets on the Server', 'Handling Errors and Failed Requests Gracefully'] },
      { title: 'Testing, Deployment, and Review', lessons: ['Testing on Mobile and Edge-Case Inputs', 'Free Deployment on Vercel', 'Presenting Your App and Explaining Its Limitations'] },
    ],
  },
  'build-a-helpful-ai-app': {
    title: 'AI Web App Development',
    academy: 'AI App Development',
    level: 'Beginner to Intermediate',
    duration: '50m',
    lessons: 12,
    youtubeVideoId: '',
    description: 'Learn how to build a simple, useful web app with AI assistance, from problem definition and interface planning to testing and deployment.',
    outcomes: ['Define a focused utility problem and map user inputs/outputs', 'Prompt AI coding assistants with clean specifications', 'Handle API keys, secrets and database records securely', 'Deploy a mobile-responsive live web app on Vercel'],
    modules: [
      { title: 'Problem Definition and Minimal Scope', lessons: ['Finding One Small, Real Problem to Solve', 'Defining Inputs, Outputs, and User Flow', 'The MVP Rule: What to Leave Out of Version 1'] },
      { title: 'Prompting AI Coding Assistants', lessons: ['Writing Build Instructions for AI Coding Assistants', 'Generating a Mobile-Responsive Interface', 'Adding State and Interactive Logic'] },
      { title: 'Data, APIs, and Safe Secret Handling', lessons: ['Connecting a Basic Data Store or Supabase Table', 'Safe API Key Handling: Protecting Secrets on the Server', 'Handling Errors and Failed Requests Gracefully'] },
      { title: 'Testing, Deployment, and Review', lessons: ['Testing on Mobile and Edge-Case Inputs', 'Free Deployment on Vercel', 'Presenting Your App and Explaining Its Limitations'] },
    ],
  },
}

type CourseSlug = keyof typeof courses
const creatorLessons = ['Define your audience and channel promise', 'Research topics and validate demand', 'Build a distinctive channel identity', 'Plan a useful publishing rhythm', 'Create an original video outline', 'Produce and package your video', 'Review audience signals and analytics', 'Evaluate rights, policy, and next steps']

const WHATSAPP_NUMBER = '2347018643642'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = getCourseProduct(slug)
  const creator = creatorCourses[slug]
  const course = courses[slug as CourseSlug]
  const title = product?.title ?? creator?.title ?? course?.title
  const description = product?.description ?? creator?.description ?? course?.description
  if (!product || !title || !description) return { title: 'Course not found | ituwaAfrica' }
  return {
    title: `${title} | ituwaAfrica`,
    description,
    openGraph: { title: `${title} | ituwaAfrica`, description, type: 'article' },
  }
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ payment?: string | string[] }>
}) {
  const { slug } = await params
  const query = searchParams ? await searchParams : {}
  const paymentStatus = Array.isArray(query.payment) ? query.payment[0] : query.payment
  const product = getCourseProduct(slug)
  const creator = creatorCourses[slug]
  const course = courses[slug as CourseSlug]
  if (!product) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  const { data: databaseCourse, error: databaseCourseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', product.databaseSlug)
    .maybeSingle()
  if (databaseCourseError) console.error('Unable to load course availability:', databaseCourseError)
  let isEnrolled = false
  let nextLessonSlug = 'lesson-1'
  if (user && databaseCourse) {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, payment_verified_at')
      .eq('user_id', user.id)
      .eq('course_id', databaseCourse.id)
      .maybeSingle()
    if (enrollmentError) {
      console.error('Unable to load learner course access:', enrollmentError)
    } else if (enrollment) {
      isEnrolled = product.price ? !!enrollment.payment_verified_at : true
    }

    if (isEnrolled) {
      const [{ data: rawLessons }, { data: rawProgress }] = await Promise.all([
        supabase
          .from('lessons')
          .select('id, slug, position')
          .eq('course_id', databaseCourse.id)
          .eq('status', 'published')
          .order('position', { ascending: true }),
        supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('course_id', databaseCourse.id),
      ])
      const courseLessons = (rawLessons ?? []) as Array<{ id: string; slug: string; position: number }>
      const completedIds = new Set(
        ((rawProgress ?? []) as Array<{ lesson_id: string }>).map((r) => r.lesson_id)
      )
      const nextLesson = courseLessons.find((l) => !completedIds.has(l.id))
      nextLessonSlug =
        nextLesson?.slug ??
        courseLessons[courseLessons.length - 1]?.slug ??
        'lesson-1'
    }
  }

  const title = product.title
  const academy = product.academy
  const description = product.description
  const level = product.level
  const isCreator = !!creator

  const outcomes = course?.outcomes ?? (isCreator
    ? ['Develop a channel concept grounded in audience needs', 'Create original video and thumbnail projects', 'Use analytics as feedback, not as a promise of results', 'Understand policy responsibilities and business models']
    : [])

  const modules = course?.modules ?? (isCreator
    ? [{ title: 'Strategy and foundations', lessons: creatorLessons.slice(0, 3) }, { title: 'Make and publish', lessons: creatorLessons.slice(3, 6) }, { title: 'Review and grow responsibly', lessons: creatorLessons.slice(6) }]
    : [])

  const lessonCount = course?.lessons ?? (isCreator ? 8 : null)
  const duration = course?.duration ?? (isCreator ? '3h' : null)

  const priceInfo = formatDualPrice(getActivePrice(product))
  const price = priceInfo.isFree ? null : priceInfo.display

  const firstLessonPath = `/learn/${slug}/${nextLessonSlug}`
  const waText = encodeURIComponent(`Hi ituwaAfrica, I'm interested in the ${title} course.`)
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`

  return (
    <div className={isAuthenticated ? 'has-app-bottom-nav' : ''}>
      {/* ── Header ── */}
      <header className="cdp-header">
        <Link href="/courses" className="cdp-back-btn">
          <ArrowLeft size={16} /> All courses
        </Link>
        <Brand />
        <div className="cdp-header-actions">
          {isAuthenticated ? (
            <Link href="/dashboard" className="cdp-auth-link">Dashboard</Link>
          ) : (
            <Link href="/login" className="cdp-auth-link">Log in</Link>
          )}
        </div>
      </header>

      {/* ── Hero Card ── */}
      <section className="cdp-hero">
        <span className="cdp-hero-eyebrow">{academy.toUpperCase()}</span>
        <h1>{title}</h1>
        <p className="cdp-hero-desc">{description}</p>

        <div className="cdp-meta-row">
          {level && <span className="cdp-meta-pill">{level}</span>}
          {duration && (
            <span className="cdp-meta-pill">
              <Clock3 size={12} /> {duration}
            </span>
          )}
          {lessonCount !== null && (
            <span className="cdp-meta-pill">
              <Play size={12} /> {lessonCount} lessons
            </span>
          )}
          {product.exclusive && <span className="cdp-meta-pill cdp-meta-pill-exclusive">Exclusive</span>}
          {price
            ? <span className="cdp-meta-pill cdp-meta-pill-price">One-time · {price}</span>
            : <span className="cdp-meta-pill cdp-meta-pill-free">Free</span>}
        </div>

        {/* Primary Action Button placed prominently right in the Hero */}
        <div className="cdp-hero-action-box">
          {product.price ? (
            <CoursePurchaseButton
              course={product}
              className="cdp-cta-btn"
              isEnrolled={isEnrolled}
            />
          ) : (
            <Link href={firstLessonPath} className="cdp-cta-btn cdp-cta-btn-free">
              {isEnrolled ? 'Continue learning' : 'Start now'} <ArrowRight size={15} />
            </Link>
          )}
          {product.price && isAuthenticated && (
            <AccessCodeRedeemer courseSlug={slug} />
          )}
        </div>
      </section>

      {/* ── Body Content ── */}
      <div className="cdp-body">
        {paymentStatus === 'success' && (
          <p className="course-purchase-state" role="status">
            Payment confirmed. Your course access is ready.
          </p>
        )}
        {paymentStatus === 'not-complete' && (
          <p className="course-purchase-state" role="status">
            The payment was not completed. You can try Paystack checkout again.
          </p>
        )}
        {paymentStatus === 'processing' && (
          <p className="course-purchase-state" role="status">
            We could not confirm the payment yet. Please check your dashboard shortly or contact support.
          </p>
        )}

        {/* What you will learn */}
        {outcomes.length > 0 && (
          <div className="cdp-section">
            <span className="cdp-section-eyebrow">01 / WHAT YOU&apos;LL LEARN</span>
            <h2>Skills you can put to work.</h2>
            <div className="cdp-outcomes-grid">
              {outcomes.map((outcome) => (
                <div key={outcome} className="cdp-outcome-card">
                  <span className="cdp-outcome-check"><Check size={13} strokeWidth={3} /></span>
                  <span className="cdp-outcome-text">{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Curriculum */}
        {modules.length > 0 ? (
          <div className="cdp-section">
            <span className="cdp-section-eyebrow">
              02 / THE CURRICULUM{lessonCount !== null ? ` · ${lessonCount} LESSONS` : ''}
            </span>
            <h2>A clear path, one step at a time.</h2>
            <CourseModuleAccordion modules={modules} />
          </div>
        ) : (
          <div className="cdp-section">
            <span className="cdp-section-eyebrow">02 / CURRICULUM STATUS</span>
            <h2>Course content is in development.</h2>
            <p>The final lessons and course schedule will be published here when they are ready.</p>
          </div>
        )}

        {/* Intro video */}
        {course?.youtubeVideoId && (
          <div className="cdp-section">
            <span className="cdp-section-eyebrow">03 / INTRO VIDEO</span>
            <h2>Watch before you start.</h2>
            <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden' }}>
              <YouTubeEmbed videoId={course.youtubeVideoId} title={title} duration={duration ?? undefined} />
            </div>
          </div>
        )}

        {/* Calendar reminder */}
        <div className="cdp-section">
          <CalendarReminder courseTitle={title} courseSlug={slug} />
        </div>

        {/* YouTube disclaimer for creator courses */}
        {isCreator && (
          <div className="cdp-yt-disclaimer">
            <b>IMPORTANT DISTINCTION</b>
            Finishing this course does not qualify your channel for monetisation. YouTube sets the current
            requirements and reviews each channel independently. Rules can change, and meeting a requirement
            does not guarantee approval, views, subscribers or income.
          </div>
        )}

        {/* WhatsApp CTA */}
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="cdp-whatsapp-card">
          <div className="cdp-whatsapp-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="#25D366"/>
              <path d="M23.472 8.516A10.368 10.368 0 0 0 16.01 5.5C10.733 5.5 6.44 9.794 6.44 15.07c0 1.69.44 3.34 1.278 4.793L6.37 24.5l4.76-1.249a10.4 10.4 0 0 0 4.876 1.237h.004c5.275 0 9.57-4.294 9.57-9.57a9.52 9.52 0 0 0-2.108-6.402Zm-7.462 14.724h-.003a8.636 8.636 0 0 1-4.404-1.207l-.316-.187-3.274.858.874-3.19-.206-.327a8.63 8.63 0 0 1-1.323-4.617c0-4.77 3.882-8.65 8.655-8.65a8.598 8.598 0 0 1 6.118 2.534 8.598 8.598 0 0 1 2.531 6.12c-.002 4.771-3.882 8.666-8.652 8.666Zm4.747-6.483c-.26-.13-1.538-.759-1.776-.846-.238-.087-.41-.13-.583.13-.173.26-.67.846-.82 1.02-.152.173-.303.195-.563.065-.26-.13-1.098-.405-2.09-1.29-.773-.688-1.294-1.538-1.446-1.797-.152-.26-.016-.4.114-.53.117-.116.26-.302.39-.453.13-.152.173-.26.26-.433.086-.173.043-.325-.022-.455-.065-.13-.583-1.405-.8-1.924-.21-.505-.424-.436-.583-.444l-.497-.009c-.173 0-.455.065-.693.325-.238.26-.909.888-.909 2.165s.931 2.511 1.061 2.684c.13.173 1.832 2.797 4.44 3.922.62.268 1.104.428 1.482.548.622.198 1.19.17 1.637.103.499-.074 1.538-.629 1.754-1.236.217-.607.217-1.128.152-1.236-.065-.109-.238-.173-.498-.303Z" fill="#fff"/>
            </svg>
          </div>
          <div className="cdp-whatsapp-text">
            <b>Have a question?</b>
            <span>Chat with us on WhatsApp about this course</span>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#B09080', flexShrink: 0 }} />
        </a>

        {/* Creator project studio */}
        {isCreator && <CreatorProjectStudio />}
      </div>

      {/* ── Sticky Bottom CTA ── */}
      <div className="cdp-sticky-cta">
        <div className="cdp-sticky-cta-inner">
          <div className="cdp-cta-price-block">
            <span className="cdp-cta-price">{price ?? 'Free'}</span>
            <span className="cdp-cta-price-label">
              {price ? 'ONE-TIME PAYMENT' : 'NO PAYMENT REQUIRED'}
            </span>
          </div>
          {product.price ? (
            <CoursePurchaseButton
              course={product}
              className="cdp-cta-btn"
              isEnrolled={isEnrolled}
            />
          ) : (
            <Link href={firstLessonPath} className={`cdp-cta-btn cdp-cta-btn-free`}>
              {isEnrolled ? 'Continue learning' : 'Start now'} <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {isAuthenticated && <AppBottomNav active="courses" />}
    </div>
  )
}
