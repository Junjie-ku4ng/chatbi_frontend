import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import CollectionsPage from '../../collections/page'

export default function DashboardCatalogPage() {
  return (
    <BiCanonicalShell
      activeTab="dashboard-catalog"
      title="Dashboard Catalog"
      description="Catalog view preserves xpert dashboard information hierarchy."
    >
      <BiCanonicalPanel
        testId="bi-dashboard-catalog"
        title="Catalog"
        description="Catalog route now hosts the live collections and favorites module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/collections" className="badge badge-warn">
            Open Collections
          </Link>
          <Link href="/project" className="badge badge-warn">
            Open Story Library
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-dashboard-runtime-catalog">
        <CollectionsPage />
      </section>
    </BiCanonicalShell>
  )
}
