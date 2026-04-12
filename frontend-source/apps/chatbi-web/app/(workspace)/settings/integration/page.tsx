'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteIntegration, listIntegrations } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsIntegrationPage() {
  const [status, setStatus] = useState<string | null>(null)
  const integrationQuery = useQuery({
    queryKey: ['settings-integration'],
    queryFn: () => listIntegrations()
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: (_, integrationId) => {
      setStatus(`deleted: ${integrationId}`)
      void integrationQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const items = integrationQuery.data?.items ?? []

  return (
    <SettingsPanel
      testId="settings-page-integration"
      title="Integration"
      description="Configure callback endpoints and integration credentials."
    >
      <LoadablePanel
        loading={integrationQuery.isLoading}
        error={integrationQuery.error}
        empty={items.length === 0}
        emptyLabel="No integration found"
        retry={() => {
          void integrationQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Integration Endpoints</strong>
            <span>{items.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">external connectors</NexusBadge>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-integration-list">
          {items.map(item => (
            <article key={item.id} data-testid={`settings-integration-row-${item.id}`} className="settings-users-row">
              <div>
                <strong>{item.name || item.id}</strong>
                <div className="settings-users-row-meta">{item.provider || '-'}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <NexusButton
                      data-testid={`settings-integration-delete-${item.id}`}
                      type="button"
                      variant="secondary"
                      disabled={!canWrite || deleteMutation.isPending}
                      title={permission.reason}
                      onClick={() => {
                        setStatus(null)
                        deleteMutation.mutate(item.id)
                      }}
                    >
                      Delete
                    </NexusButton>
                  )
                }}
              </ActionGuard>
            </article>
          ))}
        </section>
      </LoadablePanel>
      {status ? (
        <NexusBadge data-testid="settings-integration-status" tone={status.includes('deleted') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
