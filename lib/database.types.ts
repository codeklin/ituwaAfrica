export type UserRole    = 'learner' | 'admin'
export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseAccess = 'free' | 'paid' | 'preview'
export type LessonAccess = 'free' | 'paid' | 'preview'
export type LessonType   = 'video' | 'text' | 'mixed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string | null
  academy: string | null
  status: CourseStatus
  access: CourseAccess
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  module_id: string | null
  slug: string
  title: string
  position: number
  lesson_type: LessonType
  access_level: LessonAccess
  youtube_video_id: string | null
  video_duration: string | null
  body: string | null
  takeaway: string | null
  read_time_min: number | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
  payment_verified_at: string | null
  payment_verified_by: string | null
}

export interface CoursePayment {
  id: string
  user_id: string
  course_id: string
  reference: string
  amount_kobo: number
  currency: 'NGN'
  customer_email: string
  status: 'pending' | 'initialized' | 'successful' | 'failed'
  provider_transaction_id: number | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string  // uuid : FK to lessons.id
  course_id: string
  completed_at: string
}

export interface ChallengeSubmission {
  id: string
  user_id: string
  practice_id: string
  response: string
  submitted_at: string
  updated_at: string
}

export interface AccessCode {
  id: string
  code: string
  course_id: string
  user_id: string
  created_by: string
  redeemed_at: string | null
  expires_at: string
  created_at: string
}

type SupabaseRecord<T> = T & Record<string, unknown>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: SupabaseRecord<Profile>
        Insert: SupabaseRecord<Omit<Profile, 'created_at' | 'updated_at'>>
        Update: SupabaseRecord<Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>>
        Relationships: []
      }
      courses: {
        Row: SupabaseRecord<Course>
        Insert: SupabaseRecord<Omit<Course, 'id' | 'created_at' | 'updated_at'>>
        Update: SupabaseRecord<Partial<Omit<Course, 'id' | 'created_at' | 'updated_at'>>>
        Relationships: []
      }
      modules: {
        Row: SupabaseRecord<Module>
        Insert: SupabaseRecord<Omit<Module, 'id' | 'created_at' | 'updated_at'>>
        Update: SupabaseRecord<Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>>
        Relationships: []
      }
      lessons: {
        Row: SupabaseRecord<Lesson>
        Insert: SupabaseRecord<Omit<Lesson, 'id' | 'created_at' | 'updated_at'>>
        Update: SupabaseRecord<Partial<Omit<Lesson, 'id' | 'created_at' | 'updated_at'>>>
        Relationships: []
      }
      enrollments: {
        Row: SupabaseRecord<Enrollment>
        Insert: SupabaseRecord<
          Omit<Enrollment, 'id' | 'enrolled_at' | 'completed_at' | 'payment_verified_at' | 'payment_verified_by'>
          & Partial<Pick<Enrollment, 'enrolled_at' | 'completed_at' | 'payment_verified_at' | 'payment_verified_by'>>
        >
        Update: SupabaseRecord<Partial<Omit<Enrollment, 'id' | 'user_id' | 'course_id'>>>
        Relationships: [
          {
            foreignKeyName: 'enrollments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      course_payments: {
        Row: SupabaseRecord<CoursePayment>
        Insert: SupabaseRecord<
          Omit<CoursePayment, 'id' | 'created_at' | 'updated_at' | 'provider_transaction_id' | 'paid_at'>
          & Partial<Pick<CoursePayment, 'provider_transaction_id' | 'paid_at'>>
        >
        Update: SupabaseRecord<
          Partial<Omit<CoursePayment, 'id' | 'user_id' | 'course_id' | 'reference' | 'amount_kobo' | 'currency' | 'customer_email'>>
        >
        Relationships: []
      }
      lesson_progress: {
        Row: SupabaseRecord<LessonProgress>
        Insert: SupabaseRecord<Omit<LessonProgress, 'id'>>
        Update: SupabaseRecord<Partial<Omit<LessonProgress, 'id'>>>
        Relationships: []
      }
      challenge_submissions: {
        Row: SupabaseRecord<ChallengeSubmission>
        Insert: SupabaseRecord<
          Omit<ChallengeSubmission, 'id' | 'submitted_at' | 'updated_at'> &
            Partial<Pick<ChallengeSubmission, 'submitted_at' | 'updated_at'>>
        >
        Update: SupabaseRecord<Partial<Omit<ChallengeSubmission, 'id' | 'user_id' | 'practice_id'>>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      course_status: CourseStatus
      course_access: CourseAccess
      lesson_access: LessonAccess
      lesson_type: LessonType
    }
  }
}
