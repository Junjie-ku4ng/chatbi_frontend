'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getToolsetPluginPolicy } from '@/modules/governance/toolset/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function XpertToolDetailPage() {
  const params = useParams<{ id: string }>()
  const toolId = params.id

  const policyQuery = useQuery({
    queryKey: ['xpert-tool-detail-policy', toolId],
    enabled: Boolean(toolId),
    queryFn: () => getToolsetPluginPolicy(toolId, { fallbackToDefault: false })
  })

  const policy = policyQuery.data ?? null
  const policyStatusClassName = policy?.status === 'active' ? 'badge badge-ok' : 'badge badge-warn'

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section data-testid="xpert-tool-detail" style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>xpert tool detail</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link data-testid="xpert-tool-plugin-catalog-link" href="/settings/plugins" className="badge badge-ok">
                Plugin catalog
              </Link>
              <Link href="/xpert/w" className="badge badge-warn">
                Back to workspace
              </Link>
            </div>
          </div>
          <span data-testid="xpert-tool-id" className="badge badge-warn" style={{ width: 'fit-content' }}>
            tool: {toolId}
          </span>
          <span data-testid="xpert-tool-route-truth" className="badge badge-warn" style={{ width: 'fit-content' }}>
            read-only policy view
          </span>
        </header>

        <LoadablePanel
          loading={policyQuery.isLoading}
          error={policyQuery.error}
          empty={!policy}
          loadingLabel="Loading tool policy..."
          emptyLabel="Tool policy is not configured."
          retry={() => {
            void policyQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <span data-testid="xpert-tool-policy-status" className={policyStatusClassName} style={{ width: 'fit-content' }}>
              {policy?.status ?? 'unknown'}
            </span>
            <div style={{ display: 'grid', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
              <span data-testid="xpert-tool-policy-timeout">timeoutMs: {policy?.timeoutMs ?? 0}</span>
              <span data-testid="xpert-tool-policy-payload">maxPayloadBytes: {policy?.maxPayloadBytes ?? 0}</span>
              <span data-testid="xpert-tool-policy-rate">maxActionsPerMinute: {policy?.maxActionsPerMinute ?? 0}</span>
              <span data-testid="xpert-tool-policy-domains">
                allowedDomains: {(policy?.allowedDomains ?? []).join(', ') || '(none)'}
              </span>
            </div>
          </article>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
