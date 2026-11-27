'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCourseProduct } from '@/lib/course-products'

export async function toggleLessonProgressAction({
  lessonId,
  courseId,
  completed,
  courseSlug,
  lessonSlug,
}: {
  lessonId: string
  courseId: string
  completed: boolean
  courseSlug: string
  lessonSlug: string
}) {
  if (
    typeof lessonId !== 'string' ||
    !lessonId ||
    typeof courseId !== 'string' ||
    !courseId ||
    typeof completed !== 'boolean' ||
    typeof courseSlug !== 'string' ||
    typeof lessonSlug !== 'string'
  ) {
    return { success: false, error: 'Invalid lesson progress request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized: Authentication required.' }
  }

  const expectedCourseSlug = getCourseProduct(courseSlug)?.databaseSlug ?? courseSlug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, status, access')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) {
    console.error('Failed to validate course for lesson progress:', courseError)
    return { success: false, error: 'Unable to save lesson progress. Please try again.' }
  }
  if (
    !course ||
    course.slug !== expectedCourseSlug ||
    course.status !== 'published'
  ) {
    return { success: false, error: 'This lesson is not available for progress tracking.' }
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('course_id', course.id)
    .eq('slug', lessonSlug)
    .eq('status', 'published')
    .maybeSingle()

  if (lessonError) {
    console.error('Failed to validate lesson for progress:', lessonError)
    return { success: false, error: 'Unable to save lesson progress. Please try again.' }
  }
  if (!lesson) {
    return { success: false, error: 'This lesson is not available for progress tracking.' }
  }

  if (course.access === 'paid') {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('payment_verified_at')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle()

    if (enrollmentError) {
      console.error('Failed to validate enrollment for lesson progress:', enrollmentError)
      return { success: false, error: 'Unable to save lesson progress. Please try again.' }
    }
    if (!enrollment?.payment_verified_at) {
      return { success: false, error: 'Verified course access is required to save progress.' }
    }
  }

  if (completed) {
    // Ensure the learner is enrolled in the course
    await supabase.from('enrollments').upsert(
      {
        user_id: user.id,
        course_id: course.id,
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true }
    )

    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )

    if (error) {
      console.error('Failed to record lesson progress:', error)
      return { success: false, error: 'Unable to save lesson progress. Please try again.' }
    }
  } else {
    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('course_id', course.id)

    if (error) {
      console.error('Failed to remove lesson progress:', error)
      return { success: false, error: 'Unable to update lesson progress. Please try again.' }
    }
  }

  revalidatePath(`/learn/${courseSlug}/${lessonSlug}`)
  revalidatePath(`/courses/${courseSlug}`)
  revalidatePath('/dashboard')

  return { success: true, completed }
}
