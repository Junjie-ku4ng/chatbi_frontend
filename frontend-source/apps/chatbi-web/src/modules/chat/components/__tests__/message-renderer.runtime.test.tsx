// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantMessageCard } from '../message-renderer'
import { resetChatRuntimeStore, useChatRuntimeStore } from '../../runtime/chat-runtime-store'

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

const { useMessageMock } = vi.hoisted(() => ({
  useMessageMock: vi.fn()
}))

vi.mock('@assistant-ui/react', () => ({
  useMessage: useMessageMock
}))

vi.mock('../thread/thread-timeline-message', () => ({
  ThreadTimelineMessage: ({ items }: { items: Array<unknown> }) => (
    <div data-testid="thread-timeline-message">{items.length}</div>
  )
}))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function renderCard() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(<AssistantMessageCard />)
    await Promise.resolve()
    await Promise.resolve()
  })

  return { container, root }
}

describe('AssistantMessageCard runtime selector regression', () => {
  beforeEach(() => {
    resetChatRuntimeStore()
    useMessageMock.mockReturnValue({
      content: [{ type: 'text', text: '正在分析' }],
      status: { type: 'running' }
    })
  })

  afterEach(() => {
    while (mountedRoots.length > 0) {
      const mounted = mountedRoots.pop()
      if (!mounted) continue
      act(() => {
        mounted.root.unmount()
      })
      mounted.container.remove()
    }
    resetChatRuntimeStore()
    vi.clearAllMocks()
  })

  it('renders running assistant messages with default runtime steps without infinite update loops', async () => {
    const { container } = await renderCard()

    await act(async () => {
      useChatRuntimeStore.getState().ingestEvent({
        event: 'progress',
        data: {
          phase: 'plan',
          sourceEvent: 'on_agent_start',
          status: 'running',
          detail: {
            id: 'plan-step-1',
            title: '制定执行计划'
          }
        }
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="thread-timeline-message"]')?.textContent).toBe('2')
    expect(container.querySelector('[data-testid="ask-assistant-running"]')).not.toBeNull()
  })
})
