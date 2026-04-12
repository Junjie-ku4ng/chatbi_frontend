import { apiRequest, buildAuthHeaders, resolveApiBaseUrl } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const opsAlertEventsAccess = frontendResourceAccessRegistry.opsAlertEvents
const opsAlertEventsBatchAckAccess = frontendResourceAccessRegistry.opsAlertEventsBatchAck
const opsAlertDispatchLogsAccess = frontendResourceAccessRegistry.opsAlertDispatchLogs
const askReviewLaneSummaryAccess = frontendResourceAccessRegistry.askReviewLaneSummary
const askCertificationLaneAccess = frontendResourceAccessRegistry.askCertificationLane
const indicatorWebhookDlqAccess = frontendResourceAccessRegistry.indicatorWebhookDlq
const indicatorWebhookDlqReplayBatchAccess = frontendResourceAccessRegistry.indicatorWebhookDlqReplayBatch

function buildOpsAlertDispatchLogsPath(eventId: string) {
  return opsAlertDispatchLogsAccess.path.replace(':eventId', encodeURIComponent(eventId))
}

function buildAskReviewLaneSummaryPath(lane: AskOperatorLane) {
  return askReviewLaneSummaryAccess.path.replace(':lane', encodeURIComponent(lane))
}

function buildAskCertificationLanePath(lane: AskOperatorLane) {
  return askCertificationLaneAccess.path.replace(':lane', encodeURIComponent(lane))
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
}

function resolveTenant(inputTenant?: string) {
  return inputTenant || process.env.NEXT_PUBLIC_DEV_TENANT || 'local'
}

export type AlertRule = Record<string, unknown>
export type AlertEvent = Record<string, unknown>
export type AlertDispatchLog = Record<string, unknown>
export type DlqItem = Record<string, unknown>
export type AskOperatorLane = 'direct_query' | 'diagnostic_run' | 'federated_query'
export type DispatchLogPage = Page<AlertDispatchLog> & {
  page?: number
  pageSize?: number
}
export type AskReviewLaneSummary = {
  lane: AskOperatorLane
  totalCases: number
  openCases: number
  needsMoreEvidenceCases: number
  resolvedCases: number
  approvedDecisions: number
  rejectedDecisions: number
  pendingDecisionCases: number
  overrideAuditCount: number
  avgDecisionLatencyMs: number
  oldestPendingRequestedAt?: string
  slaBreachedCases: number
  ageBuckets: {
    underOneHour: number
    underTwentyFourHours: number
    twentyFourHoursOrMore: number
  }
}
export type AskCertificationReport = {
  version: 'v1'
  lane: AskOperatorLane
  status: 'active' | 'blocked'
  decision: 'certified' | 'blocked'
  blockers: string[]
  metrics: Record<string, unknown>
  evidenceRefs: Array<{ kind: string; ref: string }>
} | null

export async function listAlertEvents(input?: {
  status?: 'open' | 'acked' | 'closed'
  eventCode?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams()
  if (input?.status) query.set('status', input.status)
  if (input?.eventCode) query.set('eventCode', input.eventCode)
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<Page<AlertEvent>>(`${opsAlertEventsAccess.path}${query.toString() ? `?${query.toString()}` : ''}`, {
    track: opsAlertEventsAccess.track
  })
}

export async function getAskReviewLaneSummary(lane: AskOperatorLane, input?: { slaHours?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.slaHours === 'number') query.set('slaHours', String(input.slaHours))
  return apiRequest<AskReviewLaneSummary>(
    `${buildAskReviewLaneSummaryPath(lane)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: askReviewLaneSummaryAccess.track
    }
  )
}

export async function getLatestAskCertificationReport(
  lane: AskOperatorLane,
  input?: {
    modelId?: string
  }
) {
  const query = new URLSearchParams()
  if (input?.modelId) query.set('modelId', input.modelId)
  return apiRequest<AskCertificationReport>(
    `${buildAskCertificationLanePath(lane)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: askCertificationLaneAccess.track
    }
  )
}

export async function listAlertRules() {
  return apiRequest<Page<AlertRule>>('/ops/alerts/rules')
}

export async function createAlertRule(input: Record<string, unknown>) {
  return apiRequest('/ops/alerts/rules', {
    method: 'POST',
    body: input
  })
}

export async function updateAlertRule(id: string, input: Record<string, unknown>) {
  return apiRequest(`/ops/alerts/rules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input
  })
}

export async function ackAlertEvent(id: string, input?: { traceKey?: string }) {
  return apiRequest(`/ops/alerts/events/${encodeURIComponent(id)}/ack`, {
    method: 'POST',
    body: input?.traceKey ? { traceKey: input.traceKey } : {}
  })
}

export async function ackAlertEventsBatch(input: { ids: string[]; traceKey?: string }) {
  return apiRequest<{
    total: number
    acked: number
    failed: number
    items: Array<{
      id: string
      status: 'acked' | 'not_found'
      traceActionRunId?: string
      error?: string
    }>
  }>(opsAlertEventsBatchAckAccess.path, {
    method: 'POST',
    track: opsAlertEventsBatchAckAccess.track,
    body: {
      ids: input.ids,
      ...(input.traceKey ? { traceKey: input.traceKey } : {})
    }
  })
}

export async function listAlertDispatchLogs(
  eventId: string,
  input?: {
    status?: 'success' | 'failed' | 'skipped'
    channel?: 'webhook' | 'email'
    page?: number
    pageSize?: number
    limit?: number
    offset?: number
  }
) {
  const query = new URLSearchParams()
  if (input?.status) query.set('status', input.status)
  if (input?.channel) query.set('channel', input.channel)
  if (typeof input?.page === 'number') query.set('page', String(input.page))
  if (typeof input?.pageSize === 'number') query.set('pageSize', String(input.pageSize))
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<DispatchLogPage>(
    `${buildOpsAlertDispatchLogsPath(eventId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: opsAlertDispatchLogsAccess.track
    }
  )
}

export async function listEmbeddingTrends(modelId: string, window: '7d' | '30d' | '90d') {
  return apiRequest<{ window: string; items: Array<Record<string, unknown>> }>(
    `/indicators/embedding/governance/trends?modelId=${encodeURIComponent(modelId)}&window=${window}`
  )
}

export async function listTenantSlaTrends(windowHours = 168) {
  return apiRequest<{ items: Array<Record<string, unknown>>; windowHours: number }>(
    `/indicator-webhooks/governance/tenant-sla/trends?windowHours=${windowHours}`
  )
}

export async function getConsumptionReport(input: {
  windowHours: number
  groupBy: 'tenant' | 'model' | 'consumer'
  format: 'json' | 'csv'
  tenant?: string
}) {
  const query = new URLSearchParams({
    windowHours: String(input.windowHours),
    groupBy: input.groupBy,
    format: input.format,
    tenant: resolveTenant(input.tenant)
  })
  return apiRequest(`/indicator-webhooks/governance/reports/consumption?${query.toString()}`)
}

export type OpsConsumptionTablePage = {
  tenant: string
  groupBy: 'tenant' | 'model' | 'consumer'
  window: '7d' | '30d' | '90d'
  from: string
  to: string
  page: number
  pageSize: number
  total: number
  items: Array<Record<string, unknown>>
  summary: {
    subscriptionCount: number
    activeSubscriptions: number
    pausedSubscriptions: number
    deliveries: number
    success: number
    failed: number
    dlq: number
    audits: number
    dlqOpen: number
  }
}

export async function getConsumptionTable(input: {
  window: '7d' | '30d' | '90d'
  groupBy: 'tenant' | 'model' | 'consumer'
  view?: 'operational'
  page?: number
  pageSize?: number
  tenant?: string
}) {
  const query = new URLSearchParams({
    window: input.window,
    groupBy: input.groupBy,
    tenant: resolveTenant(input.tenant)
  })
  if (input.view) query.set('view', input.view)
  if (typeof input.page === 'number') query.set('page', String(input.page))
  if (typeof input.pageSize === 'number') query.set('pageSize', String(input.pageSize))
  return apiRequest<OpsConsumptionTablePage>(`/ops/reports/consumption/table?${query.toString()}`)
}

export async function downloadConsumptionReportCsv(input: {
  windowHours: number
  groupBy: 'tenant' | 'model' | 'consumer'
  tenant?: string
}) {
  const query = new URLSearchParams({
    windowHours: String(input.windowHours),
    groupBy: input.groupBy,
    format: 'csv',
    tenant: resolveTenant(input.tenant)
  })
  const response = await fetch(
    `${resolveApiBaseUrl()}/indicator-webhooks/governance/reports/consumption?${query.toString()}`,
    {
      method: 'GET',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    }
  )
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Failed to download report: ${response.status}`)
  }
  return response.text()
}

export async function getTenantSla(input?: { tenant?: string; windowHours?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.windowHours === 'number') query.set('windowHours', String(input.windowHours))
  if (input?.tenant) query.set('tenant', input.tenant)
  return apiRequest(`/indicator-webhooks/governance/tenant-sla${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function listWebhookDlq(input: {
  modelId: string
  status?: 'open' | 'replayed' | 'discarded'
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams({
    modelId: input.modelId
  })
  if (input.status) query.set('status', input.status)
  if (typeof input.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<{ modelId: string; items: DlqItem[] }>(`${indicatorWebhookDlqAccess.path}?${query.toString()}`, {
    track: indicatorWebhookDlqAccess.track
  })
}

export async function replayWebhookDlqBatch(input: {
  modelId: string
  limit?: number
  replayedBy?: string
  dlqIds?: string[]
  traceKey?: string
}) {
  return apiRequest<{
    modelId: string
    requested: number
    replayed: number
    failed: number
    remainingOpen: number
    items: DlqItem[]
    traceActionRunId?: string
  }>(indicatorWebhookDlqReplayBatchAccess.path, {
    method: 'POST',
    track: indicatorWebhookDlqReplayBatchAccess.track,
    body: input
  })
}
