'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import { createConsumerRegistration, listConsumerRegistrations } from '@/modules/governance/indicator/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function IndicatorConsumersPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [consumerSystem, setConsumerSystem] = useState('finance-app')
  const [contractVersion, setContractVersion] = useState('v1')
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id
  const modelOptions = modelsQuery.data ?? []

  const registrationsQuery = useQuery({
    queryKey: ['indicator-registrations', activeModelId],
    queryFn: () => listConsumerRegistrations(activeModelId as string, { view: 'operational' }),
    enabled: Boolean(activeModelId)
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId) throw new Error('Select a model first')
      return createConsumerRegistration({
        modelId: activeModelId,
        consumerSystem,
        contractVersion
      })
    },
    onSuccess: async () => {
      await registrationsQuery.refetch()
    }
  })

  const items = (registrationsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const modelsLoading = modelsQuery.isLoading
  const registrationsLoading = Boolean(activeModelId) && registrationsQuery.isLoading
  const modelSelectPlaceholder = modelsLoading ? 'Loading semantic models...' : 'No semantic models available'
  const registrationsEmptyLabel = activeModelId
    ? 'No consumer registrations found for the selected model.'
    : 'Select a semantic model to load consumer registrations.'

  return (
    <AccessGuard scopes={['allow:indicator:*']}>
      <section data-testid="indicator-consumers-page-root" style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Indicator Consumers</strong>
          <label style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Model</span>
            <select
              value={activeModelId ?? ''}
              aria-label="Indicator consumers model"
              onChange={event => setModelId(event.target.value)}
              disabled={modelsLoading || modelOptions.length === 0}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', maxWidth: 360 }}
            >
              {modelOptions.length === 0 ? (
                <option value="">{modelSelectPlaceholder}</option>
              ) : (
                modelOptions.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input
              aria-label="Consumer system"
              value={consumerSystem}
              onChange={event => setConsumerSystem(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              aria-label="Contract version"
              value={contractVersion}
              onChange={event => setContractVersion(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <button type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}>
              Register
            </button>
          </form>
        </header>

        <LoadablePanel
          loading={modelsLoading || registrationsLoading}
          error={modelsQuery.error ?? registrationsQuery.error}
          empty={!modelsLoading && !registrationsLoading && !modelsQuery.error && !registrationsQuery.error && (!activeModelId || items.length === 0)}
          loadingLabel={modelsLoading ? 'Loading indicator consumer models...' : 'Loading consumer registrations...'}
          emptyLabel={registrationsEmptyLabel}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void registrationsQuery.refetch()
            }
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Registrations</strong>
            <MetricStrip
              testId="indicator-consumers-summary-strip"
              items={[
                { label: 'total', value: items.length, tone: 'ok' },
                {
                  label: 'contract v1',
                  value: items.filter(item => String(item.contractVersion ?? '') === 'v1').length,
                  tone: 'ok'
                },
                {
                  label: 'contract v2',
                  value: items.filter(item => String(item.contractVersion ?? '') === 'v2').length,
                  tone: 'warn'
                }
              ]}
            />
            <OperationalTable
              testId="indicator-consumers-table"
              columns={[
                { key: 'consumerSystem', label: 'Consumer', render: row => String(row.consumerSystem ?? '-') },
                { key: 'contractVersion', label: 'Contract', render: row => String(row.contractVersion ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                { key: 'updatedAt', label: 'Updated', render: row => String(row.updatedAt ?? row.createdAt ?? '-') }
              ]}
              rows={items}
              rowKey={(row, index) => `${String(row.id ?? row.consumerSystem ?? 'registration')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No consumer registrations"
            />
            <AdvancedJsonPanel testId="indicator-consumers-json" value={registrationsQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="indicator-consumers-detail-drawer"
          title="Consumer registration detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="indicator-consumer-detail"
            overview={[
              { label: 'id', value: String(selectedRow?.id ?? '-') },
              { label: 'consumer', value: String(selectedRow?.consumerName ?? '-') },
              { label: 'status', value: <StatusChip value={String(selectedRow?.status ?? '-')} /> }
            ]}
            operationalFields={[
              { label: 'owner', value: String(selectedRow?.owner ?? '-') },
              { label: 'version min', value: String(selectedRow?.contractVersionMin ?? '-') },
              { label: 'version max', value: String(selectedRow?.contractVersionMax ?? '-') },
              {
                label: 'compatibility risk',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.compatibilityRisk ?? '-')} />
              },
              {
                label: 'contract drift',
                value: String((selectedRow?.presentation as any)?.contractDrift ?? '-')
              },
              {
                label: 'owner hint',
                value: String((selectedRow?.presentation as any)?.ownerHint ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'created', value: String(selectedRow?.createdAt ?? '-') },
              { label: 'updated', value: String(selectedRow?.updatedAt ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="indicator-consumer-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
