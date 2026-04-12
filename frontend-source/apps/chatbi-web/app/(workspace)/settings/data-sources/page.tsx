'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createDataSource,
  deleteDataSource,
  getDataSource,
  listDataSources,
  pingDataSource,
  pingDataSourceById,
  updateDataSource
} from '@/modules/settings/api'
import { DataSourceFormDialog, type DataSourceFormValues } from '@/modules/settings/data-source-form-dialog'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton } from '@/modules/shared/ui/primitives'

function defaultFormValues(): DataSourceFormValues {
  return {
    typeCode: 'pa-tm1',
    name: '',
    host: '',
    authType: 'basic',
    authRef: '',
    optionsText: '{}'
  }
}

function toFormValues(source: {
  typeCode?: string
  name?: string
  host?: string
  authType?: 'basic' | 'cam' | 'token'
  authRef?: string
  options?: Record<string, unknown>
}): DataSourceFormValues {
  return {
    typeCode: source.typeCode ?? 'pa-tm1',
    name: source.name ?? '',
    host: source.host ?? '',
    authType: source.authType ?? 'basic',
    authRef: source.authRef ?? '',
    optionsText: JSON.stringify(source.options ?? {}, null, 2)
  }
}

function parseOptionsText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return {}
  }
  return JSON.parse(trimmed) as Record<string, unknown>
}

export default function SettingsDataSourcesPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingDataSourceId, setEditingDataSourceId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<DataSourceFormValues>(defaultFormValues())
  const dataSourcesQuery = useQuery({
    queryKey: ['settings-data-sources'],
    queryFn: () => listDataSources()
  })
  const createMutation = useMutation({
    mutationFn: async (values: DataSourceFormValues) => {
      return createDataSource({
        typeCode: values.typeCode.trim(),
        name: values.name.trim(),
        host: values.host.trim(),
        authType: values.authType,
        authRef: values.authRef.trim(),
        options: parseOptionsText(values.optionsText)
      })
    },
    onSuccess: (_, values) => {
      setStatus(`created: ${values.name.trim() || values.typeCode.trim()}`)
      setFormOpen(false)
      void dataSourcesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; values: DataSourceFormValues }) => {
      const trimmedAuthRef = input.values.authRef.trim()
      return updateDataSource(input.id, {
        name: input.values.name.trim(),
        host: input.values.host.trim(),
        authType: input.values.authType,
        ...(trimmedAuthRef ? { authRef: trimmedAuthRef } : {}),
        options: parseOptionsText(input.values.optionsText)
      })
    },
    onSuccess: (_, input) => {
      setStatus(`updated: ${input.id}`)
      setFormOpen(false)
      setEditingDataSourceId(null)
      void dataSourcesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const loadDataSourceMutation = useMutation({
    mutationFn: (id: string) => getDataSource(id),
    onSuccess: data => {
      setFormMode('edit')
      setEditingDataSourceId(data.id)
      setFormValues(toFormValues(data))
      setFormOpen(true)
      setStatus(null)
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const pingExistingMutation = useMutation({
    mutationFn: (input: { id: string; payload?: { host?: string; authType?: 'basic' | 'cam' | 'token'; authRef?: string } }) =>
      pingDataSourceById(input.id, input.payload ?? {}),
    onSuccess: (_, input) => {
      setStatus(`connection ok: ${input.id}`)
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const pingDraftMutation = useMutation({
    mutationFn: async (values: DataSourceFormValues) => {
      return pingDataSource({
        host: values.host.trim(),
        authType: values.authType,
        authRef: values.authRef.trim()
      })
    },
    onSuccess: () => {
      setStatus('connection ok')
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDataSource(id),
    onSuccess: (_, id) => {
      setStatus(`deleted: ${id}`)
      void dataSourcesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const items = dataSourcesQuery.data?.items ?? []

  return (
    <SettingsPanel
      testId="settings-page-data-sources"
      title="Data Sources"
      description="Register databases and semantic source endpoints."
    >
      <div className="settings-list-toolbar">
        <div className="settings-list-toolbar-title">
          <strong>Data Source Registry</strong>
          <span>{items.length} records</span>
        </div>
        <div className="settings-list-toolbar-actions">
          <NexusBadge tone="brand">model runtime</NexusBadge>
          <ActionGuard scopes={['allow:write:model:*']}>
            {permission => {
              const canWrite = permission.state === 'enabled'
              return (
                <>
                  {!canWrite ? (
                    <NexusBadge data-testid="settings-data-sources-write-warning" tone="neutral">
                      Read-only mode: write actions are disabled
                    </NexusBadge>
                  ) : null}
                  <NexusButton
                    data-testid="settings-data-sources-add"
                    type="button"
                    variant="primary"
                    disabled={!canWrite}
                    title={permission.reason}
                    onClick={() => {
                      setStatus(null)
                      setFormMode('create')
                      setEditingDataSourceId(null)
                      setFormValues(defaultFormValues())
                      setFormOpen(true)
                    }}
                  >
                    Add data source
                  </NexusButton>
                </>
              )
            }}
          </ActionGuard>
        </div>
      </div>

      <LoadablePanel
        loading={dataSourcesQuery.isLoading}
        error={dataSourcesQuery.error}
        empty={items.length === 0}
        emptyLabel="No data source found"
        retry={() => {
          void dataSourcesQuery.refetch()
        }}
      >
        <section className="settings-users-list" data-testid="settings-data-sources-list">
          {items.map(item => (
            <article key={item.id} data-testid={`settings-data-sources-row-${item.id}`} className="settings-users-row">
              <div>
                <strong>{item.name || item.id}</strong>
                <div className="settings-users-row-meta">{item.typeCode || item.type || '-'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
                <ActionGuard scopes={['allow:write:model:*']}>
                  {permission => {
                    const canWrite = permission.state === 'enabled'
                    return (
                      <>
                        <NexusButton
                          data-testid={`settings-data-sources-edit-${item.id}`}
                          type="button"
                          variant="secondary"
                          disabled={!canWrite || loadDataSourceMutation.isPending}
                          title={permission.reason}
                          onClick={() => {
                            setStatus(null)
                            loadDataSourceMutation.mutate(item.id)
                          }}
                        >
                          Edit
                        </NexusButton>
                        <NexusButton
                          data-testid={`settings-data-sources-test-connection-${item.id}`}
                          type="button"
                          variant="secondary"
                          disabled={!canWrite || pingExistingMutation.isPending}
                          title={permission.reason}
                          onClick={() => {
                            setStatus(null)
                            pingExistingMutation.mutate({ id: item.id })
                          }}
                        >
                          {pingExistingMutation.isPending ? 'Testing...' : 'Test connection'}
                        </NexusButton>
                        {canWrite ? (
                          <Link
                            data-testid={`settings-data-sources-start-modeling-${item.id}`}
                            href={`/data-model-release?dataSourceId=${encodeURIComponent(item.id)}`}
                            className="badge badge-ok"
                            title={permission.reason}
                          >
                            Start modeling
                          </Link>
                        ) : (
                          <span className="badge badge-warn" title={permission.reason}>
                            Start modeling
                          </span>
                        )}
                        <NexusButton
                          data-testid={`settings-data-sources-delete-${item.id}`}
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
                      </>
                    )
                  }}
                </ActionGuard>
              </div>
            </article>
          ))}
        </section>
      </LoadablePanel>

      {status ? (
        <NexusBadge data-testid="settings-data-sources-status" tone={status.includes('deleted') ? 'ok' : 'warn'} style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}

      <DataSourceFormDialog
        open={formOpen}
        mode={formMode}
        values={formValues}
        busy={createMutation.isPending || updateMutation.isPending}
        pingBusy={pingDraftMutation.isPending || pingExistingMutation.isPending}
        status={status}
        onClose={() => {
          setFormOpen(false)
          setEditingDataSourceId(null)
        }}
        onChange={patch => {
          setFormValues(current => ({
            ...current,
            ...patch
          }))
        }}
        onSubmit={() => {
          setStatus(null)
          try {
            if (formMode === 'create') {
              createMutation.mutate(formValues)
              return
            }
            if (!editingDataSourceId) {
              throw new Error('Missing data source id')
            }
            updateMutation.mutate({ id: editingDataSourceId, values: formValues })
          } catch (error) {
            setStatus(normalizeUiError(error).message)
          }
        }}
        onTestConnection={() => {
          setStatus(null)
          try {
            if (formMode === 'create') {
              pingDraftMutation.mutate(formValues)
              return
            }
            if (!editingDataSourceId) {
              throw new Error('Missing data source id')
            }
            pingExistingMutation.mutate({
              id: editingDataSourceId,
              payload: {
                host: formValues.host.trim() || undefined,
                authType: formValues.authType,
                authRef: formValues.authRef.trim() || undefined
              }
            })
          } catch (error) {
            setStatus(normalizeUiError(error).message)
          }
        }}
      />
    </SettingsPanel>
  )
}
