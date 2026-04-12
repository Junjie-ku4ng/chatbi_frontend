'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createAiModel, listAiModels } from '@/modules/governance/ai/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function AiModelsPage() {
  const [providerId, setProviderId] = useState('')
  const [code, setCode] = useState('llm-main')
  const [name, setName] = useState('LLM Main')
  const [capability, setCapability] = useState<'llm' | 'embedding'>('llm')
  const [remoteModel, setRemoteModel] = useState('gpt-5.1')
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => listAiModels({ view: 'operational' })
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      createAiModel({
        providerId,
        code,
        name,
        capability,
        remoteModel,
        status: 'active'
      }),
    onSuccess: async () => {
      await modelsQuery.refetch()
    }
  })

  const items = (modelsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>AI Models</strong>
            <Link href="/ai/providers" className="badge badge-warn">
              Providers
            </Link>
            <Link href="/ai/bindings" className="badge badge-warn">
              Bindings
            </Link>
          </div>
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input value={providerId} onChange={event => setProviderId(event.target.value)} placeholder="providerId" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <input value={code} onChange={event => setCode(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <input value={name} onChange={event => setName(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <select value={capability} onChange={event => setCapability(event.target.value as 'llm' | 'embedding')} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}>
              <option value="llm">llm</option>
              <option value="embedding">embedding</option>
            </select>
            <input value={remoteModel} onChange={event => setRemoteModel(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <button type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
              Create
            </button>
          </form>
        </header>

        <LoadablePanel
          loading={modelsQuery.isLoading}
          error={modelsQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading AI models..."
          emptyLabel="No AI models configured."
          retry={() => {
            void modelsQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Model inventory</strong>
            <MetricStrip
              testId="ai-models-summary-strip"
              items={[
                { label: 'total', value: items.length, tone: 'ok' },
                {
                  label: 'llm',
                  value: items.filter(item => String(item.capability ?? '') === 'llm').length,
                  tone: 'ok'
                },
                {
                  label: 'embedding',
                  value: items.filter(item => String(item.capability ?? '') === 'embedding').length,
                  tone: 'warn'
                }
              ]}
            />
            <OperationalTable
              testId="ai-models-table"
              columns={[
                { key: 'code', label: 'Code', render: row => String(row.code ?? '-') },
                { key: 'name', label: 'Name', render: row => String(row.name ?? '-') },
                { key: 'capability', label: 'Capability', render: row => String(row.capability ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                { key: 'remoteModel', label: 'Remote model', render: row => String(row.remoteModel ?? '-') }
              ]}
              rows={items}
              rowKey={(row, index) => `${String(row.id ?? row.code ?? 'model')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No models"
            />
            <AdvancedJsonPanel testId="ai-models-json" value={modelsQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="ai-models-detail-drawer"
          title="AI model detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="ai-model-detail"
            overview={[
              { label: 'id', value: String(selectedRow?.id ?? '-') },
              { label: 'code', value: String(selectedRow?.code ?? '-') },
              {
                label: 'status',
                value: <StatusChip value={String(selectedRow?.status ?? '-')} />
              }
            ]}
            operationalFields={[
              { label: 'name', value: String(selectedRow?.name ?? '-') },
              { label: 'capability', value: String(selectedRow?.capability ?? '-') },
              { label: 'remote model', value: String(selectedRow?.remoteModel ?? '-') },
              {
                label: 'binding status',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.bindingStatus ?? '-')} />
              },
              {
                label: 'capability hint',
                value: String((selectedRow?.presentation as any)?.capabilityHint ?? '-')
              },
              {
                label: 'last resolved',
                value: String((selectedRow?.presentation as any)?.lastResolvedAt ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'providerId', value: String(selectedRow?.providerId ?? '-') },
              { label: 'updated', value: String(selectedRow?.updatedAt ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="ai-model-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
