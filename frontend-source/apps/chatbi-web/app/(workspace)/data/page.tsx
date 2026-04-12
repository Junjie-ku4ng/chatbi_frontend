import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import SettingsDataSourcesPage from '../settings/data-sources/page'

export default function DataFactoryCompatibilityPage() {
  return (
    <BiCanonicalShell
      activeTab="data"
      title="Data Factory"
      description="Canonical compatibility route for xpert /data surface."
    >
      <BiCanonicalPanel
        testId="bi-data-home"
        title="Data Sources Runtime"
        description="The /data route now hosts the live data source registry and canonical authoring entry."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/settings/data-sources" className="badge badge-ok">
            Open Settings Data Sources
          </Link>
          <Link href="/models" className="badge badge-warn">
            Open Models
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-data-runtime">
        <SettingsDataSourcesPage />
      </section>
    </BiCanonicalShell>
  )
}
