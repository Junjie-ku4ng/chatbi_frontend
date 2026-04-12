import Link from 'next/link'
import { isOnboardingEnabled } from '@/modules/onboarding/api'

export default function OnboardingPage() {
  const enabled = isOnboardingEnabled()

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong data-testid="onboarding-home-title" style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 26 }}>
          Onboarding Workspace
        </strong>
        <span style={{ color: 'var(--muted)' }}>Readonly semantic onboarding from PA cubes.</span>
        {!enabled ? (
          <span data-testid="onboarding-disabled" className="badge badge-danger" style={{ width: 'fit-content' }}>
            Onboarding feature is disabled
          </span>
        ) : null}
        <Link
          data-testid="onboarding-open-semantic-readonly"
          href="/onboarding/semantic-readonly"
          className="badge badge-ok"
          style={{ width: 'fit-content', pointerEvents: enabled ? 'auto' : 'none', opacity: enabled ? 1 : 0.5 }}
        >
          Open semantic readonly flow
        </Link>
      </section>
    </main>
  )
}
