import { describe, expect, it } from 'vitest'
import {
  mergeChatTaskWithRuntimeHint,
  resolveRuntimeHintForChatTask,
  type ChatTask,
  type ChatTaskRuntimeHintLookup
} from '../api'

function createTask(overrides: Partial<ChatTask> = {}): ChatTask {
  return {
    id: 'task-1',
    modelId: 'model-1',
    sourceType: 'chat',
    traceKey: 'trace-1',
    conversationId: 'conv-1',
    title: 'Task',
    status: 'failed',
    progress: 0,
    retryCount: 0,
    ...overrides
  }
}

describe('task runtime merge', () => {
  it('resolves runtime hint by task id first, then conversation/trace fallback', () => {
    const task = createTask()
    const lookup: ChatTaskRuntimeHintLookup = {
      byTaskId: {
        'task-1': {
          statusHint: 'running',
          messageId: 'msg-1',
          sourceEvent: 'on_tool_start',
          conversationId: 'conv-1',
          traceKey: 'trace-1',
          taskId: 'task-1',
          progressPercent: 42,
          updatedAt: '2026-02-25T10:00:00.000Z'
        }
      },
      byConversationId: {
        'conv-1': {
          statusHint: 'error',
          messageId: 'msg-2',
          sourceEvent: 'on_interrupt',
          conversationId: 'conv-1',
          traceKey: null,
          taskId: null,
          progressPercent: null,
          updatedAt: '2026-02-25T10:01:00.000Z'
        }
      },
      byTraceKey: {
        'trace-1': {
          statusHint: 'success',
          messageId: 'msg-3',
          sourceEvent: 'done',
          conversationId: null,
          traceKey: 'trace-1',
          taskId: null,
          progressPercent: null,
          updatedAt: '2026-02-25T10:02:00.000Z'
        }
      }
    }

    const resolved = resolveRuntimeHintForChatTask(task, lookup)
    expect(resolved?.statusHint).toBe('running')
    expect(resolved?.taskId).toBe('task-1')
  })

  it('falls back to conversation and trace keys when task id hint is absent', () => {
    const byConversation = resolveRuntimeHintForChatTask(
      createTask({ id: 'task-2' }),
      {
        byConversationId: {
          'conv-1': {
            statusHint: 'paused',
            messageId: null,
            sourceEvent: 'on_interrupt',
            conversationId: 'conv-1',
            traceKey: null,
            taskId: null,
            progressPercent: null,
            updatedAt: '2026-02-25T10:03:00.000Z'
          }
        }
      }
    )
    expect(byConversation?.statusHint).toBe('paused')

    const byTrace = resolveRuntimeHintForChatTask(
      createTask({ id: 'task-3', conversationId: undefined }),
      {
        byTraceKey: {
          'trace-1': {
            statusHint: 'success',
            messageId: null,
            sourceEvent: 'done',
            conversationId: null,
            traceKey: 'trace-1',
            taskId: null,
            progressPercent: 100,
            updatedAt: '2026-02-25T10:04:00.000Z'
          }
        }
      }
    )
    expect(byTrace?.statusHint).toBe('success')
  })

  it('merges runtime hint into task status/progress with runtime markers', () => {
    const task = createTask({
      status: 'failed',
      progress: 0
    })

    const merged = mergeChatTaskWithRuntimeHint(task, {
      statusHint: 'success',
      messageId: 'msg-4',
      sourceEvent: 'done',
      conversationId: 'conv-1',
      traceKey: 'trace-1',
      taskId: 'task-1',
      progressPercent: 100,
      updatedAt: '2026-02-25T10:05:00.000Z'
    })

    expect(merged.status).toBe('succeeded')
    expect(merged.progress).toBe(100)
    expect(merged.runtimeStatusHint).toBe('success')
    expect(merged.runtimeSourceEvent).toBe('done')
    expect(merged.runtimeUpdatedAt).toBe('2026-02-25T10:05:00.000Z')
  })
})
