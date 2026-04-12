import { Suspense } from 'react'
import { SignInSuccessClient } from './success-client'

export default function SignInSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <section className="card" style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 560 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 24 }}>Sign-in success</strong>
            <span style={{ color: 'var(--muted)' }}>Preparing session redirect...</span>
          </section>
        </main>
      }
    >
      <SignInSuccessClient />
    </Suspense>
  )
}
