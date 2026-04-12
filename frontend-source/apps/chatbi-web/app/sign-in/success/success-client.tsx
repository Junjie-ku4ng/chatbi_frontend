'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function SignInSuccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextTarget = searchParams.get('next') || '/chat'

  return (
    <main className="shell">
      <section className="card" style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 560 }}>
        <strong data-testid="signin-success-title" style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 24 }}>
          Sign-in success
        </strong>
        <span style={{ color: 'var(--muted)' }}>Your session is ready. Continue to the target route.</span>
        <span data-testid="signin-success-next" className="badge badge-warn" style={{ width: 'fit-content' }}>
          {nextTarget}
        </span>
        <button
          data-testid="signin-success-continue"
          type="button"
          onClick={() => router.replace(nextTarget)}
          style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '8px 12px', width: 'fit-content' }}
        >
          Continue
        </button>
      </section>
    </main>
  )
}
