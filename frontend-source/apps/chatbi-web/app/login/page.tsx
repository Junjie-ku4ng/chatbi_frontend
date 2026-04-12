'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getSession, login, logout } from '@/modules/auth/api'

function resolveAuthMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'bearer' ? 'bearer' : 'dev_headers'
}

export default function LoginPage() {
  const authMode = resolveAuthMode()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [scope, setScope] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const router = useRouter()

  const sessionQuery = useQuery({
    queryKey: ['login-session'],
    queryFn: getSession,
    staleTime: 10_000
  })

  const loginMutation = useMutation({
    mutationFn: async () =>
      login({
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
        scope: scope.trim() || undefined
      }),
    onSuccess: async () => {
      setStatus('Login successful')
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const nextTarget = params.get('next') || '/chat'
      router.replace(nextTarget)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Login failed')
    }
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      setStatus('Session cleared')
      await sessionQuery.refetch()
    }
  })

  if (authMode !== 'bearer') {
    return (
      <main className="shell">
        <section className="card" style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 540 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-title), sans-serif' }}>Login not required</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Current mode is <code>dev_headers</code>. Use workspace pages directly.
          </p>
          <Link href="/chat" className="badge badge-ok" style={{ width: 'fit-content' }}>
            Open Ask
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="shell">
      <section className="card" style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 560 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-title), sans-serif' }}>Sign in</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Access token is stored in an httpOnly cookie. Leave credentials empty to use server defaults.
        </p>
        <form
          data-testid="login-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            loginMutation.mutate()
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <input
            data-testid="login-client-id"
            value={clientId}
            onChange={event => setClientId(event.target.value)}
            placeholder="Client ID (optional)"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
          />
          <input
            data-testid="login-client-secret"
            type="password"
            value={clientSecret}
            onChange={event => setClientSecret(event.target.value)}
            placeholder="Client Secret (optional)"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
          />
          <input
            data-testid="login-scope"
            value={scope}
            onChange={event => setScope(event.target.value)}
            placeholder="Scope (optional)"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loginMutation.isPending}
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '8px 12px' }}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
            <button
              data-testid="login-logout"
              type="button"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '8px 12px' }}
            >
              Logout
            </button>
          </div>
        </form>
        {sessionQuery.data ? (
          <pre data-testid="login-session" style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(sessionQuery.data, null, 2)}
          </pre>
        ) : null}
        {status ? (
          <span data-testid="login-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
            {status}
          </span>
        ) : null}
      </section>
    </main>
  )
}
