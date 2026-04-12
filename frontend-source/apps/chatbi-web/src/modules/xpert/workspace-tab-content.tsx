'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusCard } from '@/modules/shared/ui/primitives'
import {
  listWorkspaceKnowledges,
  listWorkspaceMembers,
  listWorkspaceRecentTasks,
  listWorkspaceSemanticModels,
  listWorkspaceToolsets,
  listWorkspaceXperts,
  type WorkspaceResourceRecord
} from './workspace-api'
import { useXpertWorkspaceFilter } from './workspace'

function asLabel(item: WorkspaceResourceRecord, fallback: string) {
  if (typeof item.name === 'string' && item.name.trim()) return item.name
  if (typeof item.title === 'string' && item.title.trim()) return item.title
  if (typeof item.id === 'string' && item.id.trim()) return item.id
  return fallback
}

function WorkspaceResourceList({
  testPrefix,
  queryKey,
  queryFn,
  emptyLabel
}: {
  testPrefix: string
  queryKey: unknown[]
  queryFn: () => Promise<{ items: WorkspaceResourceRecord[]; total?: number }>
  emptyLabel: string
}) {
  const filterTerm = useXpertWorkspaceFilter()
  const query = useQuery({
    queryKey,
    queryFn
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? items.length
  const normalizedFilterTerm = filterTerm.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!normalizedFilterTerm) {
      return items
    }

    return items.filter(item => {
      const target = `${asLabel(item, '')} ${String(item.id ?? '')} ${String(item.category ?? '')}`.toLowerCase()
      return target.includes(normalizedFilterTerm)
    })
  }, [items, normalizedFilterTerm])
  const categoryCount = new Set(items.map(item => String(item.category ?? '')).filter(Boolean)).size

  return (
    <LoadablePanel
      loading={query.isLoading}
      error={query.error}
      empty={filteredItems.length === 0}
      emptyLabel={normalizedFilterTerm ? 'No resources matched current filter.' : emptyLabel}
      retry={() => {
        void query.refetch()
      }}
    >
      <header className="xpert-resource-header" data-testid={`${testPrefix}-summary`}>
        <div className="xpert-resource-summary">
          <NexusBadge tone="brand">total: {total}</NexusBadge>
          {normalizedFilterTerm ? <NexusBadge tone="neutral">showing: {filteredItems.length}</NexusBadge> : null}
          <NexusBadge tone="neutral">category: {categoryCount}</NexusBadge>
        </div>
      </header>
      <section className="xpert-resource-list">
        {filteredItems.map((item, index) => (
          <article key={`${String(item.id ?? index)}-${index}`} data-testid={`${testPrefix}-row-${index}`} className="xpert-resource-row">
            <div className="xpert-resource-row-main">
              <strong>{asLabel(item, `${testPrefix}-${index + 1}`)}</strong>
              <div className="xpert-resource-row-meta">{String(item.id ?? '-')}</div>
            </div>
            {item.category ? <NexusBadge tone="neutral">{String(item.category)}</NexusBadge> : null}
          </article>
        ))}
      </section>
    </LoadablePanel>
  )
}

export function XpertWorkspaceXpertsPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Xperts</strong>
        <p className="xpert-panel-subtitle">Agent registry and binding entries attached to this workspace.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-xperts"
        queryKey={['xpert-workspace-tab-xperts', workspaceId]}
        queryFn={() => listWorkspaceXperts(workspaceId)}
        emptyLabel="No xperts found in this workspace"
      />
    </NexusCard>
  )
}

export function XpertWorkspaceKnowledgesPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Knowledges</strong>
        <p className="xpert-panel-subtitle">Knowledge corpora, indexes and retrieval resources.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-knowledges"
        queryKey={['xpert-workspace-tab-knowledges', workspaceId]}
        queryFn={() => listWorkspaceKnowledges(workspaceId)}
        emptyLabel="No knowledges found in this workspace"
      />
    </NexusCard>
  )
}

export function XpertWorkspaceMcpPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>MCP</strong>
        <p className="xpert-panel-subtitle">Model Context Protocol connections and tool gateways.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-mcp"
        queryKey={['xpert-workspace-tab-mcp', workspaceId]}
        queryFn={() => listWorkspaceToolsets(workspaceId, { category: 'mcp' })}
        emptyLabel="No toolsets found in this workspace"
      />
    </NexusCard>
  )
}

export function XpertWorkspaceCustomPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Custom</strong>
        <p className="xpert-panel-subtitle">Custom adapters, scripts and extension modules.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-custom"
        queryKey={['xpert-workspace-tab-custom', workspaceId]}
        queryFn={() => listWorkspaceToolsets(workspaceId, { category: 'custom' })}
        emptyLabel="No custom tools found in this workspace"
      />
    </NexusCard>
  )
}

export function XpertWorkspaceBuiltinPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Builtin</strong>
        <p className="xpert-panel-subtitle">Builtin tools and operational actions available by default.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-builtin"
        queryKey={['xpert-workspace-tab-builtin', workspaceId]}
        queryFn={() => listWorkspaceToolsets(workspaceId, { category: 'builtin' })}
        emptyLabel="No builtin tools found in this workspace"
      />
    </NexusCard>
  )
}

export function XpertWorkspaceDatabasePanel({ workspaceId }: { workspaceId: string }) {
  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Database</strong>
        <p className="xpert-panel-subtitle">Semantic model inventory and runtime data endpoints.</p>
      </header>
      <WorkspaceResourceList
        testPrefix="xpert-workspace-database"
        queryKey={['xpert-workspace-tab-database', workspaceId]}
        queryFn={() => listWorkspaceSemanticModels()}
        emptyLabel="No semantic models found"
      />
      <NexusBadge tone="neutral" data-testid="xpert-workspace-database-workspace">
        workspace: {workspaceId}
      </NexusBadge>
    </NexusCard>
  )
}

export function XpertWorkspaceOverviewPanel({ workspaceId }: { workspaceId: string }) {
  const filterTerm = useXpertWorkspaceFilter()
  const membersQuery = useQuery({
    queryKey: ['xpert-workspace-overview-members', workspaceId],
    queryFn: () => listWorkspaceMembers(workspaceId)
  })
  const xpertsQuery = useQuery({
    queryKey: ['xpert-workspace-overview-xperts', workspaceId],
    queryFn: () => listWorkspaceXperts(workspaceId)
  })
  const knowledgesQuery = useQuery({
    queryKey: ['xpert-workspace-overview-knowledges', workspaceId],
    queryFn: () => listWorkspaceKnowledges(workspaceId)
  })
  const modelsQuery = useQuery({
    queryKey: ['xpert-workspace-overview-models', workspaceId],
    queryFn: () => listWorkspaceSemanticModels()
  })
  const tasksQuery = useQuery({
    queryKey: ['xpert-workspace-overview-tasks', workspaceId],
    queryFn: () => listWorkspaceRecentTasks(workspaceId)
  })

  const loading =
    membersQuery.isLoading ||
    xpertsQuery.isLoading ||
    knowledgesQuery.isLoading ||
    modelsQuery.isLoading ||
    tasksQuery.isLoading
  const error = membersQuery.error || xpertsQuery.error || knowledgesQuery.error || modelsQuery.error || tasksQuery.error

  const membersCount = membersQuery.data?.total ?? 0
  const xpertsCount = xpertsQuery.data?.total ?? 0
  const knowledgesCount = knowledgesQuery.data?.total ?? 0
  const modelsCount = modelsQuery.data?.total ?? 0
  const tasks = tasksQuery.data?.items ?? []
  const normalizedFilterTerm = filterTerm.trim().toLowerCase()
  const filteredTasks = useMemo(() => {
    if (!normalizedFilterTerm) {
      return tasks
    }

    return tasks.filter(task => {
      const target = `${String(task.id ?? '')} ${String(task.name ?? '')} ${String(task.status ?? '')}`.toLowerCase()
      return target.includes(normalizedFilterTerm)
    })
  }, [normalizedFilterTerm, tasks])

  return (
    <NexusCard className="xpert-assistant-panel xpert-grid-panel">
      <strong>Workspace overview</strong>
      <LoadablePanel
        loading={loading}
        error={error}
        retry={() => {
          void membersQuery.refetch()
          void xpertsQuery.refetch()
          void knowledgesQuery.refetch()
          void modelsQuery.refetch()
          void tasksQuery.refetch()
        }}
      >
        <section className="xpert-overview-grid">
          <NexusCard className="xpert-overview-item">
            <span>Members</span>
            <NexusBadge data-testid="xpert-workspace-overview-members" tone="ok">
              {membersCount}
            </NexusBadge>
          </NexusCard>
          <NexusCard className="xpert-overview-item">
            <span>Xperts</span>
            <NexusBadge data-testid="xpert-workspace-overview-xperts" tone="ok">
              {xpertsCount}
            </NexusBadge>
          </NexusCard>
          <NexusCard className="xpert-overview-item">
            <span>Knowledges</span>
            <NexusBadge data-testid="xpert-workspace-overview-knowledges" tone="ok">
              {knowledgesCount}
            </NexusBadge>
          </NexusCard>
          <NexusCard className="xpert-overview-item">
            <span>Models</span>
            <NexusBadge data-testid="xpert-workspace-overview-models" tone="ok">
              {modelsCount}
            </NexusBadge>
          </NexusCard>
        </section>
        <section className="xpert-overview-tasks">
          <strong>Recent Tasks</strong>
          {filteredTasks.length === 0 ? (
            <span className="xpert-resource-row-meta">No recent task</span>
          ) : (
            <div className="xpert-resource-list">
              {filteredTasks.map((task, index) => (
                <article key={`${task.id}-${index}`} data-testid={`xpert-workspace-overview-task-${index}`} className="xpert-resource-row">
                  <div className="xpert-resource-row-main">
                    <strong>{task.name || task.id}</strong>
                    <div className="xpert-resource-row-meta">{task.id}</div>
                  </div>
                  {task.status ? <NexusBadge tone="neutral">{task.status}</NexusBadge> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </LoadablePanel>
    </NexusCard>
  )
}
