'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser(initialUser: User | null = null) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(initialUser === null)

  useEffect(() => {
    const supabase = createClient()

    // getSession reads from the local cookie — no network round-trip
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, isAuthenticated: !!user }
}
