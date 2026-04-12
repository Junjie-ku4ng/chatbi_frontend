'use client'

import Link from 'next/link'

export function UnauthorizedState({ message }: { message: string }) {
  return (
    <section data-testid="loadable-unauthorized-state" className="card" style={{ padding: 18, display: 'grid', gap: 10 }}>
      <span className="badge badge-danger">401</span>
      <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 20 }}>Authentication required</strong>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{message}</p>
      <Link href="/login" className="badge badge-warn" style={{ width: 'fit-content' }}>
        Go to Login
      </Link>
    </section>
  )
}
