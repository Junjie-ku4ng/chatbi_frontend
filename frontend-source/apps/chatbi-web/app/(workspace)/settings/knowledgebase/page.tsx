'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteKnowledgebase, listKnowledgebases } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

export default function SettingsKnowledgebasePage() {
  const [status, setStatus] = useState<string | null>(null)
  const knowledgebaseQuery = useQuery({
    queryKey: ['settings-knowledgebase'],
    queryFn: () => listKnowledgebases()
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKnowledgebase(id),
    onSuccess: (_, kbId) => {
      setStatus(`deleted: ${kbId}`)
      void knowledgebaseQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const items = knowledgebaseQuery.data?.items ?? []

  return (
    <SettingsPanel
      testId="settings-page-knowledgebase"
      title="Knowledgebase"
      description="Manage indexed corpora, chunking strategy, and freshness policy."
    >
      <LoadablePanel
        loading={knowledgebaseQuery.isLoading}
        error={knowledgebaseQuery.error}
        empty={items.length === 0}
        emptyLabel="No knowledgebase found"
        retry={() => {
          void knowledgebaseQuery.refetch()
        }}
      >
        <div className="settings-list-toolbar">
          <div className="settings-list-toolbar-title">
            <strong>Knowledge Assets</strong>
            <span>{items.length} records</span>
          </div>
          <div className="settings-list-toolbar-actions">
            <NexusBadge tone="brand">retrieval index</NexusBadge>
          </div>
        </div>
        <section className="settings-users-list" data-testid="settings-knowledgebase-list">
          {items.map(item => (
            <article key={item.id} data-testid={`settings-knowledgebase-row-${item.id}`} className="settings-users-row">
              <div>
                <strong>{item.name || item.id}</strong>
                <div className="settings-users-row-meta">{item.id}</div>
              </div>
              <ActionGuard scopes={['allow:write:model:*']}>
                {permission => {
                  const canWrite = permission.state === 'enabled'
                  return (
                    <NexusButton
                      data-testid={`settings-knowledgebase-delete-${item.id}`}
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
        <NexusBadge data-testid="settings-knowledgebase-status" tone={status.includes('deleted') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}
    </SettingsPanel>
  )
}
