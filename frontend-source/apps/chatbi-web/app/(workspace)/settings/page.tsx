import { SettingsPanel } from '@/modules/settings/shell'
import Link from 'next/link'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsPage() {
  return (
    <SettingsPanel
      testId="settings-page-home"
      title="Settings Overview"
      description="Navigate tenant, security, and knowledgebase settings from one canonical shell."
    >
      <section className="settings-overview-grid">
        <article className="settings-overview-card">
          <strong>Identity & Access</strong>
          <span>Users, roles, account profile and credential policy.</span>
          <div className="settings-overview-card-links">
            <Link href="/settings/users" className="settings-x-head-link">
              Users
            </Link>
            <Link href="/settings/roles" className="settings-x-head-link">
              Roles
            </Link>
          </div>
        </article>
        <article className="settings-overview-card">
          <strong>Platform Runtime</strong>
          <span>Integrations, plugins, feature rollout and tenant defaults.</span>
          <div className="settings-overview-card-links">
            <Link href="/settings/integration" className="settings-x-head-link">
              Integration
            </Link>
            <Link href="/settings/features" className="settings-x-head-link">
              Features
            </Link>
          </div>
        </article>
      </section>
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">PA Nexus Admin Console</NexusBadge>
        <NexusBadge tone="neutral">xpert facade surface</NexusBadge>
      </div>
    </SettingsPanel>
  )
}
