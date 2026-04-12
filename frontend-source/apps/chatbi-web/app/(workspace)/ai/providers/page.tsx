'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createAiProvider, listAiProviderCredentials, listAiProviders, rotateAiProviderCredential } from '@/modules/governance/ai/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function AiProvidersPage() {
  const [code, setCode] = useState('provider-http')
  const [name, setName] = useState('HTTP Provider')
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>()
  const [secret, setSecret] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const providersQuery = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => listAiProviders({ view: 'operational' })
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      createAiProvider({
        code,
        name,
        category: 'llm',
        protocol: 'http',
        endpoint: 'https://example.com/openai/v1',
        status: 'active'
      }),
    onSuccess: async () => {
      setStatusMessage('Provider created')
      await providersQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Provider creation failed')
    }
  })

  const rotateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProviderId) throw new Error('Select provider first')
      return rotateAiProviderCredential(selectedProviderId, {
        secret,
        mode: 'manual',
        cryptoProvider: 'local-aes'
      })
    },
    onSuccess: () => {
      setStatusMessage('Credential rotated')
    },
    onError: error => {
      const message = error instanceof Error ? error.message : 'Credential rotation failed'
      setStatusMessage(`Credential rotation failed: ${message}`)
    }
  })

  const credentialsQuery = useQuery({
    queryKey: ['ai-provider-credentials', selectedProviderId],
    queryFn: () => listAiProviderCredentials(selectedProviderId as string),
    enabled: Boolean(selectedProviderId)
  })

  const items = (providersQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const credentialsPayload = credentialsQuery.data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined
  const credentialRows = Array.isArray(credentialsPayload) ? credentialsPayload : credentialsPayload?.items ?? []

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>AI Providers</strong>
            <Link href="/ai/models" className="badge badge-warn">
              Models
            </Link>
            <Link href="/ai/bindings" className="badge badge-warn">
              Bindings
            </Link>
            <Link href="/ai/governance" className="badge badge-warn">
              Governance
            </Link>
          </div>
          <form
            data-testid="ai-provider-create-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input data-testid="ai-provider-code" value={code} onChange={event => setCode(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <input data-testid="ai-provider-name" value={name} onChange={event => setName(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <button data-testid="ai-provider-create-submit" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
              Create
            </button>
          </form>
          {statusMessage ? (
            <span data-testid="ai-provider-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={providersQuery.isLoading}
          error={providersQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading AI providers..."
          emptyLabel="No AI providers configured."
          retry={() => {
            void providersQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Provider inventory</strong>
            <MetricStrip
              testId="ai-provider-summary-strip"
              items={[
                { label: 'total', value: items.length, tone: 'ok' },
                {
                  label: 'active',
                  value: items.filter(item => String(item.status ?? '').toLowerCase() === 'active').length,
                  tone: 'ok'
                },
                {
                  label: 'disabled',
                  value: items.filter(item => String(item.status ?? '').toLowerCase() === 'disabled').length,
                  tone: 'warn'
                }
              ]}
            />
            <label style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Manage provider</span>
              <select
                data-testid="ai-provider-select"
                value={selectedProviderId ?? ''}
                onChange={event => setSelectedProviderId(event.target.value || undefined)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
              >
                <option value="">Select provider</option>
                {items.map(item => (
                  <option key={`provider-option-${item.id}`} value={String(item.id)}>
                    {String(item.name ?? item.code ?? item.id)} ({String(item.id)})
                  </option>
                ))}
              </select>
            </label>
            <OperationalTable
              testId="ai-provider-table"
              columns={[
                { key: 'name', label: 'Name', render: row => String(row.name ?? row.code ?? row.id ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                { key: 'protocol', label: 'Protocol', render: row => String(row.protocol ?? '-') },
                { key: 'category', label: 'Category', render: row => String(row.category ?? '-') },
                {
                  key: 'manage',
                  label: 'Manage',
                  render: row => (
                    <button
                      data-testid={`ai-provider-manage-${row.id}`}
                      type="button"
                      className="badge badge-warn"
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={event => {
                        event.stopPropagation()
                        setSelectedProviderId(String(row.id ?? ''))
                      }}
                    >
                      Manage Credentials
                    </button>
                  )
                }
              ]}
              rows={items}
              rowKey={(row, index) => `${String(row.id ?? 'provider')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No providers"
            />
            <AdvancedJsonPanel testId="ai-provider-json" value={providersQuery.data} />
          </article>
        </LoadablePanel>

        {selectedProviderId ? (
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Credential Rotation ({selectedProviderId})</strong>
            <form
              data-testid="ai-provider-rotate-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await rotateMutation.mutateAsync()
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                data-testid="ai-provider-secret"
                value={secret}
                onChange={event => setSecret(event.target.value)}
                placeholder="secret token"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 260 }}
              />
              <button data-testid="ai-provider-rotate-submit" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
                Rotate
              </button>
            </form>

            <LoadablePanel
              loading={credentialsQuery.isLoading}
              error={credentialsQuery.error}
              empty={credentialRows.length === 0}
              emptyLabel="No credentials"
            >
              <OperationalTable
                testId="ai-provider-credentials-table"
                columns={[
                  { key: 'id', label: 'Credential', render: row => String(row.id ?? '-') },
                  { key: 'version', label: 'Version', render: row => String(row.version ?? '-') },
                  { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                  { key: 'createdAt', label: 'Created', render: row => String(row.createdAt ?? '-') }
                ]}
                rows={credentialRows}
                rowKey={(row, index) => `${String(row.id ?? 'credential')}-${index}`}
                onRowClick={row => setSelectedRow(row)}
                emptyLabel="No credentials"
              />
              <AdvancedJsonPanel testId="ai-provider-credentials-json" value={credentialsQuery.data} />
            </LoadablePanel>
          </section>
        ) : null}

        <DetailDrawer
          testId="ai-provider-detail-drawer"
          title="Provider detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="ai-provider-detail"
            overview={[
              { label: 'id', value: String(selectedRow?.id ?? '-') },
              { label: 'name', value: String(selectedRow?.name ?? selectedRow?.code ?? '-') },
              {
                label: 'status',
                value: <StatusChip value={String(selectedRow?.status ?? '-')} />
              }
            ]}
            operationalFields={[
              { label: 'category', value: String(selectedRow?.category ?? '-') },
              { label: 'protocol', value: String(selectedRow?.protocol ?? '-') },
              { label: 'endpoint', value: String(selectedRow?.endpoint ?? '-') },
              {
                label: 'credential health',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.credentialHealth ?? '-')} />
              },
              {
                label: 'validation',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.validationStatus ?? '-')} />
              },
              {
                label: 'active credential',
                value: String((selectedRow?.presentation as any)?.activeCredentialVersion ?? '-')
              },
              {
                label: 'last rotated',
                value: String((selectedRow?.presentation as any)?.lastRotatedAt ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'tenant', value: String(selectedRow?.tenant ?? '-') },
              { label: 'created', value: String(selectedRow?.createdAt ?? '-') },
              { label: 'updated', value: String(selectedRow?.updatedAt ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="ai-provider-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
