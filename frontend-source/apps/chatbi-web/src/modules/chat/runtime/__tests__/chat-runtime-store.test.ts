import { beforeEach, describe, expect, it } from 'vitest'
import type { ChatStreamEvent } from '../chatbi-stream-runtime'
import { resetChatRuntimeStore, useChatRuntimeStore } from '../chat-runtime-store'
import type { RuntimeLifecycleDetail } from '../runtime-event-contract'

function makeProgressEvent(index: number): ChatStreamEvent {
  return {
    event: 'progress',
    data: {
      phase: 'execute',
      message: `step-${index}`
    }
  }
}

function makeLifecycleDetail(overrides: Partial<RuntimeLifecycleDetail>): RuntimeLifecycleDetail {
  return {
    id: null,
    name: null,
    title: null,
    message: null,
    status: null,
    messageId: null,
    conversationId: null,
    traceKey: null,
    taskId: null,
    queryLogId: null,
    progress: null,
    total: null,
    tool: null,
    toolName: null,
    toolset: null,
    retriever: null,
    effect: null,
    action: null,
    reason: null,
    error: null,
    ...overrides
  }
}

describe('chat runtime store', () => {
  beforeEach(() => {
    resetChatRuntimeStore()
  })

  it('tracks stream lifecycle state from start to done', () => {
    useChatRuntimeStore.getState().ingestEvent({
      event: 'start',
      data: {
        ts: '2026-02-25T00:00:00.000Z'
      }
    })

    expect(useChatRuntimeStore.getState().isStreaming).toBe(true)
    expect(useChatRuntimeStore.getState().runtimeEvents).toHaveLength(1)

    useChatRuntimeStore.getState().ingestEvent({
      event: 'done',
      data: {
        answer: {
          text: 'done'
        }
      }
    })

    expect(useChatRuntimeStore.getState().isStreaming).toBe(false)
    expect(useChatRuntimeStore.getState().lastDone).toEqual({
      answer: {
        text: 'done'
      }
    })
  })

  it('keeps only the latest 100 runtime events', () => {
    for (let index = 0; index < 120; index += 1) {
      useChatRuntimeStore.getState().ingestEvent(makeProgressEvent(index))
    }

    const events = useChatRuntimeStore.getState().runtimeEvents
    expect(events).toHaveLength(100)
    expect(events[0]?.event).toEqual({
      event: 'progress',
      data: {
        phase: 'execute',
        message: 'step-20'
      }
    })
    expect(events[99]?.event).toEqual({
      event: 'progress',
      data: {
        phase: 'execute',
        message: 'step-119'
      }
    })
  })

  it('projects runtime events into execution nodes and task hints', () => {
    useChatRuntimeStore.getState().ingestEvent({
      event: 'start',
      data: {
        ts: '2026-02-25T00:00:00.000Z'
      }
    })

    useChatRuntimeStore.getState().ingestEvent({
      event: 'progress',
      data: {
        phase: 'execute',
        category: 'agent',
        sourceEvent: 'on_agent_start',
        status: 'running',
        messageId: 'msg-1',
        detail: makeLifecycleDetail({
          id: 'agent-1',
          name: 'chatbi-agent',
          messageId: 'msg-1'
        })
      }
    })

    useChatRuntimeStore.getState().ingestEvent({
      event: 'done',
      data: {
        answer: {
          text: 'done'
        },
        meta: {
          messageId: 'msg-1'
        }
      }
    })

    const state = useChatRuntimeStore.getState()
    expect(state.isStreaming).toBe(false)
    expect(state.lastDone).toEqual({
      answer: {
        text: 'done'
      },
      meta: {
        messageId: 'msg-1'
      }
    })
    expect(state.executionTree['agent:agent-1']).toMatchObject({
      key: 'agent:agent-1',
      kind: 'agent',
      status: 'running',
      messageId: 'msg-1'
    })
    expect(state.taskRuntimeHints).toMatchObject({
      statusHint: 'success',
      messageId: 'msg-1'
    })
  })

  it('projects runtime control mutations into runtime hints for conversation overlay', () => {
    useChatRuntimeStore.getState().ingestRuntimeControlResult({
      conversationId: 'conv-runtime-1',
      traceKey: 'trace-runtime-1',
      taskId: 'task-runtime-1',
      command: 'interrupt',
      status: 'requires_action'
    })

    const interrupted = useChatRuntimeStore.getState()
    expect(interrupted.taskRuntimeHints.statusHint).toBe('paused')
    expect(interrupted.taskRuntimeHintsByConversationId['conv-runtime-1']?.statusHint).toBe('paused')
    expect(interrupted.runtimeEvents).toHaveLength(1)

    useChatRuntimeStore.getState().ingestRuntimeControlResult({
      conversationId: 'conv-runtime-1',
      traceKey: 'trace-runtime-1',
      taskId: 'task-runtime-1',
      command: 'resume',
      status: 'running'
    })

    const resumed = useChatRuntimeStore.getState()
    expect(resumed.taskRuntimeHintsByTaskId['task-runtime-1']?.statusHint).toBe('running')
    expect(resumed.taskRuntimeHintsByTraceKey['trace-runtime-1']?.statusHint).toBe('running')
  })
})
