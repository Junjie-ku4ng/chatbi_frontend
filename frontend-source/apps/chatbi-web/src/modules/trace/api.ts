import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'
import { appendPagingQuery } from '@/modules/shared/paging/paging'

const opsTracesAccess = frontendResourceAccessRegistry.opsTraces
const traceDetailAccess = frontendResourceAccessRegistry.traceDetail
const analysisConversationsAccess = frontendResourceAccessRegistry.analysisConversations
const analysisExecutionsAccess = frontendResourceAccessRegistry.analysisExecutions

function buildTraceDetailPath(traceKey: string, suffix = '') {
  return `${traceDetailAccess.path.replace(':traceKey', encodeURIComponent(traceKey))}${suffix}`
}

function buildAnalysisConversationPath(conversationId: string) {
  return analysisConversationsAccess.path.replace(':conversationId', encodeURIComponent(conversationId))
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
}

export type TraceActionCommand = 'ack_alert' | 'replay_dlq'

export type TraceRun = {
  id: string
  traceKey: string
  modelId?: string
  tenant?: string
  rootType: 'query' | 'alert' | 'manual' | 'worker'
  rootRefId?: string
  conversationId?: string
  queryLogId?: string
  status: 'open' | 'completed' | 'failed'
  startedAt?: string
  endedAt?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type TraceLink = {
  id: string
  traceRunId: string
  linkType: string
  refId: string
  metadata?: Record<string, unknown>
  createdAt?: string
}

export type TraceActionRun = {
  id: string
  traceRunId: string
  actionType: string
  status: 'applied' | 'failed' | 'partial'
  requestPayload?: Record<string, unknown>
  resultPayload?: Record<string, unknown>
  errorMessage?: string
  createdAt?: string
}

export type AnalysisConversation = Record<string, unknown> & {
  conversationId: string
  modelId?: string
  checkpoints?: Array<Record<string, unknown>>
}

export type AnalysisExecution = Record<string, unknown> & {
  runKey: string
  modelId?: string
  status?: string
  startedAt?: string
  endedAt?: string
  references?: Record<string, unknown>
}

export type TraceDetail = {
  run: TraceRun
  links: TraceLink[]
  actionRuns: TraceActionRun[]
  timeline: TraceTimelineItem[]
  conversation?: AnalysisConversation
  execution?: AnalysisExecution
}

export type TraceTimelineItem = {
  kind: 'run' | 'link' | 'action'
  at: string
  data: Record<string, unknown>
  suggestion?: string
  presentation?: {
    eventSummary?: string
    actionHint?: string
    relatedResourceLabel?: string | null
  }
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readString(item: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = asString(item[key])
    if (value) {
      return value
    }
  }
  return undefined
}

function readRecord(item: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = asRecord(item[key])
    if (value) {
      return value
    }
  }
  return undefined
}

function normalizeTraceStatus(value: string | undefined): TraceRun['status'] {
  const statusRaw = value?.toLowerCase()
  if (statusRaw === 'open' || statusRaw === 'running' || statusRaw === 'busy') {
    return 'open'
  }
  if (statusRaw === 'failed' || statusRaw === 'error') {
    return 'failed'
  }
  return 'completed'
}

function normalizeTraceRootType(value: string | undefined): TraceRun['rootType'] {
  if (value === 'alert' || value === 'manual' || value === 'worker') {
    return value
  }
  return 'query'
}

function normalizeTraceActionStatus(value: string | undefined): TraceActionRun['status'] {
  if (value === 'failed' || value === 'partial') {
    return value
  }
  return 'applied'
}

function normalizeTimelineKind(value: string | undefined): TraceTimelineItem['kind'] {
  if (value === 'link' || value === 'action') {
    return value
  }
  return 'run'
}

function normalizeTraceRun(item: Record<string, unknown>): TraceRun {
  const statusRaw = asString(item.status)?.toLowerCase()

  return {
    id: readString(item, 'id', 'traceKey', 'trace_key') ?? '',
    traceKey: readString(item, 'traceKey', 'trace_key', 'id') ?? '',
    modelId: readString(item, 'modelId', 'model_id'),
    tenant: readString(item, 'tenant'),
    rootType: normalizeTraceRootType(readString(item, 'rootType', 'root_type')),
    rootRefId: readString(item, 'rootRefId', 'root_ref_id'),
    conversationId: readString(item, 'conversationId', 'conversation_id'),
    queryLogId: readString(item, 'queryLogId', 'query_log_id'),
    status: normalizeTraceStatus(statusRaw),
    startedAt: readString(item, 'startedAt', 'started_at', 'createdAt', 'created_at'),
    endedAt: readString(item, 'endedAt', 'ended_at'),
    metadata: readRecord(item, 'metadata'),
    createdAt: readString(item, 'createdAt', 'created_at', 'startedAt', 'started_at'),
    updatedAt: readString(item, 'updatedAt', 'updated_at', 'endedAt', 'ended_at')
  }
}

export async function listTraces(input: {
  modelId: string
  status?: 'open' | 'completed' | 'failed'
  rootType?: 'query' | 'alert' | 'manual' | 'worker'
  q?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams({
    modelId: input.modelId
  })
  if (input.status) {
    query.set('status', input.status)
  }
  if (input.rootType) {
    query.set('rootType', input.rootType)
  }
  if (input.q) {
    query.set('q', input.q)
  }
  appendPagingQuery(query, input)

  const payload = await apiRequest<Record<string, unknown>>(`${opsTracesAccess.path}?${query.toString()}`, {
    track: opsTracesAccess.track
  })
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceRun)

  return {
    items,
    total: asNumber(payload.total) ?? items.length,
    limit: asNumber(payload.limit) ?? input.limit,
    offset: asNumber(payload.offset) ?? input.offset
  } satisfies Page<TraceRun>
}

function normalizeTraceLink(item: Record<string, unknown>): TraceLink {
  return {
    id: readString(item, 'id') ?? '',
    traceRunId: readString(item, 'traceRunId', 'trace_run_id') ?? '',
    linkType: readString(item, 'linkType', 'link_type') ?? '',
    refId: readString(item, 'refId', 'ref_id') ?? '',
    metadata: readRecord(item, 'metadata'),
    createdAt: readString(item, 'createdAt', 'created_at')
  }
}

function normalizeTraceActionRun(item: Record<string, unknown>): TraceActionRun {
  return {
    id: readString(item, 'id') ?? '',
    traceRunId: readString(item, 'traceRunId', 'trace_run_id') ?? '',
    actionType: readString(item, 'actionType', 'action_type') ?? '',
    status: normalizeTraceActionStatus(readString(item, 'status')),
    requestPayload: readRecord(item, 'requestPayload', 'request_payload'),
    resultPayload: readRecord(item, 'resultPayload', 'result_payload'),
    errorMessage: readString(item, 'errorMessage', 'error_message'),
    createdAt: readString(item, 'createdAt', 'created_at')
  }
}

function normalizeTraceTimelinePresentation(item: Record<string, unknown>) {
  const presentation = readRecord(item, 'presentation')
  if (!presentation) {
    return undefined
  }
  return {
    eventSummary: readString(presentation, 'eventSummary', 'event_summary'),
    actionHint: readString(presentation, 'actionHint', 'action_hint'),
    relatedResourceLabel: readString(presentation, 'relatedResourceLabel', 'related_resource_label') ?? null
  }
}

function normalizeTraceTimelineItem(item: Record<string, unknown>): TraceTimelineItem {
  return {
    kind: normalizeTimelineKind(readString(item, 'kind')),
    at: readString(item, 'at') ?? '',
    data: readRecord(item, 'data') ?? {},
    suggestion: readString(item, 'suggestion'),
    presentation: normalizeTraceTimelinePresentation(item)
  }
}

function normalizeTraceDetail(payload: Record<string, unknown>): TraceDetail {
  const run = normalizeTraceRun(readRecord(payload, 'run') ?? payload)
  const links = (Array.isArray(payload.links) ? payload.links : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceLink)
  const actionRuns = (Array.isArray(payload.actionRuns) ? payload.actionRuns : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceActionRun)
  const timeline = (Array.isArray(payload.timeline) ? payload.timeline : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceTimelineItem)

  return {
    run,
    links,
    actionRuns,
    timeline
  }
}

function normalizeAnalysisConversation(payload: Record<string, unknown>): AnalysisConversation {
  return {
    ...payload,
    conversationId: readString(payload, 'conversationId', 'conversation_id', 'id') ?? '',
    modelId: readString(payload, 'modelId', 'model_id'),
    checkpoints: (Array.isArray(payload.checkpoints) ? payload.checkpoints : [])
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => Boolean(item))
  }
}

function normalizeAnalysisExecution(payload: Record<string, unknown>): AnalysisExecution {
  return {
    ...payload,
    runKey: readString(payload, 'runKey', 'run_key', 'id') ?? '',
    modelId: readString(payload, 'modelId', 'model_id'),
    status: readString(payload, 'status'),
    startedAt: readString(payload, 'startedAt', 'started_at'),
    endedAt: readString(payload, 'endedAt', 'ended_at'),
    references: readRecord(payload, 'references')
  }
}

function selectTraceExecution(items: AnalysisExecution[], traceKey: string) {
  return items.find(item => readString(item.references ?? {}, 'traceKey', 'trace_key') === traceKey) ?? items[0]
}

export async function getTrace(traceKey: string) {
  const detail = normalizeTraceDetail(
    await apiRequest<Record<string, unknown>>(buildTraceDetailPath(traceKey), {
      track: traceDetailAccess.track
    })
  )

  let conversation: AnalysisConversation | undefined
  if (detail.run.conversationId) {
    try {
      const payload = await apiRequest<Record<string, unknown>>(
        buildAnalysisConversationPath(detail.run.conversationId),
        {
          track: analysisConversationsAccess.track
        }
      )
      conversation = normalizeAnalysisConversation(payload)
    } catch {
      conversation = undefined
    }
  }

  let execution: AnalysisExecution | undefined
  const executionModelId = detail.run.modelId ?? conversation?.modelId
  if (detail.run.conversationId && executionModelId) {
    const query = new URLSearchParams({
      modelId: executionModelId,
      conversationId: detail.run.conversationId
    })
    query.set('limit', '20')
    query.set('offset', '0')

    try {
      const payload = await apiRequest<Record<string, unknown>>(`${analysisExecutionsAccess.path}?${query.toString()}`, {
        track: analysisExecutionsAccess.track
      })
      const items = (Array.isArray(payload.items) ? payload.items : [])
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map(normalizeAnalysisExecution)
      execution = selectTraceExecution(items, traceKey)
    } catch {
      execution = undefined
    }
  }

  return {
    ...detail,
    conversation,
    execution
  } satisfies TraceDetail
}

export async function runTraceAction(
  traceKey: string,
  input: {
    action: TraceActionCommand
    params?: Record<string, unknown>
  }
) {
  const payload = await apiRequest<Record<string, unknown>>(buildTraceDetailPath(traceKey, '/actions'), {
    method: 'POST',
    track: traceDetailAccess.track,
    body: {
      action: input.action,
      ...(input.params ? { params: input.params } : {})
    }
  })

  return {
    ...payload,
    actionRun: payload.actionRun ? normalizeTraceActionRun(asRecord(payload.actionRun) ?? {}) : undefined
  } as {
    actionRun?: TraceActionRun
    result?: Record<string, unknown>
  }
}

export async function listTraceActions(
  traceKey: string,
  _input?: {
    status?: 'applied' | 'partial' | 'failed'
    actionType?: TraceActionCommand
    cursor?: number
    limit?: number
    offset?: number
  }
) {
  const query = new URLSearchParams()
  if (_input?.status) {
    query.set('status', _input.status)
  }
  if (_input?.actionType) {
    query.set('actionType', _input.actionType)
  }
  appendPagingQuery(query, _input)

  const payload = await apiRequest<Record<string, unknown>>(
    `${buildTraceDetailPath(traceKey, '/actions')}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: traceDetailAccess.track
    }
  )
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceActionRun)

  return {
    items,
    total: asNumber(payload.total) ?? items.length,
    limit: asNumber(payload.limit) ?? _input?.limit,
    offset: asNumber(payload.offset) ?? _input?.offset
  } satisfies Page<TraceActionRun>
}

export async function listTraceTimeline(
  traceKey: string,
  input?: {
    kind?: 'run' | 'link' | 'action'
    status?: 'applied' | 'partial' | 'failed' | 'open' | 'completed'
    view?: 'operational'
    page?: number
    pageSize?: number
  }
) {
  const query = new URLSearchParams()
  if (input?.kind) {
    query.set('kind', input.kind)
  }
  if (input?.status) {
    query.set('status', input.status)
  }
  if (input?.view) {
    query.set('view', input.view)
  }
  if (typeof input?.page === 'number') {
    query.set('page', String(input.page))
  }
  if (typeof input?.pageSize === 'number') {
    query.set('pageSize', String(input.pageSize))
  }

  const payload = await apiRequest<Record<string, unknown>>(
    `${buildTraceDetailPath(traceKey, '/timeline')}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: traceDetailAccess.track
    }
  )
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(normalizeTraceTimelineItem)

  return {
    traceKey: readString(payload, 'traceKey', 'trace_key') ?? traceKey,
    run: payload.run ? normalizeTraceRun(asRecord(payload.run) ?? {}) : undefined,
    page: asNumber(payload.page) ?? input?.page ?? 1,
    pageSize: asNumber(payload.pageSize) ?? input?.pageSize ?? items.length,
    total: asNumber(payload.total) ?? items.length,
    items
  }
}

export async function listRelatedAlertTraces(
  _eventId: string,
  _input?: { modelId?: string; limit?: number; offset?: number }
) {
  return {
    items: [] as TraceRun[],
    total: 0,
    limit: _input?.limit,
    offset: _input?.offset
  } satisfies Page<TraceRun>
}

export async function getInsightTrace(insightId: string) {
  return {
    trace: null
  } as { trace: TraceDetail | null }
}
