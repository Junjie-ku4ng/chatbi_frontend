import type { RuntimeLifecycleDetail } from './runtime-event-contract'

export type ChatProgressCategory = 'agent' | 'tool' | 'chat' | 'system'

export type ChatProgressEvent = {
  phase: 'context' | 'resolve' | 'plan' | 'execute' | 'render'
  message?: string
  ts?: string
  category?: ChatProgressCategory
  sourceEvent?: string
  status?: string
  messageId?: string
  conversationId?: string
  traceKey?: string
  taskId?: string
  queryLogId?: string
  progress?: number
  total?: number
  detail?: RuntimeLifecycleDetail
}

export type ChatComponentEvent = {
  type: 'table' | 'kpi' | 'chart'
  payload: Record<string, unknown>
  sourceEvent?: string
  messageId?: string
}

export type ChatClarificationEvent = {
  required: true
  message: string
  missingSlots: string[]
  candidateHints?: Record<string, string[]>
}

export type ChatAnswerMode = 'analysis' | 'chat' | 'clarification' | string

export type ChatDoneEvent = Record<string, unknown>

export type ChatPlanEvent = {
  phase: 'plan'
  title?: string
  agent?: string
  agentId?: string
  status?: string
  sourceEvent?: string
  messageId?: string
  ts?: string
}

export type ChatStreamEvent =
  | { event: 'start'; data: Record<string, unknown> }
  | { event: 'progress'; data: ChatProgressEvent }
  | { event: 'plan'; data: ChatPlanEvent | Record<string, unknown> }
  | { event: 'component'; data: ChatComponentEvent }
  | { event: 'clarification'; data: ChatClarificationEvent }
  | { event: 'done'; data: Record<string, unknown> }
  | { event: 'error'; data: Record<string, unknown> }
