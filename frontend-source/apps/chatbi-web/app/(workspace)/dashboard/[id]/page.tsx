import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import InsightDetailPage from '@/modules/insight/pages/insight-detail-page'

export default function DashboardInsightDetailPage() {
  return (
    <BiCanonicalShell
      activeTab="dashboard"
      title="Insight Detail"
      description="Canonical insight detail route under dashboard."
    >
      <BiCanonicalPanel
        testId="bi-dashboard-insight-detail"
        title="Insight Detail"
        description="This route runs the live insight detail runtime under canonical /dashboard/:id."
      />
      <section data-testid="bi-dashboard-runtime-insight-detail">
        <InsightDetailPage />
      </section>
    </BiCanonicalShell>
  )
}
