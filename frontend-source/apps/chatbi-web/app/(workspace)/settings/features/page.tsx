'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listFeatureToggles, updateFeatureToggle, type FeatureToggleRecord } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

function featureLabel(item: FeatureToggleRecord) {
  return item.feature?.code || item.feature?.name || item.featureId || item.id
}

export default function SettingsFeaturesPage() {
  const [status, setStatus] = useState<string | null>(null)
  const featuresQuery = useQuery({
    queryKey: ['settings-features'],
    queryFn: () => listFeatureToggles()
  })
  const toggleMutation = useMutation({
    mutationFn: (item: FeatureToggleRecord) =>
      updateFeatureToggle({
        ...item,
        isEnabled: !(item.isEnabled ?? false)
      }),
    onSuccess: () => {
      setStatus('updated')
      void featuresQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const items = featuresQuery.data?.items ?? []

  return (
    <SettingsPanel
      testId="settings-page-features"
      title="Features"
      description="Toggle product capabilities and rollout guards."
    >
      <LoadablePanel
        loading={featuresQuery.isLoading}
        error={featuresQuery.error}
        empty={items.length === 0}
        loadingLabel="Loading feature toggles..."
        emptyLabel="No feature toggles found"
        retry={() => {
          void featuresQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Feature Flags</strong>
            <span>{items.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">release controls</NexusBadge>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => {
                const canWrite = permission.state === 'enabled'
                return !canWrite ? (
                  <NexusBadge data-testid="settings-features-write-warning" tone="neutral">
                    Read-only mode: write actions are disabled
                  </NexusBadge>
                ) : null
              }}
            </ActionGuard>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-features-list">
          {items.map(item => (
            <article key={item.id} data-testid={`settings-features-row-${item.id}`} className="settings-users-row">
              <div>
                <strong>{featureLabel(item)}</strong>
                <div className="settings-users-row-meta">{item.id}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <div className="settings-inline-actions">
                      <NexusBadge tone={item.isEnabled ? 'ok' : 'warn'}>{item.isEnabled ? 'enabled' : 'disabled'}</NexusBadge>
                      <NexusButton
                        data-testid={`settings-features-toggle-${item.id}`}
                        type="button"
                        variant="secondary"
                        disabled={!canWrite || toggleMutation.isPending}
                        title={permission.reason}
                        onClick={() => {
                          setStatus(null)
                          toggleMutation.mutate(item)
                        }}
                      >
                        Flip
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
        <NexusBadge data-testid="settings-features-status" tone={status === 'updated' ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
