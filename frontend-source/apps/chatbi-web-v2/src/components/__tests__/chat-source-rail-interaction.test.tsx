// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskMessageFeedbackV2 } from '../ask-message-feedback-v2'
import { OnyxSourceRailV2 } from '../onyx/onyx-source-rail-v2'
import { resetChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import { resetChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'

const { createMessageFeedbackMock, deleteMessageFeedbackMock, getMessageFeedbackMock } = vi.hoisted(() => ({
  createMessageFeedbackMock: vi.fn(),
  deleteMessageFeedbackMock: vi.fn(),
  getMessageFeedbackMock: vi.fn()
}))

vi.mock('@/lib/ask-data', () => ({
  createMessageFeedback: createMessageFeedbackMock,
  deleteMessageFeedback: deleteMessageFeedbackMock,
  getMessageFeedback: getMessageFeedbackMock
}))

type MountedRoot = {
  container: HTMLDivElement
  root: Root
}

const mountedRoots: MountedRoot[] = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  resetChatSourceRailStore()
  vi.clearAllMocks()
})

async function renderInteractionSurface() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <div>
        <AskMessageFeedbackV2
          conversationId="conv-1"
          messageId="msg-1"
          sources={[
            {
              id: 'query-log:query-log-1',
              title: '查询日志引用',
              body: '本次回答捕获的分析证据。',
              meta: 'query-log-1',
              kind: 'document'
            }
          ]}
        />
        <OnyxSourceRailV2
          items={[
            {
              id: 'fallback-session',
              title: '会话记录',
              body: '备用工作区卡片',
              kind: 'chat'
            }
          ]}
        />
      </div>
    )
    await Promise.resolve()
  })

  return container
}

describe('chat source rail interaction', () => {
  it('toggles the selected message sources into the right rail when Sources is clicked', async () => {
    getMessageFeedbackMock.mockResolvedValue(null)

    const container = await renderInteractionSurface()
    const sourceButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === '来源')
    const sourceRail = container.querySelector('[data-testid="onyx-donor-source-rail"]')

    expect(sourceButton).toBeTruthy()
    expect(sourceRail?.className).toContain('onyx-donor-source-rail')
    expect(container.textContent).toContain('会话记录')
    expect(container.textContent).not.toContain('查询日志引用')

    await act(async () => {
      sourceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(sourceButton?.getAttribute('data-interactive-state')).toBe('selected')
    expect(container.textContent).toContain('查询日志引用')
    expect(container.textContent).not.toContain('会话记录')
    expect(container.querySelector('[data-testid="onyx-source-rail-card"]')?.className).toContain('onyx-donor-source-card')

    await act(async () => {
      sourceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(sourceButton?.getAttribute('data-interactive-state')).toBe('empty')
    expect(container.textContent).toContain('会话记录')
  })
})
