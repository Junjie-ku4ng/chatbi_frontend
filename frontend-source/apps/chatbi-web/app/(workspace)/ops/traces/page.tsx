'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import { listTraces } from '@/modules/trace/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const pageSize = 50

export default function OpsTracesPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [status, setStatus] = useState<'all' | 'open' | 'completed' | 'failed'>('all')
  const [rootType, setRootType] = useState<'all' | 'query' | 'alert' | 'manual' | 'worker'>('all')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  const tracesQuery = useQuery({
    queryKey: ['trace-runs', activeModelId, status, rootType, q, offset],
    enabled: Boolean(activeModelId),
    queryFn: () =>
      listTraces({
        modelId: activeModelId as string,
        status: status === 'all' ? undefined : status,
        rootType: rootType === 'all' ? undefined : rootType,
        q: q.trim() === '' ? undefined : q.trim(),
        limit: pageSize,
        offset
      })
  })

  const traces = tracesQuery.data?.items ?? []
  const total = tracesQuery.data?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + pageSize < total

  const paginationLabel = useMemo(() => {
    if (total === 0) {
      return '0 / 0'
    }
    const start = offset + 1
    const end = Math.min(offset + traces.length, total)
    return `${start}-${end} / ${total}`
  }, [offset, traces.length, total])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Trace Console</strong>
          <form
            data-testid="ops-trace-filter-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              setOffset(0)
              void tracesQuery.refetch()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <select
              data-testid="ops-trace-model"
              value={activeModelId ?? ''}
              onChange={event => {
                setModelId(event.target.value)
                setOffset(0)
              }}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 240 }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <select
              data-testid="ops-trace-status"
              value={status}
              onChange={event => {
                setStatus(event.target.value as typeof status)
                setOffset(0)
              }}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            >
              <option value="all">all status</option>
              <option value="open">open</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
            <select
              data-testid="ops-trace-root-type"
              value={rootType}
              onChange={event => {
                setRootType(event.target.value as typeof rootType)
                setOffset(0)
              }}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            >
              <option value="all">all roots</option>
              <option value="query">query</option>
              <option value="alert">alert</option>
              <option value="manual">manual</option>
              <option value="worker">worker</option>
            </select>
            <input
              data-testid="ops-trace-search"
              value={q}
              onChange={event => setQ(event.target.value)}
              placeholder="trace key / root ref"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 220 }}
            />
            <button
              data-testid="ops-trace-refresh"
              type="submit"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
            >
              Refresh
            </button>
          </form>
          <span data-testid="ops-trace-page-label" className="badge badge-warn" style={{ width: 'fit-content' }}>
            {paginationLabel}
          </span>
        </header>

        <LoadablePanel
          loading={tracesQuery.isLoading}
          error={tracesQuery.error}
          empty={traces.length === 0}
          loadingLabel="Loading traces..."
          emptyLabel={activeModelId ? 'No traces found for the selected filters.' : 'Select a semantic model to load traces.'}
          retry={() => {
            if (activeModelId) {
              void tracesQuery.refetch()
            }
          }}
        >
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            {traces.map(trace => (
              <article
                key={trace.id}
                data-testid={`ops-trace-row-${trace.traceKey}`}
                className="card"
                style={{ padding: 10, borderRadius: 10, display: 'grid', gap: 6 }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{trace.traceKey}</strong>
                  <span className="badge badge-warn">{trace.rootType}</span>
                  <span className={trace.status === 'failed' ? 'badge badge-danger' : 'badge badge-ok'}>
                    {trace.status}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  model: {trace.modelId ?? '-'} · queryLog: {trace.queryLogId ?? '-'} · conversation: {trace.conversationId ?? '-'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="badge badge-ok" href={`/ops/traces/${trace.traceKey}`}>
                    Open
                  </Link>
                </div>
              </article>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                data-testid="ops-trace-prev"
                type="button"
                disabled={!canPrev}
                onClick={() => setOffset(current => Math.max(0, current - pageSize))}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
              >
                Prev
              </button>
              <button
                data-testid="ops-trace-next"
                type="button"
                disabled={!canNext}
                onClick={() => setOffset(current => current + pageSize)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
              >
                Next
              </button>
            </div>
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
