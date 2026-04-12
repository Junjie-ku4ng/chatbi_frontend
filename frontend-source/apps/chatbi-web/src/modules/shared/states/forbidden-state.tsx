'use client'

import Link from 'next/link'

export function ForbiddenState({ message }: { message: string }) {
  return (
    <section data-testid="loadable-forbidden-state" className="card" style={{ padding: 18, display: 'grid', gap: 10 }}>
      <span className="badge badge-danger">403</span>
      <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 20 }}>Access denied</strong>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{message}</p>
      <Link href="/" className="badge badge-warn" style={{ width: 'fit-content' }}>
        Back Home
      </Link>
    </section>
  )
}
