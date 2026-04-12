import type { ExpertExecutionLogRecord, ExpertExecutionRecord } from './workspace-api'

type RuntimeControlViewModel = {
  command: string
  status: string
  reason?: string
  requestedAt?: string
}

export type RuntimeKernelContext = {
  conversationId?: string
  threadId?: string
  turnId?: string
  traceKey?: string
  runtimeControl?: Partial<RuntimeControlViewModel>
}

export type ToolCallViewModel = {
  id: string
  name: string
  status: string
  summary?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
}

export type ExecutionViewModel = {
  executionId: string
  title: string
  status: string
  lifecycleStatus: string
  conversationId?: string
  traceKey?: string
  threadId?: string
  turnId?: string
  runtimeControl: RuntimeControlViewModel
  pendingActionCount: number
  pendingActionKeys: string[]
  toolCalls: ToolCallViewModel[]
}

export type StateViewModel = {
  lifecycleStatus: string
  transitions: string[]
  runtimeControl: RuntimeControlViewModel
  checkpointId?: number
  messageCount: number
  pendingActionCount: number
  topLevelKeys: string[]
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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readPath(record: Record<string, unknown> | undefined, path: string[]) {
  let current: unknown = record
  for (const key of path) {
    const currentRecord = asRecord(current)
    if (!currentRecord) {
      return undefined
    }
    current = currentRecord[key]
  }
  return current
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value)
    if (text) {
      return text
    }
  }
  return undefined
}

function pickRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value)
    if (record) {
      return record
    }
  }
  return undefined
}

function pickArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

function normalizeTransitions(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(item => asString(item)).filter((item): item is string => Boolean(item))
}

function resolveRuntimeControl(stateRecord: Record<string, unknown> | undefined, logRecord: Record<string, unknown> | undefined) {
  const runtimeControl = pickRecord(
    readPath(stateRecord, ['runtimeControl']),
    readPath(stateRecord, ['conversation', 'runtimeControl']),
    readPath(stateRecord, ['meta', 'runtimeControl']),
    readPath(logRecord, ['runtimeControl']),
    readPath(logRecord, ['conversation', 'runtimeControl'])
  )

  return {
    command: pickString(runtimeControl?.command, runtimeControl?.runtimeCommand) ?? 'unknown',
    status: pickString(runtimeControl?.status) ?? 'unknown',
    reason: pickString(runtimeControl?.reason, runtimeControl?.runtimeReason),
    requestedAt: pickString(runtimeControl?.requestedAt)
  } satisfies RuntimeControlViewModel
}

function resolveLifecycle(stateRecord: Record<string, unknown> | undefined, logRecord: Record<string, unknown> | undefined) {
  const lifecycle = pickRecord(
    readPath(stateRecord, ['executionLifecycle']),
    readPath(stateRecord, ['meta', 'executionLifecycle']),
    readPath(logRecord, ['executionLifecycle'])
  )
  return {
    status: pickString(lifecycle?.status) ?? 'unknown',
    transitions: normalizeTransitions(lifecycle?.transitions)
  }
}

function resolvePendingActions(stateRecord: Record<string, unknown> | undefined, logRecord: Record<string, unknown> | undefined) {
  const pendingActions = pickArray(
    readPath(stateRecord, ['pendingActions']),
    readPath(stateRecord, ['meta', 'pendingActions']),
    readPath(logRecord, ['pendingActions'])
  )

  const pendingActionKeys = pendingActions
    .map((item, index) => {
      const record = asRecord(item)
      if (!record) {
        return `pending-${index + 1}`
      }
      return pickString(record.id, record.action, record.name) ?? `pending-${index + 1}`
    })
    .filter(Boolean)

  return {
    count: pendingActionKeys.length,
    keys: pendingActionKeys
  }
}

function resolveToolCalls(stateRecord: Record<string, unknown> | undefined, logRecord: Record<string, unknown> | undefined) {
  const toolExecutions = pickArray(
    readPath(stateRecord, ['toolExecutions']),
    readPath(stateRecord, ['meta', 'toolExecutions']),
    readPath(stateRecord, ['metrics', 'toolExecutions']),
    readPath(logRecord, ['toolExecutions']),
    readPath(logRecord, ['metrics', 'toolExecutions'])
  )

  const mapped: ToolCallViewModel[] = []
  toolExecutions.forEach((item, index) => {
    const record = asRecord(item)
    if (!record) {
      return
    }
    const startedAt = pickString(record.startedAt, record.startAt, record.createdAt)
    const finishedAt = pickString(record.finishedAt, record.endAt, record.updatedAt)
    const startedTs = startedAt ? Date.parse(startedAt) : NaN
    const finishedTs = finishedAt ? Date.parse(finishedAt) : NaN
    const summary = pickString(record.summary, record.message)
    const next: ToolCallViewModel = {
      id: pickString(record.callId, record.id) ?? `tool-${index + 1}`,
      name: pickString(record.tool, record.name, record.action) ?? 'unknown',
      status: pickString(record.status) ?? 'unknown',
      startedAt,
      finishedAt,
      durationMs:
        Number.isFinite(startedTs) && Number.isFinite(finishedTs) && finishedTs >= startedTs ? finishedTs - startedTs : undefined
    }
    if (summary) {
      next.summary = summary
    }
    mapped.push(next)
  })
  return mapped
}

function resolveConversationContext(
  execution: ExpertExecutionRecord | null | undefined,
  log: ExpertExecutionLogRecord | null | undefined,
  stateRecord: Record<string, unknown> | undefined,
  logRecord: Record<string, unknown> | undefined
) {
  const messageConversationId = Array.isArray(log?.messages)
    ? log.messages
        .map(item => asRecord(item))
        .map(item => (item ? pickString(item.conversationId, item.conversation_id, item.threadId, item.thread_id) : undefined))
        .find(Boolean)
    : undefined

  const conversationRecord = pickRecord(
    readPath(stateRecord, ['conversation']),
    readPath(logRecord, ['conversation']),
    readPath(logRecord, ['meta', 'conversation'])
  )

  return {
    conversationId: pickString(
      readPath(stateRecord, ['conversationId']),
      readPath(stateRecord, ['conversation_id']),
      readPath(logRecord, ['conversationId']),
      readPath(logRecord, ['conversation_id']),
      readPath(logRecord, ['meta', 'conversationId']),
      conversationRecord?.conversationId,
      conversationRecord?.conversation_id,
      messageConversationId
    ),
    threadId: pickString(
      readPath(stateRecord, ['threadId']),
      readPath(stateRecord, ['thread_id']),
      readPath(logRecord, ['threadId']),
      readPath(logRecord, ['thread_id']),
      readPath(logRecord, ['meta', 'threadId']),
      conversationRecord?.threadId,
      conversationRecord?.thread_id
    ),
    turnId: pickString(
      readPath(stateRecord, ['turnId']),
      readPath(stateRecord, ['turn_id']),
      readPath(logRecord, ['turnId']),
      readPath(logRecord, ['turn_id']),
      readPath(logRecord, ['meta', 'turnId']),
      conversationRecord?.turnId,
      conversationRecord?.turn_id
    ),
    traceKey: pickString(
      readPath(stateRecord, ['traceKey']),
      readPath(stateRecord, ['trace_id']),
      readPath(logRecord, ['traceKey']),
      readPath(logRecord, ['trace_id']),
      readPath(logRecord, ['meta', 'traceKey']),
      readPath(logRecord, ['meta', 'trace_id']),
      conversationRecord?.traceKey,
      conversationRecord?.trace_id
    ),
    executionId: execution?.id ?? log?.id
  }
}

function resolveCheckpointId(stateRecord: Record<string, unknown> | undefined) {
  return asNumber(
    readPath(stateRecord, ['checkpoint', 'id']) ??
      readPath(stateRecord, ['checkpointId']) ??
      readPath(stateRecord, ['checkpoint_id'])
  )
}

export function mapExecutionViewModel(input: {
  execution: ExpertExecutionRecord | null | undefined
  log: ExpertExecutionLogRecord | null | undefined
  state: Record<string, unknown> | undefined
  runtimeContext?: RuntimeKernelContext
}): ExecutionViewModel {
  const stateRecord = asRecord(input.state)
  const logRecord = asRecord(input.log?.metadata)
  const lifecycle = resolveLifecycle(stateRecord, logRecord)
  const resolvedRuntimeControl = resolveRuntimeControl(stateRecord, logRecord)
  const runtimeControl: RuntimeControlViewModel =
    resolvedRuntimeControl.command === 'unknown' && resolvedRuntimeControl.status === 'unknown' && input.runtimeContext?.runtimeControl
      ? {
          command: input.runtimeContext.runtimeControl.command ?? resolvedRuntimeControl.command,
          status: input.runtimeContext.runtimeControl.status ?? resolvedRuntimeControl.status,
          reason: input.runtimeContext.runtimeControl.reason ?? resolvedRuntimeControl.reason,
          requestedAt: input.runtimeContext.runtimeControl.requestedAt ?? resolvedRuntimeControl.requestedAt
        }
      : resolvedRuntimeControl
  const pendingActions = resolvePendingActions(stateRecord, logRecord)
  const conversation = resolveConversationContext(input.execution, input.log, stateRecord, logRecord)
  const toolCalls = resolveToolCalls(stateRecord, logRecord)

  return {
    executionId: conversation.executionId ?? 'unknown',
    title:
      input.execution?.title ??
      input.log?.title ??
      input.execution?.agentKey ??
      input.execution?.type ??
      input.execution?.category ??
      input.execution?.id ??
      'unknown',
    status: input.execution?.status ?? input.log?.status ?? lifecycle.status,
    lifecycleStatus: lifecycle.status,
    conversationId: conversation.conversationId ?? input.runtimeContext?.conversationId,
    traceKey: conversation.traceKey ?? input.runtimeContext?.traceKey,
    threadId: conversation.threadId ?? input.runtimeContext?.threadId,
    turnId: conversation.turnId ?? input.runtimeContext?.turnId,
    runtimeControl,
    pendingActionCount: pendingActions.count,
    pendingActionKeys: pendingActions.keys,
    toolCalls
  }
}

export function mapStateViewModel(input: {
  state: Record<string, unknown> | undefined
  log: ExpertExecutionLogRecord | null | undefined
}): StateViewModel {
  const stateRecord = asRecord(input.state)
  const logRecord = asRecord(input.log?.metadata)
  const lifecycle = resolveLifecycle(stateRecord, logRecord)
  const runtimeControl = resolveRuntimeControl(stateRecord, logRecord)
  const pendingActions = resolvePendingActions(stateRecord, logRecord)
  const stateMessages = pickArray(readPath(stateRecord, ['messages']), readPath(stateRecord, ['meta', 'messages']))
  const timelineMessages = Array.isArray(input.log?.messages) ? input.log.messages : []
  const messageCount = stateMessages.length > 0 ? stateMessages.length : timelineMessages.length

  return {
    lifecycleStatus: lifecycle.status,
    transitions: lifecycle.transitions,
    runtimeControl,
    checkpointId: resolveCheckpointId(stateRecord),
    messageCount,
    pendingActionCount: pendingActions.count,
    topLevelKeys: stateRecord ? Object.keys(stateRecord).sort() : []
  }
}
