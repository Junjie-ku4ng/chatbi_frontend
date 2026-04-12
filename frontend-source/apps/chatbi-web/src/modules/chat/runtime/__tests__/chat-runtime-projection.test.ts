import { describe, expect, it } from 'vitest'
import type { ChatStreamEvent } from '../chatbi-stream-runtime'
import type { RuntimeLifecycleDetail } from '../runtime-event-contract'
import {
  createInitialChatRuntimeProjectionState,
  reduceChatRuntimeProjectionState,
  selectExecutionNodes,
  selectMessageExecutionGroups,
  selectMessageStepsByMessageId,
  selectTaskRuntimeHintForTask
} from '../chat-runtime-projection'

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

function projectEvents(...events: ChatStreamEvent[]) {
  return events.reduce((state, event, index) => {
    return reduceChatRuntimeProjectionState(state, event, {
      runtimeEventId: index + 1,
      receivedAt: `2026-02-25T00:00:${String(index).padStart(2, '0')}.000Z`
    })
  }, createInitialChatRuntimeProjectionState())
}

describe('chat runtime projection', () => {
  it('upserts message step by id under same message', () => {
    const projected = projectEvents(
      {
        event: 'progress',
        data: {
          phase: 'execute',
          sourceEvent: 'on_chat_event',
          status: 'running',
          messageId: 'msg-1',
          detail: makeLifecycleDetail({
            id: 'step-1',
            title: '准备执行',
            messageId: 'msg-1',
            status: 'running'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'render',
          sourceEvent: 'on_chat_event',
          status: 'success',
          messageId: 'msg-1',
          detail: makeLifecycleDetail({
            id: 'step-1',
            title: '执行完成',
            messageId: 'msg-1',
            status: 'success'
          })
        }
      }
    )

    const steps = selectMessageStepsByMessageId(projected, 'msg-1')
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      id: 'step-1',
      title: '执行完成',
      status: 'success',
      messageId: 'msg-1'
    })
  })

  it('records plan events as dedicated plan steps and reuses default message steps after final message id resolves', () => {
    const projected = projectEvents(
      {
        event: 'plan',
        data: {
          phase: 'plan',
          title: '制定执行计划',
          agent: 'chatbi-agent',
          sourceEvent: 'on_agent_start'
        }
      },
      {
        event: 'done',
        data: {
          meta: {
            messageId: 'msg-plan-1'
          }
        }
      }
    )

    expect(selectMessageStepsByMessageId(projected, 'msg-plan-1')).toEqual([
      expect.objectContaining({
        kind: 'plan',
        title: '制定执行计划',
        messageId: '__default__'
      })
    ])
  })

  it('tracks agent/tool/retriever execution node transitions', () => {
    const projected = projectEvents(
      {
        event: 'progress',
        data: {
          phase: 'plan',
          category: 'agent',
          sourceEvent: 'on_agent_start',
          status: 'running',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'agent-1',
            name: 'chatbi-agent',
            messageId: 'msg-2'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'execute',
          category: 'tool',
          sourceEvent: 'on_tool_start',
          status: 'running',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'tool-1',
            toolset: 'metrics',
            tool: 'sql_query',
            messageId: 'msg-2'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'resolve',
          category: 'tool',
          sourceEvent: 'on_retriever_start',
          status: 'running',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'retriever-1',
            retriever: 'vector',
            messageId: 'msg-2'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'resolve',
          category: 'tool',
          sourceEvent: 'on_retriever_error',
          status: 'error',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'retriever-1',
            retriever: 'vector',
            error: 'timeout',
            messageId: 'msg-2'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'render',
          category: 'tool',
          sourceEvent: 'on_tool_end',
          status: 'success',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'tool-1',
            toolset: 'metrics',
            tool: 'sql_query',
            messageId: 'msg-2'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'render',
          category: 'agent',
          sourceEvent: 'on_agent_end',
          status: 'success',
          messageId: 'msg-2',
          detail: makeLifecycleDetail({
            id: 'agent-1',
            name: 'chatbi-agent',
            messageId: 'msg-2'
          })
        }
      }
    )

    const nodes = selectExecutionNodes(projected)
    expect(nodes).toEqual([
      expect.objectContaining({
        key: 'agent:agent-1',
        kind: 'agent',
        status: 'success'
      }),
      expect.objectContaining({
        key: 'tool:tool-1',
        kind: 'tool',
        status: 'success'
      }),
      expect.objectContaining({
        key: 'retriever:retriever-1',
        kind: 'retriever',
        status: 'error'
      })
    ])
  })

  it('groups agent tool component and chat activities under the same message execution group', () => {
    const projected = projectEvents(
      {
        event: 'progress',
        data: {
          phase: 'plan',
          category: 'agent',
          sourceEvent: 'on_agent_start',
          status: 'running',
          messageId: 'msg-7',
          detail: makeLifecycleDetail({
            id: 'agent-7',
            name: 'chatbi-agent',
            messageId: 'msg-7'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'execute',
          category: 'tool',
          sourceEvent: 'on_tool_message',
          status: 'running',
          messageId: 'msg-7',
          detail: makeLifecycleDetail({
            id: 'tool-7',
            title: '执行指标计算',
            toolset: 'metrics',
            tool: 'sql_query',
            messageId: 'msg-7'
          })
        }
      },
      {
        event: 'component',
        data: {
          type: 'chart',
          sourceEvent: 'on_tool_message',
          messageId: 'msg-7',
          payload: {
            title: '月度趋势',
            option: {
              xAxis: { type: 'category', data: ['1月'] },
              yAxis: { type: 'value' },
              series: [{ type: 'line', data: [10] }]
            }
          }
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'render',
          sourceEvent: 'on_chat_event',
          status: 'success',
          messageId: 'msg-7',
          detail: makeLifecycleDetail({
            id: 'step-7',
            title: '图表生成完成',
            messageId: 'msg-7',
            status: 'success'
          })
        }
      }
    )

    expect(selectMessageExecutionGroups(projected)).toEqual([
      expect.objectContaining({
        messageId: 'msg-7',
        steps: [
          expect.objectContaining({
            kind: 'agent',
            title: 'chatbi-agent',
            messageId: 'msg-7'
          }),
          expect.objectContaining({
            kind: 'tool',
            title: '执行指标计算',
            messageId: 'msg-7'
          }),
          expect.objectContaining({
            kind: 'component',
            title: '组件输出 · chart · 月度趋势',
            messageId: 'msg-7'
          }),
          expect.objectContaining({
            kind: 'chat',
            title: '图表生成完成',
            messageId: 'msg-7'
          })
        ]
      })
    ])
  })

  it('projects task status hints from runtime lifecycle and terminal events', () => {
    const paused = projectEvents(
      {
        event: 'start',
        data: {
          ts: '2026-02-25T00:00:00.000Z'
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'execute',
          category: 'system',
          sourceEvent: 'on_interrupt',
          status: 'paused',
          queryLogId: 'query-log-3',
          messageId: 'msg-3',
          detail: makeLifecycleDetail({
            action: 'pause',
            reason: 'await_user_confirmation',
            status: 'paused',
            messageId: 'msg-3'
          })
        }
      }
    )

    expect(paused.taskRuntimeHints).toMatchObject({
      statusHint: 'paused',
      messageId: 'msg-3',
      queryLogId: 'query-log-3'
    })
    expect(paused.runtimeControlState).toMatchObject({
      phase: 'paused',
      canResume: true
    })

    const succeeded = reduceChatRuntimeProjectionState(paused, {
      event: 'done',
      data: {
        answer: {
          text: 'ok'
        },
        meta: {
          messageId: 'msg-3',
          traceKey: 'trace-3',
          queryLogId: 'query-log-3'
        },
        queryLogId: 'query-log-3'
      }
    }, {
      runtimeEventId: 3,
      receivedAt: '2026-02-25T00:00:03.000Z'
    })

    expect(succeeded.taskRuntimeHints).toMatchObject({
      statusHint: 'success',
      messageId: 'msg-3',
      queryLogId: 'query-log-3',
      traceKey: 'trace-3',
      progressPercent: 100
    })

    const errored = reduceChatRuntimeProjectionState(succeeded, {
      event: 'error',
      data: {
        messageId: 'msg-3',
        reason: 'network_error'
      }
    }, {
      runtimeEventId: 4,
      receivedAt: '2026-02-25T00:00:04.000Z'
    })

    expect(errored.taskRuntimeHints).toMatchObject({
      statusHint: 'error',
      messageId: 'msg-3'
    })
    expect(errored.runtimeControlState).toMatchObject({
      phase: 'error',
      canCancel: false
    })
  })

  it('resets execution nodes and message steps on start for a new run', () => {
    const firstRun = projectEvents(
      {
        event: 'progress',
        data: {
          phase: 'plan',
          category: 'agent',
          sourceEvent: 'on_agent_start',
          status: 'running',
          messageId: 'msg-old',
          detail: makeLifecycleDetail({
            id: 'agent-old',
            name: 'chatbi-agent',
            messageId: 'msg-old'
          })
        }
      },
      {
        event: 'progress',
        data: {
          phase: 'execute',
          sourceEvent: 'on_chat_event',
          status: 'running',
          messageId: 'msg-old',
          detail: makeLifecycleDetail({
            id: 'step-old',
            title: '旧步骤',
            messageId: 'msg-old'
          })
        }
      }
    )

    expect(selectExecutionNodes(firstRun)).toHaveLength(1)
    expect(selectMessageStepsByMessageId(firstRun, 'msg-old')).toHaveLength(2)

    const secondRunStarted = reduceChatRuntimeProjectionState(firstRun, {
      event: 'start',
      data: {
        ts: '2026-02-25T00:00:10.000Z'
      }
    }, {
      runtimeEventId: 3,
      receivedAt: '2026-02-25T00:00:10.000Z'
    })

    expect(selectExecutionNodes(secondRunStarted)).toEqual([])
    expect(selectMessageStepsByMessageId(secondRunStarted, 'msg-old')).toEqual([])
    expect(secondRunStarted.taskRuntimeHints).toMatchObject({
      statusHint: 'running'
    })
  })

  it('indexes task runtime hints by task/conversation/trace keys', () => {
    const projected = projectEvents(
      {
        event: 'progress',
        data: {
          phase: 'execute',
          sourceEvent: 'on_tool_start',
          status: 'running',
          taskId: 'task-77',
          conversationId: 'conv-77',
          traceKey: 'trace-77'
        }
      },
      {
        event: 'done',
        data: {
          meta: {
            taskId: 'task-77',
            traceKey: 'trace-77',
            conversation: {
              conversationId: 'conv-77'
            }
          }
        }
      }
    )

    const byTask = selectTaskRuntimeHintForTask(projected, { taskId: 'task-77' })
    const byConversation = selectTaskRuntimeHintForTask(projected, { conversationId: 'conv-77' })
    const byTrace = selectTaskRuntimeHintForTask(projected, { traceKey: 'trace-77' })

    expect(byTask?.statusHint).toBe('success')
    expect(byConversation?.statusHint).toBe('success')
    expect(byTrace?.statusHint).toBe('success')
    expect(byTask?.progressPercent).toBe(100)
  })
})
