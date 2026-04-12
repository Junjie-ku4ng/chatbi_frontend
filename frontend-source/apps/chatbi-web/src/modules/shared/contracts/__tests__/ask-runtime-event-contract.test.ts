import { describe, expect, it } from 'vitest'
import {
  askRuntimeEventGroupLabels,
  formatAskRuntimeEventClock,
  formatAskRuntimeEventLabel,
  groupAskRuntimeEvents,
  resolveAskRuntimeEventGroup,
  resolveAskRuntimeEventTone
} from '@/modules/shared/contracts/ask-runtime-event-contract'

describe('ask runtime event contract', () => {
  it('projects runtime events into stable groups and tones', () => {
    expect(
      resolveAskRuntimeEventGroup({
        event: 'progress',
        data: {
          phase: 'execute',
          category: 'tool',
          message: 'tool running'
        }
      })
    ).toBe('tool')

    expect(
      resolveAskRuntimeEventGroup({
        event: 'clarification',
        data: {
          required: true,
          message: 'need clarification',
          missingSlots: []
        }
      })
    ).toBe('chat')

    expect(
      resolveAskRuntimeEventTone({
        event: 'done',
        data: {}
      })
    ).toBe('ok')

    expect(
      resolveAskRuntimeEventTone({
        event: 'error',
        data: {
          message: 'failed'
        }
      })
    ).toBe('danger')
  })

  it('formats stable runtime event labels for the ask diagnostics timeline', () => {
    expect(
      formatAskRuntimeEventLabel({
        event: 'start',
        data: {}
      })
    ).toBe('会话已发起')

    expect(
      formatAskRuntimeEventLabel({
        event: 'progress',
        data: {
          phase: 'render',
          message: 'assembling answer'
        }
      })
    ).toBe('渲染 · assembling answer')

    expect(
      formatAskRuntimeEventLabel({
        event: 'component',
        data: {
          type: 'chart',
          payload: {
            title: 'Revenue by Month'
          }
        }
      })
    ).toBe('组件输出 · chart · Revenue by Month')

    expect(
      formatAskRuntimeEventLabel({
        event: 'error',
        data: {
          message: 'runtime failed'
        }
      })
    ).toBe('runtime failed')
  })

  it('groups runtime events in reverse-recent order with canonical labels', () => {
    const groups = groupAskRuntimeEvents([
      {
        id: 1,
        receivedAt: '2026-04-09T00:00:00.000Z',
        event: {
          event: 'progress',
          data: {
            phase: 'plan',
            category: 'agent',
            message: 'planning'
          }
        }
      },
      {
        id: 2,
        receivedAt: '2026-04-09T00:00:01.000Z',
        event: {
          event: 'clarification',
          data: {
            required: true,
            message: 'need dimensions',
            missingSlots: []
          }
        }
      },
      {
        id: 3,
        receivedAt: '2026-04-09T00:00:02.000Z',
        event: {
          event: 'progress',
          data: {
            phase: 'execute',
            category: 'tool',
            message: 'querying'
          }
        }
      }
    ])

    expect(askRuntimeEventGroupLabels).toEqual({
      system: 'System',
      agent: 'Agent',
      tool: 'Tool',
      chat: 'ChatEvent'
    })
    expect(groups).toEqual([
      {
        key: 'agent',
        label: 'Agent',
        items: [
          expect.objectContaining({
            id: 1
          })
        ]
      },
      {
        key: 'tool',
        label: 'Tool',
        items: [
          expect.objectContaining({
            id: 3
          })
        ]
      },
      {
        key: 'chat',
        label: 'ChatEvent',
        items: [
          expect.objectContaining({
            id: 2
          })
        ]
      }
    ])
  })

  it('returns empty clock text for invalid timestamps', () => {
    expect(formatAskRuntimeEventClock('not-a-date')).toBe('')
  })
})
