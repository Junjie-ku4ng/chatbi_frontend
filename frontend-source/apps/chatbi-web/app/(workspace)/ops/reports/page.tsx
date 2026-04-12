'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import {
  downloadConsumptionReportCsv,
  getAskReviewLaneSummary,
  getLatestAskCertificationReport,
  getConsumptionTable,
  getConsumptionReport,
  type AskCertificationReport,
  type AskOperatorLane,
  listAlertDispatchLogs,
  listAlertEvents
} from '@/modules/ops/api'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'

type GroupBy = 'tenant' | 'model' | 'consumer'
type DispatchStatus = 'all' | 'success' | 'failed' | 'skipped'
type DispatchChannel = 'all' | 'webhook' | 'email'
const ASK_OPERATOR_LANES: AskOperatorLane[] = ['diagnostic_run', 'federated_query', 'direct_query']

function resolveGroupByLabel(groupBy: GroupBy) {
  if (groupBy === 'tenant') return '租户'
  if (groupBy === 'model') return '模型'
  if (groupBy === 'consumer') return '消费方'
  return groupBy
}

function resolveAskLaneLabel(lane: AskOperatorLane) {
  if (lane === 'diagnostic_run') return '高度诊断'
  if (lane === 'federated_query') return '联合问数'
  if (lane === 'direct_query') return '直接问数'
  return lane
}

function resolveCertificationBlockerClassLabel(value: unknown) {
  if (value === 'automatic_pass') return '自动通过'
  if (value === 'review_backlog') return '人工审核待决'
  if (value === 'review_rejected') return '人工审核驳回'
  if (value === 'threshold_failure') return '评分阈值未达标'
  if (value === 'override_pending') return '等待 override 证据'
  return '无额外 blocker class'
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

export default function OpsReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('tenant')
  const [windowPreset, setWindowPreset] = useState<'7d' | '30d' | '90d'>('30d')
  const [askLane, setAskLane] = useState<AskOperatorLane>('diagnostic_run')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatus>('all')
  const [dispatchChannel, setDispatchChannel] = useState<DispatchChannel>('all')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const dispatchLimit = 20

  const tableQuery = useQuery({
    queryKey: ['ops-report-table', groupBy, windowPreset],
    queryFn: () =>
      getConsumptionTable({
        window: windowPreset,
        groupBy,
        view: 'operational',
        page: 1,
        pageSize: 50
      })
  })

  const reportQuery = useQuery({
    queryKey: ['ops-report-legacy', groupBy, windowPreset],
    queryFn: () =>
      getConsumptionReport({
        windowHours: windowPreset === '7d' ? 168 : windowPreset === '30d' ? 720 : 2160,
        groupBy,
        format: 'json'
      })
  })

  const reviewSummaryQuery = useQuery({
    queryKey: ['ask-review-lane-summary', askLane],
    queryFn: () =>
      getAskReviewLaneSummary(askLane, {
        slaHours: 12
      })
  })

  const certificationQuery = useQuery({
    queryKey: ['ask-certification-latest', askLane],
    queryFn: () => getLatestAskCertificationReport(askLane)
  })

  const eventsQuery = useQuery({
    queryKey: ['ops-report-events'],
    queryFn: () => listAlertEvents({ limit: 50, offset: 0 })
  })

  const eventOptions = eventsQuery.data?.items ?? []
  const activeEventId = selectedEventId || String(eventOptions[0]?.id ?? '')

  const dispatchLogsQuery = useInfiniteQuery({
    queryKey: ['ops-dispatch-logs', activeEventId, dispatchStatus, dispatchChannel],
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listAlertDispatchLogs(activeEventId, {
        status: dispatchStatus === 'all' ? undefined : dispatchStatus,
        channel: dispatchChannel === 'all' ? undefined : dispatchChannel,
        page: Number(pageParam ?? 1),
        pageSize: dispatchLimit
      }),
    enabled: activeEventId !== '',
    getNextPageParam: (lastPage, pages) => {
      const typedLastPage = lastPage as { items?: Array<Record<string, unknown>> }
      if ((typedLastPage.items?.length ?? 0) < dispatchLimit) {
        return undefined
      }
      return pages.length + 1
    }
  })

  const exportCsvMutation = useMutation({
    mutationFn: async () =>
      downloadConsumptionReportCsv({
        windowHours: windowPreset === '7d' ? 168 : windowPreset === '30d' ? 720 : 2160,
        groupBy
      }),
    onSuccess: () => {
      setStatusMessage('CSV export ready')
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'CSV export failed')
    }
  })

  const dispatchItems = (dispatchLogsQuery.data?.pages ?? []).flatMap(page => page.items ?? [])
  const dispatchPageSize = dispatchLimit
  const dispatchPagesLoaded = dispatchLogsQuery.data?.pages?.length ?? 1
  const hasNextDispatchPage = dispatchLogsQuery.hasNextPage ?? false
  const csvPreview = exportCsvMutation.data
  const reportItems = (tableQuery.data?.items ?? []) as Array<Record<string, unknown>>
  const certificationMetrics = toRecord(certificationQuery.data?.metrics)
  const certification = certificationQuery.data as AskCertificationReport
  const eventsLoading = eventsQuery.isLoading
  const dispatchLogsLoading = activeEventId !== '' && dispatchLogsQuery.isLoading

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Ops Reports</strong>
            <span className="badge badge-warn">运维报表</span>
            <Link href="/ops/traces" className="badge badge-ok">
              追踪控制台
            </Link>
          </div>
          <form
            data-testid="ops-reports-filter-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await reportQuery.refetch()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <select
              data-testid="ops-reports-window"
              aria-label="Ops reports window"
              value={windowPreset}
              onChange={event => setWindowPreset(event.target.value as '7d' | '30d' | '90d')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
            <select
              data-testid="ops-reports-group-by"
              aria-label="Ops reports group by"
              value={groupBy}
              onChange={event => setGroupBy(event.target.value as GroupBy)}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="tenant">租户</option>
              <option value="model">模型</option>
              <option value="consumer">消费方</option>
            </select>
            <button data-testid="ops-reports-refresh" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
              刷新
            </button>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="ops-reports-export-csv"
                  type="button"
                  onClick={() => exportCsvMutation.mutate()}
                  disabled={permission.state !== 'enabled' || exportCsvMutation.isPending}
                  title={permission.reason}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  {exportCsvMutation.isPending ? '导出中...' : '导出 CSV'}
                </button>
              )}
            </ActionGuard>
          </form>
          {statusMessage ? (
            <span data-testid="ops-reports-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={tableQuery.isLoading}
          error={tableQuery.error}
          empty={reportItems.length === 0}
          loadingLabel="Loading ops consumption report..."
          emptyLabel="No ops report rows found for the selected window."
          retry={() => {
            void tableQuery.refetch()
          }}
        >
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>消费汇总</strong>
            <MetricStrip
              testId="ops-reports-summary-strip"
              items={[
                { label: '订阅数', value: String(tableQuery.data?.summary?.subscriptionCount ?? 0), tone: 'ok' },
                { label: '投递数', value: String(tableQuery.data?.summary?.deliveries ?? 0), tone: 'ok' },
                { label: '失败数', value: String(tableQuery.data?.summary?.failed ?? 0), tone: 'danger' },
                { label: 'DLQ', value: String(tableQuery.data?.summary?.dlq ?? 0), tone: 'warn' },
                { label: '审计数', value: String(tableQuery.data?.summary?.audits ?? 0), tone: 'warn' }
              ]}
            />
            <OperationalTable
              testId="ops-reports-table"
              columns={[
                { key: 'groupKey', label: resolveGroupByLabel(groupBy), render: row => String(row.groupKey ?? '-') },
                { key: 'deliveries', label: '投递', render: row => String(row.deliveries ?? 0) },
                { key: 'success', label: '成功', render: row => String(row.success ?? 0) },
                { key: 'failed', label: '失败', render: row => String(row.failed ?? 0) },
                { key: 'dlq', label: 'DLQ', render: row => String(row.dlq ?? 0) }
              ]}
              rows={reportItems}
              rowKey={(row, index) => `${String(row.groupKey ?? 'row')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="暂无报表数据"
            />
            <AdvancedJsonPanel testId="ops-reports-table-json" value={tableQuery.data} />
          </section>
        </LoadablePanel>

        <LoadablePanel
          loading={reviewSummaryQuery.isLoading || certificationQuery.isLoading}
          error={reviewSummaryQuery.error ?? certificationQuery.error}
          empty={!reviewSummaryQuery.isLoading && !certificationQuery.isLoading && !reviewSummaryQuery.data && !certificationQuery.data}
          loadingLabel="Loading ask review and certification summary..."
          emptyLabel="No ask review or certification summary available."
          retry={() => {
            if (reviewSummaryQuery.error) {
              void reviewSummaryQuery.refetch()
              return
            }
            void certificationQuery.refetch()
          }}
        >
          <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>Ask Review & Certification</strong>
                <span className="badge badge-warn">operator hardening</span>
                <span
                  data-testid="ops-reports-certification-status"
                  className={certification?.status === 'active' ? 'badge badge-ok' : 'badge badge-danger'}
                >
                  certification: {certification?.status ?? 'missing'}
                </span>
              </div>
              <Link href="/settings/certification" className="badge badge-ok">
                Certification Settings
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label htmlFor="ops-reports-ask-lane" style={{ color: 'var(--muted)', fontSize: 12 }}>
                lane
              </label>
              <select
                id="ops-reports-ask-lane"
                data-testid="ops-reports-ask-lane"
                value={askLane}
                onChange={event => setAskLane(event.target.value as AskOperatorLane)}
                style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
              >
                {ASK_OPERATOR_LANES.map(item => (
                  <option key={item} value={item}>
                    {resolveAskLaneLabel(item)}
                  </option>
                ))}
              </select>
              <span className="badge badge-ok">sla window: 12h</span>
            </div>

            <MetricStrip
              testId="ops-reports-ask-ops-strip"
              items={[
                {
                  label: 'review cases',
                  value: String(reviewSummaryQuery.data?.totalCases ?? 0),
                  tone: (reviewSummaryQuery.data?.totalCases ?? 0) > 0 ? 'warn' : 'ok'
                },
                {
                  label: 'pending decisions',
                  value: String(reviewSummaryQuery.data?.pendingDecisionCases ?? 0),
                  tone: (reviewSummaryQuery.data?.pendingDecisionCases ?? 0) > 0 ? 'warn' : 'ok'
                },
                {
                  label: 'sla breached',
                  value: String(reviewSummaryQuery.data?.slaBreachedCases ?? 0),
                  tone: (reviewSummaryQuery.data?.slaBreachedCases ?? 0) > 0 ? 'danger' : 'ok'
                },
                {
                  label: 'review state',
                  value: String(certificationMetrics?.reviewState ?? 'not_started'),
                  tone: certificationMetrics?.reviewState === 'backlog' ? 'warn' : 'ok'
                },
                {
                  label: 'blocker class',
                  value: resolveCertificationBlockerClassLabel(certificationMetrics?.certificationBlockerClass),
                  tone: certification?.status === 'blocked' ? 'danger' : 'ok'
                }
              ]}
            />

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                {resolveAskLaneLabel(askLane)} 当前的 certification blocker 会直接影响 operator rollout 判断。优先看待决审核和
                threshold / rejection 类 blocker。
              </div>
              <div
                data-testid="ops-reports-certification-blockers"
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
              >
                {(certification?.blockers ?? []).length > 0 ? (
                  certification?.blockers.map(blocker => (
                    <span key={blocker} className="badge badge-danger">
                      {blocker}
                    </span>
                  ))
                ) : (
                  <span className="badge badge-ok">no active blockers</span>
                )}
              </div>
            </div>

            <AdvancedJsonPanel
              testId="ops-reports-ask-ops-json"
              value={{
                lane: askLane,
                reviewSummary: reviewSummaryQuery.data,
                certification
              }}
            />
          </section>
        </LoadablePanel>

        <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <strong>投递日志</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              data-testid="ops-reports-event-select"
              aria-label="Dispatch alert event"
              value={activeEventId}
              onChange={event => {
                setSelectedEventId(event.target.value)
              }}
              disabled={eventsLoading || eventOptions.length === 0}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', minWidth: 320 }}
            >
              {eventOptions.length > 0 ? (
                eventOptions.map(item => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {String(item.id)} · {String(item.metricCode ?? item.ruleName ?? '事件')}
                  </option>
                ))
              ) : null}
            </select>
            <select
              data-testid="ops-reports-dispatch-status"
              aria-label="Dispatch status filter"
              value={dispatchStatus}
              onChange={event => {
                setDispatchStatus(event.target.value as DispatchStatus)
              }}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="all">全部状态</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
              <option value="skipped">跳过</option>
            </select>
            <select
              data-testid="ops-reports-dispatch-channel"
              aria-label="Dispatch channel filter"
              value={dispatchChannel}
              onChange={event => {
                setDispatchChannel(event.target.value as DispatchChannel)
              }}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="all">全部通道</option>
              <option value="webhook">webhook</option>
              <option value="email">email</option>
            </select>
          </div>

          <LoadablePanel
            loading={eventsLoading || dispatchLogsLoading}
            error={eventsQuery.error ?? dispatchLogsQuery.error}
            empty={!eventsLoading && !dispatchLogsLoading && !eventsQuery.error && !dispatchLogsQuery.error && (activeEventId === '' || dispatchItems.length === 0)}
            loadingLabel={eventsLoading ? 'Loading alert events...' : 'Loading dispatch logs...'}
            emptyLabel={activeEventId === '' ? 'Select an alert event to load dispatch logs.' : 'No dispatch logs found for the selected filters.'}
            retry={() => {
              if (eventsQuery.error) {
                void eventsQuery.refetch()
                return
              }
              if (activeEventId) {
                void dispatchLogsQuery.refetch()
              }
            }}
          >
            <VirtualizedList
              items={dispatchItems}
              estimateSize={74}
              hasMore={hasNextDispatchPage}
              isLoadingMore={dispatchLogsQuery.isFetchingNextPage}
              onLoadMore={() => {
                if (hasNextDispatchPage) {
                  dispatchLogsQuery.fetchNextPage()
                }
              }}
              getKey={item => String((item as Record<string, unknown>).id)}
              renderItem={log => (
                <article
                  data-testid={`ops-reports-dispatch-row-${String((log as Record<string, unknown>).id)}`}
                  key={String((log as Record<string, unknown>).id)}
                  className="card"
                  style={{ padding: 10, borderRadius: 10, marginBottom: 8 }}
                >
                  <strong style={{ fontSize: 13 }}>{String((log as Record<string, unknown>).channel ?? '通道')}</strong>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
                    {String((log as Record<string, unknown>).status ?? '状态')} · {String((log as Record<string, unknown>).createdAt ?? '')}
                  </p>
                  {(log as Record<string, unknown>).traceKey || (log as Record<string, unknown>).trace_key ? (
                    <Link
                      className="badge badge-ok"
                      href={`/ops/traces/${encodeURIComponent(
                        String((log as Record<string, unknown>).traceKey ?? (log as Record<string, unknown>).trace_key)
                      )}`}
                    >
                      追踪
                    </Link>
                  ) : null}
                  {(log as Record<string, unknown>).errorMessage ? (
                    <p style={{ margin: '4px 0 0', color: '#b3342f', fontSize: 12 }}>{String((log as Record<string, unknown>).errorMessage)}</p>
                  ) : null}
                </article>
              )}
            />
          </LoadablePanel>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (hasNextDispatchPage) {
                  dispatchLogsQuery.fetchNextPage()
                }
              }}
              disabled={!hasNextDispatchPage || dispatchLogsQuery.isFetchingNextPage}
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
            >
              加载更多
            </button>
            <span data-testid="ops-reports-dispatch-page" className="badge badge-warn">
              pages: {dispatchPagesLoaded} / pageSize: {dispatchPageSize}
            </span>
          </div>
        </section>

        {csvPreview ? (
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>CSV 预览</strong>
            <pre style={{ margin: 0, maxHeight: 180, overflow: 'auto', fontSize: 12 }}>{csvPreview.split('\n').slice(0, 12).join('\n')}</pre>
          </section>
        ) : null}

        <AdvancedJsonPanel testId="ops-reports-legacy-json" value={reportQuery.data} />

        <DetailDrawer testId="ops-reports-detail-drawer" title="行明细" open={selectedRow !== null} onClose={() => setSelectedRow(null)}>
          <EntityDetailSections
            testIdPrefix="ops-reports-detail"
            overview={[
              { label: '分组键', value: String(selectedRow?.groupKey ?? '-') },
              { label: '投递数', value: String(selectedRow?.deliveries ?? 0) },
              { label: '失败数', value: String(selectedRow?.failed ?? 0) }
            ]}
            operationalFields={[
              {
                label: '失败率',
                value: String((selectedRow?.presentation as any)?.failureRate ?? '-')
              },
              {
                label: '主要失败码',
                value: String((selectedRow?.presentation as any)?.dominantFailureCode ?? '-')
              },
              {
                label: '建议动作',
                value: String((selectedRow?.presentation as any)?.actionHint ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'DLQ', value: String(selectedRow?.dlq ?? 0) },
              { label: '成功数', value: String(selectedRow?.success ?? 0) },
              { label: '审计数', value: String(selectedRow?.audits ?? 0) }
            ]}
            rawValue={selectedRow}
            advancedTestId="ops-reports-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
