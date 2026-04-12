'use client'

import Link from 'next/link'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { NexusBadge, NexusCard } from '@/modules/shared/ui/primitives'

export type BiCanonicalTabKey =
  | 'dashboard'
  | 'dashboard-catalog'
  | 'dashboard-trending'
  | 'models'
  | 'project'
  | 'project-indicators'
  | 'indicator-market'
  | 'indicator-app'
  | 'data'
  | 'organization'

type BiCanonicalTab = {
  key: BiCanonicalTabKey
  label: string
  href: string
}

const biCanonicalTabs: BiCanonicalTab[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'dashboard-catalog', label: 'Catalog', href: '/dashboard/catalog' },
  { key: 'dashboard-trending', label: 'Trending', href: '/dashboard/trending' },
  { key: 'models', label: 'Models', href: '/models' },
  { key: 'project', label: 'Project', href: '/project' },
  { key: 'project-indicators', label: 'Project Indicators', href: '/project/indicators' },
  { key: 'indicator-market', label: 'Indicator Market', href: '/indicator/market' },
  { key: 'indicator-app', label: 'Indicator App', href: '/indicator-app' },
  { key: 'data', label: 'Data', href: '/data' },
  { key: 'organization', label: 'Organization', href: '/organization' }
]

const relatedLinksByTab: Record<BiCanonicalTabKey, Array<{ label: string; href: string }>> = {
  dashboard: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Governance Overview', href: '/governance' }
  ],
  'dashboard-catalog': [
    { label: 'Collections', href: '/collections' },
    { label: 'Story Library', href: '/project' }
  ],
  'dashboard-trending': [
    { label: 'Feed', href: '/feed' },
    { label: 'Ops Reports', href: '/ops/reports' }
  ],
  models: [
    { label: 'Model Governance', href: '/models' },
    { label: 'Semantic Studio', href: '/semantic-studio' }
  ],
  project: [
    { label: 'Stories', href: '/project' },
    { label: 'Project Indicators', href: '/project/indicators' }
  ],
  'project-indicators': [
    { label: 'Indicator App', href: '/indicator-app' },
    { label: 'Indicator Contracts', href: '/indicator-contracts' }
  ],
  'indicator-market': [
    { label: 'Indicator Contracts', href: '/indicator-contracts' },
    { label: 'Project Indicator Register', href: '/project/indicator' }
  ],
  'indicator-app': [
    { label: 'Indicator App', href: '/indicator-app' },
    { label: 'Indicator Consumers', href: '/indicator-consumers' }
  ],
  data: [
    { label: 'Settings Data Sources', href: '/settings/data-sources' },
    { label: 'Semantic Models', href: '/models' }
  ],
  organization: [
    { label: 'Organization', href: '/organization' },
    { label: 'Settings Tenant', href: '/settings/tenant' }
  ]
}

export function BiCanonicalShell({
  activeTab,
  title,
  description,
  children
}: {
  activeTab: BiCanonicalTabKey
  title: string
  description: string
  children: React.ReactNode
}) {
  const relatedLinks = relatedLinksByTab[activeTab] ?? []

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="bi-canonical-shell bi-canonical-shell-v2">
        <NexusCard className="bi-canonical-hero">
          <div className="bi-canonical-hero-aurora" />
          <div className="bi-canonical-hero-gridline" />
          <div className="bi-canonical-hero-head">
            <div className="bi-canonical-hero-copy">
              <strong className="bi-canonical-hero-title">{title}</strong>
              <span className="bi-canonical-hero-description">{description}</span>
            </div>
            <div className="bi-canonical-hero-visual">
              <div className="bi-canonical-hero-orbit">
                <span className="bi-canonical-orbit-ring bi-canonical-orbit-ring-a" />
                <span className="bi-canonical-orbit-ring bi-canonical-orbit-ring-b" />
              </div>
              <div className="bi-canonical-hero-signal" aria-hidden="true">
                <span className="bi-canonical-hero-signal-bar bi-canonical-hero-signal-bar-a" />
                <span className="bi-canonical-hero-signal-bar bi-canonical-hero-signal-bar-b" />
                <span className="bi-canonical-hero-signal-bar bi-canonical-hero-signal-bar-c" />
              </div>
            </div>
          </div>
          <div className="bi-canonical-hero-badges">
            <NexusBadge tone="brand">Canonical xpert BI route</NexusBadge>
            <NexusBadge tone="ok">Canonical only mode</NexusBadge>
          </div>
          <div className="bi-canonical-hero-links">
            {relatedLinks.map(link => (
              <Link key={link.href} href={link.href} className="badge badge-warn">
                {link.label}
              </Link>
            ))}
          </div>
        </NexusCard>

        <NexusCard data-testid="bi-canonical-tab-nav" className="bi-canonical-tab-nav">
          {biCanonicalTabs.map(tab => (
            <Link
              key={tab.key}
              data-testid={`bi-canonical-tab-${tab.key}`}
              href={tab.href}
              className={`xpert-chip ${tab.key === activeTab ? 'is-brand' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </NexusCard>

        {children}
      </section>
    </AccessGuard>
  )
}

export function BiCanonicalPanel({
  testId,
  title,
  description,
  children
}: {
  testId: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <NexusCard data-testid={testId} className="bi-canonical-panel">
      <strong className="bi-canonical-panel-title">{title}</strong>
      <span className="bi-canonical-panel-description">{description}</span>
      {children ? <div className="bi-canonical-panel-body">{children}</div> : null}
    </NexusCard>
  )
}
