'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listPlugins, uninstallPlugin } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsPluginsPage() {
  const [status, setStatus] = useState<string | null>(null)
  const pluginsQuery = useQuery({
    queryKey: ['settings-plugins'],
    queryFn: () => listPlugins()
  })
  const uninstallMutation = useMutation({
    mutationFn: (name: string) => uninstallPlugin(name),
    onSuccess: (_, name) => {
      setStatus(`uninstalled: ${name}`)
      void pluginsQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const items = pluginsQuery.data?.items ?? []

  return (
    <SettingsPanel testId="settings-page-plugins" title="Plugins" description="Enable plugin catalog entries for xpert workspaces.">
      <LoadablePanel
        loading={pluginsQuery.isLoading}
        error={pluginsQuery.error}
        empty={items.length === 0}
        loadingLabel="Loading plugins..."
        emptyLabel="No plugins found"
        retry={() => {
          void pluginsQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Plugin Catalog</strong>
            <span>{items.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">runtime extensions</NexusBadge>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => {
                const canWrite = permission.state === 'enabled'
                return !canWrite ? (
                  <NexusBadge data-testid="settings-plugins-write-warning" tone="neutral">
                    Read-only mode: write actions are disabled
                  </NexusBadge>
                ) : null
              }}
            </ActionGuard>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-plugins-list">
          {items.map(item => (
            <article key={item.name} data-testid={`settings-plugins-row-${item.name}`} className="settings-users-row">
              <div>
                <strong>{item.meta?.title || item.name}</strong>
                <div className="settings-users-row-meta">{item.name}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <div className="settings-inline-actions">
                      {item.isGlobal ? <NexusBadge tone="neutral">global</NexusBadge> : null}
                      <NexusButton
                        data-testid={`settings-plugins-uninstall-${item.name}`}
                        type="button"
                        variant="secondary"
                        disabled={!canWrite || uninstallMutation.isPending}
                        title={permission.reason}
                        onClick={() => {
                          setStatus(null)
                          uninstallMutation.mutate(item.name)
                        }}
                      >
                        Uninstall
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
        <NexusBadge data-testid="settings-plugins-status" tone={status.includes('uninstalled') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
