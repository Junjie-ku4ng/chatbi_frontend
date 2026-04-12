export type RuntimeLifecycleDetail = {
  id: string | null
  name: string | null
  title: string | null
  message: string | null
  status: string | null
  messageId: string | null
  conversationId: string | null
  traceKey: string | null
  taskId: string | null
  queryLogId: string | null
  progress: number | null
  total: number | null
  tool: string | null
  toolName: string | null
  toolset: string | null
  retriever: string | null
  effect: string | null
  action: string | null
  reason: string | null
  error: string | null
}

export type RuntimeLifecyclePhase = 'context' | 'resolve' | 'plan' | 'execute' | 'render'
export type RuntimeLifecycleCategory = 'agent' | 'tool' | 'chat' | 'system'
export const supportedRuntimeLifecycleEvents = [
  'on_agent_start',
  'on_agent_end',
  'on_tool_message',
  'on_tool_start',
  'on_tool_end',
  'on_retriever_start',
  'on_retriever_end',
  'on_chat_event',
  'on_client_effect',
  'on_interrupt',
  'on_tool_error',
  'on_retriever_error'
] as const

export type SupportedRuntimeLifecycleEvent = (typeof supportedRuntimeLifecycleEvents)[number]
type PlanLifecycleEvent = Extract<SupportedRuntimeLifecycleEvent, 'on_agent_start' | 'on_agent_end'>

export type NormalizedRuntimeLifecycleEvent = {
  sourceEvent: SupportedRuntimeLifecycleEvent
  phase: RuntimeLifecyclePhase
  category: RuntimeLifecycleCategory
  message: string
  status?: string
  messageId?: string
  detail: RuntimeLifecycleDetail
}

export type RuntimeLifecyclePlanProjection = {
  phase: 'plan'
  title?: string
  agent?: string
  agentId?: string
  status?: string
  sourceEvent: PlanLifecycleEvent
  messageId?: string
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

  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

function extractTitleForProgress(data: Record<string, unknown> | undefined) {
  if (!data) return undefined
  return (
    asString(data.title) ??
    asString(data.message) ??
    asString(data.name) ??
    asString(data.tool) ??
    asString(data.toolName)
  )
}

function buildStableDetail(
  eventData: Record<string, unknown> | undefined,
  context?: { messageId?: string },
  normalizedEvent?: string
) {
  const ownMessageId =
    normalizedEvent === 'on_message_start' || normalizedEvent === 'on_message_end'
      ? asString(eventData?.id)
      : undefined
  const messageId = asString(eventData?.messageId) ?? ownMessageId ?? context?.messageId
  const name = asString(eventData?.name)
  const meta = asRecord(eventData?.meta)
  const conversation = asRecord(eventData?.conversation) ?? asRecord(meta?.conversation)
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
    id: asString(eventData?.id) ?? null,
    name: name ?? null,
    title: asString(eventData?.title) ?? null,
    message: asString(eventData?.message) ?? null,
    status: asString(eventData?.status) ?? null,
    messageId: messageId ?? null,
    conversationId: conversationId ?? null,
    traceKey: traceKey ?? null,
    taskId: taskId ?? null,
    queryLogId: queryLogId ?? null,
    progress: progress ?? null,
    total: total ?? null,
    tool: asString(eventData?.tool) ?? null,
    toolName: asString(eventData?.toolName) ?? null,
    toolset: asString(eventData?.toolset) ?? null,
    retriever: asString(eventData?.retriever) ?? name ?? null,
    effect: asString(eventData?.effect) ?? null,
    action: asString(eventData?.action) ?? null,
    reason: asString(eventData?.reason) ?? null,
    error: asString(eventData?.error) ?? null
  } as RuntimeLifecycleDetail
}

function buildToolLabel(detail: RuntimeLifecycleDetail, fallback: string) {
  const candidate = detail.title ?? detail.message ?? detail.name
  if (candidate) {
    return candidate
  }

  const toolPair = [detail.toolset, detail.tool].filter(Boolean).join('/')
  if (toolPair) {
    return toolPair
  }

  return detail.toolName ?? fallback
}

function buildRetrieverLabel(detail: RuntimeLifecycleDetail, fallback: string) {
  return detail.title ?? detail.message ?? detail.retriever ?? detail.name ?? fallback
}

function buildClientEffectLabel(detail: RuntimeLifecycleDetail) {
  return detail.title ?? detail.message ?? detail.effect ?? detail.action ?? '客户端动作已执行'
}

type RuntimeLifecycleSpecContext = {
  detail: RuntimeLifecycleDetail
  status?: string
  normalizedStatus?: string
  eventData: Record<string, unknown> | undefined
}

type RuntimeLifecycleSpec = {
  category: RuntimeLifecycleCategory
  phase: (context: RuntimeLifecycleSpecContext) => RuntimeLifecyclePhase
  message: (context: RuntimeLifecycleSpecContext) => string
}

const runtimeLifecycleSpecs: Record<SupportedRuntimeLifecycleEvent, RuntimeLifecycleSpec> = {
  on_agent_start: {
    category: 'agent',
    phase: () => 'plan',
    message: ({ eventData }) => {
      const title = extractTitleForProgress(eventData)
      return title ? `代理启动: ${title}` : '代理启动'
    }
  },
  on_agent_end: {
    category: 'agent',
    phase: ({ normalizedStatus }) => (normalizedStatus === 'error' ? 'execute' : 'render'),
    message: ({ eventData, normalizedStatus }) => {
      const title = extractTitleForProgress(eventData)
      return title ?? (normalizedStatus === 'error' ? '代理执行失败' : '代理执行完成')
    }
  },
  on_tool_message: {
    category: 'tool',
    phase: () => 'execute',
    message: ({ detail, status }) => {
      const label = buildToolLabel(detail, '工具执行')
      return `${label}${status ? ` (${status})` : ''}`
    }
  },
  on_tool_start: {
    category: 'tool',
    phase: () => 'execute',
    message: ({ detail }) => `工具启动: ${buildToolLabel(detail, '工具执行')}`
  },
  on_tool_end: {
    category: 'tool',
    phase: ({ normalizedStatus }) => (normalizedStatus === 'error' ? 'execute' : 'render'),
    message: ({ detail, normalizedStatus }) => {
      const label = buildToolLabel(detail, '工具执行')
      return normalizedStatus === 'error' ? `${label} 执行失败` : `${label} 执行完成`
    }
  },
  on_retriever_start: {
    category: 'tool',
    phase: () => 'resolve',
    message: ({ detail }) => `检索开始: ${buildRetrieverLabel(detail, '检索任务')}`
  },
  on_retriever_end: {
    category: 'tool',
    phase: () => 'resolve',
    message: ({ detail, normalizedStatus }) => {
      const label = buildRetrieverLabel(detail, '检索任务')
      return normalizedStatus === 'error' ? `${label} 检索失败` : `${label} 检索完成`
    }
  },
  on_chat_event: {
    category: 'chat',
    phase: ({ normalizedStatus }) => (normalizedStatus === 'success' ? 'render' : 'execute'),
    message: ({ eventData, normalizedStatus }) => {
      const title = extractTitleForProgress(eventData)
      return title ?? (normalizedStatus === 'success' ? '步骤完成' : '处理中')
    }
  },
  on_client_effect: {
    category: 'chat',
    phase: () => 'render',
    message: ({ detail }) => buildClientEffectLabel(detail)
  },
  on_interrupt: {
    category: 'system',
    phase: () => 'execute',
    message: () => '执行中断，等待确认'
  },
  on_tool_error: {
    category: 'system',
    phase: () => 'execute',
    message: ({ detail }) => detail.error ?? '执行失败'
  },
  on_retriever_error: {
    category: 'system',
    phase: () => 'execute',
    message: ({ detail }) => detail.error ?? '执行失败'
  }
}

function isSupportedRuntimeLifecycleEvent(eventName: string): eventName is SupportedRuntimeLifecycleEvent {
  return Object.prototype.hasOwnProperty.call(runtimeLifecycleSpecs, eventName)
}

function isPlanLifecycleEvent(eventName: SupportedRuntimeLifecycleEvent): eventName is PlanLifecycleEvent {
  return eventName === 'on_agent_start' || eventName === 'on_agent_end'
}

export function normalizeRuntimeLifecycleEvent(
  eventName: string | undefined,
  eventData: Record<string, unknown> | undefined,
  context?: { messageId?: string }
): NormalizedRuntimeLifecycleEvent | null {
  const normalizedEventName = eventName?.toLowerCase()
  if (!normalizedEventName || !isSupportedRuntimeLifecycleEvent(normalizedEventName)) {
    return null
  }

  const detail = buildStableDetail(eventData, context, normalizedEventName)
  const status = detail.status ?? undefined
  const normalizedStatus = status?.toLowerCase()
  const messageId = detail.messageId ?? undefined
  const lifecycleSpec = runtimeLifecycleSpecs[normalizedEventName]

  return {
    sourceEvent: normalizedEventName,
    phase: lifecycleSpec.phase({
      detail,
      status,
      normalizedStatus,
      eventData
    }),
    category: lifecycleSpec.category,
    message: lifecycleSpec.message({
      detail,
      status,
      normalizedStatus,
      eventData
    }),
    status,
    messageId,
    detail
  }
}

export function projectPlanFromNormalizedRuntimeLifecycleEvent(
  event: NormalizedRuntimeLifecycleEvent
): RuntimeLifecyclePlanProjection | null {
  if (!isPlanLifecycleEvent(event.sourceEvent)) {
    return null
  }

  return {
    phase: 'plan',
    title: event.detail.title ?? undefined,
    agentId: event.detail.id ?? undefined,
    agent: event.detail.name ?? undefined,
    status: event.status,
    sourceEvent: event.sourceEvent,
    messageId: event.messageId
  }
}
