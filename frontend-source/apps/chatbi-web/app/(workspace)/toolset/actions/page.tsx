'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createToolsetAction, listToolsetActions, patchToolsetAction } from '@/modules/governance/toolset/api'
import { ToolsetCompatNotice } from '@/modules/governance/toolset/compat-notice'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function ToolsetActionsPage() {
  const [action, setAction] = useState('list_webhook_failures')
  const [domain, setDomain] = useState('indicator_governance')
  const [executor, setExecutor] = useState('indicator_governance.dispatch')
  const actionsQuery = useQuery({
    queryKey: ['toolset-actions'],
    queryFn: () => listToolsetActions({})
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      createToolsetAction({
        action,
        domain,
        executor,
        status: 'active',
        inputSchema: {},
        outputSchema: {}
      }),
    onSuccess: async () => {
      await actionsQuery.refetch()
    }
  })

  const disableMutation = useMutation({
    mutationFn: async (targetAction: string) => patchToolsetAction(targetAction, { status: 'disabled' }),
    onSuccess: async () => {
      await actionsQuery.refetch()
    }
  })

  const items = (actionsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section className="nexus-domain-stack">
        <header className="card nexus-domain-hero toolset-hero">
          <div className="nexus-domain-heading-row toolset-heading-row">
            <strong className="toolset-title">Toolset Actions</strong>
            <Link href="/toolset/plugins" className="badge badge-warn">
              Plugins
            </Link>
            <Link href="/toolset/scenarios" className="badge badge-warn">
              Scenarios
            </Link>
            <Link href="/toolset/learning" className="badge badge-warn">
              Learning
            </Link>
          </div>
          <ToolsetCompatNotice />
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            className="nexus-domain-form-row toolset-form-row"
          >
            <input value={action} onChange={event => setAction(event.target.value)} className="nexus-domain-input toolset-input" />
            <input value={domain} onChange={event => setDomain(event.target.value)} className="nexus-domain-input toolset-input" />
            <input value={executor} onChange={event => setExecutor(event.target.value)} className="nexus-domain-input toolset-input toolset-input-wide" />
            <button type="submit" className="nexus-domain-btn toolset-btn">
              Register
            </button>
          </form>
        </header>
        <LoadablePanel
          loading={actionsQuery.isLoading}
          error={actionsQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading toolset actions..."
        >
          <div className="nexus-domain-list toolset-list">
            {items.map(item => (
              <article key={String(item.action)} className="card nexus-domain-card toolset-item">
                <div className="toolset-item-main">
                  <strong>{String(item.action)}</strong>
                  <p className="toolset-item-meta">
                    {String(item.domain)} · {String(item.status)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => disableMutation.mutate(String(item.action))}
                  className="nexus-domain-btn toolset-btn"
                >
                  Disable
                </button>
              </article>
            ))}
          </div>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
