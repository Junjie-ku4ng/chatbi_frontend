import { describe, expect, it } from 'vitest'
import { buildDonorMessagePresentationV2 } from '../ask-donor-message-adapter-v2'

describe('ask donor message adapter v2', () => {
  it('builds donor presentation sections and runtime groups from mixed timeline items', () => {
    const presentation = buildDonorMessagePresentationV2([
      {
        key: 'plan-1',
        kind: 'plan_step',
        step: {
          id: 'plan-1',
          messageId: 'msg-1',
          kind: 'plan',
          title: '制定执行计划',
          status: 'running',
          sourceEvent: 'on_agent_start',
          traceKey: null,
          queryLogId: null,
          progressPercent: null,
          updatedAt: '2026-04-10T10:00:00.000Z',
          runtimeEventId: 1,
          timelineOrder: 1,
          detail: null
        },
        timelineOrder: 1
      },
      {
        key: 'text-1',
        kind: 'assistant_text',
        text: '先给出一句总结。',
        timelineOrder: 2
      },
      {
        key: 'tool-1',
        kind: 'tool_step',
        step: {
          id: 'tool-1',
          messageId: 'msg-1',
          kind: 'tool',
          title: '执行月度聚合',
          status: 'running',
          sourceEvent: 'on_tool_start',
          traceKey: 'trace-1',
          queryLogId: 'query-log-1',
          progressPercent: 60,
          updatedAt: '2026-04-10T10:00:01.000Z',
          runtimeEventId: 2,
          timelineOrder: 3,
          detail: null
        },
        timelineOrder: 3
      },
      {
        key: 'clarify-1',
        kind: 'clarification',
        clarification: {
          required: true,
          message: 'Choose a region',
          missingSlots: ['region']
        },
        timelineOrder: 4
      },
      {
        key: 'status-1',
        kind: 'terminal_status',
        status: 'running',
        label: 'Streaming…',
        timelineOrder: Number.MAX_SAFE_INTEGER
      }
    ])

    expect(presentation.tone).toBe('clarification')
    expect(presentation.runtimeShellHeader).toBe('Thinking')
    expect(presentation.runtimeStepItems.map(item => item.key)).toEqual(['plan-1'])
    expect(presentation.runtimeTerminalItems).toHaveLength(0)
    expect(presentation.finalAnswerSections.map(section => `${section.sectionKind}:${section.item.key}`)).toEqual([
      'markdown:text-1',
      'timeline:tool-1',
      'clarification:clarify-1',
      'status:status-1'
    ])
  })

  it('keeps chart content unwrapped while still classifying non-chart sections', () => {
    const presentation = buildDonorMessagePresentationV2([
      {
        key: 'chart-1',
        kind: 'analysis_component',
        component: {
          type: 'chart',
          payload: {
            queryLogId: 'query-log-chart-1'
          }
        },
        timelineOrder: 1
      },
      {
        key: 'table-1',
        kind: 'analysis_component',
        component: {
          type: 'table',
          payload: {
            queryLogId: 'query-log-table-1'
          }
        },
        timelineOrder: 2
      }
    ])

    expect(presentation.tone).toBe('analysis')
    expect(presentation.finalAnswerSections.map(section => [section.item.key, section.sectionKind])).toEqual([
      ['chart-1', null],
      ['table-1', 'analysis']
    ])
  })

  it('coalesces adjacent streamed assistant text chunks into a single markdown section', () => {
    const presentation = buildDonorMessagePresentationV2([
      {
        key: 'text-1',
        kind: 'assistant_text',
        text: 'This ',
        timelineOrder: 1
      },
      {
        key: 'text-2',
        kind: 'assistant_text',
        text: 'workspace ',
        timelineOrder: 2
      },
      {
        key: 'text-3',
        kind: 'assistant_text',
        text: 'runtime.',
        timelineOrder: 3
      }
    ])

    expect(presentation.finalAnswerSections).toHaveLength(1)
    expect(presentation.finalAnswerSections[0]?.sectionKind).toBe('markdown')
    expect(presentation.finalAnswerSections[0]?.item.kind).toBe('assistant_text')
    if (presentation.finalAnswerSections[0]?.item.kind !== 'assistant_text') {
      throw new Error('expected coalesced markdown item')
    }
    expect(presentation.finalAnswerSections[0].item.text).toBe('This workspace runtime.')
  })
})
