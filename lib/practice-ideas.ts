export interface PracticeIdea {
  id: string
  title: string
  academy: string
  description: string
  prompt: string
  courseSlug: string
  lessonSlug: string
  tone: string
}

export const PRACTICE_IDEAS: PracticeIdea[] = [
  {
    id: 'practice-1',
    title: 'Write an AI prompt for one task',
    academy: 'AI Foundations',
    description: 'Choose a real task. Tell AI what you need, add key details and ask for a clear format.',
    prompt: 'Think of one task you do regularly (writing a message, researching a topic, planning something). Write the prompt you would give an AI tool to help you do it better. Include: who you are, what you need, the format you want the output in.',
    courseSlug: 'ai-toolkit-practical-start',
    lessonSlug: 'lesson-4',
    tone: 'coral',
  },
  {
    id: 'practice-2',
    title: 'Plan an original YouTube channel',
    academy: 'Creator Economy and YouTube',
    description: 'Use AI to explore ideas. Choose who the channel is for and outline one original video.',
    prompt: 'Use an AI tool to brainstorm. Then write: (1) the channel name and niche, (2) the target audience in one sentence, (3) the title and 3-line outline of your first original video idea.',
    courseSlug: 'youtube-monetization',
    lessonSlug: 'lesson-2',
    tone: 'amber',
  },
  {
    id: 'practice-3',
    title: 'Use AI on an everyday task',
    academy: 'AI Foundations',
    description: 'Ask AI for a first draft. Check it for mistakes, then improve it yourself.',
    prompt: 'Pick a real task (a message, a summary, a list). Get a first draft from AI. Paste the AI output here, then write one sentence explaining what you changed or improved and why.',
    courseSlug: 'ai-toolkit-practical-start',
    lessonSlug: 'lesson-7',
    tone: 'lavender',
  },
  {
    id: 'practice-4',
    title: 'Plan a useful business campaign',
    academy: 'AI Content Marketing for Business',
    description: 'Choose a business, identify one customer need and outline a useful campaign idea with a clear goal.',
    prompt: 'Pick a small business (real or made up). Write: (1) the business name and what it sells, (2) one problem its customers have, (3) a campaign idea with a clear goal, one content type, and one call to action.',
    courseSlug: 'ai-content-marketing-for-business',
    lessonSlug: 'lesson-3',
    tone: 'peach',
  },
  {
    id: 'practice-5',
    title: 'Define a small app idea',
    academy: 'AI Web App Development',
    description: 'Name a user, a problem they face and one outcome a simple app prototype could help them achieve.',
    prompt: 'Write a one-paragraph app brief: who the user is, the problem they face, and what one screen of the app would let them do. Then write the prompt you would give an AI coding tool to build the first version.',
    courseSlug: 'ai-web-app-development',
    lessonSlug: 'lesson-1',
    tone: 'blue',
  },
]

export function getPracticeIdea(practiceId: string): PracticeIdea | undefined {
  return PRACTICE_IDEAS.find((idea) => idea.id === practiceId)
}
