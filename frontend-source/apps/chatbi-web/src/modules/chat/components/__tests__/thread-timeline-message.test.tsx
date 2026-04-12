// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeMessageStep } from '@/modules/chat/runtime/chat-runtime-projection'
import { buildAssistantThreadTimeline } from '@/modules/chat/runtime/chat-thread-timeline'
import { ThreadTimelineMessage } from '../thread/thread-timeline-message'

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockChart() {
      return <div data-testid="mock-chart" />
    }
}))

vi.mock('@assistant-ui/react', async () => {
  return {
    useAui: () => ({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
  }
})

const mountedRoots: Array<{ root: Root; container: HTMLDivElement }> = []

beforeEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
})

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
  })

  return container
}

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

describe('ThreadTimelineMessage', () => {
  it('renders inline timeline items in text -> tool -> component -> clarification order', async () => {
    const timeline = buildAssistantThreadTimeline({
      parts: [
        { type: 'text', text: '先看结论。' },
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
          id: 'tool-1',
          kind: 'tool',
          title: '执行指标计算',
          runtimeEventId: 2
        })
      ]
    })

    const container = await renderIntoDom(<ThreadTimelineMessage items={timeline} />)
    const itemKinds = Array.from(container.querySelectorAll('[data-thread-item-kind]')).map(node =>
      node.getAttribute('data-thread-item-kind')
    )

    expect(itemKinds).toEqual(['assistant_text', 'tool_step', 'analysis_component', 'clarification'])
    expect(container.textContent).toContain('先看结论。')
    expect(container.querySelector('[data-testid="thread-tool-step-card"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="mock-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="ask-clarification-card"]')).toBeTruthy()
  })

  it('shows expandable runtime step metadata for tool cards', async () => {
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
          progressPercent: 100,
          detail: {
            message: '图表已生成',
            status: 'success'
          }
        })
      ]
    })

    const container = await renderIntoDom(<ThreadTimelineMessage items={timeline} />)
    const toggle = container.querySelector('[data-testid="thread-tool-step-toggle"]') as HTMLButtonElement

    expect(toggle).toBeTruthy()

    await act(async () => {
      toggle.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="thread-tool-step-detail"]')?.textContent).toContain('trace-ctx-1')
    expect(container.querySelector('[data-testid="thread-tool-step-detail"]')?.textContent).toContain('query-log-ctx-1')
    expect(container.querySelector('[data-testid="thread-tool-step-detail"]')?.textContent).toContain('图表已生成')
  })
})
