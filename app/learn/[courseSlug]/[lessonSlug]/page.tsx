import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import LessonPreview from '@/components/lesson-preview'
import LessonLmsPlayer from '@/components/lesson-lms-player'
import type { Course, Enrollment, Lesson, Module, LessonProgress } from '@/lib/database.types'
import { getCourseProduct } from '@/lib/course-products'
import type { LessonInteractiveMeta, ModuleGroup, SiblingLessonItem } from '@/components/lesson-lms-player'

// Static course slugs served from the legacy LessonPreview component
// (until their lessons are seeded into the database)
const LEGACY_COURSES = [
  'ai-toolkit-practical-start',
  'prompting-better-work',
  'ai-content-marketing-for-business',
  'build-a-helpful-ai-app',
  'youtube-business-fundamentals',
  'starting-a-faceless-youtube-channel',
  'youtube-automation-monetization-masterclass',
  'ai-powered-youtube-content-production',
  'youtube-shorts-growth-strategy',
  'youtube-seo-and-analytics',
  'youtube-monetization-policies-and-copyright',
  'building-a-creator-business-beyond-ad-revenue',
]

// ── Interactive metadata per lesson slug ──────────────────────────────────────
// Add prompt/practice/quiz data here as lessons are written.
const LESSON_INTERACTIVE_META: Record<string, LessonInteractiveMeta> = {
  'lesson-1': {
    prompt: `I need your help as my AI assistant. I am a [your profession or role] in [your city/country].
My task today: [describe a real work task you want help with].
Please give me a clear, practical response that I can apply immediately.`,
    practiceTask: 'Have a real conversation with an AI assistant about a task you do every week.',
    checklist: [
      'Open ChatGPT, Gemini or Copilot on your phone or laptop',
      'Describe your profession and location clearly',
      'State a specific task you need help with',
      'Read the response and ask a follow-up question',
      'Save one useful output to your notes',
    ],
    quiz: {
      question: 'What does "AI" stand for in the context of this course?',
      options: [
        'Automated Interface',
        'Artificial Intelligence',
        'Automated Information',
        'Advanced Internet',
      ],
      correctIndex: 1,
      explanation:
        'AI stands for Artificial Intelligence : computer systems designed to perform tasks that normally require human thinking, such as writing, answering questions and generating images.',
    },
  },
  'lesson-2': {
    prompt: `Act as a professional writing assistant. Help me write a [type of content] about [topic].
Tone: [formal / conversational / persuasive].
Target audience: [describe your audience].
Length: approximately [number] words.
Include a compelling opening and a clear call to action at the end.`,
    practiceTask: 'Write a short professional message or email using the prompt above.',
    checklist: [
      'Choose a real writing task (email, caption, proposal, report)',
      'Fill in all the brackets in the prompt with real values',
      'Paste the customised prompt into your AI assistant',
      'Review the output and request one improvement',
      'Copy the final version to your clipboard',
    ],
    quiz: {
      question: 'What is the most important element to include when prompting an AI to write for you?',
      options: [
        'Your name and contact details',
        'The audience, tone and purpose',
        'The exact number of characters you want',
        'Your subscription plan',
      ],
      correctIndex: 1,
      explanation:
        'Specifying your audience, desired tone and purpose gives the AI the context it needs to produce relevant, useful content instead of a generic response.',
    },
  },
  'lesson-3': {
    prompt: `I need to solve this problem: [describe the challenge].
My constraints are: [time / budget / tools available].
Please suggest three practical solutions, rank them by ease of implementation, and explain the first step for each.`,
    practiceTask: 'Use AI to break down a real challenge you are facing at work or in your business.',
    checklist: [
      'Write down one real challenge you are currently facing',
      'Fill in the prompt with that challenge and your constraints',
      'Get three solutions from your AI assistant',
      'Pick the most practical one and ask for a detailed action plan',
      'Save the action plan somewhere you can revisit it',
    ],
    quiz: {
      question: 'Which of the following makes an AI prompt more effective?',
      options: [
        'Using lots of technical jargon',
        'Keeping it as short as possible at all times',
        'Providing context, constraints and a clear goal',
        'Starting every prompt with "Hello"',
      ],
      correctIndex: 2,
      explanation:
        'Context, constraints and a clear goal allow the AI to focus its response. Without these, responses tend to be vague and hard to apply directly.',
    },
  },
  'lesson-4': {
    prompt: `You are my business research assistant. Research this topic for me: [topic].
Summarise the key facts in bullet points.
Then give me three actionable insights I can apply to [my business / my work / my project].
Keep the language simple and practical.`,
    practiceTask: 'Use AI to research one topic that is relevant to your work or business right now.',
    checklist: [
      'Pick a topic you need to understand better (market, skill, tool, regulation)',
      'Paste the customised prompt into your AI assistant',
      'Review the bullet-point summary carefully',
      'Ask one follow-up question to go deeper on the most useful insight',
      'Write one sentence about how you will act on this',
    ],
    quiz: {
      question: 'Why should you always verify AI-generated research with other sources?',
      options: [
        'AI assistants are always wrong',
        'AI can produce confident but inaccurate information',
        'Verification is a legal requirement',
        'AI cannot access the internet',
      ],
      correctIndex: 1,
      explanation:
        'AI models can generate plausible-sounding information that is outdated or factually incorrect. Cross-checking with trusted sources protects the quality of your work.',
    },
  },
  'lesson-5': {
    prompt: `I want to improve my productivity on this daily task: [describe the task].
Currently I spend about [time] on it each day.
Please help me create a simple AI-assisted workflow I can follow step by step to do this task faster and better.`,
    practiceTask: 'Map out one repetitive task in your work that AI can help you do faster.',
    checklist: [
      'Identify one task you repeat at least three times per week',
      'Paste the prompt with your task details',
      'Review the AI workflow suggestion',
      'Test the first two steps of the workflow today',
      'Note down how much time you saved',
    ],
    quiz: {
      question: 'What is a "workflow" in the context of using AI tools?',
      options: [
        'A type of AI model',
        'A step-by-step process that uses AI at specific points to get work done',
        'A subscription plan for AI tools',
        'A way to train your own AI',
      ],
      correctIndex: 1,
      explanation:
        'An AI workflow is a structured sequence of steps where AI tools assist at specific points, making recurring tasks faster, more consistent and less mentally draining.',
    },
  },
  'lesson-6': {
    prompt: `I want to create content for my [business / personal brand / employer] on the topic: [topic].
My target audience is: [describe them].
Please generate five content ideas with a headline and a one-sentence description for each.
Format them as a numbered list.`,
    practiceTask: 'Generate a week of content ideas for your business or social media using this prompt.',
    checklist: [
      'Choose a topic relevant to your audience or niche',
      'Fill in your audience description clearly',
      'Generate five ideas using the prompt',
      'Pick your favourite two ideas',
      'Ask AI to draft the first piece of content for one of them',
    ],
    quiz: {
      question: 'What is the best way to use AI for content creation?',
      options: [
        'Post everything the AI writes without editing',
        'Use AI to generate a first draft and then add your own voice and facts',
        'Only use AI for captions, never for long content',
        'Ask AI to copy content from other creators',
      ],
      correctIndex: 1,
      explanation:
        'AI is best used as a starting point. Adding your personal voice, real examples and accurate information transforms a generic draft into authentic content that builds trust.',
    },
  },
}

// Support both 'lesson-1' and 'lesson-01' aliases for interactive meta
function getInteractiveMeta(lessonSlug: string): LessonInteractiveMeta | undefined {
  if (LESSON_INTERACTIVE_META[lessonSlug]) {
    return LESSON_INTERACTIVE_META[lessonSlug]
  }
  // If slug is lesson-01, check lesson-1; if lesson-1, check lesson-01
  const num = lessonSlug.replace('lesson-', '')
  const unpadded = `lesson-${parseInt(num, 10)}`
  const padded = `lesson-${num.padStart(2, '0')}`
  return LESSON_INTERACTIVE_META[unpadded] ?? LESSON_INTERACTIVE_META[padded]
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>
  searchParams?: Promise<{ preview?: string | string[] }>
}) {
  const { courseSlug, lessonSlug } = await params
  const query = searchParams ? await searchParams : {}
  const previewValue = Array.isArray(query.preview) ? query.preview[0] : query.preview
  const adminPreview = previewValue === '1'

  // ── Authentication check ───────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const lessonPath = `/learn/${courseSlug}/${lessonSlug}${adminPreview ? '?preview=1' : ''}`
    redirect(`/login?next=${encodeURIComponent(lessonPath)}`)
  }

  // ── Validate slug format ───────────────────────────────────────
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lessonSlug)) notFound()

  let contentClient = supabase
  if (adminPreview) {
    const { data: rawProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const profile = rawProfile as { role: string } | null

    if (profileError) {
      console.error('Unable to verify admin lesson preview access:', profileError)
      notFound()
    }
    if (profile?.role !== 'admin') notFound()

    contentClient = await createAdminClient()
  }

  const product = getCourseProduct(courseSlug)
  const databaseSlug = product?.databaseSlug ?? courseSlug

  let accessibleCourse = (await contentClient
    .from('courses')
    .select('id, title, slug, status, access, academy')
    .eq('slug', databaseSlug)
    .maybeSingle()).data as Pick<Course, 'id' | 'title' | 'slug' | 'status' | 'access' | 'academy'> | null

  if (!accessibleCourse && !adminPreview && product?.price) {
    const adminClient: any = await createAdminClient()
    const { data: draftCourse } = await adminClient
      .from('courses')
      .select('id, title, slug, status, access, academy')
      .eq('slug', databaseSlug)
      .maybeSingle()
    accessibleCourse = draftCourse as Pick<Course, 'id' | 'title' | 'slug' | 'status' | 'access' | 'academy'> | null
  }

  if (!accessibleCourse || accessibleCourse.status === 'archived') notFound()

  if (!adminPreview && accessibleCourse.status !== 'published') {
    return <CourseInDevelopment courseTitle={accessibleCourse.title} courseSlug={courseSlug} />
  }

  if (!adminPreview && accessibleCourse.access === 'paid') {
    const { data: rawEnrollment } = await supabase
      .from('enrollments')
      .select('id, payment_verified_at')
      .eq('user_id', user.id)
      .eq('course_id', accessibleCourse.id)
      .maybeSingle()
    const enrollment = rawEnrollment as Pick<Enrollment, 'id' | 'payment_verified_at'> | null

    if (!enrollment?.payment_verified_at) {
      return <LockedLesson courseSlug={courseSlug} courseTitle={accessibleCourse.title} />
    }
  }

  // ── Database-driven lesson lookup ──────────────────────────────
  const { data: lesson } = await contentClient
    .from('lessons')
    .select('*, courses(*)')
    .eq('course_id', accessibleCourse.id)
    .eq('slug', lessonSlug)
    .maybeSingle() as { data: (Lesson & { courses: Course }) | null }

  // Fallback to legacy LessonPreview if database lesson not yet seeded
  if (!lesson || (!adminPreview && lesson.status !== 'published')) {
    if (!adminPreview && LEGACY_COURSES.includes(courseSlug)) {
      return <LessonPreview slug={courseSlug} userId={user.id} />
    }
    notFound()
  }

  // ── Access enforcement ─────────────────────────────────────────
  // Individual lesson access_level is the source of truth.
  // A lesson marked 'free' is accessible to any authenticated user even inside a paid course
  // (allowing freebie / preview lessons within paid courses as configured in the database).
  if (!adminPreview && lesson.access_level === 'paid') {
    const { data: rawEnrollment } = await supabase
      .from('enrollments')
      .select('id, payment_verified_at')
      .eq('user_id', user.id)
      .eq('course_id', lesson.course_id)
      .single()
    const enrollment = rawEnrollment as Pick<Enrollment, 'id' | 'payment_verified_at'> | null

    if (!enrollment?.payment_verified_at) {
      return <LockedLesson courseSlug={courseSlug} courseTitle={lesson.courses.title} />
    }
  }

  // ── Auto-enroll learner if course is accessible ────────────────
  if (!adminPreview && (accessibleCourse.access === 'free' || lesson.access_level === 'free')) {
    await supabase.from('enrollments').upsert(
      {
        user_id: user.id,
        course_id: accessibleCourse.id,
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true }
    )
  }

  // ── Fetch modules for this course ──────────────────────────────
  const { data: rawModules } = await contentClient
    .from('modules')
    .select('id, title, position')
    .eq('course_id', accessibleCourse.id)
    .order('position', { ascending: true })
  const dbModules = (rawModules ?? []) as Pick<Module, 'id' | 'title' | 'position'>[]

  // ── Fetch all published lessons in this course ─────────────────
  type SiblingRow = Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'access_level' | 'module_id' | 'status'>
  const { data: rawSiblings } = await contentClient
    .from('lessons')
    .select('id, slug, title, position, access_level, module_id, status')
    .eq('course_id', accessibleCourse.id)
    .order('position', { ascending: true })
  const allLessons: SiblingLessonItem[] = ((rawSiblings ?? []) as SiblingRow[])
    .filter((item) => adminPreview || item.status === 'published')

  // ── Fetch completed lesson IDs for this user + course ─────────
  const { data: rawProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('course_id', accessibleCourse.id)
  const publishedLessonIds = new Set(allLessons.map((item) => item.id))
  const completedLessonIds = [...new Set(
    (rawProgress ?? [])
      .map((r: Pick<LessonProgress, 'lesson_id'>) => r.lesson_id)
      .filter((lessonId) => publishedLessonIds.has(lessonId))
  )]

  // ── Build module groups (group lessons under their module) ─────
  const moduleMap = new Map<string, ModuleGroup>()
  for (const mod of dbModules) {
    moduleMap.set(mod.id, { id: mod.id, title: mod.title, position: mod.position, lessons: [] })
  }

  // Lessons without a module_id go into a catch-all group
  const ungroupedLessons: SiblingLessonItem[] = []
  for (const lesson of allLessons) {
    if (lesson.module_id && moduleMap.has(lesson.module_id)) {
      moduleMap.get(lesson.module_id)!.lessons.push(lesson)
    } else {
      ungroupedLessons.push(lesson)
    }
  }

  let modules: ModuleGroup[] = Array.from(moduleMap.values()).filter((m) => m.lessons.length > 0)

  // If there are ungrouped lessons or no modules at all, create a catch-all module
  if (ungroupedLessons.length > 0 || modules.length === 0) {
    modules.push({
      id: 'ungrouped',
      title: accessibleCourse.title,
      position: 999,
      lessons: ungroupedLessons.length > 0 ? ungroupedLessons : allLessons,
    })
  }

  modules.sort((a, b) => a.position - b.position)

  // ── Prev / next navigation ─────────────────────────────────────
  const currentIdx = allLessons.findIndex((s) => s.id === lesson.id)
  const prevLesson = allLessons[currentIdx - 1] ?? null
  const nextLesson = allLessons[currentIdx + 1] ?? null

  // ── Interactive metadata ───────────────────────────────────────
  const interactiveMeta = getInteractiveMeta(lessonSlug)

  // ── Normalise course object for the player ─────────────────────
  const courseForPlayer = {
    id: accessibleCourse.id,
    title: accessibleCourse.title,
    slug: accessibleCourse.slug ?? courseSlug,
    academy: accessibleCourse.academy ?? 'AI Academy',
    access: accessibleCourse.access,
  }

  return (
    <LessonLmsPlayer
      course={courseForPlayer}
      lesson={lesson}
      modules={modules}
      allLessons={allLessons}
      completedLessonIds={completedLessonIds}
      currentIdx={currentIdx >= 0 ? currentIdx : 0}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      courseSlug={courseSlug}
      lessonSlug={lessonSlug}
      previewMode={adminPreview}
      interactiveMeta={interactiveMeta}
    />
  )
}

function CourseInDevelopment({ courseTitle, courseSlug }: { courseTitle: string; courseSlug: string }) {
  return (
    <div className="lesson-locked">
      <div className="lesson-locked-card">
        <h1>Content coming soon</h1>
        <p>Your enrollment is confirmed. Lessons for {courseTitle} will appear here as they are published.</p>
        <Link href={`/courses/${courseSlug}`} className="button button-dark">
          View course details <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}

function LockedLesson({ courseSlug, courseTitle }: { courseSlug: string; courseTitle: string }) {
  return (
    <div className="lesson-locked">
      <div className="lesson-locked-card">
        <Lock size={32} className="lesson-locked-icon" aria-hidden="true" />
        <h1>This lesson is available to enrolled learners</h1>
        <p>
          Review <strong>{courseTitle}</strong> to see its lessons and available access options.
        </p>
        <Link href={`/courses/${courseSlug}`} className="button button-dark">
          View course <ArrowRight size={15} />
        </Link>
        <Link href="/courses" className="auth-back-link" style={{ marginTop: 12 }}>
          <ArrowLeft size={14} /> Browse all courses
        </Link>
      </div>
    </div>
  )
}
