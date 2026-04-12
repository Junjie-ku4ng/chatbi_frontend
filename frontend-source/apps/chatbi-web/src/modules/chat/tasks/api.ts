import { apiRequest } from '@/lib/api-client'
import type { RuntimeTaskHints, RuntimeTaskStatusHint } from '@/modules/chat/runtime/chat-runtime-projection'
import { appendPagingQuery } from '@/modules/shared/paging/paging'

export type ChatTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export type ChatTask = {
  id: string
  modelId: string
  tenant?: string
  sourceType: string
  traceKey?: string
  conversationId?: string
  title: string
  detail?: string
  status: ChatTaskStatus
  progress: number
  total?: number
  errorMessage?: string
  payload?: Record<string, unknown>
  resultPayload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  retryCount: number
  lastRetryAt?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  runtimeUpdatedAt?: string
  runtimeSourceEvent?: string
  runtimeStatusHint?: RuntimeTaskStatusHint
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
}

export type ChatTaskRuntimeHintLookup = {
  byTaskId?: Record<string, RuntimeTaskHints>
  byConversationId?: Record<string, RuntimeTaskHints>
  byTraceKey?: Record<string, RuntimeTaskHints>
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

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeStatus(value: unknown): ChatTaskStatus {
  const status = asString(value)?.toLowerCase()
  if (status === 'queued' || status === 'running' || status === 'succeeded' || status === 'failed' || status === 'cancelled') {
    return status
  }
  if (status === 'paused') return 'cancelled'
  if (status === 'archived') return 'succeeded'
  if (status === 'scheduled') return 'queued'
  return 'queued'
}

function mapRuntimeHintToTaskStatus(hint: RuntimeTaskStatusHint): ChatTaskStatus {
  if (hint === 'running' || hint === 'paused') return 'running'
  if (hint === 'success') return 'succeeded'
  if (hint === 'error') return 'failed'
  return 'queued'
}

function toChatTask(item: Record<string, unknown>): ChatTask {
  const options = asRecord(item.options)
  const status = normalizeStatus(asString(options?.runtimeStatus) ?? item.status)
  return {
    id: asString(item.id) ?? '',
    modelId: asString(item.xpertId) ?? asString(options?.modelId) ?? 'unknown-model',
    tenant: asString(item.tenantId),
    sourceType: asString(options?.sourceType) ?? 'xpert_task',
    traceKey: asString(options?.traceKey),
    conversationId: asString(options?.conversationId),
    title: asString(item.name) ?? asString(options?.title) ?? 'Untitled Task',
    detail: asString(item.prompt) ?? asString(options?.detail),
    status,
    progress: asNumber(
      options?.progress,
      status === 'queued' || status === 'running' ? 0 : 100
    ),
    total: typeof options?.total === 'number' ? options.total : undefined,
    errorMessage: asString(options?.errorMessage),
    payload: asRecord(options?.payload),
    resultPayload: asRecord(options?.resultPayload),
    metadata: asRecord(options?.metadata),
    retryCount: asNumber(options?.retryCount, 0),
    lastRetryAt: asString(options?.lastRetryAt),
    createdAt: asString(item.createdAt),
    createdBy: asString(item.createdById),
    updatedAt: asString(item.updatedAt),
    updatedBy: asString(item.updatedById)
  }
}

export function resolveRuntimeHintForChatTask(task: ChatTask, hints: ChatTaskRuntimeHintLookup) {
  if (task.id && hints.byTaskId?.[task.id]) {
    return hints.byTaskId[task.id]
  }
  if (task.conversationId && hints.byConversationId?.[task.conversationId]) {
    return hints.byConversationId[task.conversationId]
  }
  if (task.traceKey && hints.byTraceKey?.[task.traceKey]) {
    return hints.byTraceKey[task.traceKey]
  }
  return null
}

export function mergeChatTaskWithRuntimeHint(task: ChatTask, hint: RuntimeTaskHints | null | undefined): ChatTask {
  if (!hint || hint.statusHint === 'idle') {
    return task
  }

  const status = mapRuntimeHintToTaskStatus(hint.statusHint)
  const nextProgress =
    hint.progressPercent !== null && hint.progressPercent !== undefined
      ? hint.progressPercent
      : status === 'succeeded' || status === 'failed'
        ? 100
        : task.progress

  return {
    ...task,
    status,
    progress: nextProgress,
    runtimeUpdatedAt: hint.updatedAt ?? task.runtimeUpdatedAt,
    runtimeSourceEvent: hint.sourceEvent ?? task.runtimeSourceEvent,
    runtimeStatusHint: hint.statusHint
  }
}

export async function listChatTasks(input: {
  modelId: string
  status?: ChatTaskStatus
  q?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        xpertId: input.modelId
      },
      take: input.limit ?? 20,
      skip: input.offset ?? 0,
      order: {
        updatedAt: 'DESC'
      }
    })
  })
  appendPagingQuery(query, input)

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    `/xpert-task/my?${query.toString()}`,
    {
      track: 'xpert'
    }
  )

  let items = (Array.isArray(payload?.items) ? payload.items : []).map(toChatTask)
  if (input.status) {
    items = items.filter(item => item.status === input.status)
  }
  if (input.q) {
    const keyword = input.q.toLowerCase()
    items = items.filter(item => `${item.title} ${item.detail ?? ''}`.toLowerCase().includes(keyword))
  }
  return {
    items,
    total: items.length,
    limit: input.limit,
    offset: input.offset
  } satisfies Page<ChatTask>
}

export async function getChatTask(id: string) {
  const payload = await apiRequest<Record<string, unknown>>(`/xpert-task/${encodeURIComponent(id)}`, {
    track: 'xpert'
  })
  return toChatTask(payload)
}

export async function retryChatTask(id: string, actor?: string) {
  await apiRequest(`/xpert-task/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    track: 'xpert',
    body: actor ? { actor } : {}
  })
  return getChatTask(id)
}
