import { describe, expect, it } from 'vitest'
import type { RuntimeMessageStep } from '../chat-runtime-projection'
import { buildAssistantThreadTimeline } from '../chat-thread-timeline'

function makeStep(overrides: Partial<RuntimeMessageStep>): RuntimeMessageStep {
  return {
    id: 'step-1',
    messageId: 'msg-1',
    kind: 'tool',
    title: '执行指标计算',
    status: 'running',
    sourceEvent: 'on_tool_start',
    traceKey: 'trace-1',
    queryLogId: 'query-log-1',
    progressPercent: 40,
    updatedAt: '2026-04-08T10:00:00.000Z',
    runtimeEventId: 1,
    detail: null,
    ...overrides
  }
}

describe('buildAssistantThreadTimeline', () => {
  it('projects text, runtime steps, components and clarification into one ordered timeline', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'text',
          text: '先看结论。'
        },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '月度趋势',
              option: {
                xAxis: { type: 'category', data: ['1月'] },
                yAxis: { type: 'value' },
                series: [{ type: 'line', data: [12] }]
              }
            }
          }
        },
        {
          type: 'data',
          name: 'chatbi_clarification',
          data: {
            required: true,
            message: '请补充对比维度',
            missingSlots: ['dimension']
          }
        }
      ],
      runtimeSteps: [
        makeStep({
          id: 'plan-1',
          kind: 'plan',
          title: '制定执行计划',
          sourceEvent: 'on_agent_start',
          runtimeEventId: 1
        }),
        makeStep({
          id: 'tool-1',
          kind: 'tool',
          title: '执行指标计算',
          sourceEvent: 'on_tool_start',
          runtimeEventId: 2
        })
      ]
    })

    expect(timeline.map(item => item.kind)).toEqual([
      'assistant_text',
      'plan_step',
      'tool_step',
      'analysis_component',
      'clarification'
    ])
  })

  it('preserves runtime metadata on projected timeline steps', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [],
      runtimeSteps: [
        makeStep({
          id: 'tool-2',
          kind: 'tool',
          title: '生成图表',
          status: 'success',
          sourceEvent: 'on_tool_end',
          traceKey: 'trace-ctx-1',
          queryLogId: 'query-log-ctx-1',
          runtimeEventId: 9,
          detail: {
            message: '图表已生成'
          }
        })
      ]
    })

    expect(timeline).toEqual([
      expect.objectContaining({
        kind: 'tool_step',
        step: expect.objectContaining({
          id: 'tool-2',
          sourceEvent: 'on_tool_end',
          traceKey: 'trace-ctx-1',
          queryLogId: 'query-log-ctx-1',
          runtimeEventId: 9,
          detail: {
            message: '图表已生成'
          }
        })
      })
    ])
  })
})
