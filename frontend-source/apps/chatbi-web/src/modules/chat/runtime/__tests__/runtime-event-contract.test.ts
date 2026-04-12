import { describe, expect, it } from 'vitest'
import { normalizeRuntimeLifecycleEvent } from '../runtime-event-contract'

describe('normalizeRuntimeLifecycleEvent', () => {
  it('normalizes tool lifecycle with stable detail keys', () => {
    const normalized = normalizeRuntimeLifecycleEvent(
      'on_tool_start',
      {
        id: 'tool-1',
        toolset: 'metrics',
        tool: 'sql_query',
        status: 'running',
        messageId: 'msg-1',
        meta: {
          conversationId: 'conv-1',
          traceKey: 'trace-1',
          taskId: 'task-1',
          queryLogId: 'query-log-1',
          progress: 20,
          total: 50
        }
      },
      {
        messageId: 'fallback-msg'
      }
    )

    expect(normalized).toMatchObject({
      sourceEvent: 'on_tool_start',
      phase: 'execute',
      category: 'tool',
      status: 'running',
      messageId: 'msg-1',
      detail: {
        id: 'tool-1',
        toolset: 'metrics',
        tool: 'sql_query',
        status: 'running',
        messageId: 'msg-1',
        conversationId: 'conv-1',
        traceKey: 'trace-1',
        taskId: 'task-1',
        queryLogId: 'query-log-1',
        progress: 20,
        total: 50
      }
    })
    expect(normalized?.detail ? Object.keys(normalized.detail).sort() : []).toEqual([
      'action',
      'conversationId',
      'effect',
      'error',
      'id',
      'message',
      'messageId',
      'name',
      'progress',
      'queryLogId',
      'reason',
      'retriever',
      'status',
      'taskId',
      'title',
      'tool',
      'toolName',
      'toolset',
      'total',
      'traceKey'
    ])
  })

  it('normalizes retriever and client-effect lifecycle events', () => {
    const retrieverEnd = normalizeRuntimeLifecycleEvent('on_retriever_end', {
      id: 'ret-1',
      name: 'hybrid_retriever',
      status: 'success'
    })
    const clientEffect = normalizeRuntimeLifecycleEvent('on_client_effect', {
      effect: 'open_drawer',
      action: 'open',
      title: '打开图表详情',
      status: 'success'
    })

    expect(retrieverEnd).toMatchObject({
      sourceEvent: 'on_retriever_end',
      phase: 'resolve',
      category: 'tool',
      detail: {
        id: 'ret-1',
        name: 'hybrid_retriever',
        retriever: 'hybrid_retriever'
      }
    })
    expect(clientEffect).toMatchObject({
      sourceEvent: 'on_client_effect',
      phase: 'render',
      category: 'chat',
      detail: {
        effect: 'open_drawer',
        action: 'open',
        title: '打开图表详情'
      }
    })
  })

  it('projects interrupt detail and supports context message id fallback', () => {
    const normalized = normalizeRuntimeLifecycleEvent(
      'on_interrupt',
      {
        reason: 'await_user_confirmation',
        action: 'pause'
      },
      {
        messageId: 'msg-fallback'
      }
    )

    expect(normalized).toMatchObject({
      sourceEvent: 'on_interrupt',
      phase: 'execute',
      category: 'system',
      messageId: 'msg-fallback',
      detail: {
        reason: 'await_user_confirmation',
        action: 'pause',
        messageId: 'msg-fallback'
      }
    })
  })

  it('returns null for unsupported lifecycle event', () => {
    expect(normalizeRuntimeLifecycleEvent('on_unknown', { id: 'x' })).toBeNull()
  })
})
