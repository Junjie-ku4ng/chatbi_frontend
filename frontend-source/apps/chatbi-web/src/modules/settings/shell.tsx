'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { NexusBadge, NexusCard, NexusInput } from '@/modules/shared/ui/primitives'

export type SettingsTabKey =
  | 'home'
  | 'account-profile'
  | 'account-password'
  | 'users'
  | 'roles'
  | 'business-area'
  | 'certification'
  | 'chatbi'
  | 'copilot'
  | 'email-templates'
  | 'custom-smtp'
  | 'data-sources'
  | 'integration'
  | 'plugins'
  | 'features'
  | 'tenant'
  | 'organizations'
  | 'knowledgebase'

type SettingsTab = {
  id: SettingsTabKey
  label: string
  href: string
}

type SettingsGroup = {
  id: 'account' | 'platform' | 'knowledge'
  title: string
  tabs: SettingsTabKey[]
}

const settingsTabs: SettingsTab[] = [
  { id: 'home', label: 'Overview', href: '/settings' },
  { id: 'account-profile', label: 'Account Profile', href: '/settings/account/profile' },
  { id: 'account-password', label: 'Account Password', href: '/settings/account/password' },
  { id: 'users', label: 'Users', href: '/settings/users' },
  { id: 'roles', label: 'Roles', href: '/settings/roles' },
  { id: 'business-area', label: 'Business Area', href: '/settings/business-area' },
  { id: 'certification', label: 'Certification', href: '/settings/certification' },
  { id: 'chatbi', label: 'ChatBI', href: '/settings/chatbi' },
  { id: 'copilot', label: 'Copilot', href: '/settings/copilot' },
  { id: 'email-templates', label: 'Email Templates', href: '/settings/email-templates' },
  { id: 'custom-smtp', label: 'Custom SMTP', href: '/settings/custom-smtp' },
  { id: 'data-sources', label: 'Data Sources', href: '/settings/data-sources' },
  { id: 'integration', label: 'Integration', href: '/settings/integration' },
  { id: 'plugins', label: 'Plugins', href: '/settings/plugins' },
  { id: 'features', label: 'Features', href: '/settings/features' },
  { id: 'tenant', label: 'Tenant', href: '/settings/tenant' },
  { id: 'organizations', label: 'Organizations', href: '/organization' },
  { id: 'knowledgebase', label: 'Knowledgebase', href: '/settings/knowledgebase' }
]

const settingsGroups: SettingsGroup[] = [
  {
    id: 'account',
    title: 'Account & Access',
    tabs: ['home', 'account-profile', 'account-password', 'users', 'roles']
  },
  {
    id: 'platform',
    title: 'Platform',
    tabs: [
      'business-area',
      'certification',
      'chatbi',
      'copilot',
      'email-templates',
      'custom-smtp',
      'data-sources',
      'integration',
      'plugins',
      'features',
      'tenant',
      'organizations'
    ]
  },
  {
    id: 'knowledge',
    title: 'Knowledge',
    tabs: ['knowledgebase']
  }
]

function isActiveTab(pathname: string, href: string) {
  if (href === '/settings') return pathname === '/settings'
  return pathname === href || pathname.startsWith(`${href}/`)
}

const settingsTabMap = Object.fromEntries(settingsTabs.map(tab => [tab.id, tab])) as Record<SettingsTabKey, SettingsTab>

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [settingsSearch, setSettingsSearch] = useState('')
  const normalizedSettingsSearch = settingsSearch.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!normalizedSettingsSearch) {
      return settingsGroups
    }

    return settingsGroups
      .map(group => ({
        ...group,
        tabs: group.tabs.filter(tabId => {
          const tab = settingsTabMap[tabId]
          const target = `${tab.label} ${tab.href}`.toLowerCase()
          return target.includes(normalizedSettingsSearch)
        })
      }))
      .filter(group => group.tabs.length > 0)
  }, [normalizedSettingsSearch])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section data-testid="settings-shell-layout" className="settings-assistant-shell settings-x-shell settings-shell-v2">
        <header data-testid="settings-shell-header" className="settings-assistant-header settings-x-head settings-x-head-v2 nx-card">
          <div className="settings-x-head-glow" aria-hidden="true" />
          <div className="settings-x-head-main">
            <div className="settings-x-head-copy">
              <span className="settings-x-kicker">PA NEXUS ADMIN</span>
              <strong data-testid="settings-shell-title" className="settings-x-title">
                Settings
              </strong>
              <p className="settings-x-subtitle">Central shell for tenant, identity, model and integration governance.</p>
            </div>
            <div className="settings-x-head-meta nx-shell-meta-row">
              <NexusBadge tone="brand">Canonical /settings/*</NexusBadge>
              <NexusBadge tone="ok">Scope: allow:model:*</NexusBadge>
            </div>
          </div>
          <NexusInput
            data-testid="settings-search-launcher"
            placeholder="搜索设置..."
            value={settingsSearch}
            onChange={event => setSettingsSearch(event.target.value)}
          />
          <div className="settings-x-head-links nx-shell-meta-row">
            <Link data-testid="settings-legacy-ai-models" href="/ai/models" className="settings-x-head-link">
              AI Models
            </Link>
            <Link data-testid="settings-legacy-ai-providers" href="/ai/providers" className="settings-x-head-link">
              Providers
            </Link>
            <Link href="/xpert/w" className="settings-x-head-link">
              Workbench
            </Link>
          </div>
          <div className="settings-x-telemetry-strip" aria-hidden="true" />
        </header>

        <div data-testid="settings-shell-body" className="settings-assistant-body settings-x-body">
          <NexusCard data-testid="settings-tab-nav" className="settings-assistant-nav settings-x-nav">
            {filteredGroups.map(group => (
              <section
                key={group.id}
                data-testid={`settings-nav-group-${group.id}`}
                className="settings-x-nav-group nx-shell-panel"
              >
                <strong className="settings-x-nav-group-title">{group.title}</strong>
                <div className="settings-x-nav-group-items">
                  {group.tabs.map(tabId => {
                    const tab = settingsTabMap[tabId]
                    return (
                      <Link
                        key={tab.id}
                        data-testid={`settings-tab-${tab.id}`}
                        href={tab.href}
                        className={`settings-x-nav-item-link ${isActiveTab(pathname, tab.href) ? 'is-active' : ''}`}
                      >
                        <span className="settings-x-nav-item">{tab.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
            {filteredGroups.length === 0 ? <div data-testid="settings-nav-empty">No settings matched current filter.</div> : null}
          </NexusCard>
          <div className="settings-assistant-content settings-x-content">{children}</div>
        </div>
      </section>
    </AccessGuard>
  )
}

export function SettingsPanel({ testId, title, description, children }: { testId: string; title: string; description: string; children?: React.ReactNode }) {
  return (
    <NexusCard data-testid={testId} className="settings-assistant-panel settings-x-panel">
      <header className="settings-panel-head">
        <strong className="settings-panel-title">{title}</strong>
        <span className="settings-panel-description">{description}</span>
      </header>
      {children ? (
        <div className="settings-panel-body">
          <div className="settings-panel-body nx-shell-panel">{children}</div>
        </div>
      ) : null}
    </NexusCard>
  )
}

export function SettingsPreviewNotice({ scope }: { scope: string }) {
  return (
    <div className="settings-inline-actions">
      <NexusBadge data-testid="settings-preview-notice" tone="neutral" className="nx-shell-readonly-note">
        Read-only preview
      </NexusBadge>
      <NexusBadge data-testid="settings-preview-scope" tone="brand">
        route truth: {scope}
      </NexusBadge>
      <NexusBadge data-testid="settings-preview-durability" tone="warn">
        No durable save on this route
      </NexusBadge>
    </div>
  )
}
