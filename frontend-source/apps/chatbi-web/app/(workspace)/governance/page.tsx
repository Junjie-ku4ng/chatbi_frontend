'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { mergePagingItems, toPagingWindowState } from '@/modules/shared/paging/paging-adapter'
import {
  getGovernanceOverview,
  listGovernanceRecentActivity,
  listGovernanceRiskHotspots,
  listGovernanceWorklist
} from '@/modules/governance/overview/api'
import { ackAlertEvent } from '@/modules/ops/api'
import { retryFailedIndicatorImportJob } from '@/modules/governance/indicator/api'

export default function GovernanceOverviewPage() {
  const [modelId, setModelId] = useState('')
  const [windowHours, setWindowHours] = useState(72)
  const [hubOverride, setHubOverride] = useState<string | null>(null)
  const [hubActionsOverride, setHubActionsOverride] = useState<string | null>(null)
  const [worklistDomain, setWorklistDomain] = useState<'semantic' | 'indicator' | 'ops' | ''>('')
  const [worklistSeverity, setWorklistSeverity] = useState<'ok' | 'warn' | 'critical' | ''>('')
  const [selectedWorklistIds, setSelectedWorklistIds] = useState<Record<string, boolean>>({})
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [worklistRows, setWorklistRows] = useState<any[]>([])
  const [worklistNextCursor, setWorklistNextCursor] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setHubOverride(params.get('hub'))
    setHubActionsOverride(params.get('hubActions'))
  }, [])

  const modelsQuery = useQuery({
    queryKey: ['governance-overview-models'],
    queryFn: listSemanticModels
  })

  const effectiveModelId = modelId || modelsQuery.data?.[0]?.id || ''
  const hubFlagRaw = String(process.env.NEXT_PUBLIC_GOVERNANCE_HUB || '').toLowerCase() === 'true'
  const hubEnabledFlag = hubOverride === '1' ? true : hubOverride === '0' ? false : hubFlagRaw
  const allowlist = String(process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ALLOWLIST || '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '')
  const hubEnabledForModel = Boolean(effectiveModelId) && hubEnabledFlag && (allowlist.length === 0 || allowlist.includes(effectiveModelId))
  const actionsFlagRaw = String(process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ACTIONS || '').toLowerCase() === 'true'
  const actionsEnabled = hubActionsOverride === '1' ? true : hubActionsOverride === '0' ? false : actionsFlagRaw
  const queryEnabled = Boolean(effectiveModelId)

  const overviewQuery = useQuery({
    queryKey: ['governance-overview', effectiveModelId, windowHours],
    queryFn: () =>
      getGovernanceOverview({
        modelId: effectiveModelId,
        windowHours
      }),
    enabled: queryEnabled
  })

  const hotspotsQuery = useQuery({
    queryKey: ['governance-hotspots', effectiveModelId, windowHours],
    queryFn: () =>
      listGovernanceRiskHotspots({
        modelId: effectiveModelId,
        windowHours
      }),
    enabled: queryEnabled
  })

  const recentActivityQuery = useQuery({
    queryKey: ['governance-activity', effectiveModelId, windowHours],
    queryFn: () =>
      listGovernanceRecentActivity({
        modelId: effectiveModelId,
        windowHours,
        limit: 20,
        offset: 0
      }),
    enabled: queryEnabled
  })

  const worklistQuery = useQuery({
    queryKey: ['governance-worklist', effectiveModelId, windowHours, worklistDomain, worklistSeverity],
    queryFn: () =>
      listGovernanceWorklist({
        modelId: effectiveModelId,
        windowHours,
        domain: worklistDomain || undefined,
        severity: worklistSeverity || undefined,
        limit: 50,
        cursor: '0'
      }),
    enabled: queryEnabled && hubEnabledForModel
  })

  useEffect(() => {
    const payload = worklistQuery.data
    if (!payload) return
    const windowed = toPagingWindowState(payload)
    setWorklistRows(windowed.items)
    setWorklistNextCursor(windowed.nextCursor)
  }, [worklistQuery.data])

  const loadMoreWorklistMutation = useMutation({
    mutationFn: async (cursor: string) =>
      listGovernanceWorklist({
        modelId: effectiveModelId,
        windowHours,
        domain: worklistDomain || undefined,
        severity: worklistSeverity || undefined,
        limit: 50,
        cursor
      }),
    onSuccess: payload => {
      const windowed = toPagingWindowState(payload)
      setWorklistRows(current => mergePagingItems(current, windowed.items, item => String((item as any).id)))
      setWorklistNextCursor(windowed.nextCursor)
    }
  })

  const actionMutation = useMutation({
    mutationFn: async (payload: { id: string; actionType: 'ack_alert' | 'retry_import_failed'; actionPayload: Record<string, unknown> }) => {
      if (payload.actionType === 'ack_alert') {
        const eventId = typeof payload.actionPayload.eventId === 'string' ? payload.actionPayload.eventId : String(payload.actionPayload.eventId || '')
        if (!eventId) {
          throw new Error('missing eventId in actionPayload')
        }
        return ackAlertEvent(eventId)
      }
      const jobId = typeof payload.actionPayload.jobId === 'string' ? payload.actionPayload.jobId : String(payload.actionPayload.jobId || '')
      if (!jobId) {
        throw new Error('missing jobId in actionPayload')
      }
      return retryFailedIndicatorImportJob(jobId, { actor: 'governance-hub' })
    },
    onSuccess: async () => {
      setActionStatus('Action executed successfully')
      setSelectedWorklistIds({})
      await Promise.all([overviewQuery.refetch(), worklistQuery.refetch()])
    },
    onError: error => {
      setActionStatus(error instanceof Error ? error.message : 'Failed to execute action')
    }
  })

  const loading =
    modelsQuery.isLoading ||
    overviewQuery.isLoading ||
    hotspotsQuery.isLoading ||
    recentActivityQuery.isLoading ||
    (hubEnabledForModel && worklistQuery.isLoading)

  const error = modelsQuery.error || overviewQuery.error || hotspotsQuery.error || recentActivityQuery.error || worklistQuery.error

  const semantic = overviewQuery.data?.domains.semantic
  const indicator = overviewQuery.data?.domains.indicator
  const ai = overviewQuery.data?.domains.ai
  const toolset = overviewQuery.data?.domains.toolset
  const ops = overviewQuery.data?.domains.ops
  const riskHotspots = useMemo(() => {
    const items = hotspotsQuery.data ?? []
    return items.map(item => ({ label: item.label, value: item.value, severity: item.severity }))
  }, [hotspotsQuery.data])
  const worklistItems = worklistRows
  const selectedActionItems = useMemo(
    () =>
      worklistItems.filter(
        item => selectedWorklistIds[item.id] && (item.actionType === 'ack_alert' || item.actionType === 'retry_import_failed')
      ),
    [worklistItems, selectedWorklistIds]
  )

  const worklistReady = hubEnabledForModel && !loading && !error

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack" style={{ display: 'grid', gap: 12 }}>
        <header className="card nexus-domain-hero" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Governance Overview</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              data-testid="governance-overview-model"
              aria-label="Governance model"
              value={effectiveModelId}
              onChange={event => setModelId(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 240, background: '#fff' }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.cube ?? 'n/a'})
                </option>
              ))}
            </select>
            <select
              data-testid="governance-overview-window"
              aria-label="Governance window hours"
              value={String(windowHours)}
              onChange={event => setWindowHours(Number(event.target.value))}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
            >
              <option value="24">24h</option>
              <option value="72">72h</option>
              <option value="168">168h</option>
            </select>
          </div>
          {!hubEnabledForModel ? (
            <span className="badge badge-warn">Governance Hub is disabled for this model (feature flag + allowlist).</span>
          ) : null}
          {overviewQuery.data?.worklistSummary ? (
            <div data-testid="governance-worklist-summary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-ok">open: {overviewQuery.data.worklistSummary.totalOpen}</span>
              <span className="badge badge-warn">critical: {overviewQuery.data.worklistSummary.criticalOpen}</span>
              <span className="badge badge-warn">actionable: {overviewQuery.data.worklistSummary.actionableCount}</span>
            </div>
          ) : null}
          {actionStatus ? (
            <span data-testid="governance-worklist-action-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {actionStatus}
            </span>
          ) : null}
          {worklistReady ? (
            <span data-testid="governance-worklist-ready" className="badge badge-ok" style={{ width: 'fit-content' }}>
              ready
            </span>
          ) : null}
        </header>

        <LoadablePanel loading={loading} error={error} empty={!effectiveModelId} emptyLabel="No model selected">
          <section className="nexus-domain-card-grid" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <article data-testid="governance-card-semantic" className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 6 }}>
              <strong>Semantic</strong>
              <span className="badge badge-ok">queue items: {semantic?.queueItems ?? 0}</span>
              <span className="badge badge-warn">blockers: {semantic?.blockers ?? 0}</span>
              <span className="badge badge-warn">role gaps: {semantic?.roleGaps ?? 0}</span>
              <Link href={`/models/${effectiveModelId}`} style={{ fontSize: 12, color: '#1e3a8a' }}>
                Open semantic governance
              </Link>
            </article>

            <article data-testid="governance-card-indicator" className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 6 }}>
              <strong>Indicator</strong>
              <span className="badge badge-ok">contracts: {indicator?.contracts ?? 0}</span>
              <span className="badge badge-warn">breaking: {indicator?.breakingIndicators ?? 0}</span>
              <span className="badge badge-warn">incompatible consumers: {indicator?.incompatibleConsumers ?? 0}</span>
              <Link href={`/indicator-app?modelId=${encodeURIComponent(effectiveModelId)}`} style={{ fontSize: 12, color: '#1e3a8a' }}>
                Open indicator app
              </Link>
            </article>

            <article data-testid="governance-card-ai" className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 6 }}>
              <strong>AI</strong>
              <span className="badge badge-ok">bindings: {ai?.bindings ?? 0}</span>
              <span className="badge badge-warn">unhealthy: {ai?.unhealthyBindings ?? 0}</span>
              <span className="badge badge-warn">rotation failure rate: {Math.round((ai?.rotationFailureRate ?? 0) * 1000) / 10}%</span>
              <Link href="/ai/governance" style={{ fontSize: 12, color: '#1e3a8a' }}>
                Open AI governance
              </Link>
            </article>

            <article data-testid="governance-card-toolset" className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 6 }}>
              <strong>Toolset/Ops</strong>
              <span className="badge badge-ok">outcomes: {toolset?.totalOutcomes ?? 0}</span>
              <span className="badge badge-warn">failed: {toolset?.failureCount ?? 0}</span>
              <span className="badge badge-warn">open alerts: {ops?.openAlerts ?? 0}</span>
              <Link href="/ops" style={{ fontSize: 12, color: '#1e3a8a' }}>
                Open ops center
              </Link>
            </article>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Risk hotspots</strong>
            <div style={{ display: 'grid', gap: 6 }}>
              {riskHotspots.map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{item.label}</span>
                  <span className={item.severity === 'ok' ? 'badge badge-ok' : 'badge badge-warn'}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section data-testid="governance-worklist-panel" className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>Action worklist</strong>
              <div className="nexus-domain-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  data-testid="governance-worklist-domain-filter"
                  aria-label="Worklist domain filter"
                  value={worklistDomain}
                  onChange={event => setWorklistDomain(event.target.value as 'semantic' | 'indicator' | 'ops' | '')}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                >
                  <option value="">all domains</option>
                  <option value="semantic">semantic</option>
                  <option value="indicator">indicator</option>
                  <option value="ops">ops</option>
                </select>
                <select
                  data-testid="governance-worklist-severity-filter"
                  aria-label="Worklist severity filter"
                  value={worklistSeverity}
                  onChange={event => setWorklistSeverity(event.target.value as 'ok' | 'warn' | 'critical' | '')}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                >
                  <option value="">all severity</option>
                  <option value="critical">critical</option>
                  <option value="warn">warn</option>
                  <option value="ok">ok</option>
                </select>
              </div>
            </div>
            <div className="nexus-domain-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="nexus-domain-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Select</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Domain</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Title</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Severity</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Status</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {worklistItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>
                        <input
                          data-testid={`governance-worklist-select-${item.id}`}
                          aria-label={`Select worklist item ${item.id}`}
                          type="checkbox"
                          checked={Boolean(selectedWorklistIds[item.id])}
                          disabled={!actionsEnabled || !(item.actionType === 'ack_alert' || item.actionType === 'retry_import_failed')}
                          onChange={event =>
                            setSelectedWorklistIds(current => ({
                              ...current,
                              [item.id]: event.target.checked
                            }))
                          }
                        />
                      </td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>{item.domain}</td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <span>{item.title}</span>
                          <span style={{ color: 'var(--muted)' }}>{item.summary}</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>
                        <span className={item.severity === 'critical' ? 'badge badge-danger' : item.severity === 'warn' ? 'badge badge-warn' : 'badge badge-ok'}>
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>{item.status}</td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>
                        {item.actionType === 'open_detail' ? (
                          <Link href={item.route} style={{ fontSize: 12, color: '#1e3a8a' }}>
                            open detail
                          </Link>
                        ) : (
                          <ActionGuard scopes={['allow:write:model:*']}>
                            {permission => {
                              const actionType = item.actionType === 'ack_alert' ? 'ack_alert' : 'retry_import_failed'
                              const permissionDisabled = permission.state !== 'enabled'
                              const disabled = !actionsEnabled || permissionDisabled || actionMutation.isPending
                              const reason = !actionsEnabled
                                ? 'Hub actions are disabled by flag.'
                                : permission.reason ?? 'Missing required scopes.'
                              return (
                                <div style={{ display: 'grid', gap: 4 }}>
                                  <button
                                    data-testid={`governance-worklist-action-${item.id}`}
                                    type="button"
                                    className="badge badge-warn"
                                    style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                                    disabled={disabled}
                                    title={disabled ? reason : undefined}
                                    onClick={() =>
                                      actionMutation.mutate({
                                        id: item.id,
                                        actionType,
                                        actionPayload: item.actionPayload
                                      })
                                    }
                                  >
                                    {actionType === 'ack_alert' ? 'Ack alert' : 'Retry failed'}
                                  </button>
                                  {permissionDisabled ? (
                                    <span data-testid={`governance-worklist-action-reason-${item.id}`} className="badge badge-warn">
                                      {reason}
                                    </span>
                                  ) : null}
                                </div>
                              )
                            }}
                          </ActionGuard>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {worklistNextCursor ? (
              <button
                data-testid="governance-worklist-load-more"
                type="button"
                className="badge badge-warn"
                style={{ border: 'none', cursor: 'pointer', width: 'fit-content' }}
                disabled={loadMoreWorklistMutation.isPending}
                onClick={() => loadMoreWorklistMutation.mutate(worklistNextCursor)}
              >
                {loadMoreWorklistMutation.isPending ? 'Loading...' : 'Load more'}
              </button>
            ) : null}
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => {
                const permissionDisabled = permission.state !== 'enabled'
                const disabled = !actionsEnabled || permissionDisabled || selectedActionItems.length === 0 || actionMutation.isPending
                const reason = !actionsEnabled
                  ? 'Hub actions are disabled by flag.'
                  : permission.reason ?? 'Missing required scopes.'
                return (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      data-testid="governance-worklist-batch-run"
                      type="button"
                      className="badge badge-ok"
                      style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                      disabled={disabled}
                      title={disabled ? reason : undefined}
                      onClick={async () => {
                        const failed: string[] = []
                        for (const item of selectedActionItems) {
                          try {
                            await actionMutation.mutateAsync({
                              id: item.id,
                              actionType: item.actionType as 'ack_alert' | 'retry_import_failed',
                              actionPayload: item.actionPayload
                            })
                          } catch {
                            failed.push(item.id)
                          }
                        }
                        if (failed.length > 0) {
                          setActionStatus(`Batch completed with ${failed.length} failed item(s)`)
                        } else if (selectedActionItems.length > 0) {
                          setActionStatus(`Batch executed ${selectedActionItems.length} action(s)`)
                        }
                      }}
                    >
                      Run selected actions
                    </button>
                    {!actionsEnabled ? <span className="badge badge-warn">Hub actions are disabled by flag.</span> : null}
                    {permissionDisabled ? (
                      <span data-testid="governance-worklist-batch-reason" className="badge badge-warn">
                        {reason}
                      </span>
                    ) : null}
                  </div>
                )
              }}
            </ActionGuard>
          </section>

          <section className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Recent activity</strong>
            <div className="nexus-domain-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="nexus-domain-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Domain</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Signal</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '6px 4px' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentActivityQuery.data?.items ?? []).map(item => (
                    <tr key={`${item.domain}-${item.signal}`}>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>{item.domain}</td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>{item.signal}</td>
                      <td style={{ padding: '6px 4px', borderBottom: '1px solid var(--line)' }}>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
