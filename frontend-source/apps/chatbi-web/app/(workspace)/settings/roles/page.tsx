'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteRole, listRoles } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsRolesPage() {
  const [status, setStatus] = useState<string | null>(null)
  const rolesQuery = useQuery({
    queryKey: ['settings-roles'],
    queryFn: () => listRoles()
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_, roleId) => {
      setStatus(`deleted: ${roleId}`)
      void rolesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const roles = rolesQuery.data?.items ?? []

  return (
    <SettingsPanel testId="settings-page-roles" title="Roles" description="Define role bundles and scope templates.">
      <LoadablePanel
        loading={rolesQuery.isLoading}
        error={rolesQuery.error}
        empty={roles.length === 0}
        emptyLabel="No roles found"
        retry={() => {
          void rolesQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Role Templates</strong>
            <span>{roles.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">rbac</NexusBadge>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => {
                const canWrite = permission.state === 'enabled'
                return !canWrite ? (
                  <NexusBadge data-testid="settings-roles-write-warning" tone="neutral">
                    Read-only mode: write actions are disabled
                  </NexusBadge>
                ) : null
              }}
            </ActionGuard>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-roles-list">
          {roles.map(role => (
            <article key={role.id} data-testid={`settings-roles-row-${role.id}`} className="settings-users-row">
              <div>
                <strong>{role.name || role.id}</strong>
                <div className="settings-users-row-meta">{role.id}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <NexusButton
                      data-testid={`settings-roles-delete-${role.id}`}
                      type="button"
                      variant="secondary"
                      disabled={!canWrite || deleteMutation.isPending}
                      title={permission.reason}
                      onClick={() => {
                        setStatus(null)
                        deleteMutation.mutate(role.id)
                      }}
                    >
                      Delete role
                    </NexusButton>
                  )
                }}
              </ActionGuard>
            </article>
          ))}
        </section>
      </LoadablePanel>
      {status ? (
        <NexusBadge data-testid="settings-roles-status" tone={status.includes('deleted') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
