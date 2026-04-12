import { describe, expect, it } from 'vitest'
import {
  buildXpertChatRequestBody,
  buildXpertRuntimeControlRequestBody,
  deriveAnswerMode,
  extractXpertMessageArtifacts,
  parseSseEventBlock,
  resolveAnalysisTextProjection,
  resolvePlanFromXpertLifecycleEvent,
  resolveProgressFromXpertLifecycleEvent,
  toChatComponentEvent
} from '../chatbi-stream-runtime'

describe('parseSseEventBlock', () => {
  it('parses event name and json payload', () => {
    const parsed = parseSseEventBlock('event: progress\ndata: {"phase":"plan","message":"compiled"}')

    expect(parsed).toEqual({
      event: 'progress',
      data: { phase: 'plan', message: 'compiled' }
    })
  })

  it('supports multiline data payloads', () => {
    const parsed = parseSseEventBlock('event: done\ndata: {"answer":\n data: {"components":[]}}')

    expect(parsed?.event).toBe('done')
    expect(parsed?.data).toEqual({ answer: { components: [] } })
  })

  it('returns null for invalid blocks', () => {
    const parsed = parseSseEventBlock('bad line without fields')

    expect(parsed).toBeNull()
  })
})

describe('deriveAnswerMode', () => {
  it('uses answer.mode when backend returns it', () => {
    expect(deriveAnswerMode({ answer: { mode: 'chat' } } as never)).toBe('chat')
    expect(deriveAnswerMode({ answer: { mode: 'clarification' } } as never)).toBe('clarification')
  })

  it('falls back to chat for greeting question when no explicit intent', () => {
    expect(deriveAnswerMode({ answer: {} } as never, '你好')).toBe('chat')
  })

  it('falls back to chat when no analysis payload', () => {
    expect(deriveAnswerMode({ answer: { text: '你好，我可以帮你。' } } as never, '你好')).toBe('chat')
  })

  it('keeps analysis when backend indicates query output', () => {
    expect(
      deriveAnswerMode({
        answer: {
          components: [{ type: 'kpi', payload: { value: 1 } }]
        },
        result: { rowCount: 1 },
        meta: { queryLogId: '10', traceKey: 'tk' }
      } as never, '上月收入趋势')
    ).toBe('analysis')
  })

  it('keeps analysis when backend returns typed artifacts without legacy query payload', () => {
    expect(
      deriveAnswerMode({
        artifacts: [
          {
            kind: 'narrative',
            text: '利润下滑主要来自华东区。'
          }
        ]
      } as never, '为什么利润下滑了')
    ).toBe('analysis')
  })

  it('keeps analysis when backend returns an execution handle without answer text', () => {
    expect(
      deriveAnswerMode({
        executionHandle: {
          kind: 'what_if',
          runId: 'run-9',
          status: 'running'
        }
      } as never, '如果华东区涨价 5%，收入会怎样？')
    ).toBe('analysis')
  })
})

describe('buildXpertChatRequestBody', () => {
  it('includes explicit xpert targeting in the outgoing chat request options', () => {
    const body = buildXpertChatRequestBody({
      question: '查询华东区收入',
      xpertId: 'xpert-42'
    })

    expect(body).toMatchObject({
      request: {
        input: {
          input: '查询华东区收入',
          files: []
        }
      },
      options: {
        xpertId: 'xpert-42'
      }
    })
  })

  it('attaches structured analysis follow-up metadata to the outgoing chat request', () => {
    const body = buildXpertChatRequestBody({
      question: '继续分析当前结果',
      modelId: 'model-1',
      conversationId: 'conv-1',
      analysisFollowup: {
        prompt: '继续分析当前结果',
        patch: {
          topN: 5,
          filters: [{ dimension: 'Region', op: 'IN', members: ['South'] }]
        },
        analysisAction: 'analysis_panel_apply',
        baseQueryLogId: 'query-log-1'
      }
    })

    expect(body).toMatchObject({
      request: {
        input: {
          input: '继续分析当前结果',
          files: [],
          modelId: 'model-1'
        },
        conversationId: 'conv-1'
      },
      options: {
        analysisFollowup: {
          prompt: '继续分析当前结果',
          patch: {
            topN: 5,
            filters: [{ dimension: 'Region', op: 'IN', members: ['South'] }]
          },
          analysisAction: 'analysis_panel_apply',
          baseQueryLogId: 'query-log-1'
        }
      }
    })
  })

  it('keeps ordinary ask requests on the conversation follow-up shape instead of runtime command shape', () => {
    const body = buildXpertChatRequestBody({
      question: '继续对比华东区与华北区',
      conversationId: 'conv-followup-1',
      analysisFollowup: {
        prompt: '继续对比华东区与华北区',
        patch: {
          filters: [{ dimension: 'Region', op: 'IN', members: ['East', 'North'] }]
        },
        analysisAction: 'analysis_panel_compare',
        baseQueryLogId: 'query-log-followup-1'
      }
    })

    expect(body.request.conversationId).toBe('conv-followup-1')
    expect(body.request).not.toHaveProperty('command')
    expect(body.options.analysisFollowup).toEqual({
      prompt: '继续对比华东区与华北区',
      patch: {
        filters: [{ dimension: 'Region', op: 'IN', members: ['East', 'North'] }]
      },
      analysisAction: 'analysis_panel_compare',
      baseQueryLogId: 'query-log-followup-1'
    })
  })

  it('builds runtime resume requests without inventing analysis follow-up payloads', () => {
    const body = buildXpertRuntimeControlRequestBody({
      action: 'resume',
      conversationId: 'conv-1',
      resume: {
        threadId: 'thread-1',
        executionId: 'execution-1'
      },
      update: {
        approved: true
      }
    })

    expect(body).toMatchObject({
      request: {
        input: {
          input: '',
          files: []
        },
        conversationId: 'conv-1',
        command: {
          resume: {
            threadId: 'thread-1',
            executionId: 'execution-1'
          },
          update: {
            approved: true
          }
        }
      }
    })
    expect(body.options).not.toHaveProperty('analysisFollowup')
  })

  it('builds runtime tool-call update requests with canonical args payloads', () => {
    const body = buildXpertRuntimeControlRequestBody({
      action: 'tool_call_update',
      conversationId: 'conv-1',
      toolCalls: [
        {
          id: 'tool-call-1',
          args: {
            approved: true
          }
        },
        {
          id: 'tool-call-2',
          args: {
            approved: false,
            reason: 'missing scope'
          }
        }
      ]
    })

    expect(body).toMatchObject({
      request: {
        input: {
          input: '',
          files: []
        },
        conversationId: 'conv-1',
        command: {
          toolCalls: [
            {
              id: 'tool-call-1',
              args: {
                approved: true
              }
            },
            {
              id: 'tool-call-2',
              args: {
                approved: false,
                reason: 'missing scope'
              }
            }
          ]
        }
      }
    })
  })

  it('rejects unsupported runtime control actions at the helper boundary', () => {
    expect(() =>
      buildXpertRuntimeControlRequestBody({
        action: 'cancel',
        conversationId: 'conv-1'
      } as never)
    ).toThrow('Unsupported runtime control action: cancel')
  })
})

describe('resolveAnalysisTextProjection', () => {
  it('prefers narrative artifacts over legacy answer text', () => {
    expect(
      resolveAnalysisTextProjection({
        answer: {
          text: 'legacy answer text'
        },
        artifacts: [
          {
            kind: 'narrative',
            text: 'artifact narrative text'
          }
        ]
      } as never)
    ).toBe('artifact narrative text')
  })

  it('falls back to execution handle summary when answer text is absent', () => {
    expect(
      resolveAnalysisTextProjection({
        executionHandle: {
          kind: 'what_if',
          runId: 'run-9',
          status: 'running'
        }
      } as never)
    ).toBe('what-if compare executed (runId=run-9, status=running)')
  })
})

describe('toChatComponentEvent', () => {
  it('maps direct chart payload', () => {
    const event = toChatComponentEvent({
      type: 'chart',
      payload: {
        option: {
          xAxis: { type: 'category', data: ['1月'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [10] }]
        }
      }
    })

    expect(event).toEqual({
      type: 'chart',
      payload: {
        option: {
          xAxis: { type: 'category', data: ['1月'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [10] }]
        }
      }
    })
  })

  it('infers chart event from echarts option fields', () => {
    const event = toChatComponentEvent({
      chartOptions: {
        xAxis: { type: 'category', data: ['1月'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [42] }]
      }
    })

    expect(event).toEqual({
      type: 'chart',
      payload: {
        option: {
          xAxis: { type: 'category', data: ['1月'] },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: [42] }]
        }
      }
    })
  })

  it('maps xpert component envelope with chartOptions', () => {
    const event = toChatComponentEvent({
      type: 'component',
      data: {
        category: 'Dashboard',
        type: 'AnalyticalGrid',
        chartOptions: {
          xAxis: { type: 'category', data: ['Q1'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [128] }]
        }
      }
    })

    expect(event).toEqual({
      type: 'chart',
      payload: {
        option: {
          xAxis: { type: 'category', data: ['Q1'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [128] }]
        }
      }
    })
  })

  it('attaches component event metadata when provided', () => {
    const event = toChatComponentEvent(
      {
        chartOptions: {
          xAxis: { type: 'category', data: ['Q1'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [128] }]
        }
      },
      {
        sourceEvent: 'on_tool_message',
        messageId: 'msg-1'
      }
    )

    expect(event).toMatchObject({
      type: 'chart',
      sourceEvent: 'on_tool_message',
      messageId: 'msg-1'
    })
  })
})

describe('extractXpertMessageArtifacts', () => {
  it('extracts text and component from nested message payload', () => {
    const artifacts = extractXpertMessageArtifacts({
      type: 'text',
      text: '先看趋势',
      data: {
        chartOptions: {
          xAxis: { type: 'category', data: ['1月'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [18] }]
        }
      }
    })

    expect(artifacts.text).toBe('先看趋势')
    expect(artifacts.components).toEqual([
      {
        type: 'chart',
        payload: {
          option: {
            xAxis: { type: 'category', data: ['1月'] },
            yAxis: { type: 'value' },
            series: [{ type: 'line', data: [18] }]
          }
        }
      }
    ])
  })

  it('extracts chart component from xpert component message payload', () => {
    const artifacts = extractXpertMessageArtifacts({
      type: 'component',
      data: {
        category: 'Dashboard',
        type: 'AnalyticalGrid',
        chartOptions: {
          xAxis: { type: 'category', data: ['1月'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [32] }]
        }
      }
    })

    expect(artifacts.text).toBe('')
    expect(artifacts.components).toEqual([
      {
        type: 'chart',
        payload: {
          option: {
            xAxis: { type: 'category', data: ['1月'] },
            yAxis: { type: 'value' },
            series: [{ type: 'line', data: [32] }]
          }
        }
      }
    ])
  })
})

describe('resolveProgressFromXpertLifecycleEvent', () => {
  it('maps tool lifecycle event to execute progress', () => {
    expect(resolveProgressFromXpertLifecycleEvent('on_tool_message', {
        title: '执行指标计算',
        status: 'running'
      })
    ).toMatchObject({
      phase: 'execute',
      message: '执行指标计算 (running)',
      category: 'tool',
      sourceEvent: 'on_tool_message',
      status: 'running'
    })
  })

  it('maps agent end success to render progress', () => {
    expect(resolveProgressFromXpertLifecycleEvent('on_agent_end', {
        status: 'success',
        name: 'chatbi-agent'
      })
    ).toMatchObject({
      phase: 'render',
      message: 'chatbi-agent',
      category: 'agent',
      sourceEvent: 'on_agent_end',
      status: 'success'
    })
  })

  it('maps tool start/end lifecycle events with canonical detail projection', () => {
    const toolStart = resolveProgressFromXpertLifecycleEvent('on_tool_start', {
      id: 'tool-1',
      toolset: 'metrics',
      tool: 'sql_query',
      status: 'running',
      messageId: 'msg-1'
    })
    const toolEnd = resolveProgressFromXpertLifecycleEvent('on_tool_end', {
      id: 'tool-1',
      toolset: 'metrics',
      tool: 'sql_query',
      status: 'success',
      messageId: 'msg-1'
    })

    expect(toolStart).toMatchObject({
      phase: 'execute',
      category: 'tool',
      sourceEvent: 'on_tool_start',
      status: 'running',
      messageId: 'msg-1',
      detail: {
        id: 'tool-1',
        toolset: 'metrics',
        tool: 'sql_query',
        status: 'running',
        messageId: 'msg-1'
      }
    })
    expect(toolEnd).toMatchObject({
      phase: 'render',
      category: 'tool',
      sourceEvent: 'on_tool_end',
      status: 'success',
      messageId: 'msg-1',
      detail: {
        id: 'tool-1',
        toolset: 'metrics',
        tool: 'sql_query',
        status: 'success',
        messageId: 'msg-1'
      }
    })
  })

  it('maps retriever lifecycle events to resolve progress and keeps normalized detail', () => {
    const retrieverStart = resolveProgressFromXpertLifecycleEvent('on_retriever_start', {
      id: 'ret-1',
      name: 'vector_retriever',
      status: 'running',
      messageId: 'msg-1'
    })
    const retrieverEnd = resolveProgressFromXpertLifecycleEvent('on_retriever_end', {
      id: 'ret-1',
      name: 'vector_retriever',
      status: 'success',
      messageId: 'msg-1'
    })

    expect(retrieverStart).toMatchObject({
      phase: 'resolve',
      category: 'tool',
      sourceEvent: 'on_retriever_start',
      status: 'running',
      messageId: 'msg-1',
      detail: {
        id: 'ret-1',
        name: 'vector_retriever',
        retriever: 'vector_retriever'
      }
    })
    expect(retrieverEnd).toMatchObject({
      phase: 'resolve',
      category: 'tool',
      sourceEvent: 'on_retriever_end',
      status: 'success',
      messageId: 'msg-1',
      detail: {
        id: 'ret-1',
        name: 'vector_retriever',
        retriever: 'vector_retriever'
      }
    })
  })

  it('maps client effect lifecycle event to render progress', () => {
    expect(
      resolveProgressFromXpertLifecycleEvent('on_client_effect', {
        title: '打开图表详情',
        effect: 'open_drawer',
        action: 'open',
        status: 'success',
        messageId: 'msg-2'
      })
    ).toMatchObject({
      phase: 'render',
      category: 'chat',
      sourceEvent: 'on_client_effect',
      status: 'success',
      messageId: 'msg-2',
      detail: {
        title: '打开图表详情',
        effect: 'open_drawer',
        action: 'open'
      }
    })
  })

  it('projects interrupt detail in stable normalized shape', () => {
    const progress = resolveProgressFromXpertLifecycleEvent('on_interrupt', {
      reason: 'await_user_confirmation',
      action: 'pause',
      status: 'paused',
      messageId: 'msg-3'
    })

    expect(progress).toMatchObject({
      phase: 'execute',
      category: 'system',
      sourceEvent: 'on_interrupt',
      status: 'paused',
      messageId: 'msg-3',
      detail: {
        reason: 'await_user_confirmation',
        action: 'pause',
        status: 'paused',
        messageId: 'msg-3'
      }
    })
  })

  it('extracts runtime context keys from lifecycle payload metadata', () => {
    const progress = resolveProgressFromXpertLifecycleEvent('on_tool_start', {
      id: 'tool-ctx-1',
      status: 'running',
      progress: 30,
      total: 60,
      meta: {
        conversationId: 'conv-ctx-1',
        traceKey: 'trace-ctx-1',
        taskId: 'task-ctx-1',
        queryLogId: 'query-log-ctx-1'
      }
    })

    expect(progress).toMatchObject({
      sourceEvent: 'on_tool_start',
      conversationId: 'conv-ctx-1',
      traceKey: 'trace-ctx-1',
      taskId: 'task-ctx-1',
      queryLogId: 'query-log-ctx-1',
      progress: 30,
      total: 60
    })
  })
})

describe('resolvePlanFromXpertLifecycleEvent', () => {
  it('maps agent start lifecycle event to plan update payload', () => {
    expect(
      resolvePlanFromXpertLifecycleEvent(
        'on_agent_start',
        {
          id: 'agent-1',
          name: 'chatbi-agent',
          title: '制定执行计划'
        },
        {
          messageId: 'msg-1'
        }
      )
    ).toMatchObject({
      phase: 'plan',
      title: '制定执行计划',
      agentId: 'agent-1',
      agent: 'chatbi-agent',
      sourceEvent: 'on_agent_start',
      messageId: 'msg-1'
    })
  })

  it('returns null for non planning lifecycle event', () => {
    expect(resolvePlanFromXpertLifecycleEvent('on_tool_message', { title: 'tool running' })).toBeNull()
  })
})
