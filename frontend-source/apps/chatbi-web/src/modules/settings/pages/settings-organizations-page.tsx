'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { generateOrganizationDemo, listOrganizations } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsOrganizationsPage() {
  const [status, setStatus] = useState<string | null>(null)
  const organizationsQuery = useQuery({
    queryKey: ['settings-organizations'],
    queryFn: () => listOrganizations()
  })
  const demoMutation = useMutation({
    mutationFn: (id: string) => generateOrganizationDemo(id),
    onSuccess: (_, orgId) => {
      setStatus(`demo generated: ${orgId}`)
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const organizations = organizationsQuery.data?.items ?? []

  return (
    <SettingsPanel
      testId="settings-page-organizations"
      title="Organizations"
      description="Organization topology and ownership controls."
    >
      <LoadablePanel
        loading={organizationsQuery.isLoading}
        error={organizationsQuery.error}
        empty={organizations.length === 0}
        emptyLabel="No organizations found"
        retry={() => {
          void organizationsQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Organization Units</strong>
            <span>{organizations.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">multi-org</NexusBadge>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-organizations-list">
          {organizations.map(org => (
            <article key={org.id} data-testid={`settings-organizations-row-${org.id}`} className="settings-users-row">
              <div>
                <strong>{org.name || org.id}</strong>
                <div className="settings-users-row-meta">{org.id}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <div className="settings-inline-actions">
                      <NexusButton
                        data-testid={`settings-organizations-demo-${org.id}`}
                        type="button"
                        variant="secondary"
                        disabled={!canWrite || demoMutation.isPending}
                        title={permission.reason}
                        onClick={() => {
                          setStatus(null)
                          demoMutation.mutate(org.id)
                        }}
                      >
                        Generate demo
                      </NexusButton>
                    </div>
                  )
                }}
              </ActionGuard>
            </article>
          ))}
        </section>
      </LoadablePanel>
      {status ? (
        <NexusBadge data-testid="settings-organizations-status" tone={status.includes('demo') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
