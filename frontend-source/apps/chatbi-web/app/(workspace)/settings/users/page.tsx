'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { deactivateUserOrganization, listUserOrganizations } from '@/modules/settings/api'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { SettingsPanel } from '@/modules/settings/shell'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsUsersPage() {
  const [status, setStatus] = useState<string | null>(null)
  const usersQuery = useQuery({
    queryKey: ['settings-users-directory'],
    queryFn: () => listUserOrganizations()
  })
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUserOrganization(id),
    onSuccess: result => {
      setStatus(`inactive: ${result.user?.name ?? result.id}`)
      void usersQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const users = usersQuery.data?.items ?? []

  return (
    <SettingsPanel testId="settings-page-users" title="Users" description="Workspace member directory and invitation controls.">
      <ActionGuard scopes={['allow:write:model:*']}>
        {permission => {
          const canWrite = permission.state === 'enabled'
          return (
            <div className="settings-users-panel">
              {!canWrite ? (
                <NexusBadge data-testid="settings-users-write-warning" tone="neutral" style={{ width: 'fit-content' }}>
                  Read-only mode: write actions are disabled
                </NexusBadge>
              ) : null}
              <NexusButton
                data-testid="settings-users-invite"
                type="button"
                disabled={!canWrite}
                title={permission.reason}
                style={{ width: 'fit-content' }}
              >
                Invite user
              </NexusButton>
              <div className="settings-list-toolbar">
                <div className="settings-list-toolbar-title">
                  <strong>User Directory</strong>
                  <span>{users.length} records</span>
                </div>
                <div className="settings-list-toolbar-actions">
                  <NexusBadge tone="brand">workspace scope</NexusBadge>
                </div>
              </div>

              <LoadablePanel
                loading={usersQuery.isLoading}
                error={usersQuery.error}
                empty={users.length === 0}
                emptyLabel="No users found"
                retry={() => {
                  void usersQuery.refetch()
                }}
              >
                <section className="settings-users-list" data-testid="settings-users-list">
                  {users.map(userOrg => {
                    const displayName = userOrg.user?.name || userOrg.user?.email || userOrg.id
                    return (
                      <article key={userOrg.id} data-testid={`settings-users-row-${userOrg.id}`} className="settings-users-row">
                        <div>
                          <strong>{displayName}</strong>
                          <div className="settings-users-row-meta">{userOrg.user?.email || '-'}</div>
                        </div>
                        <div className="settings-inline-actions">
                          <NexusBadge tone={userOrg.isActive === false ? 'warn' : 'ok'}>
                            {userOrg.isActive === false ? 'inactive' : 'active'}
                          </NexusBadge>
                          <NexusButton
                            data-testid={`settings-users-deactivate-${userOrg.id}`}
                            type="button"
                            variant="secondary"
                            disabled={!canWrite || deactivateMutation.isPending}
                            title={permission.reason}
                            onClick={() => {
                              setStatus(null)
                              deactivateMutation.mutate(userOrg.id)
                            }}
                          >
                            Set inactive
                          </NexusButton>
                        </div>
                      </article>
                    )
                  })}
                </section>
              </LoadablePanel>
              {status ? (
                <NexusBadge data-testid="settings-users-status" tone="ok" style={{ width: 'fit-content' }}>
                  {status}
                </NexusBadge>
              ) : null}
            </div>
          )
        }}
      </ActionGuard>
    </SettingsPanel>
  )
}
