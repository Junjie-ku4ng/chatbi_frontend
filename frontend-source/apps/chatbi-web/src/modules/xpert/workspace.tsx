'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createContext, useContext, useMemo, useState } from 'react'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusCard, NexusInput } from '@/modules/shared/ui/primitives'
import { archiveXpertWorkspace, listMyXpertWorkspaces } from './workspace-api'

export type XpertWorkspaceTabKey = 'xperts' | 'knowledges' | 'custom' | 'builtin' | 'mcp' | 'database'

type XpertWorkspaceRelatedLink = {
  id: string
  label: string
  href: (workspaceId: string) => string
}

type XpertWorkspaceTab = {
  key: XpertWorkspaceTabKey
  label: string
  relatedLinks: XpertWorkspaceRelatedLink[]
}

const workspaceTabs: XpertWorkspaceTab[] = [
  {
    key: 'xperts',
    label: 'Xperts',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'xpert-registry', label: 'Xpert registry', href: workspaceId => tabHref(workspaceId, 'xperts') }
    ]
  },
  {
    key: 'knowledges',
    label: 'Knowledges',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'knowledge-catalog', label: 'Knowledge catalog', href: workspaceId => tabHref(workspaceId, 'knowledges') }
    ]
  },
  {
    key: 'custom',
    label: 'Custom',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'custom-toolsets', label: 'Custom toolsets', href: workspaceId => tabHref(workspaceId, 'custom') }
    ]
  },
  {
    key: 'builtin',
    label: 'Builtin',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'builtin-toolsets', label: 'Builtin toolsets', href: workspaceId => tabHref(workspaceId, 'builtin') }
    ]
  },
  {
    key: 'mcp',
    label: 'MCP',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'mcp-gateways', label: 'MCP gateways', href: workspaceId => tabHref(workspaceId, 'mcp') }
    ]
  },
  {
    key: 'database',
    label: 'Database',
    relatedLinks: [
      { id: 'workbench-home', label: 'Workspace home', href: workspaceId => `/xpert/w/${encodeURIComponent(workspaceId)}` },
      { id: 'workspace-database', label: 'Workspace database', href: workspaceId => tabHref(workspaceId, 'database') }
    ]
  }
]

function tabHref(workspaceId: string, key: XpertWorkspaceTabKey) {
  return `/xpert/w/${encodeURIComponent(workspaceId)}/${key}`
}

const XpertWorkspaceFilterContext = createContext('')

export function useXpertWorkspaceFilter() {
  return useContext(XpertWorkspaceFilterContext)
}

export function XpertExploreShell() {
  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="xpert-assistant-surface xpert-surface xpert-surface-v2">
        <header className="xpert-assistant-header xpert-surface-head xpert-surface-head-v2 nx-card">
          <div className="xpert-surface-head-glow" aria-hidden="true" />
          <strong data-testid="xpert-explore-title" className="xpert-surface-title">
            Explore
          </strong>
          <NexusInput data-testid="xpert-explore-search-launcher" placeholder="搜索专家、知识库与工作空间..." readOnly />
          <NexusBadge tone="neutral">Read-only launcher</NexusBadge>
          <div className="nexus-chip-row">
            <Link data-testid="xpert-workspace-entry" href="/xpert/w" className="xpert-chip is-brand">
              Open Workbench
            </Link>
            <Link href="/ai/models" className="xpert-chip">
              AI Models
            </Link>
          </div>
          <div className="xpert-surface-telemetry" aria-hidden="true" />
        </header>
      </section>
    </AccessGuard>
  )
}

export function XpertWorkspaceIndexShell() {
  const [status, setStatus] = useState<string | null>(null)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const workspaceQuery = useQuery({
    queryKey: ['xpert-workspace-my'],
    queryFn: () => listMyXpertWorkspaces()
  })
  const workspaceUiError = workspaceQuery.error ? normalizeUiError(workspaceQuery.error) : null
  const workspaceDataItems = workspaceQuery.data?.items ?? []
  const hasWorkspaceItems = workspaceDataItems.length > 0

  const archiveMutation = useMutation({
    mutationFn: (workspaceId: string) => archiveXpertWorkspace(workspaceId),
    onSuccess: result => {
      setStatus(`archived: ${result.id}`)
      void workspaceQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const workspaceItems = useMemo(() => {
    if (hasWorkspaceItems) {
      return workspaceDataItems.map(item => ({
        id: item.id,
        name: item.name || item.code || item.id,
        code: item.code || item.id,
        description: item.description || 'Workspace for xpert orchestration, knowledge and tools.',
        archived: Boolean(item.archivedAt)
      }))
    }

    return []
  }, [hasWorkspaceItems, workspaceDataItems])

  const totalCount = workspaceItems.length
  const archivedCount = workspaceItems.filter(item => item.archived).length
  const activeCount = totalCount - archivedCount
  const normalizedWorkspaceSearch = workspaceSearch.trim().toLowerCase()
  const filteredWorkspaceItems = useMemo(() => {
    if (!normalizedWorkspaceSearch) {
      return workspaceItems
    }

    return workspaceItems.filter(item => {
      const target = `${item.id} ${item.name} ${item.code} ${item.description}`.toLowerCase()
      return target.includes(normalizedWorkspaceSearch)
    })
  }, [normalizedWorkspaceSearch, workspaceItems])
  const visibleWorkspaceCount = filteredWorkspaceItems.length
  const settledWorkspaceLabel = normalizedWorkspaceSearch
    ? `showing ${visibleWorkspaceCount} of ${totalCount} workspaces`
    : `${totalCount} workspace${totalCount === 1 ? '' : 's'} loaded`
  const effectiveStatus =
    status ?? (workspaceQuery.isLoading ? 'loading workspaces...' : workspaceUiError ? `error: ${workspaceUiError.message}` : settledWorkspaceLabel)
  const effectiveStatusTone = workspaceQuery.isLoading
    ? 'neutral'
    : effectiveStatus.includes('archived')
      ? 'ok'
      : effectiveStatus.startsWith('error:')
        ? 'warn'
        : 'brand'

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section data-testid="xpert-workspace-layout" className="xpert-assistant-surface xpert-surface xpert-surface-v2">
        <NexusCard data-testid="xpert-workspace-header" className="xpert-assistant-header xpert-surface-head xpert-surface-head-v2">
          <div className="xpert-surface-head-glow" aria-hidden="true" />
          <div className="xpert-workspace-hero">
            <div className="xpert-workspace-hero-copy">
              <strong data-testid="xpert-workspace-index-title" className="xpert-surface-title">
                Xpert Workbench
              </strong>
              <p className="xpert-surface-subtitle">Select a workspace to enter xpert tabs and govern xpert assets.</p>
            </div>
            <div data-testid="xpert-workspace-toolbar" className="xpert-workspace-toolbar nx-shell-panel">
              <NexusInput
                data-testid="xpert-workspace-search-launcher"
                placeholder="Search workspace..."
                value={workspaceSearch}
                onChange={event => setWorkspaceSearch(event.target.value)}
              />
              <div className="xpert-workspace-toolbar-actions">
                <Link href="/explore" className="xpert-chip">
                  Explore
                </Link>
                <Link href="/chat" className="xpert-chip is-brand">
                  Open chat
                </Link>
              </div>
            </div>
          </div>
          <section data-testid="xpert-workspace-metrics" className="xpert-workspace-metrics nx-shell-panel">
            <NexusCard className="xpert-workspace-metric">
              <span>Total workspace</span>
              <strong>{totalCount}</strong>
            </NexusCard>
            <NexusCard className="xpert-workspace-metric">
              <span>Active</span>
              <strong>{activeCount}</strong>
            </NexusCard>
            <NexusCard className="xpert-workspace-metric">
              <span>Archived</span>
              <strong>{archivedCount}</strong>
            </NexusCard>
            <NexusCard className="xpert-workspace-metric">
              <span>Data source</span>
              <strong>{workspaceQuery.isLoading ? 'loading' : workspaceUiError ? 'error' : `${totalCount} loaded`}</strong>
            </NexusCard>
          </section>
          <div className="xpert-workspace-status-row nx-shell-meta-row">
            <NexusBadge data-testid="xpert-workspace-status" tone={effectiveStatusTone}>
              {effectiveStatus}
            </NexusBadge>
            <NexusBadge data-testid="xpert-workspace-index-route-truth" tone="neutral">
              workspace inventory surface
            </NexusBadge>
          </div>
          <div className="xpert-surface-telemetry" aria-hidden="true" />
        </NexusCard>
        <NexusCard data-testid="xpert-workspace-content" className="xpert-assistant-panel xpert-grid-panel">
          <LoadablePanel
            loading={workspaceQuery.isLoading}
            error={workspaceQuery.error}
            empty={filteredWorkspaceItems.length === 0}
            emptyLabel={normalizedWorkspaceSearch ? 'No workspace matched current filter.' : 'No workspace available'}
            retry={() => {
              void workspaceQuery.refetch()
            }}
          >
            <div className="xpert-workspace-list">
              {filteredWorkspaceItems.map(workspace => (
                <NexusCard key={workspace.id} className="xpert-assistant-item xpert-workspace-item">
                  <div className="xpert-workspace-item-head">
                    <strong>{workspace.name}</strong>
                    <NexusBadge tone={workspace.archived ? 'warn' : 'ok'}>{workspace.archived ? 'archived' : 'active'}</NexusBadge>
                  </div>
                  <p className="xpert-workspace-item-description">{workspace.description}</p>
                  <div data-testid="xpert-workspace-item-meta" className="xpert-workspace-item-meta nx-shell-meta-row">
                    <NexusBadge tone="neutral">code: {workspace.code}</NexusBadge>
                    <span>{workspace.id}</span>
                  </div>
                  <div className="xpert-workspace-links">
                    <Link
                      data-testid={`xpert-workspace-open-${workspace.id}`}
                      href={`/xpert/w/${encodeURIComponent(workspace.id)}`}
                      className="xpert-chip is-brand"
                    >
                      Open workspace
                    </Link>
                    <Link href={`/xpert/w/${encodeURIComponent(workspace.id)}/xperts`} className="xpert-chip">
                      Xperts
                    </Link>
                    <ActionGuard scopes={['allow:write:model:*']}>
                      {permission => {
                        const canWrite = permission.state === 'enabled'
                        return (
                          <NexusButton
                            data-testid={`xpert-workspace-archive-${workspace.id}`}
                            type="button"
                            variant="secondary"
                            disabled={!canWrite || workspace.archived || archiveMutation.isPending}
                            title={permission.reason}
                            onClick={() => {
                              setStatus(null)
                              archiveMutation.mutate(workspace.id)
                            }}
                          >
                            {workspace.archived ? 'Archived' : 'Archive'}
                          </NexusButton>
                        )
                      }}
                    </ActionGuard>
                  </div>
                </NexusCard>
              ))}
            </div>
          </LoadablePanel>
        </NexusCard>
      </section>
    </AccessGuard>
  )
}

export function XpertWorkspacePageShell({
  workspaceId,
  title,
  summary,
  activeTab,
  children
}: {
  workspaceId: string
  title: string
  summary: string
  activeTab?: XpertWorkspaceTabKey
  children?: React.ReactNode
}) {
  const breadcrumbParts = ['xpert', 'w', workspaceId]
  const activeWorkspaceTab = activeTab ? workspaceTabs.find(tab => tab.key === activeTab) : undefined
  const [tabFilter, setTabFilter] = useState('')
  if (activeTab) breadcrumbParts.push(activeTab)
  const normalizedTabFilter = tabFilter.trim().toLowerCase()
  const filteredRelatedLinks = (activeWorkspaceTab?.relatedLinks ?? [
    { id: 'workbench-home', label: 'Workspace home', href: (id: string) => `/xpert/w/${encodeURIComponent(id)}` }
  ]).filter(link => {
    if (!normalizedTabFilter) {
      return true
    }
    return link.label.toLowerCase().includes(normalizedTabFilter)
  })

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <XpertWorkspaceFilterContext.Provider value={tabFilter}>
        <section data-testid="xpert-workspace-layout" className="xpert-assistant-surface xpert-surface xpert-surface-v2">
        <NexusCard data-testid="xpert-workspace-header" className="xpert-assistant-header xpert-surface-head xpert-surface-head-v2">
          <div className="xpert-surface-head-glow" aria-hidden="true" />
          <div className="xpert-workspace-hero">
            <div className="xpert-workspace-hero-copy">
              <strong data-testid="xpert-workspace-title" className="xpert-surface-title">
                {title}
              </strong>
              <span data-testid="xpert-workspace-breadcrumb" className="xpert-breadcrumb">
                {breadcrumbParts.join(' / ')}
              </span>
              <NexusBadge data-testid="xpert-workspace-route-truth" tone="neutral" className="xpert-expert-fit">
                resource inventory surface
              </NexusBadge>
              <p className="xpert-surface-subtitle">{summary}</p>
            </div>
            <div className="xpert-workspace-toolbar nx-shell-panel">
              <NexusInput
                data-testid="xpert-workspace-tab-filter-launcher"
                placeholder="Filter current tab..."
                value={tabFilter}
                onChange={event => setTabFilter(event.target.value)}
              />
              <div className="xpert-workspace-toolbar-actions">
                <Link href="/xpert/w" className="xpert-chip is-brand">
                  Workspaces
                </Link>
                <Link href="/explore" className="xpert-chip">
                  Explore
                </Link>
              </div>
            </div>
          </div>
          <div className="xpert-surface-telemetry" aria-hidden="true" />
        </NexusCard>

        <NexusCard data-testid="xpert-workspace-tab-nav" className="xpert-assistant-tab-nav xpert-tab-nav">
          {workspaceTabs.map(tab => (
            <Link
              key={tab.key}
              data-testid={`xpert-workspace-tab-${tab.key}`}
              href={tabHref(workspaceId, tab.key)}
              className={`xpert-assistant-tab-link xpert-tab-link ${activeTab === tab.key ? 'is-active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </NexusCard>

        <div data-testid="xpert-workspace-content">
          {activeTab && !children ? (
            <NexusCard className="xpert-assistant-panel xpert-grid-panel">
              <strong>{activeTab.toUpperCase()} workspace adapter</strong>
              <span className="xpert-expert-muted">
                Canonical xpert route is active. Open related xpert workbench surfaces from canonical IA.
              </span>
              <div className="xpert-workspace-toolbar-actions">
                {filteredRelatedLinks.map((link, index) => (
                  <Link
                    key={`${link.id}-${index}`}
                    data-testid={`xpert-workspace-related-link-${activeTab}-${index}`}
                    href={link.href(workspaceId)}
                    className={`xpert-chip ${index === 0 ? 'is-brand' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
                {filteredRelatedLinks.length === 0 ? <span>No related links matched current filter.</span> : null}
              </div>
            </NexusCard>
          ) : null}
          {children}
        </div>
        </section>
      </XpertWorkspaceFilterContext.Provider>
    </AccessGuard>
  )
}
