'use client'

import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type ThreadAssistantMessagePart,
  type ThreadMessageLike
} from '@assistant-ui/react'
import { useMemo } from 'react'
import { buildAuthHeaders, buildRequestContextHeaders, resolveApiBaseUrlByTrack } from '@/lib/api-client'
import { runSseTransport, StreamTransportError } from './stream-transport'
import { buildXpertChatRequestBody } from './runtime-control-request'
import { deriveChatSourceItems } from './chat-source-items'
import {
  normalizeRuntimeLifecycleEvent,
  projectPlanFromNormalizedRuntimeLifecycleEvent
} from './runtime-event-contract'
import type {
  ChatProgressCategory,
  ChatProgressEvent,
  ChatComponentEvent,
  ChatClarificationEvent,
  ChatAnswerMode,
  ChatDoneEvent,
  ChatPlanEvent,
  ChatStreamEvent
} from './chat-runtime-event-types'

export type {
  ChatProgressCategory,
  ChatProgressEvent,
  ChatComponentEvent,
  ChatClarificationEvent,
  ChatAnswerMode,
  ChatDoneEvent,
  ChatPlanEvent,
  ChatStreamEvent
} from './chat-runtime-event-types'

export { buildXpertChatRequestBody, buildXpertRuntimeControlRequestBody } from './runtime-control-request'

type RuntimeAnalysisExecutionKind = 'query' | 'what_if' | 'attribution'

type XpertStreamEnvelope = {
  type?: string
  event?: string
  data?: unknown
}

type ThreadAssistantDataPart = Extract<ThreadAssistantMessagePart, { type: 'data' }>

type TimelineMarkerKind = 'text' | 'component' | 'clarification'

function isThreadAssistantDataPart(part: ThreadAssistantMessagePart): part is ThreadAssistantDataPart {
  return part.type === 'data'
}

function isThreadMessageMetaPart(
  part: ThreadAssistantMessagePart
): part is ThreadAssistantDataPart & { name: 'chatbi_message_meta'; data?: { messageId?: string } } {
  return isThreadAssistantDataPart(part) && part.name === 'chatbi_message_meta'
}

class StreamRequestError extends Error {
  status?: number
  retryable: boolean

  constructor(message: string, status?: number, retryable = false) {
    super(message)
    this.name = 'StreamRequestError'
    this.status = status
    this.retryable = retryable
  }
}

export function parseSseEventBlock(block: string): ChatStreamEvent | null {
  const lines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  let eventName: string | undefined
  const dataLines: string[] = []

  for (const line of lines) {
    const eventMatch = /^event:\s*(.+)$/.exec(line.trimStart())
    if (eventMatch) {
      eventName = eventMatch[1].trim()
      continue
    }

    const dataMatch = /^data:\s?(.*)$/.exec(line.trimStart())
    if (dataMatch) {
      dataLines.push(dataMatch[1])
    }
  }

  if (!eventName || dataLines.length === 0) {
    return null
  }

  const rawPayload = dataLines.join('\n').trim()
  if (!rawPayload) {
    return null
  }

  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>
    if (
      eventName !== 'start' &&
      eventName !== 'progress' &&
      eventName !== 'plan' &&
      eventName !== 'component' &&
      eventName !== 'clarification' &&
      eventName !== 'done' &&
      eventName !== 'error'
    ) {
      return null
    }
    return {
      event: eventName,
      data: parsed as never
    } as ChatStreamEvent
  } catch {
    return null
  }
}

function parseXpertSseEventBlock(block: string): XpertStreamEnvelope | null {
  const lines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const dataLines: string[] = []
  for (const line of lines) {
    const dataMatch = /^data:\s?(.*)$/.exec(line.trimStart())
    if (dataMatch) {
      dataLines.push(dataMatch[1])
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  const rawPayload = dataLines.join('\n').trim()
  if (!rawPayload || rawPayload === '[DONE]') {
    return null
  }

  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>
    return {
      type: asString(parsed.type),
      event: asString(parsed.event),
      data: parsed.data
    }
  } catch {
    return null
  }
}

function extractLatestUserQuestion(messages: ReadonlyArray<{ role: string; content: ReadonlyArray<{ type: string; text?: string }> }>) {
  const latest = [...messages].reverse().find(message => message.role === 'user')
  if (!latest) return undefined
  const textParts = latest.content.filter(part => part.type === 'text')
  const question = textParts
    .map(part => (typeof part.text === 'string' ? part.text.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
  return question || undefined
}

function safeObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function buildLegacyResultSummary(doneEvent: Record<string, unknown> | undefined) {
  const result = safeObject(doneEvent?.result)
  const preview = Array.isArray(result?.preview) ? result.preview : []
  const rowCount = typeof result?.rowCount === 'number' ? result.rowCount : preview.length

  if (rowCount === 0) {
    return '未返回任何行，请调整筛选条件后重试。'
  }

  if (preview.length > 0) {
    const firstRow = safeObject(preview[0])
    const firstValue = firstRow?.formatted ?? firstRow?.value
    return `共返回 ${rowCount} 行。示例值: ${String(firstValue ?? '')}`
  }

  return `共返回 ${rowCount} 行。`
}

function asString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

function hasAnalysisPayload(doneEvent: ChatDoneEvent | undefined) {
  const answer = safeObject(doneEvent?.answer)
  const artifacts = Array.isArray(doneEvent?.artifacts) ? doneEvent.artifacts : []
  const executionHandle = safeObject(doneEvent?.executionHandle)
  const result = safeObject(doneEvent?.result)
  const meta = safeObject(doneEvent?.meta)
  const hasComponents = Array.isArray(answer?.components) && answer.components.length > 0
  const hasArtifacts = artifacts.length > 0
  const hasExecutionHandle = !!executionHandle
  const hasResult =
    !!result &&
    (typeof (result as { rowCount?: unknown }).rowCount === 'number' || Array.isArray((result as { data?: unknown }).data))
  const hasQueryLog = asString(doneEvent?.queryLogId) !== undefined || asString(meta?.queryLogId) !== undefined
  const hasTrace = asString(meta?.traceKey) !== undefined || asString(meta?.trace_key) !== undefined

  return hasComponents || hasArtifacts || hasExecutionHandle || hasResult || Boolean(hasQueryLog) || Boolean(hasTrace)
}

function isLikelyGreeting(text: string | undefined) {
  if (!text) return false
  const trimmed = text.trim().toLowerCase()
  const greetingPatterns = [
    '你好',
    'hi',
    'hello',
    'hey',
    '您好',
    '早上好',
    '上午好',
    '下午好',
    '晚上好',
    '再见',
    'thanks',
    'thank you',
    '谢谢'
  ]
  const hasAnalyticHints =
    trimmed.includes('查') ||
    trimmed.includes('看') ||
    trimmed.includes('分析') ||
    trimmed.includes('趋势') ||
    trimmed.includes('多少') ||
    trimmed.includes('指标') ||
    trimmed.includes('收入') ||
    trimmed.includes('毛利') ||
    trimmed.includes('销售') ||
    trimmed.includes('查询') ||
    trimmed.includes('compare') ||
    trimmed.includes('revenue') ||
    trimmed.includes('metric')

  if (hasAnalyticHints) {
    return false
  }

  return greetingPatterns.some(pattern => trimmed === pattern || trimmed.startsWith(`${pattern},`) || trimmed.startsWith(`${pattern}，`))
}

function looksLikeEchartsOption(value: unknown) {
  const record = safeObject(value)
  if (!record) {
    return false
  }

  const series = Array.isArray(record.series) ? record.series : []
  const hasEchartsSeriesShape = series.some(item => {
    const seriesRecord = safeObject(item)
    if (!seriesRecord) {
      return false
    }

    return (
      typeof seriesRecord.type === 'string' ||
      Array.isArray(seriesRecord.data) ||
      safeObject(seriesRecord.encode) !== undefined
    )
  })

  return (
    record.xAxis !== undefined ||
    record.yAxis !== undefined ||
    record.dataset !== undefined ||
    record.legend !== undefined ||
    record.tooltip !== undefined ||
    hasEchartsSeriesShape
  )
}

export function resolveProgressFromXpertLifecycleEvent(
  eventName: string | undefined,
  eventData: Record<string, unknown> | undefined,
  context?: { messageId?: string }
): ChatProgressEvent | null {
  const lifecycleEvent = normalizeRuntimeLifecycleEvent(eventName, eventData, context)
  if (!lifecycleEvent) {
    return null
  }

  const meta = safeObject(eventData?.meta)
  const conversation = safeObject(eventData?.conversation) ?? safeObject(meta?.conversation)
  const conversationId =
    asString(eventData?.conversationId) ??
    asString(eventData?.conversation_id) ??
    asString(conversation?.conversationId) ??
    asString(conversation?.conversation_id) ??
    asString(meta?.conversationId) ??
    asString(meta?.conversation_id)
  const traceKey =
    asString(eventData?.traceKey) ??
    asString(eventData?.trace_id) ??
    asString(meta?.traceKey) ??
    asString(meta?.trace_id)
  const taskId =
    asString(eventData?.taskId) ??
    asString(eventData?.task_id) ??
    asString(meta?.taskId) ??
    asString(meta?.task_id)
  const queryLogId = asString(eventData?.queryLogId) ?? asString(meta?.queryLogId)
  const progress = asFiniteNumber(eventData?.progress) ?? asFiniteNumber(meta?.progress)
  const total = asFiniteNumber(eventData?.total) ?? asFiniteNumber(meta?.total)

  return {
    phase: lifecycleEvent.phase,
    message: lifecycleEvent.message,
    category: lifecycleEvent.category,
    sourceEvent: lifecycleEvent.sourceEvent,
    status: lifecycleEvent.status,
    messageId: lifecycleEvent.messageId,
    ...(conversationId ? { conversationId } : {}),
    ...(traceKey ? { traceKey } : {}),
    ...(taskId ? { taskId } : {}),
    ...(queryLogId ? { queryLogId } : {}),
    ...(progress !== undefined ? { progress } : {}),
    ...(total !== undefined ? { total } : {}),
    detail: lifecycleEvent.detail
  }
}

export function resolvePlanFromXpertLifecycleEvent(
  eventName: string | undefined,
  eventData: Record<string, unknown> | undefined,
  context?: { messageId?: string }
): ChatPlanEvent | null {
  const lifecycleEvent = normalizeRuntimeLifecycleEvent(eventName, eventData, context)
  if (!lifecycleEvent) {
    return null
  }

  const projection = projectPlanFromNormalizedRuntimeLifecycleEvent(lifecycleEvent)
  if (!projection) {
    return null
  }

  return {
    ...projection,
    ts: new Date().toISOString()
  }
}

export function toChatComponentEvent(
  value: unknown,
  meta?: {
    sourceEvent?: string
    messageId?: string
  }
): ChatComponentEvent | null {
  const record = safeObject(value)
  if (!record) {
    return null
  }

  const componentMeta =
    meta && (meta.sourceEvent || meta.messageId)
      ? {
          ...(meta.sourceEvent ? { sourceEvent: meta.sourceEvent } : {}),
          ...(meta.messageId ? { messageId: meta.messageId } : {})
        }
      : {}

  const directType = asString(record.type)
  const directPayload = safeObject(record.payload)
  if ((directType === 'kpi' || directType === 'table' || directType === 'chart') && directPayload) {
    return {
      type: directType,
      payload: directPayload,
      ...componentMeta
    }
  }

  if (directType === 'component') {
    const envelope = safeObject(record.data)
    const candidates = [safeObject(envelope?.data), envelope].filter(Boolean) as Record<string, unknown>[]
    for (const candidate of candidates) {
      const nested = toChatComponentEvent(candidate, meta)
      if (nested) {
        return nested
      }
    }
  }

  const outputRecord = safeObject(record.output)
  if (outputRecord && looksLikeEchartsOption(outputRecord)) {
    return {
      type: 'chart',
      payload: { option: outputRecord },
      ...componentMeta
    }
  }

  const chartOptions = safeObject(record.chartOptions)
  if (chartOptions && looksLikeEchartsOption(chartOptions)) {
    return {
      type: 'chart',
      payload: { option: chartOptions },
      ...componentMeta
    }
  }

  const nestedOption = safeObject(record.option)
  if (nestedOption && looksLikeEchartsOption(nestedOption)) {
    return {
      type: 'chart',
      payload: record,
      ...componentMeta
    }
  }

  if (looksLikeEchartsOption(record)) {
    return {
      type: 'chart',
      payload: { option: record },
      ...componentMeta
    }
  }

  if (Array.isArray(record.rows) || Array.isArray(record.columns)) {
    return {
      type: 'table',
      payload: record,
      ...componentMeta
    }
  }

  if (record.value !== undefined || record.formatted !== undefined) {
    return {
      type: 'kpi',
      payload: record,
      ...componentMeta
    }
  }

  return null
}

export function extractXpertMessageArtifacts(payload: unknown): { text: string; components: ChatComponentEvent[] } {
  if (typeof payload === 'string') {
    return { text: payload, components: [] }
  }

  if (Array.isArray(payload)) {
    return payload.reduce(
      (state, item) => {
        const next = extractXpertMessageArtifacts(item)
        return {
          text: state.text + next.text,
          components: [...state.components, ...next.components]
        }
      },
      { text: '', components: [] as ChatComponentEvent[] }
    )
  }

  const record = safeObject(payload)
  if (!record) {
    return { text: '', components: [] }
  }

  const components: ChatComponentEvent[] = []
  const directComponent = toChatComponentEvent(record)
  if (directComponent) {
    components.push(directComponent)
  }

  let text = ''
  const directText = asString(record.text) ?? asString(record.content)
  if (directText) {
    text += directText
  }

  const nestedContent = Array.isArray(record.content) ? record.content : []
  for (const item of nestedContent) {
    const next = extractXpertMessageArtifacts(item)
    text += next.text
    components.push(...next.components)
  }

  if (record.data !== undefined) {
    const next = extractXpertMessageArtifacts(record.data)
    text += next.text
    components.push(...next.components)
  }

  const dedupedComponents: ChatComponentEvent[] = []
  const seenComponentKeys = new Set<string>()
  for (const component of components) {
    const key = `${component.type}:${JSON.stringify(component.payload)}`
    if (seenComponentKeys.has(key)) {
      continue
    }
    seenComponentKeys.add(key)
    dedupedComponents.push(component)
  }

  return { text, components: dedupedComponents }
}

export function deriveAnswerMode(doneEvent: ChatDoneEvent | undefined, question?: string) {
  const answer = safeObject(doneEvent?.answer)
  const answerMode = asString(answer?.mode)
  if (answerMode) {
    return answerMode
  }

  const meta = safeObject(doneEvent?.meta)
  const intent = safeObject(meta?.intent)
  const intentKind = asString(intent?.kind)
  if (intentKind === 'smalltalk') {
    return 'chat'
  }
  if (intentKind === 'clarification') {
    return 'clarification'
  }
  if (intentKind === 'analysis') {
    return 'analysis'
  }

  if (isLikelyGreeting(question)) {
    return 'chat'
  }

  if (!hasAnalysisPayload(doneEvent)) {
    return 'chat'
  }

  return 'analysis'
}

export function resolveAnalysisTextProjection(doneEvent: ChatDoneEvent | undefined) {
  const doneRecord = safeObject(doneEvent)
  if (!doneRecord) {
    return ''
  }

  return (
    resolveNarrativeArtifactText(doneRecord) ??
    summarizeAnalysisContract(doneRecord) ??
    buildLegacyResultSummary(doneRecord)
  )
}

function getLatestAssistantMessageId(conversation: unknown) {
  const record = safeObject(conversation)
  const messages = Array.isArray(record?.messages) ? record.messages : []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = safeObject(messages[index])
    const role = asString(message?.role)?.toLowerCase()
    if (role === 'assistant' || role === 'ai') {
      const id = asString(message?.id)
      if (id) {
        return id
      }
    }
  }
  return undefined
}

function normalizeComponents(doneEvent: Record<string, unknown> | undefined, streamed: ChatComponentEvent[]) {
  const doneAnswer = safeObject(doneEvent?.answer)
  const doneComponents = Array.isArray(doneAnswer?.components)
    ? doneAnswer.components
        .map(component => toChatComponentEvent(component))
        .filter((component): component is ChatComponentEvent => component !== null)
    : []

  if (doneComponents.length > 0) {
    return doneComponents
  }

  return streamed
}

function buildFinalAnswerPayload(params: {
  streamedAnswer: Record<string, unknown> | undefined
  streamedText: string
  streamedComponents: ChatComponentEvent[]
  streamedResult?: Record<string, unknown>
  streamedMeta?: Record<string, unknown>
  streamedArtifacts?: unknown[]
  streamedExecutionHandle?: Record<string, unknown>
}) {
  const baseAnswer = {
    ...(params.streamedAnswer ?? {})
  } as Record<string, unknown>

  const streamedText = params.streamedText.trim()
  if (!asString(baseAnswer.text) && streamedText) {
    baseAnswer.text = streamedText
  }

  const hasComponents = Array.isArray(baseAnswer.components) && baseAnswer.components.length > 0
  if (!hasComponents && params.streamedComponents.length > 0) {
    baseAnswer.components = params.streamedComponents
  }

  if (!asString(baseAnswer.text)) {
    const projectedText = resolveAnalysisTextProjection({
      answer: baseAnswer,
      ...(params.streamedResult ? { result: params.streamedResult } : {}),
      ...(params.streamedMeta ? { meta: params.streamedMeta } : {}),
      ...(params.streamedArtifacts ? { artifacts: params.streamedArtifacts } : {}),
      ...(params.streamedExecutionHandle ? { executionHandle: params.streamedExecutionHandle } : {})
    })
    if (projectedText) {
      baseAnswer.text = projectedText
    }
  }

  if (Object.keys(baseAnswer).length === 0) {
    return {
      text: streamedText
    } as Record<string, unknown>
  }

  return baseAnswer
}

function isRetryableStreamFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  if (error instanceof StreamTransportError) {
    if (error.status && [401, 403, 422].includes(error.status)) {
      return false
    }
    return error.retryable || !error.status || error.status >= 500
  }
  if (error instanceof StreamRequestError) {
    if (error.status && [401, 403, 422].includes(error.status)) {
      return false
    }
    return error.retryable || !error.status || error.status >= 500
  }
  return /network|fetch|timeout/i.test(error.message)
}

function resolveNarrativeArtifactText(doneEvent: Record<string, unknown>) {
  const artifacts = Array.isArray(doneEvent.artifacts) ? doneEvent.artifacts : []
  for (const artifact of artifacts) {
    const record = safeObject(artifact)
    if (record?.kind === 'narrative') {
      const text = asString(record.text)
      if (text) {
        return text
      }
    }
  }

  const answer = safeObject(doneEvent.answer)
  return asString(answer?.text)
}

function summarizeAnalysisContract(doneEvent: Record<string, unknown>) {
  const resultSetSummary = summarizeResultSetArtifact(doneEvent)
  if (resultSetSummary) {
    return resultSetSummary
  }

  const executionHandle = deriveExecutionHandle(doneEvent)
  if (!executionHandle) {
    return undefined
  }

  return summarizeExecutionHandle(executionHandle)
}

function summarizeResultSetArtifact(doneEvent: Record<string, unknown>) {
  const artifacts = Array.isArray(doneEvent.artifacts) ? doneEvent.artifacts : []
  for (const artifact of artifacts) {
    const record = safeObject(artifact)
    if (record?.kind !== 'result_set') {
      continue
    }
    const rowCount = asFiniteNumber(record.rowCount)
    const colCount = asFiniteNumber(record.colCount)
    if (rowCount !== undefined || colCount !== undefined) {
      return `query executed (rows=${rowCount ?? 0}, cols=${colCount ?? 0})`
    }
  }

  const result = safeObject(doneEvent.result)
  const rowCount = asFiniteNumber(result?.rowCount)
  const colCount = asFiniteNumber(result?.colCount)
  if (rowCount !== undefined || colCount !== undefined) {
    return `query executed (rows=${rowCount ?? 0}, cols=${colCount ?? 0})`
  }

  return undefined
}

function deriveExecutionHandle(
  doneEvent: Record<string, unknown>
):
  | {
      kind: RuntimeAnalysisExecutionKind
      runId?: string
      status?: string
      stage?: string
      queryLogId?: string
      traceKey?: string
    }
  | undefined {
  const explicit = normalizeExecutionHandle(safeObject(doneEvent.executionHandle))
  if (explicit) {
    return explicit
  }

  const meta = safeObject(doneEvent.meta)
  const whatIf = safeObject(meta?.whatIf)
  if (whatIf) {
    return normalizeExecutionHandle({
      kind: 'what_if',
      runId: whatIf.runId,
      status: whatIf.status,
      stage: whatIf.stage
    })
  }

  const attributionRun = safeObject(meta?.attributionRun)
  if (attributionRun) {
    return normalizeExecutionHandle({
      kind: 'attribution',
      runId: attributionRun.runId ?? attributionRun.id,
      status: attributionRun.status,
      stage: attributionRun.stage
    })
  }

  const queryLogId = asString(doneEvent.queryLogId) ?? asString(meta?.queryLogId)
  const traceKey = asString(meta?.traceKey) ?? asString(meta?.trace_key)
  if (!queryLogId && !traceKey) {
    return undefined
  }

  return {
    kind: 'query',
    ...(queryLogId ? { queryLogId } : {}),
    ...(traceKey ? { traceKey } : {})
  }
}

function normalizeExecutionHandle(
  value: Record<string, unknown> | undefined
):
  | {
      kind: RuntimeAnalysisExecutionKind
      runId?: string
      status?: string
      stage?: string
      queryLogId?: string
      traceKey?: string
    }
  | undefined {
  if (!value) {
    return undefined
  }

  const kind = normalizeExecutionKind(value.kind)
  if (!kind) {
    return undefined
  }

  const runId = asString(value.runId) ?? asString(value.id)
  const status = asString(value.status)
  const stage = asString(value.stage)
  const queryLogId = asString(value.queryLogId)
  const traceKey = asString(value.traceKey)

  if (!runId && !status && !stage && !queryLogId && !traceKey) {
    return undefined
  }

  return {
    kind,
    ...(runId ? { runId } : {}),
    ...(status ? { status } : {}),
    ...(stage ? { stage } : {}),
    ...(queryLogId ? { queryLogId } : {}),
    ...(traceKey ? { traceKey } : {})
  }
}

function normalizeExecutionKind(value: unknown): RuntimeAnalysisExecutionKind | undefined {
  if (value === 'query' || value === 'what_if' || value === 'attribution') {
    return value
  }
  return undefined
}

function summarizeExecutionHandle(handle: {
  kind: RuntimeAnalysisExecutionKind
  runId?: string
  status?: string
}) {
  switch (handle.kind) {
    case 'what_if':
      if (handle.runId && handle.status) {
        return `what-if compare executed (runId=${handle.runId}, status=${handle.status})`
      }
      if (handle.runId) {
        return `what-if compare executed (runId=${handle.runId})`
      }
      return 'what-if compare executed'
    case 'attribution':
      if (handle.runId && handle.status) {
        return `attribution run available (runId=${handle.runId}, status=${handle.status})`
      }
      if (handle.runId) {
        return `attribution run available (runId=${handle.runId})`
      }
      return 'attribution run available'
    case 'query':
    default:
      return 'query executed'
  }
}

async function refreshAuthSession() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({}),
    cache: 'no-store'
  })
  return response.ok
}

type RuntimeOptions = {
  modelId?: string
  xpertId?: string
  conversationId?: string
  mockChatScenario?: string
  mockChatLatencyMs?: number
  initialMessages?: readonly ThreadMessageLike[]
  analysisFollowup?: {
    prompt: string
    patch?: Record<string, unknown>
    analysisAction?: string
    baseQueryLogId?: string
  }
  onAnalysisFollowupConsumed?: () => void
  onConversationId?: (conversationId: string) => void
  onEvent?: (event: ChatStreamEvent) => void
  onRuntimeError?: (error: Error) => void
}

type StreamingRunQueue<T> = {
  push: (value: T) => void
  close: () => void
  fail: (error: unknown) => void
  iterate: () => AsyncGenerator<T, void>
}

function createStreamingRunQueue<T>(): StreamingRunQueue<T> {
  const values: T[] = []
  let closed = false
  let failedError: unknown
  let pendingResolve: ((result: IteratorResult<T>) => void) | null = null
  let pendingReject: ((error: unknown) => void) | null = null

  const resolvePending = (result: IteratorResult<T>) => {
    const resolve = pendingResolve
    pendingResolve = null
    pendingReject = null
    resolve?.(result)
  }

  return {
    push(value) {
      if (closed || failedError) {
        return
      }
      if (pendingResolve) {
        resolvePending({ value, done: false })
        return
      }
      values.push(value)
    },
    close() {
      closed = true
      if (pendingResolve) {
        resolvePending({ value: undefined as T, done: true })
      }
    },
    fail(error) {
      failedError = error
      const reject = pendingReject
      pendingResolve = null
      pendingReject = null
      reject?.(error)
    },
    async *iterate() {
      while (true) {
        if (values.length > 0) {
          yield values.shift() as T
          continue
        }
        if (failedError) {
          throw failedError
        }
        if (closed) {
          return
        }

        const next = await new Promise<IteratorResult<T>>((resolve, reject) => {
          pendingResolve = resolve
          pendingReject = reject
        })

        if (next.done) {
          return
        }

        yield next.value
      }
    }
  }
}

function getComponentEventKey(component: ChatComponentEvent) {
  return `${component.type}:${JSON.stringify(component.payload)}`
}

function cloneThreadAssistantMessagePart(part: ThreadAssistantMessagePart): ThreadAssistantMessagePart {
  if (part.type !== 'data') {
    return {
      ...part
    }
  }

  return {
    ...part,
    ...(part.data && typeof part.data === 'object' ? { data: structuredClone(part.data) } : {})
  }
}

export function upsertThreadMessageMetaPart(parts: ThreadAssistantMessagePart[], messageId: string | undefined) {
  if (!messageId) {
    return
  }

  const existingMeta = parts.find(isThreadMessageMetaPart)
  if (existingMeta) {
    existingMeta.data = {
      messageId
    }
    return
  }

  parts.push({
    type: 'data',
    name: 'chatbi_message_meta',
    data: {
      messageId
    }
  })
}

export function appendThreadTextPart(parts: ThreadAssistantMessagePart[], text: string) {
  if (!text) {
    return
  }

  const lastPart = parts[parts.length - 1]
  if (lastPart?.type === 'text') {
    parts[parts.length - 1] = {
      type: 'text',
      text: `${lastPart.text ?? ''}${text}`
    }
    return
  }

  parts.push({
    type: 'text',
    text
  })
}

function appendTimelineMarkerPart(parts: ThreadAssistantMessagePart[], order: number, kind: TimelineMarkerKind) {
  parts.push({
    type: 'data',
    name: 'chatbi_timeline_marker',
    data: {
      order,
      kind
    }
  })
}

function appendTimedThreadTextPart(parts: ThreadAssistantMessagePart[], text: string, order: number) {
  if (!text) {
    return
  }

  appendTimelineMarkerPart(parts, order, 'text')
  appendThreadTextPart(parts, text)
}

export function createChatbiStreamAdapter(options: RuntimeOptions): ChatModelAdapter {
  return {
    run: async function* ({ messages, abortSignal }) {
        const question = extractLatestUserQuestion(messages as never)
        if (!question) {
          const empty: ChatModelRunResult = {
            content: [{ type: 'text', text: '请先输入问题。' }]
          }
          yield empty
          return
        }

        const streamedComponents: ChatComponentEvent[] = []
        const streamedComponentKeys = new Set<string>()
        const streamedContentParts: ThreadAssistantMessagePart[] = []
        let clarification: ChatClarificationEvent | undefined
        let done: Record<string, unknown> | undefined
        let streamedXpertText = ''
        let streamedXpertConversationId: string | undefined
        let streamedXpertMessageId: string | undefined
        let streamedXpertMessageStatus: string | undefined
        let streamedAnswer: Record<string, unknown> | undefined
        let streamedResult: Record<string, unknown> | undefined
        let streamedClarification: Record<string, unknown> | undefined
        let streamedMeta: Record<string, unknown> | undefined
        let streamedArtifacts: unknown[] | undefined
        let streamedExecutionHandle: Record<string, unknown> | undefined
        let xpertProgressNotified = false
        const streamedUpdates = createStreamingRunQueue<ChatModelRunResult>()
        let streamedTextEmitted = ''
        let nextTimelineOrder = 0
        const allocateTimelineOrder = () => {
          nextTimelineOrder += 1
          return nextTimelineOrder
        }
        const emitProgressEvent = (data: ChatProgressEvent) => {
          options.onEvent?.({
            event: 'progress',
            data: {
              ...data,
              timelineOrder: allocateTimelineOrder()
            }
          })
        }
        const emitPlanEvent = (data: ChatPlanEvent | Record<string, unknown>) => {
          options.onEvent?.({
            event: 'plan',
            data: {
              ...data,
              timelineOrder: allocateTimelineOrder()
            }
          })
        }
        const pushAccumulatedContent = (metadata?: ChatModelRunResult['metadata']) => {
          streamedUpdates.push({
            ...(streamedContentParts.length > 0
              ? { content: streamedContentParts.map(cloneThreadAssistantMessagePart) }
              : {}),
            ...(metadata ? { metadata } : {})
          })
        }
        const ensureStreamedMessageMeta = (messageId: string | undefined) => {
          upsertThreadMessageMetaPart(streamedContentParts, messageId)
        }
        const appendStreamedText = (text: string) => {
          if (!text) {
            return
          }

          appendTimedThreadTextPart(streamedContentParts, text, allocateTimelineOrder())

          streamedTextEmitted += text
          pushAccumulatedContent()
        }
        const appendStreamedComponent = (component: ChatComponentEvent | null) => {
          if (!component) {
            return
          }
          const key = getComponentEventKey(component)
          if (streamedComponentKeys.has(key)) {
            return
          }
          const timedComponent = {
            ...component,
            timelineOrder: allocateTimelineOrder()
          } satisfies ChatComponentEvent
          streamedComponentKeys.add(key)
          streamedComponents.push(timedComponent)
          appendTimelineMarkerPart(streamedContentParts, timedComponent.timelineOrder!, 'component')
          streamedContentParts.push({
            type: 'data',
            name: 'chatbi_component',
            data: timedComponent
          })
          options.onEvent?.({
            event: 'component',
            data: timedComponent
          })
          pushAccumulatedContent()
        }

        options.onEvent?.({
          event: 'start',
          data: {
            ts: new Date().toISOString()
          }
        })

        const streamTask = (async () => {
          try {
            const requestBody = buildXpertChatRequestBody({
              question,
              modelId: options.modelId,
              xpertId: options.xpertId,
              conversationId: options.conversationId,
              analysisFollowup: options.analysisFollowup
            })
            if (options.analysisFollowup) {
              options.onAnalysisFollowupConsumed?.()
            }
            await runSseTransport<XpertStreamEnvelope>({
              url: `${resolveApiBaseUrlByTrack('xpert')}/chat`,
              headers: {
                accept: 'text/event-stream',
                'content-type': 'application/json',
                ...buildAuthHeaders(),
                ...buildRequestContextHeaders(),
                ...(options.mockChatScenario ? { 'x-chatbi-mock-scenario': options.mockChatScenario } : {}),
                ...(options.mockChatLatencyMs !== undefined
                  ? { 'x-chatbi-mock-latency-ms': String(options.mockChatLatencyMs) }
                  : {})
              },
              body: requestBody,
              signal: abortSignal,
              maxAttempts: 2,
              retryDelayMs: 0,
              shouldRetry: isRetryableStreamFailure,
              expectedContentType: 'text/event-stream',
              onUnauthorized: async () => {
                emitProgressEvent({
                  phase: 'context',
                  message: '认证状态已过期，正在刷新会话',
                  category: 'system'
                })
                const refreshed = await refreshAuthSession().catch(() => false)
                if (refreshed) {
                  emitProgressEvent({
                    phase: 'context',
                    message: '会话已刷新，正在恢复流式请求',
                    category: 'system'
                  })
                }
                return refreshed
              },
              onRetry: () => {
                emitProgressEvent({
                  phase: 'context',
                  message: 'xpert 流连接中断，正在重试一次',
                  category: 'system'
                })
              },
              parseEventBlock: parseXpertSseEventBlock,
              onEvent: parsed => {
                const envelope = parsed as XpertStreamEnvelope
                const messageType = asString(envelope.type)?.toLowerCase()
                const eventName = asString(envelope.event)?.toLowerCase()
                const eventData = safeObject(envelope.data)

                if (messageType === 'message') {
                  const artifacts = extractXpertMessageArtifacts(envelope.data)
                  for (const component of artifacts.components) {
                    appendStreamedComponent({
                      ...component,
                      ...(streamedXpertMessageId ? { messageId: streamedXpertMessageId } : {})
                    })
                  }

                  const nextText = artifacts.text
                  if (nextText) {
                    streamedXpertText += nextText
                    appendStreamedText(nextText)
                    if (!xpertProgressNotified) {
                      xpertProgressNotified = true
                      emitProgressEvent({
                        phase: 'execute',
                        message: 'xpert 响应中',
                        category: 'chat',
                        messageId: streamedXpertMessageId
                      })
                    }
                  }
                  return
                }

                if (messageType === 'component') {
                  const directRecord = safeObject(envelope.data)
                  const directMessageId = asString(directRecord?.messageId) ?? streamedXpertMessageId
                  appendStreamedComponent(
                    toChatComponentEvent(envelope.data, {
                      sourceEvent: 'component',
                      ...(directMessageId ? { messageId: directMessageId } : {})
                    })
                  )
                  return
                }

                if (messageType === 'event' && eventName) {
                  const lifecycleProgress = resolveProgressFromXpertLifecycleEvent(eventName, eventData, {
                    messageId: streamedXpertMessageId
                  })
                  if (lifecycleProgress) {
                    xpertProgressNotified = true
                    emitProgressEvent(lifecycleProgress)
                  }

                  const lifecyclePlan = resolvePlanFromXpertLifecycleEvent(eventName, eventData, {
                    messageId: streamedXpertMessageId
                  })
                  if (lifecyclePlan) {
                    emitPlanEvent(lifecyclePlan)
                  }

                  if (eventName === 'on_tool_message') {
                    appendStreamedComponent(
                      toChatComponentEvent(eventData, {
                        sourceEvent: eventName,
                        messageId: streamedXpertMessageId ?? asString(eventData?.messageId)
                      })
                    )
                  }

                  if (eventName === 'on_conversation_start' || eventName === 'on_conversation_end') {
                    const conversationId = asString(eventData?.id) ?? asString(eventData?.conversationId)
                    if (conversationId) {
                      streamedXpertConversationId = conversationId
                      options.onConversationId?.(conversationId)
                    }
                  }

                  if (eventName === 'on_message_start') {
                    const messageId = asString(eventData?.id) ?? asString(eventData?.messageId)
                    if (messageId) {
                      streamedXpertMessageId = messageId
                      ensureStreamedMessageMeta(messageId)
                      pushAccumulatedContent()
                    }
                  }

                  if (eventName === 'on_message_end') {
                    const messageId = asString(eventData?.id) ?? asString(eventData?.messageId)
                    if (messageId) {
                      streamedXpertMessageId = messageId
                    }
                    const answerPayload = safeObject(eventData?.answer)
                    if (answerPayload) {
                      streamedAnswer = answerPayload
                    }
                    const resultPayload = safeObject(eventData?.result)
                    if (resultPayload) {
                      streamedResult = resultPayload
                    }
                    const clarificationPayload = safeObject(eventData?.clarification)
                    if (clarificationPayload) {
                      streamedClarification = clarificationPayload
                    }
                    const metaPayload = safeObject(eventData?.meta)
                    if (metaPayload) {
                      streamedMeta = metaPayload
                    }
                    const artifactsPayload = Array.isArray(eventData?.artifacts) ? eventData.artifacts : undefined
                    if (artifactsPayload) {
                      streamedArtifacts = artifactsPayload
                    }
                    const executionHandlePayload = safeObject(eventData?.executionHandle)
                    if (executionHandlePayload) {
                      streamedExecutionHandle = executionHandlePayload
                    }
                    const status = asString(eventData?.status)?.toLowerCase()
                    if (status) {
                      streamedXpertMessageStatus = status
                    }
                    const errorMessage = asString(eventData?.error)
                    if (status === 'error' || errorMessage) {
                      throw new StreamRequestError(errorMessage ?? 'xpert 消息执行失败', 200)
                    }
                  }

                  if (eventName === 'on_conversation_end') {
                    const fallbackMessageId = getLatestAssistantMessageId(eventData)
                    if (fallbackMessageId) {
                      streamedXpertMessageId = streamedXpertMessageId ?? fallbackMessageId
                    }
                    done = {
                      ...(streamedResult ? { result: streamedResult } : {}),
                      ...(streamedClarification ? { clarification: streamedClarification } : {}),
                      ...(streamedArtifacts ? { artifacts: streamedArtifacts } : {}),
                      ...(streamedExecutionHandle ? { executionHandle: streamedExecutionHandle } : {}),
                      answer: buildFinalAnswerPayload({
                        streamedAnswer,
                        streamedText: streamedXpertText,
                        streamedComponents,
                        streamedResult,
                        streamedMeta,
                        streamedArtifacts,
                        streamedExecutionHandle
                      }),
                      meta: {
                        ...(streamedMeta ?? {}),
                        conversation: {
                          conversationId: streamedXpertConversationId
                        },
                        ...(streamedXpertMessageId ? { messageId: streamedXpertMessageId } : {}),
                        ...(streamedXpertMessageStatus ? { messageStatus: streamedXpertMessageStatus } : {}),
                        track: 'xpert'
                      }
                    }
                  }
                }
              }
            })
          } catch (error) {
            if (error instanceof Error) {
              options.onEvent?.({
                event: 'error',
                data: {
                  message: error.message,
                  ts: new Date().toISOString()
                }
              })
              options.onRuntimeError?.(error)
            }
            streamedUpdates.fail(error)
            return
          }

          if (!done) {
            done = {
              ...(streamedResult ? { result: streamedResult } : {}),
              ...(streamedClarification ? { clarification: streamedClarification } : {}),
              ...(streamedArtifacts ? { artifacts: streamedArtifacts } : {}),
              ...(streamedExecutionHandle ? { executionHandle: streamedExecutionHandle } : {}),
              answer: buildFinalAnswerPayload({
                streamedAnswer,
                streamedText: streamedXpertText,
                streamedComponents,
                streamedResult,
                streamedMeta,
                streamedArtifacts,
                streamedExecutionHandle
              }),
              meta: {
                ...(streamedMeta ?? {}),
                conversation: {
                  conversationId: streamedXpertConversationId
                },
                ...(streamedXpertMessageId ? { messageId: streamedXpertMessageId } : {}),
                ...(streamedXpertMessageStatus ? { messageStatus: streamedXpertMessageStatus } : {}),
                track: 'xpert'
              }
            }
          }

          options.onEvent?.({
            event: 'done',
            data: done
          })

          const finalParts: ThreadAssistantMessagePart[] = [...streamedContentParts]
          const answer = safeObject(done?.answer)
          const answerMode = deriveAnswerMode(done, question)
          const doneClarification = clarification ?? (safeObject(done?.clarification) as ChatClarificationEvent | undefined)

          if (doneClarification?.required === true) {
            appendTimedThreadTextPart(finalParts, doneClarification.message, allocateTimelineOrder())
            appendTimelineMarkerPart(finalParts, allocateTimelineOrder(), 'clarification')
            finalParts.push({
              type: 'data',
              name: 'chatbi_clarification',
              data: {
                ...doneClarification,
                timelineOrder: nextTimelineOrder
              }
            })
          } else if (answerMode === 'chat') {
            const chatText =
              typeof answer?.text === 'string' && answer.text.trim() !== ''
                ? answer.text
                : '你好，我可以帮你分析指标趋势、对比和明细。'
            if (!streamedTextEmitted || chatText !== streamedTextEmitted) {
              appendTimedThreadTextPart(finalParts, chatText, allocateTimelineOrder())
            }
          } else {
            const answerText = resolveAnalysisTextProjection(done)
            if (answerText && answerText !== streamedTextEmitted) {
              appendTimedThreadTextPart(finalParts, answerText, allocateTimelineOrder())
            } else if (!streamedTextEmitted) {
              appendTimedThreadTextPart(finalParts, '分析已执行。', allocateTimelineOrder())
            }

            const components = normalizeComponents(done, streamedComponents)
            for (const component of components) {
              if (streamedComponentKeys.has(getComponentEventKey(component))) {
                continue
              }
              const timedComponent = {
                ...component,
                timelineOrder: allocateTimelineOrder()
              } satisfies ChatComponentEvent
              appendTimelineMarkerPart(finalParts, timedComponent.timelineOrder!, 'component')
              finalParts.push({
                type: 'data',
                name: 'chatbi_component',
                data: timedComponent
              })
            }
          }

          const doneMeta = safeObject(done?.meta)
          const serverMessageId = asString(doneMeta?.messageId)
          const hasMessageMeta = finalParts.some(part => part.type === 'data' && part.name === 'chatbi_message_meta')
          if (serverMessageId && !hasMessageMeta) {
            finalParts.push({
              type: 'data',
              name: 'chatbi_message_meta',
              data: {
                messageId: serverMessageId
              }
            })
          }

          const sourceItems = deriveChatSourceItems(done ?? undefined)
          if (sourceItems.length > 0) {
            finalParts.push({
              type: 'data',
              name: 'chatbi_sources',
              data: {
                items: sourceItems
              }
            })
          }

          streamedContentParts.splice(0, streamedContentParts.length, ...finalParts)
          pushAccumulatedContent({
            custom: {
              chatbi: done ?? null
            }
          })
          streamedUpdates.close()
        })()

        for await (const update of streamedUpdates.iterate()) {
          yield update
        }

        await streamTask
      }
    }
  }
export function useChatbiStreamRuntime(options: RuntimeOptions) {
  const adapter = useMemo<ChatModelAdapter>(() => createChatbiStreamAdapter(options), [
    options.analysisFollowup,
    options.conversationId,
    options.modelId,
    options.mockChatLatencyMs,
    options.mockChatScenario,
    options.onAnalysisFollowupConsumed,
    options.onConversationId,
    options.onEvent,
    options.onRuntimeError,
    options.xpertId
  ])

  return useLocalRuntime(adapter, {
    initialMessages: options.initialMessages
  })
}
