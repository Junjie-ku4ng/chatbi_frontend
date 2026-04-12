import type { ChatProgressCategory, ChatStreamEvent } from '@/modules/chat/runtime/chat-runtime-event-types'

type AskRuntimeEventEntry = {
  id: number
  receivedAt: string
  event: ChatStreamEvent
}

export type AskRuntimeEventGroupKey = 'system' | 'agent' | 'tool' | 'chat'

export const askRuntimeEventGroupLabels: Record<AskRuntimeEventGroupKey, string> = {
  system: 'System',
  agent: 'Agent',
  tool: 'Tool',
  chat: 'ChatEvent'
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return undefined
}

export function resolveAskRuntimeEventTone(event: ChatStreamEvent): 'brand' | 'ok' | 'danger' | 'neutral' {
  if (event.event === 'error') return 'danger'
  if (event.event === 'done') return 'ok'
  if (event.event === 'start') return 'brand'
  return 'neutral'
}

export function resolveAskRuntimeEventGroup(event: ChatStreamEvent): AskRuntimeEventGroupKey {
  if (event.event === 'progress') {
    const category = event.data.category as ChatProgressCategory | undefined
    if (category === 'agent' || category === 'tool' || category === 'chat' || category === 'system') {
      return category
    }
    return 'system'
  }
  if (event.event === 'component') return 'tool'
  if (event.event === 'plan') return 'agent'
  if (event.event === 'clarification') return 'chat'
  return 'system'
}

export function formatAskRuntimeEventLabel(event: ChatStreamEvent) {
  if (event.event === 'start') return '会话已发起'
  if (event.event === 'progress') {
    const phase = event.data.phase ?? 'execute'
    const phaseLabel =
      phase === 'context'
        ? '上下文'
        : phase === 'resolve'
          ? '解析'
          : phase === 'plan'
            ? '规划'
            : phase === 'execute'
              ? '执行'
              : phase === 'render'
                ? '渲染'
                : '处理中'
    return `${phaseLabel} · ${event.data.message ?? '进行中'}`
  }
  if (event.event === 'plan') return '规划更新'
  if (event.event === 'component') {
    const payload = asRecord(event.data.payload)
    const title = asString(payload?.title) ?? asString(payload?.name)
    return title ? `组件输出 · ${event.data.type} · ${title}` : `组件输出 · ${event.data.type}`
  }
  if (event.event === 'clarification') return event.data.message || '需要补充澄清信息'
  if (event.event === 'done') return '会话完成'
  if (event.event === 'error') return asString(event.data?.message) ?? '执行失败'
  return '运行中'
}

export function formatAskRuntimeEventClock(isoTime: string) {
  const parsed = new Date(isoTime)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(parsed)
}

export function groupAskRuntimeEvents(entries: ReadonlyArray<AskRuntimeEventEntry>, limit = 24) {
  const buckets: Record<AskRuntimeEventGroupKey, AskRuntimeEventEntry[]> = {
    system: [],
    agent: [],
    tool: [],
    chat: []
  }

  for (const entry of [...entries].reverse().slice(0, limit)) {
    const key = resolveAskRuntimeEventGroup(entry.event)
    buckets[key].push(entry)
  }

  return (['system', 'agent', 'tool', 'chat'] as const)
    .map(key => ({
      key,
      label: askRuntimeEventGroupLabels[key],
      items: buckets[key]
    }))
    .filter(group => group.items.length > 0)
}
