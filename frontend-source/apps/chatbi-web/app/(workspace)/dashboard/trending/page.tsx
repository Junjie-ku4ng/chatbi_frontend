import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import FeedPage from '../../feed/page'

export default function DashboardTrendingPage() {
  return (
    <BiCanonicalShell
      activeTab="dashboard-trending"
      title="Dashboard Trending"
      description="Trending route keeps a canonical URL while reusing existing operational streams."
    >
      <BiCanonicalPanel
        testId="bi-dashboard-trending"
        title="Trending"
        description="Trending route now hosts live collaboration feed signals."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/feed" className="badge badge-warn">
            Open Feed
          </Link>
          <Link href="/ops/reports" className="badge badge-warn">
            Open Ops Reports
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-dashboard-runtime-trending">
        <FeedPage />
      </section>
    </BiCanonicalShell>
  )
}
