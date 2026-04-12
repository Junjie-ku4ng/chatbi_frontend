'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSession } from './api'
import { useSessionStore } from './session-store'

function resolveAuthMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'bearer' ? 'bearer' : 'dev_headers'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode = resolveAuthMode()
  const setLoading = useSessionStore(state => state.setLoading)
  const setSession = useSessionStore(state => state.setSession)
  const clearSession = useSessionStore(state => state.clearSession)
  const status = useSessionStore(state => state.status)

  const router = useRouter()
  const pathname = usePathname()

  const sessionQuery = useQuery({
    queryKey: ['auth-session'],
    queryFn: getSession,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 0
  })

  useEffect(() => {
    setLoading()
  }, [setLoading])

  useEffect(() => {
    if (sessionQuery.data) {
      setSession(sessionQuery.data)
      return
    }
    if (sessionQuery.isError) {
      clearSession()
    }
  }, [clearSession, sessionQuery.data, sessionQuery.isError, setSession])

  useEffect(() => {
    if (mode !== 'bearer') return
    if (!pathname) return
    if (pathname === '/login') return
    if (status !== 'unauthenticated') return
    const query = typeof window !== 'undefined' ? window.location.search : ''
    const nextTarget = query ? `${pathname}${query}` : pathname
    router.replace(`/login?next=${encodeURIComponent(nextTarget)}`)
  }, [mode, pathname, router, status])

  return <>{children}</>
}
