'use client'

import Link from 'next/link'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'

export type XpertExpertTabKey =
  | 'agents'
  | 'auth'
  | 'logs'
  | 'monitor'
  | 'workflow'
  | 'memory-store'
  | 'memory-database'
  | 'copilot-create'
  | 'copilot-testing'

type XpertExpertTab = {
  key: XpertExpertTabKey
  label: string
  href: (expertId: string) => string
}

const xpertExpertTabs: XpertExpertTab[] = [
  { key: 'agents', label: 'Agents', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/agents` },
  { key: 'auth', label: 'Auth', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/auth` },
  { key: 'logs', label: 'Logs', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/logs` },
  { key: 'monitor', label: 'Monitor', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/monitor` },
  { key: 'workflow', label: 'Workflow', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/workflow` },
  { key: 'memory-store', label: 'Memory Store', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/memory/store` },
  { key: 'memory-database', label: 'Memory Database', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/memory/database` },
  { key: 'copilot-create', label: 'Copilot Create', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/copilot/create` },
  { key: 'copilot-testing', label: 'Copilot Testing', href: expertId => `/xpert/x/${encodeURIComponent(expertId)}/copilot/testing` }
]

export function XpertExpertDetailShell({
  expertId,
  activeTab,
  title,
  summary,
  routeTruthLabel,
  children
}: {
  expertId: string
  activeTab: XpertExpertTabKey
  title: string
  summary: string
  routeTruthLabel?: string
  children?: React.ReactNode
}) {
  const breadcrumb = ['xpert', 'x', expertId, activeTab].join(' / ')

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="xpert-expert-shell">
        <NexusCard className="xpert-expert-hero">
          <strong data-testid="xpert-expert-title" className="xpert-expert-title">
            {title}
          </strong>
          <NexusBadge data-testid="xpert-expert-breadcrumb" tone="neutral" className="xpert-expert-fit">
            {breadcrumb}
          </NexusBadge>
          <span className="xpert-expert-muted">{summary}</span>
          <div className="xpert-expert-link-row nx-shell-meta-row">
            <Link href="/xpert/w">
              <NexusBadge tone="brand">Workspaces</NexusBadge>
            </Link>
            <NexusBadge data-testid="xpert-expert-workspace-note" tone="neutral">
              Workspace selected from /xpert/w
            </NexusBadge>
            <NexusBadge data-testid="xpert-expert-route-mode" tone="warn" className="nx-shell-readonly-note">
              Preview-only route
            </NexusBadge>
            {routeTruthLabel ? (
              <NexusBadge data-testid="xpert-expert-route-truth-detail" tone="neutral">
                {routeTruthLabel}
              </NexusBadge>
            ) : null}
          </div>
          <span className="xpert-expert-muted">This route stays preview-only until a canonical workspace flow is chosen.</span>
        </NexusCard>

        <NexusCard data-testid="xpert-expert-tab-nav" className="xpert-expert-tab-nav">
          {xpertExpertTabs.map(tab => (
            <Link key={tab.key} data-testid={`xpert-expert-tab-${tab.key}`} href={tab.href(expertId)}>
              <NexusBadge tone={tab.key === activeTab ? 'brand' : 'neutral'}>{tab.label}</NexusBadge>
            </Link>
          ))}
        </NexusCard>

        {children}
      </section>
    </AccessGuard>
  )
}

export function XpertExpertAgentsCard() {
  const agents = [
    { id: 'agent-primary', state: 'running' },
    { id: 'agent-fallback', state: 'idle' }
  ]

  return (
    <NexusCard className="xpert-expert-card">
      <strong>Agent roster</strong>
      <NexusBadge data-testid="xpert-expert-agents-count" tone="ok" className="xpert-expert-fit">
        {agents.length}
      </NexusBadge>
      {agents.map(agent => (
        <NexusCard key={agent.id} className="xpert-expert-row">
          <span>{agent.id}</span>
          <NexusBadge tone="neutral">{agent.state}</NexusBadge>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

export function XpertExpertLogsCard() {
  const logs = [
    { level: 'info', text: 'planner finished', ts: '2026-02-22T10:00:00.000Z' },
    { level: 'warn', text: 'fallback tool selected', ts: '2026-02-22T10:01:00.000Z' }
  ]

  return (
    <NexusCard className="xpert-expert-card">
      <strong>Execution logs</strong>
      {logs.map((log, index) => (
        <NexusCard key={`${log.ts}-${index}`} data-testid={`xpert-expert-log-row-${index}`} className="xpert-expert-subcard">
          <span>{log.level.toUpperCase()}</span>
          <span className="xpert-expert-muted">{log.text}</span>
          <span className="xpert-expert-muted xpert-expert-mini">{log.ts}</span>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

export function XpertExpertAuthCard() {
  return (
    <NexusCard className="xpert-expert-card">
      <strong>Expert auth policy</strong>
      <NexusBadge data-testid="xpert-expert-auth-policy" tone="ok" className="xpert-expert-fit">
        mode: session + rbac
      </NexusBadge>
      <span className="xpert-expert-muted">
        Runtime control and write operations require `allow:write:model:*`; read operations follow `allow:model:*`.
      </span>
      <ActionGuard scopes={['allow:write:model:*']}>
        {permission => {
          const canWrite = permission.state === 'enabled'
          return (
            <>
              <NexusBadge tone={canWrite ? 'ok' : 'neutral'}>
                write access: {canWrite ? 'enabled' : 'hidden'}
              </NexusBadge>
              {!canWrite ? (
                <NexusBadge data-testid="xpert-expert-auth-readonly" tone="warn" className="nx-shell-readonly-note">
                  write policy is read-only in current session
                </NexusBadge>
              ) : null}
            </>
          )
        }}
      </ActionGuard>
    </NexusCard>
  )
}

export function XpertExpertMonitorCard() {
  return (
    <NexusCard className="xpert-expert-monitor-row">
      <NexusBadge data-testid="xpert-expert-monitor-kpi-latency" tone="ok">
        p95 latency: 180ms
      </NexusBadge>
      <NexusBadge tone="neutral">success rate: 98%</NexusBadge>
      <NexusBadge tone="neutral">tokens/min: 14000</NexusBadge>
    </NexusCard>
  )
}

export function XpertExpertMemoryStoreCard() {
  const memories = [
    { key: 'user_profile', value: 'enterprise analyst' },
    { key: 'favorite_domain', value: 'revenue diagnostics' }
  ]

  return (
    <NexusCard className="xpert-expert-card">
      <strong>Memory store</strong>
      {memories.map((memory, index) => (
        <NexusCard key={memory.key} data-testid={`xpert-expert-memory-store-row-${index}`} className="xpert-expert-subcard">
          <span>{memory.key}</span>
          <span className="xpert-expert-muted">{memory.value}</span>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

export function XpertExpertMemoryDatabaseCard() {
  const rows = [
    { table: 'memory_vectors', rows: 2431 },
    { table: 'memory_snapshots', rows: 644 }
  ]

  return (
    <NexusCard className="xpert-expert-card">
      <strong>Memory database</strong>
      {rows.map((row, index) => (
        <NexusCard key={row.table} data-testid={`xpert-expert-memory-database-row-${index}`} className="xpert-expert-row">
          <span>{row.table}</span>
          <NexusBadge tone="ok">{row.rows}</NexusBadge>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

export function XpertExpertCopilotCreateCard({ expertId }: { expertId: string }) {
  const previewReason = 'Preview-only route; durable publish starts from canonical workspace flow.'

  return (
    <NexusCard className="xpert-expert-card">
      <strong data-testid="xpert-expert-copilot-create-title">Copilot create</strong>
      <span className="xpert-expert-muted">Preview draft surface for copilot authoring.</span>
      <ActionGuard scopes={['allow:write:model:*']}>
        {permission => {
          const canWrite = permission.state === 'enabled'
          const actionTitle = canWrite ? previewReason : `${permission.reason ?? 'Write access required'}; ${previewReason}`
          return (
            <>
              <NexusBadge data-testid="xpert-expert-copilot-preview-note" tone="warn" className="nx-shell-readonly-note">
                Preview-only action
              </NexusBadge>
              {!canWrite ? (
                <NexusBadge data-testid="xpert-expert-copilot-hidden-write" tone="neutral" className="nx-shell-readonly-note">
                  Write actions hidden in read-only mode
                </NexusBadge>
              ) : null}
              <NexusButton
                data-testid="xpert-expert-copilot-publish"
                type="button"
                disabled
                title={actionTitle}
                className="xpert-expert-fit"
              >
                Publish copilot
              </NexusButton>
              {canWrite ? (
                <Link href={`/xpert/x/${encodeURIComponent(expertId)}/copilot/testing`} className="xpert-expert-fit">
                  <NexusBadge tone="brand">Run testing</NexusBadge>
                </Link>
              ) : null}
            </>
          )
        }}
      </ActionGuard>
    </NexusCard>
  )
}

export function XpertExpertCopilotTestingCard() {
  const runs = [
    { id: 'run-001', status: 'passed' },
    { id: 'run-002', status: 'running' }
  ]

  return (
    <NexusCard className="xpert-expert-card">
      <strong>Copilot testing</strong>
      {runs.map((run, index) => (
        <NexusCard key={run.id} data-testid={`xpert-expert-copilot-testing-row-${index}`} className="xpert-expert-row">
          <span>{run.id}</span>
          <NexusBadge tone={run.status === 'passed' ? 'ok' : 'neutral'}>{run.status}</NexusBadge>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

export function XpertExpertCopilotDetailCard({ copilotId }: { copilotId: string }) {
  return (
    <NexusCard className="xpert-expert-card">
      <strong>Copilot detail</strong>
      <NexusBadge data-testid="xpert-expert-copilot-detail-id" tone="ok" className="xpert-expert-fit">
        {copilotId}
      </NexusBadge>
      <span className="xpert-expert-muted">Versioned copilot profile and runtime metadata.</span>
    </NexusCard>
  )
}
