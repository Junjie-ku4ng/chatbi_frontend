import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorOpsPage from '@/modules/governance/pages/indicator-ops-page'
import IndicatorConsumersPage from '../indicator-consumers/page'

export default function IndicatorAppPage() {
  return (
    <BiCanonicalShell
      activeTab="indicator-app"
      title="Indicator App"
      description="Canonical indicator app shell aligned to xpert menu entry."
    >
      <BiCanonicalPanel
        testId="bi-indicator-app-home"
        title="Indicator App"
        description="Canonical indicator app route now runs indicator ops and consumer registration surfaces."
      >
        <div className="bi-canonical-kpi-strip">
          <article className="bi-canonical-kpi-tile">
            <span>Import Pipeline</span>
            <strong>Streaming</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Approval Loop</span>
            <strong>Controlled</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Consumer Registry</span>
            <strong>Synced</strong>
          </article>
        </div>
        <div className="bi-canonical-highlight-grid">
          <article className="bi-canonical-highlight-card">
            <strong>Ops + Registry</strong>
            <span>Import execution, approvals and consumers are orchestrated in a single canvas.</span>
          </article>
          <article className="bi-canonical-highlight-card">
            <strong>Parity Ready</strong>
            <span>Layout follows xpert IA while keeping PA-specific signal density.</span>
          </article>
        </div>
        <div className="bi-canonical-quick-links bi-canonical-quick-links-indicator">
          <Link href="/indicator-app" className="badge badge-ok">
            Open Indicator App
          </Link>
          <Link href="/indicator-consumers" className="badge badge-ok">
            Open Consumer Registry
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-indicator-app-runtime-frame" className="bi-canonical-runtime-frame">
        <div className="bi-canonical-runtime-grid">
          <section data-testid="bi-indicator-app-runtime-ops">
            <IndicatorOpsPage />
          </section>
          <section data-testid="bi-indicator-app-runtime-consumers">
            <IndicatorConsumersPage />
          </section>
        </div>
      </section>
    </BiCanonicalShell>
  )
}
