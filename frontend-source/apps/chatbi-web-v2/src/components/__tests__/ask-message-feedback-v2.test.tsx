// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskMessageFeedbackV2 } from '../ask-message-feedback-v2'
import { resetChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'

const { createMessageFeedbackMock, deleteMessageFeedbackMock, getMessageFeedbackMock } = vi.hoisted(() => ({
  createMessageFeedbackMock: vi.fn(),
  deleteMessageFeedbackMock: vi.fn(),
  getMessageFeedbackMock: vi.fn()
}))
const { copyDonorAnswerMock } = vi.hoisted(() => ({
  copyDonorAnswerMock: vi.fn()
}))

vi.mock('@/lib/ask-data', () => ({
  createMessageFeedback: createMessageFeedbackMock,
  deleteMessageFeedback: deleteMessageFeedbackMock,
  getMessageFeedback: getMessageFeedbackMock
}))

vi.mock('../ask-donor-copy-utils-v2', () => ({
  copyDonorAnswerV2: copyDonorAnswerMock
}))

type MountedRoot = { container: HTMLDivElement; root: Root }

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
  vi.clearAllMocks()
  copyDonorAnswerMock.mockReset()
  resetChatSourceRailStore()
})

async function renderFeedback(
  props: Partial<React.ComponentProps<typeof AskMessageFeedbackV2>> = {}
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <AskMessageFeedbackV2
        conversationId={props.conversationId ?? 'conv-2'}
        getCopyHtml={props.getCopyHtml}
        getCopyText={props.getCopyText}
        messageId={props.messageId ?? 'msg-9'}
        sources={props.sources}
      />
    )
    await Promise.resolve()
  })

  return container
}

describe('AskMessageFeedbackV2', () => {
  it('creates like feedback when the message has no prior rating', async () => {
    getMessageFeedbackMock.mockResolvedValue(null)
    createMessageFeedbackMock.mockResolvedValue({
      id: 'feedback-1',
      conversationId: 'conv-2',
      messageId: 'msg-9',
      rating: 'LIKE'
    })

    const container = await renderFeedback()
    const likeButton = container.querySelector('button[data-rating="LIKE"]')

    expect(getMessageFeedbackMock).toHaveBeenCalledWith('conv-2', 'msg-9')
    expect(likeButton).not.toBeNull()

    await act(async () => {
      likeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(createMessageFeedbackMock).toHaveBeenCalledWith({
      conversationId: 'conv-2',
      messageId: 'msg-9',
      rating: 'LIKE'
    })
  })

  it('hides the donor-style source affordance when the message has no sources', async () => {
    getMessageFeedbackMock.mockResolvedValue(null)

    const container = await renderFeedback()
    const toolbar = container.querySelector('[data-testid="AgentMessage/toolbar"]')
    const actionGroup = container.querySelector('[data-testid="onyx-donor-toolbar-actions"]')

    expect(toolbar).not.toBeNull()
    expect(toolbar?.className).toContain('onyx-donor-toolbar')
    expect(toolbar?.className).toContain('flex md:flex-row justify-between items-center w-full transition-transform duration-300 ease-in-out transform opacity-100 pl-1')
    expect(actionGroup).not.toBeNull()
    expect(actionGroup?.className).toContain('onyx-donor-toolbar-actions')
    expect(actionGroup?.className).toContain('flex items-center gap-1')
    expect(container.innerHTML).toContain('opal-select-button')
    expect(container.querySelector('[data-testid="AgentMessage/copy-button"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="AgentMessage/like-button"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="AgentMessage/dislike-button"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="AgentMessage/regenerate"]')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent?.trim() === '回答来源')).toBe(false)
  })

  it('renders the donor-style source affordance when the message has real sources', async () => {
    getMessageFeedbackMock.mockResolvedValue(null)

    const container = await renderFeedback({
      sources: [
        {
          id: 'query-log:query-log-1',
          title: '查询日志引用',
          body: 'Analytical evidence captured for this answer.',
          meta: 'query-log-1',
          kind: 'document'
        }
      ]
    })

    expect(container.querySelector('[data-testid="onyx-donor-toolbar-sources"]')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent?.trim() === '回答来源')).toBe(true)
  })

  it('copies the final answer text through the donor toolbar copy action', async () => {
    getMessageFeedbackMock.mockResolvedValue(null)
    copyDonorAnswerMock.mockResolvedValue(undefined)

    const container = await renderFeedback({
      getCopyText: () => 'Revenue is up 12% month over month.',
      getCopyHtml: () => '<p>Revenue is up 12% month over month.</p>'
    })

    const copyButton = container.querySelector('button[aria-label="复制回答"]')

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(copyDonorAnswerMock).toHaveBeenCalledWith({
      text: 'Revenue is up 12% month over month.',
      html: '<p>Revenue is up 12% month over month.</p>'
    })
  })
})
