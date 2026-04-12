import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import InsightsPage from '@/modules/insight/pages/insights-page'

export default function DashboardPage() {
  return (
    <BiCanonicalShell
      activeTab="dashboard"
      title="Dashboard"
      description="Canonical dashboard entry aligned to xpert menu layout."
    >
      <BiCanonicalPanel
        testId="bi-dashboard-home"
        title="Dashboard Today"
        description="Today overview now runs the existing Insights runtime under canonical dashboard URL."
      >
        <div className="bi-canonical-kpi-strip">
          <article className="bi-canonical-kpi-tile">
            <span>Insight Runtime</span>
            <strong>Live</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Governance Linkage</span>
            <strong>Connected</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Catalog Readiness</span>
            <strong>Ready</strong>
          </article>
        </div>
        <div className="bi-canonical-highlight-grid">
          <article className="bi-canonical-highlight-card">
            <strong>Executive Pulse</strong>
            <span>Model health, governance and runtime confidence in one pane.</span>
          </article>
          <article className="bi-canonical-highlight-card">
            <strong>Fast Entry</strong>
            <span>Direct links keep catalog and trending actions within one click.</span>
          </article>
        </div>
        <div className="bi-canonical-quick-links bi-canonical-quick-links-dashboard">
          <Link href="/dashboard/catalog" className="badge badge-ok">
            Open Catalog
          </Link>
          <Link href="/dashboard/trending" className="badge badge-ok">
            Open Trending
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-dashboard-runtime-frame" className="bi-canonical-runtime-frame">
        <section data-testid="bi-dashboard-runtime-insights">
          <InsightsPage />
        </section>
      </section>
    </BiCanonicalShell>
  )
}
