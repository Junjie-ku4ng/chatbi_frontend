import { describe, expect, it } from 'vitest'
import type { RuntimeMessageStep } from './chat-runtime-projection'
import { buildAssistantThreadTimeline, partitionAssistantThreadTimeline } from './chat-thread-timeline'

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
    updatedAt: '2026-04-09T10:00:00.000Z',
    runtimeEventId: 1,
    detail: null,
    ...overrides
  }
}

describe('buildAssistantThreadTimeline', () => {
  it('renders runtime steps before the final answer surfaces in runtime event order', () => {
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
              queryLogId: 'query-log-1',
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
          id: 'tool-1',
          kind: 'tool',
          title: '执行指标计算',
          runtimeEventId: 2
        }),
        makeStep({
          id: 'plan-1',
          kind: 'plan',
          title: '制定执行计划',
          sourceEvent: 'on_agent_start',
          runtimeEventId: 1
        })
      ]
    })

    expect(timeline.map(item => item.kind)).toEqual([
      'plan_step',
      'tool_step',
      'assistant_text',
      'analysis_component',
      'clarification'
    ])
  })

  it('collapses repeated streamed component updates for the same logical surface and keeps the latest payload', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '月度趋势',
              queryLogId: 'query-log-1',
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
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '月度趋势',
              queryLogId: 'query-log-1',
              option: {
                xAxis: { type: 'category', data: ['1月'] },
                yAxis: { type: 'value' },
                series: [{ type: 'line', data: [24] }]
              }
            }
          }
        },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '区域分布',
              queryLogId: 'query-log-2',
              option: {
                xAxis: { type: 'category', data: ['华东'] },
                yAxis: { type: 'value' },
                series: [{ type: 'bar', data: [30] }]
              }
            }
          }
        }
      ],
      runtimeSteps: []
    })

    const components = timeline.filter(item => item.kind === 'analysis_component')

    expect(components).toHaveLength(2)
    expect(components[0]).toMatchObject({
      component: {
        type: 'chart',
        payload: {
          title: '月度趋势',
          queryLogId: 'query-log-1',
          option: {
            series: [{ data: [24] }]
          }
        }
      }
    })
    expect(components[1]).toMatchObject({
      component: {
        payload: {
          title: '区域分布',
          queryLogId: 'query-log-2'
        }
      }
    })
  })

  it('suppresses duplicate clarification narrative text when the clarification card carries the same message', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'text',
          text: '请明确改看 2025 年、最近12个月，或给出一个已有数据的具体年份。'
        },
        {
          type: 'data',
          name: 'chatbi_clarification',
          data: {
            required: true,
            message: '请明确改看 2025 年、最近12个月，或给出一个已有数据的具体年份。',
            missingSlots: ['time']
          }
        }
      ],
      runtimeSteps: []
    })

    expect(timeline.map(item => item.kind)).toEqual(['clarification'])
  })

  it('preserves streamed content order when timeline markers interleave text and component output', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'data',
          name: 'chatbi_timeline_marker',
          data: {
            order: 2,
            kind: 'text'
          }
        },
        {
          type: 'text',
          text: '先给出一句总结。'
        },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            timelineOrder: 3,
            payload: {
              title: '月度趋势',
              queryLogId: 'query-log-1',
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
          name: 'chatbi_timeline_marker',
          data: {
            order: 4,
            kind: 'text'
          }
        },
        {
          type: 'text',
          text: '接着补充图表结论。'
        }
      ],
      runtimeSteps: []
    })

    expect(timeline.map(item => item.kind)).toEqual([
      'assistant_text',
      'analysis_component',
      'assistant_text'
    ])
  })

  it('preserves raw spacing while coalescing contiguous streamed text chunks', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'text',
          text: 'This '
        },
        {
          type: 'text',
          text: 'workspace '
        },
        {
          type: 'text',
          text: 'runtime.'
        }
      ],
      runtimeSteps: []
    })

    expect(
      timeline.filter((item): item is Extract<typeof timeline[number], { kind: 'assistant_text' }> => item.kind === 'assistant_text').map(item => item.text)
    ).toEqual(['This workspace runtime.'])
  })

  it('partitions runtime timeline items away from final answer content items', () => {
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
              queryLogId: 'query-log-1',
              option: {
                xAxis: { type: 'category', data: ['1月'] },
                yAxis: { type: 'value' },
                series: [{ type: 'line', data: [12] }]
              }
            }
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
          runtimeEventId: 2
        })
      ],
      terminalStatus: {
        status: 'running',
        label: 'Streaming…'
      }
    })

    const sections = partitionAssistantThreadTimeline(timeline)

    expect(sections.runtimeItems.map(item => item.kind)).toEqual([
      'plan_step',
      'tool_step',
      'terminal_status'
    ])
    expect(sections.contentItems.map(item => item.kind)).toEqual([
      'assistant_text',
      'analysis_component'
    ])
  })

  it('keeps only pre-answer runtime steps in the upper timeline shell and moves later runtime updates into the final answer order', () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        {
          type: 'data',
          name: 'chatbi_timeline_marker',
          data: {
            order: 2,
            kind: 'text'
          }
        },
        {
          type: 'text',
          text: '先给出一句总结。'
        },
        {
          type: 'data',
          name: 'chatbi_timeline_marker',
          data: {
            order: 4,
            kind: 'text'
          }
        },
        {
          type: 'text',
          text: '接着补充图表结论。'
        }
      ],
      runtimeSteps: [
        makeStep({
          id: 'plan-1',
          kind: 'plan',
          title: '制定执行计划',
          sourceEvent: 'on_agent_start',
          runtimeEventId: 1,
          timelineOrder: 1
        }),
        makeStep({
          id: 'tool-1',
          kind: 'tool',
          title: '执行月度聚合',
          runtimeEventId: 2,
          timelineOrder: 3
        })
      ],
      terminalStatus: {
        status: 'running',
        label: 'Streaming…'
      }
    })

    const sections = partitionAssistantThreadTimeline(timeline)

    expect(sections.runtimeItems.map(item => item.kind)).toEqual(['plan_step'])
    expect(sections.contentItems.map(item => item.kind)).toEqual([
      'assistant_text',
      'tool_step',
      'assistant_text',
      'terminal_status'
    ])
  })
})
