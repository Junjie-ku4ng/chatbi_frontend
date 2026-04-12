import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import { SettingsShell } from '@/modules/settings/shell'
import SettingsOrganizationsPage from '@/modules/settings/pages/settings-organizations-page'

export default function OrganizationPage() {
  return (
    <BiCanonicalShell
      activeTab="organization"
      title="Organization"
      description="Canonical organization route aligned to xpert BI menu."
    >
      <BiCanonicalPanel
        testId="bi-organization-home"
        title="Organization"
        description="Canonical organization route now runs the live organizations management module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/organization" className="badge badge-warn">
            Open Organization
          </Link>
          <Link href="/settings/tenant" className="badge badge-warn">
            Open Settings Tenant
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-organization-runtime-settings">
        <SettingsShell>
          <SettingsOrganizationsPage />
        </SettingsShell>
      </section>
    </BiCanonicalShell>
  )
}
