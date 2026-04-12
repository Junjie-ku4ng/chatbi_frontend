import type { ChatComponentEvent, ChatPlanEvent, ChatProgressEvent, ChatStreamEvent } from './chatbi-stream-runtime'

export type RuntimeExecutionNodeKind = 'agent' | 'tool' | 'retriever'
export type RuntimeExecutionNodeStatus = 'pending' | 'running' | 'paused' | 'success' | 'error'
export type RuntimeTaskStatusHint = 'idle' | 'running' | 'paused' | 'success' | 'error'
export type RuntimeControlPhase = 'idle' | 'running' | 'paused' | 'done' | 'error'
export type RuntimeMessageStepKind = RuntimeExecutionNodeKind | 'component' | 'chat' | 'plan'

export type RuntimeExecutionNode = {
  key: string
  id: string
  kind: RuntimeExecutionNodeKind
  label: string
  status: RuntimeExecutionNodeStatus
  messageId: string | null
  sourceEvent: string | null
  startedAt: string | null
  updatedAt: string
  runtimeEventId: number
}

export type RuntimeMessageStep = {
  id: string
  messageId: string
  kind: RuntimeMessageStepKind
  title: string | null
  status: string | null
  sourceEvent: string | null
  traceKey: string | null
  queryLogId: string | null
  progressPercent: number | null
  updatedAt: string
  runtimeEventId: number
  detail: Record<string, unknown> | null
}

export type RuntimeMessageExecutionGroup = {
  key: string
  messageId: string | null
  label: string
  steps: RuntimeMessageStep[]
  latestRuntimeEventId: number
}

export type RuntimeTaskHints = {
  statusHint: RuntimeTaskStatusHint
  messageId: string | null
  sourceEvent: string | null
  conversationId: string | null
  traceKey: string | null
  taskId: string | null
  queryLogId: string | null
  progressPercent: number | null
  updatedAt: string | null
}

export type RuntimeControlState = {
  phase: RuntimeControlPhase
  canInterrupt: boolean
  canResume: boolean
  canCancel: boolean
}

export type ChatRuntimeProjectionState = {
  executionTree: Record<string, RuntimeExecutionNode>
  executionOrder: string[]
  messageStepsByMessageId: Record<string, RuntimeMessageStep[]>
  taskRuntimeHints: RuntimeTaskHints
  taskRuntimeHintsByConversationId: Record<string, RuntimeTaskHints>
  taskRuntimeHintsByTraceKey: Record<string, RuntimeTaskHints>
  taskRuntimeHintsByTaskId: Record<string, RuntimeTaskHints>
  runtimeControlState: RuntimeControlState
}

export type ChatRuntimeProjectionContext = {
  runtimeEventId: number
  receivedAt: string
}

const defaultMessageKey = '__default__'

export function resolveRuntimeControlState(statusHint: RuntimeTaskStatusHint): RuntimeControlState {
  if (statusHint === 'running') {
    return {
      phase: 'running',
      canInterrupt: true,
      canResume: false,
      canCancel: true
    }
  }

  if (statusHint === 'paused') {
    return {
      phase: 'paused',
      canInterrupt: false,
      canResume: true,
      canCancel: true
    }
  }

  if (statusHint === 'success') {
    return {
      phase: 'done',
      canInterrupt: false,
      canResume: false,
      canCancel: false
    }
  }

  if (statusHint === 'error') {
    return {
      phase: 'error',
      canInterrupt: false,
      canResume: false,
      canCancel: false
    }
  }

  return {
    phase: 'idle',
    canInterrupt: false,
    canResume: false,
    canCancel: false
  }
}

export function createInitialChatRuntimeProjectionState(): ChatRuntimeProjectionState {
  return {
    executionTree: {},
    executionOrder: [],
    messageStepsByMessageId: {},
    taskRuntimeHints: {
      statusHint: 'idle',
      messageId: null,
      sourceEvent: null,
      conversationId: null,
      traceKey: null,
      taskId: null,
      queryLogId: null,
      progressPercent: null,
      updatedAt: null
    },
    taskRuntimeHintsByConversationId: {},
    taskRuntimeHintsByTraceKey: {},
    taskRuntimeHintsByTaskId: {},
    runtimeControlState: resolveRuntimeControlState('idle')
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toProgressPercent(progress: number | undefined, total: number | undefined) {
  if (progress === undefined) {
    return undefined
  }
  if (total !== undefined && total > 0) {
    const ratio = (progress / total) * 100
    return Math.max(0, Math.min(100, Math.round(ratio)))
  }
  return Math.max(0, Math.min(100, Math.round(progress)))
}

function normalizeStatus(status: string | null | undefined) {
  return typeof status === 'string' && status.length > 0 ? status.toLowerCase() : undefined
}

function resolveMessageIdFromProgress(event: ChatProgressEvent) {
  return asString(event.messageId) ?? asString(event.detail?.messageId)
}

function resolveMessageIdFromPlan(event: ChatPlanEvent | Record<string, unknown>) {
  return asString((event as { messageId?: unknown }).messageId)
}

function resolveMessageIdFromDone(data: Record<string, unknown>) {
  const meta = asRecord(data.meta)
  return asString(meta?.messageId) ?? asString(data.messageId)
}

function normalizeTaskStatus(value: string | undefined): RuntimeTaskStatusHint | undefined {
  const normalized = normalizeStatus(value)
  if (!normalized) {
    return undefined
  }

  if (normalized === 'error' || normalized === 'failed' || normalized === 'fail') {
    return 'error'
  }

  if (
    normalized === 'paused' ||
    normalized === 'interrupt' ||
    normalized === 'interrupted' ||
    normalized === 'await_user_confirmation'
  ) {
    return 'paused'
  }

  if (normalized === 'success' || normalized === 'done' || normalized === 'completed' || normalized === 'complete') {
    return 'success'
  }

  if (
    normalized === 'running' ||
    normalized === 'planning' ||
    normalized === 'execute' ||
    normalized === 'executing' ||
    normalized === 'render' ||
    normalized === 'queued'
  ) {
    return 'running'
  }

  return undefined
}

function updateTaskRuntimeHints(
  state: ChatRuntimeProjectionState,
  input: {
    statusHint: RuntimeTaskStatusHint
    messageId?: string
    sourceEvent?: string
    conversationId?: string
    traceKey?: string
    taskId?: string
    queryLogId?: string
    progressPercent?: number
    updatedAt: string
  }
) {
  const nextHints: RuntimeTaskHints = {
    statusHint: input.statusHint,
    messageId: input.messageId ?? state.taskRuntimeHints.messageId,
    sourceEvent: input.sourceEvent ?? state.taskRuntimeHints.sourceEvent,
    conversationId: input.conversationId ?? state.taskRuntimeHints.conversationId,
    traceKey: input.traceKey ?? state.taskRuntimeHints.traceKey,
    taskId: input.taskId ?? state.taskRuntimeHints.taskId,
    queryLogId: input.queryLogId ?? state.taskRuntimeHints.queryLogId,
    progressPercent: input.progressPercent ?? state.taskRuntimeHints.progressPercent,
    updatedAt: input.updatedAt
  }

  const taskRuntimeHintsByConversationId = nextHints.conversationId
    ? {
        ...state.taskRuntimeHintsByConversationId,
        [nextHints.conversationId]: nextHints
      }
    : state.taskRuntimeHintsByConversationId

  const taskRuntimeHintsByTraceKey = nextHints.traceKey
    ? {
        ...state.taskRuntimeHintsByTraceKey,
        [nextHints.traceKey]: nextHints
      }
    : state.taskRuntimeHintsByTraceKey

  const taskRuntimeHintsByTaskId = nextHints.taskId
    ? {
        ...state.taskRuntimeHintsByTaskId,
        [nextHints.taskId]: nextHints
      }
    : state.taskRuntimeHintsByTaskId

  return {
    ...state,
    taskRuntimeHints: nextHints,
    taskRuntimeHintsByConversationId,
    taskRuntimeHintsByTraceKey,
    taskRuntimeHintsByTaskId,
    runtimeControlState: resolveRuntimeControlState(nextHints.statusHint)
  }
}

function resolveProgressContextKeys(event: ChatProgressEvent) {
  const detail = asRecord(event.detail)
  return {
    conversationId: asString(event.conversationId) ?? asString(detail?.conversationId) ?? asString(detail?.conversation_id),
    traceKey: asString(event.traceKey) ?? asString(detail?.traceKey) ?? asString(detail?.trace_id),
    taskId: asString(event.taskId) ?? asString(detail?.taskId) ?? asString(detail?.task_id),
    queryLogId: asString(event.queryLogId) ?? asString(detail?.queryLogId),
    progressPercent: toProgressPercent(
      asFiniteNumber(event.progress) ?? asFiniteNumber(detail?.progress),
      asFiniteNumber(event.total) ?? asFiniteNumber(detail?.total)
    )
  }
}

function resolveDoneContextKeys(data: Record<string, unknown>) {
  const meta = asRecord(data.meta)
  const conversation = asRecord(meta?.conversation) ?? asRecord(data.conversation)
  return {
    conversationId:
      asString(conversation?.conversationId) ??
      asString(conversation?.conversation_id) ??
      asString(meta?.conversationId) ??
      asString(meta?.conversation_id) ??
      asString(data.conversationId) ??
      asString(data.conversation_id),
    traceKey:
      asString(meta?.traceKey) ??
      asString(meta?.trace_id) ??
      asString(data.traceKey) ??
      asString(data.trace_id),
    taskId:
      asString(meta?.taskId) ??
      asString(meta?.task_id) ??
      asString(data.taskId) ??
      asString(data.task_id),
    queryLogId: asString(data.queryLogId) ?? asString(meta?.queryLogId)
  }
}

function resolveErrorContextKeys(data: Record<string, unknown>) {
  const meta = asRecord(data.meta)
  return {
    conversationId:
      asString(meta?.conversationId) ??
      asString(meta?.conversation_id) ??
      asString(data.conversationId) ??
      asString(data.conversation_id),
    traceKey:
      asString(meta?.traceKey) ??
      asString(meta?.trace_id) ??
      asString(data.traceKey) ??
      asString(data.trace_id),
    taskId:
      asString(meta?.taskId) ??
      asString(meta?.task_id) ??
      asString(data.taskId) ??
      asString(data.task_id),
    queryLogId: asString(data.queryLogId) ?? asString(meta?.queryLogId)
  }
}

function resolveNodeIdentity(event: ChatProgressEvent): {
  key: string
  id: string
  kind: RuntimeExecutionNodeKind
  label: string
} | null {
  const sourceEvent = asString(event.sourceEvent)?.toLowerCase()
  const detail = event.detail

  if (sourceEvent?.includes('retriever')) {
    const id = asString(detail?.id) ?? asString(detail?.retriever) ?? asString(detail?.name)
    if (!id) return null
    return {
      key: `retriever:${id}`,
      id,
      kind: 'retriever',
      label: asString(detail?.title) ?? asString(detail?.message) ?? asString(detail?.retriever) ?? id
    }
  }

  if (sourceEvent?.includes('agent') || event.category === 'agent') {
    const id = asString(detail?.id) ?? asString(detail?.name) ?? asString(detail?.title)
    if (!id) return null
    return {
      key: `agent:${id}`,
      id,
      kind: 'agent',
      label: asString(detail?.title) ?? asString(detail?.name) ?? id
    }
  }

  if (sourceEvent?.includes('tool') || event.category === 'tool') {
    const id = asString(detail?.id) ?? asString(detail?.toolName) ?? asString(detail?.tool) ?? asString(detail?.name)
    if (!id) return null
    const toolLabel = [asString(detail?.toolset), asString(detail?.tool)].filter(Boolean).join('/')
    return {
      key: `tool:${id}`,
      id,
      kind: 'tool',
      label: asString(detail?.title) ?? asString(detail?.message) ?? (toolLabel || asString(detail?.toolName) || id)
    }
  }

  return null
}

function resolveExecutionNodeStatus(
  event: ChatProgressEvent,
  previousStatus: RuntimeExecutionNodeStatus | undefined
): RuntimeExecutionNodeStatus {
  const sourceEvent = asString(event.sourceEvent)?.toLowerCase()
  const normalizedStatus = normalizeStatus(asString(event.status) ?? asString(event.detail?.status))

  if (sourceEvent?.endsWith('_start')) {
    return 'running'
  }

  if (sourceEvent?.endsWith('_error')) {
    return 'error'
  }

  if (sourceEvent?.endsWith('_end')) {
    if (normalizedStatus === 'error' || normalizedStatus === 'failed' || normalizedStatus === 'fail') {
      return 'error'
    }
    if (normalizedStatus === 'paused' || normalizedStatus === 'interrupted') {
      return 'paused'
    }
    return 'success'
  }

  if (normalizedStatus === 'running' || normalizedStatus === 'planning' || normalizedStatus === 'executing') {
    return 'running'
  }

  if (normalizedStatus === 'success' || normalizedStatus === 'done' || normalizedStatus === 'completed') {
    return 'success'
  }

  if (normalizedStatus === 'error' || normalizedStatus === 'failed') {
    return 'error'
  }

  if (normalizedStatus === 'paused' || normalizedStatus === 'interrupted') {
    return 'paused'
  }

  return previousStatus ?? 'pending'
}

function reduceExecutionNode(
  state: ChatRuntimeProjectionState,
  event: ChatProgressEvent,
  context: ChatRuntimeProjectionContext
): ChatRuntimeProjectionState {
  const identity = resolveNodeIdentity(event)
  if (!identity) {
    return state
  }

  const previous = state.executionTree[identity.key]
  const nextStatus = resolveExecutionNodeStatus(event, previous?.status)
  const messageId = resolveMessageIdFromProgress(event) ?? previous?.messageId ?? null
  const sourceEvent = asString(event.sourceEvent) ?? previous?.sourceEvent ?? null

  const nextNode: RuntimeExecutionNode = {
    key: identity.key,
    id: identity.id,
    kind: identity.kind,
    label: identity.label,
    status: nextStatus,
    messageId,
    sourceEvent,
    startedAt: previous?.startedAt ?? (nextStatus === 'running' ? context.receivedAt : null),
    updatedAt: context.receivedAt,
    runtimeEventId: context.runtimeEventId
  }

  return {
    ...state,
    executionTree: {
      ...state.executionTree,
      [identity.key]: nextNode
    },
    executionOrder: previous ? state.executionOrder : [...state.executionOrder, identity.key]
  }
}

function reduceMessageStep(
  state: ChatRuntimeProjectionState,
  step: RuntimeMessageStep
) {
  const steps = state.messageStepsByMessageId[step.messageId] ?? []
  const existingIndex = steps.findIndex(current => current.id === step.id)
  const nextSteps = [...steps]
  if (existingIndex >= 0) {
    nextSteps[existingIndex] = step
  } else {
    nextSteps.push(step)
  }

  return {
    ...state,
    messageStepsByMessageId: {
      ...state.messageStepsByMessageId,
      [step.messageId]: nextSteps
    }
  }
}

function buildProgressMessageStep(
  event: ChatProgressEvent,
  context: ChatRuntimeProjectionContext
) {
  const messageId = resolveMessageIdFromProgress(event) ?? defaultMessageKey
  const sourceEvent = asString(event.sourceEvent)?.toLowerCase()
  const status = normalizeStatus(asString(event.status) ?? asString(event.detail?.status)) ?? null
  const contextKeys = resolveProgressContextKeys(event)

  if (sourceEvent === 'on_chat_event') {
    const stepId = asString(event.detail?.id)
    if (!stepId) {
      return null
    }

    return {
      id: stepId,
      messageId,
      kind: 'chat' as const,
      title: asString(event.detail?.title) ?? asString(event.detail?.message) ?? asString(event.message) ?? null,
      status,
      sourceEvent: asString(event.sourceEvent) ?? null,
      traceKey: contextKeys.traceKey ?? null,
      queryLogId: contextKeys.queryLogId ?? null,
      progressPercent: contextKeys.progressPercent ?? null,
      updatedAt: context.receivedAt,
      runtimeEventId: context.runtimeEventId,
      detail: asRecord(event.detail) ?? null
    }
  }

  const identity = resolveNodeIdentity(event)
  if (!identity) {
    return null
  }

  return {
    id: identity.key,
    messageId,
    kind: identity.kind,
    title: identity.label,
    status,
    sourceEvent: asString(event.sourceEvent) ?? null,
    traceKey: contextKeys.traceKey ?? null,
    queryLogId: contextKeys.queryLogId ?? null,
    progressPercent: contextKeys.progressPercent ?? null,
    updatedAt: context.receivedAt,
    runtimeEventId: context.runtimeEventId,
    detail: asRecord(event.detail) ?? null
  }
}

function reduceProgressMessageStep(
  state: ChatRuntimeProjectionState,
  event: ChatProgressEvent,
  context: ChatRuntimeProjectionContext
) {
  const step = buildProgressMessageStep(event, context)
  if (!step) {
    return state
  }

  return reduceMessageStep(state, step)
}

function reduceComponentMessageStep(
  state: ChatRuntimeProjectionState,
  event: ChatComponentEvent,
  context: ChatRuntimeProjectionContext
) {
  const messageId = asString(event.messageId) ?? defaultMessageKey
  const payload = asRecord(event.payload)
  const title = asString(payload?.title) ?? asString(payload?.name)
  return reduceMessageStep(state, {
    id: `component:${context.runtimeEventId}`,
    messageId,
    kind: 'component',
    title: title ? `组件输出 · ${event.type} · ${title}` : `组件输出 · ${event.type}`,
    status: 'success',
    sourceEvent: asString(event.sourceEvent) ?? null,
    traceKey: state.taskRuntimeHints.traceKey,
    queryLogId: state.taskRuntimeHints.queryLogId,
    progressPercent: state.taskRuntimeHints.progressPercent,
    updatedAt: context.receivedAt,
    runtimeEventId: context.runtimeEventId,
    detail: payload ?? null
  })
}

function reduceProgressEvent(
  state: ChatRuntimeProjectionState,
  event: ChatProgressEvent,
  context: ChatRuntimeProjectionContext
) {
  let nextState = reduceExecutionNode(state, event, context)
  nextState = reduceProgressMessageStep(nextState, event, context)

  const sourceEvent = asString(event.sourceEvent)?.toLowerCase()
  const messageId = resolveMessageIdFromProgress(event)
  const contextKeys = resolveProgressContextKeys(event)
  const mappedStatus =
    sourceEvent === 'on_interrupt'
      ? 'paused'
      : normalizeTaskStatus(asString(event.status) ?? asString(event.detail?.status)) ??
        (sourceEvent?.endsWith('_start') ? 'running' : undefined)

  if (!mappedStatus) {
    return nextState
  }

  return updateTaskRuntimeHints(nextState, {
    statusHint: mappedStatus,
    messageId,
    sourceEvent: asString(event.sourceEvent),
    conversationId: contextKeys.conversationId,
    traceKey: contextKeys.traceKey,
    taskId: contextKeys.taskId,
    queryLogId: contextKeys.queryLogId,
    progressPercent: contextKeys.progressPercent,
    updatedAt: context.receivedAt
  })
}

function reducePlanEvent(state: ChatRuntimeProjectionState, event: ChatPlanEvent | Record<string, unknown>, context: ChatRuntimeProjectionContext) {
  const eventRecord = event as Record<string, unknown>
  const eventMeta = asRecord(eventRecord.meta)
  const status = normalizeTaskStatus(asString((event as { status?: unknown }).status)) ?? 'running'
  const nextState = reduceMessageStep(state, {
    id: `plan:${context.runtimeEventId}`,
    messageId: resolveMessageIdFromPlan(event) ?? defaultMessageKey,
    kind: 'plan',
    title:
      asString((event as { title?: unknown }).title) ??
      asString((event as { agent?: unknown }).agent) ??
      '规划更新',
    status: normalizeStatus(asString((event as { status?: unknown }).status)) ?? 'running',
    sourceEvent: asString((event as { sourceEvent?: unknown }).sourceEvent) ?? null,
    traceKey:
      asString(eventRecord.traceKey) ??
      asString(eventRecord.trace_id) ??
      asString(eventMeta?.traceKey) ??
      asString(eventMeta?.trace_id) ??
      null,
    queryLogId: asString(eventRecord.queryLogId) ?? asString(eventMeta?.queryLogId) ?? null,
    progressPercent: null,
    updatedAt: context.receivedAt,
    runtimeEventId: context.runtimeEventId,
    detail: eventRecord
  })

  return updateTaskRuntimeHints(nextState, {
    statusHint: status,
    messageId: resolveMessageIdFromPlan(event),
    sourceEvent: asString((event as { sourceEvent?: unknown }).sourceEvent),
    conversationId:
      asString(eventRecord.conversationId) ??
      asString(eventRecord.conversation_id) ??
      asString(eventMeta?.conversationId) ??
      asString(eventMeta?.conversation_id),
    traceKey:
      asString(eventRecord.traceKey) ??
      asString(eventRecord.trace_id) ??
      asString(eventMeta?.traceKey) ??
      asString(eventMeta?.trace_id),
    taskId:
      asString(eventRecord.taskId) ??
      asString(eventRecord.task_id) ??
      asString(eventMeta?.taskId) ??
      asString(eventMeta?.task_id),
    queryLogId: asString(eventRecord.queryLogId) ?? asString(eventMeta?.queryLogId),
    updatedAt: context.receivedAt
  })
}

export function reduceChatRuntimeProjectionState(
  state: ChatRuntimeProjectionState,
  event: ChatStreamEvent,
  context?: ChatRuntimeProjectionContext
): ChatRuntimeProjectionState {
  const effectiveContext = context ?? {
    runtimeEventId: 0,
    receivedAt: new Date().toISOString()
  }

  if (event.event === 'start') {
    const resetState = createInitialChatRuntimeProjectionState()
    return updateTaskRuntimeHints(resetState, {
      statusHint: 'running',
      updatedAt: effectiveContext.receivedAt
    })
  }

  if (event.event === 'progress') {
    return reduceProgressEvent(state, event.data, effectiveContext)
  }

  if (event.event === 'plan') {
    return reducePlanEvent(state, event.data, effectiveContext)
  }

  if (event.event === 'component') {
    return reduceComponentMessageStep(state, event.data, effectiveContext)
  }

  if (event.event === 'done') {
    const contextKeys = resolveDoneContextKeys(event.data)
    return updateTaskRuntimeHints(state, {
      statusHint: 'success',
      messageId: resolveMessageIdFromDone(event.data),
      sourceEvent: 'done',
      conversationId: contextKeys.conversationId,
      traceKey: contextKeys.traceKey,
      taskId: contextKeys.taskId,
      queryLogId: contextKeys.queryLogId,
      progressPercent: 100,
      updatedAt: effectiveContext.receivedAt
    })
  }

  if (event.event === 'error') {
    const contextKeys = resolveErrorContextKeys(event.data)
    return updateTaskRuntimeHints(state, {
      statusHint: 'error',
      messageId: asString(event.data.messageId),
      sourceEvent: 'error',
      conversationId: contextKeys.conversationId,
      traceKey: contextKeys.traceKey,
      taskId: contextKeys.taskId,
      queryLogId: contextKeys.queryLogId,
      updatedAt: effectiveContext.receivedAt
    })
  }

  return state
}

export function selectExecutionNodes(state: ChatRuntimeProjectionState): RuntimeExecutionNode[] {
  return state.executionOrder.map(key => state.executionTree[key]).filter((node): node is RuntimeExecutionNode => Boolean(node))
}

export function selectMessageStepsByMessageId(state: ChatRuntimeProjectionState, messageId: string | null | undefined) {
  if (!messageId) {
    return state.messageStepsByMessageId[defaultMessageKey] ?? []
  }

  const directSteps = state.messageStepsByMessageId[messageId] ?? []
  const defaultSteps = state.messageStepsByMessageId[defaultMessageKey] ?? []
  const merged = [...defaultSteps, ...directSteps]
  const deduped = new Map<string, RuntimeMessageStep>()

  for (const step of merged) {
    deduped.set(`${step.id}:${step.runtimeEventId}`, step)
  }

  return [...deduped.values()].sort((left, right) => left.runtimeEventId - right.runtimeEventId)
}

export function selectMessageExecutionGroups(state: ChatRuntimeProjectionState): RuntimeMessageExecutionGroup[] {
  return Object.entries(state.messageStepsByMessageId)
    .map(([messageId, steps]) => ({
      key: messageId,
      messageId: messageId === defaultMessageKey ? null : messageId,
      label: messageId === defaultMessageKey ? 'message · current' : `message · ${messageId}`,
      steps: [...steps].sort((left, right) => left.runtimeEventId - right.runtimeEventId),
      latestRuntimeEventId: steps.reduce((max, step) => Math.max(max, step.runtimeEventId), 0)
    }))
    .sort((left, right) => left.latestRuntimeEventId - right.latestRuntimeEventId)
}

export function selectTaskRuntimeStatusHint(state: ChatRuntimeProjectionState) {
  return state.taskRuntimeHints
}

export function selectTaskRuntimeHintForTask(
  state: ChatRuntimeProjectionState,
  input: {
    taskId?: string | null
    conversationId?: string | null
    traceKey?: string | null
  }
) {
  if (input.taskId) {
    const hint = state.taskRuntimeHintsByTaskId[input.taskId]
    if (hint) {
      return hint
    }
  }
  if (input.conversationId) {
    const hint = state.taskRuntimeHintsByConversationId[input.conversationId]
    if (hint) {
      return hint
    }
  }
  if (input.traceKey) {
    const hint = state.taskRuntimeHintsByTraceKey[input.traceKey]
    if (hint) {
      return hint
    }
  }
  return null
}
