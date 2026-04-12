'use client'

import { create } from 'zustand'
import type { ChatStreamEvent } from './chatbi-stream-runtime'
import {
  createInitialChatRuntimeProjectionState,
  reduceChatRuntimeProjectionState,
  type ChatRuntimeProjectionState,
  type RuntimeTaskStatusHint
} from './chat-runtime-projection'

export type RuntimeEventEntry = {
  id: number
  receivedAt: string
  event: ChatStreamEvent
}

type ChatRuntimeStoreState = ChatRuntimeProjectionState & {
  isStreaming: boolean
  lastEvent: ChatStreamEvent | null
  runtimeEvents: RuntimeEventEntry[]
  lastDone: Record<string, unknown> | null
  nextRuntimeEventId: number
  ingestEvent: (event: ChatStreamEvent) => void
  ingestRuntimeControlResult: (input: {
    conversationId?: string | null
    traceKey?: string | null
    taskId?: string | null
    command?: string | null
    status?: string | null
  }) => void
  clearRuntimeState: () => void
}

const initialProjectionState = createInitialChatRuntimeProjectionState()

const initialState: Pick<
  ChatRuntimeStoreState,
  | 'isStreaming'
  | 'lastEvent'
  | 'runtimeEvents'
  | 'lastDone'
  | 'nextRuntimeEventId'
  | 'executionTree'
  | 'executionOrder'
  | 'messageStepsByMessageId'
  | 'taskRuntimeHints'
  | 'taskRuntimeHintsByConversationId'
  | 'taskRuntimeHintsByTraceKey'
  | 'taskRuntimeHintsByTaskId'
  | 'runtimeControlState'
> = {
  isStreaming: false,
  lastEvent: null,
  runtimeEvents: [],
  lastDone: null,
  nextRuntimeEventId: 0,
  ...initialProjectionState
}

function mapRuntimeControlToTaskHint(input: { command?: string | null; status?: string | null }): RuntimeTaskStatusHint {
  const normalizedStatus = input.status?.toLowerCase()
  const normalizedCommand = input.command?.toLowerCase()

  if (normalizedStatus === 'running' || normalizedCommand === 'resume') {
    return 'running'
  }
  if (
    normalizedStatus === 'requires_action' ||
    normalizedStatus === 'paused' ||
    normalizedStatus === 'interrupted' ||
    normalizedCommand === 'interrupt'
  ) {
    return 'paused'
  }
  if (
    normalizedStatus === 'succeeded' ||
    normalizedStatus === 'success' ||
    normalizedStatus === 'completed' ||
    normalizedStatus === 'done'
  ) {
    return 'success'
  }
  if (
    normalizedStatus === 'failed' ||
    normalizedStatus === 'error' ||
    normalizedStatus === 'cancelled' ||
    normalizedCommand === 'cancel'
  ) {
    return 'error'
  }
  return 'idle'
}

function buildRuntimeControlSyntheticEvent(
  input: {
    conversationId?: string | null
    traceKey?: string | null
    taskId?: string | null
    command?: string | null
    status?: string | null
  },
  hint: RuntimeTaskStatusHint
): ChatStreamEvent {
  const context = {
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.traceKey ? { traceKey: input.traceKey } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {})
  }

  if (hint === 'success') {
    return {
      event: 'done',
      data: {
        meta: {
          ...context
        }
      }
    }
  }

  if (hint === 'error') {
    return {
      event: 'error',
      data: {
        message: 'runtime control updated',
        ...context
      }
    }
  }

  return {
    event: 'progress',
    data: {
      phase: 'execute',
      category: 'system',
      sourceEvent: hint === 'paused' ? 'on_interrupt' : 'on_client_effect',
      status: hint === 'paused' ? 'paused' : hint === 'running' ? 'running' : 'idle',
      message: hint === 'paused' ? '执行已中断' : hint === 'running' ? '执行恢复中' : '运行控制更新',
      ...context
    }
  }
}

export const useChatRuntimeStore = create<ChatRuntimeStoreState>((set) => ({
  ...initialState,
  ingestEvent: event =>
    set(state => {
      const nextId = state.nextRuntimeEventId + 1
      const receivedAt = new Date().toISOString()
      const nextProjection = reduceChatRuntimeProjectionState(state, event, {
        runtimeEventId: nextId,
        receivedAt
      })

      return {
        ...nextProjection,
        lastEvent: event,
        nextRuntimeEventId: nextId,
        runtimeEvents: [
          ...state.runtimeEvents.slice(-99),
          {
            id: nextId,
            receivedAt,
            event
          }
        ],
        isStreaming:
          event.event === 'start'
            ? true
            : event.event === 'done' || event.event === 'error'
              ? false
              : state.isStreaming,
        lastDone: event.event === 'done' ? (event.data as Record<string, unknown>) : state.lastDone
      }
    }),
  ingestRuntimeControlResult: input =>
    set(state => {
      const hint = mapRuntimeControlToTaskHint(input)
      const event = buildRuntimeControlSyntheticEvent(input, hint)
      const nextId = state.nextRuntimeEventId + 1
      const receivedAt = new Date().toISOString()
      const nextProjection = reduceChatRuntimeProjectionState(state, event, {
        runtimeEventId: nextId,
        receivedAt
      })

      return {
        ...nextProjection,
        lastEvent: event,
        nextRuntimeEventId: nextId,
        runtimeEvents: [
          ...state.runtimeEvents.slice(-99),
          {
            id: nextId,
            receivedAt,
            event
          }
        ]
      }
    }),
  clearRuntimeState: () =>
    set({
      ...initialState
    })
}))

export function resetChatRuntimeStore() {
  useChatRuntimeStore.setState({
    ...initialState
  })
}

export { selectMessageStepsByMessageId } from './chat-runtime-projection'
