// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DEV_ASK_HARNESS_XPERT_ID } from '@/modules/chat/runtime/ask-harness'
import { AskConversationSidebarV2 } from '../ask-conversation-sidebar-v2'

const { listConversationsMock } = vi.hoisted(() => ({
  listConversationsMock: vi.fn()
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { href, ...props }, children)
}))

vi.mock('@/lib/ask-data', () => ({
  listConversations: listConversationsMock
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
  vi.clearAllMocks()
})

async function renderSidebar({
  activeXpertId = 'workspace-alpha',
  activeConversationId = 'conv-2',
  preferActiveConversationFallback = false
}: {
  activeXpertId?: string
  activeConversationId?: string
  preferActiveConversationFallback?: boolean
} = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <AskConversationSidebarV2
        activeXpertId={activeXpertId}
        activeConversationId={activeConversationId}
        preferActiveConversationFallback={preferActiveConversationFallback}
        handoff={{
          queryLogId: 'query-demo-01',
          traceKey: 'trace-demo-01'
        }}
      />
    )
    await Promise.resolve()
  })

  return { container, root }
}

describe('AskConversationSidebarV2', () => {
  it('loads conversations and builds links that preserve handoff state', async () => {
    listConversationsMock.mockResolvedValue({
      items: [
        {
          conversationId: 'conv-1',
          memorySummary: 'North America revenue decline',
          lastTurnAt: '2026-04-09T04:00:00.000Z'
        },
        {
          conversationId: 'conv-2',
          memorySummary: 'Governance evidence follow-up',
          lastTurnAt: '2026-04-09T05:00:00.000Z'
        }
      ],
      total: 2
    })

    const { container } = await renderSidebar()
    const list = container.querySelector('[data-testid="onyx-donor-session-list"]')
    const items = container.querySelectorAll('[data-testid="onyx-donor-session-item"]')
    const meta = container.querySelectorAll('[data-testid="onyx-donor-session-item-meta"]')

    expect(listConversationsMock).toHaveBeenCalledWith('workspace-alpha', 30, 0)
    expect(list?.className).toContain('onyx-donor-session-list')
    expect(items).toHaveLength(2)
    expect(items[0]?.className).toContain('onyx-donor-session-item')
    expect(meta[0]?.className).toContain('onyx-donor-session-item-meta')
    expect(container.textContent).toContain('North America revenue decline')
    expect(container.textContent).toContain('Governance evidence follow-up')
    const activeLink = container.querySelector('a[href*="conversationId=conv-2"]')
    expect(activeLink?.getAttribute('href')).toContain('xpertId=workspace-alpha')
    expect(activeLink?.getAttribute('href')).toContain('queryLogId=query-demo-01')
    expect(activeLink?.getAttribute('href')).toContain('traceKey=trace-demo-01')
  })

  it('falls back to donor placeholder sessions when conversation history is unavailable for the current workspace', async () => {
    const error = Object.assign(new Error('Access denied'), { status: 403 })
    listConversationsMock.mockRejectedValue(error)

    const { container } = await renderSidebar()
    const list = container.querySelector('[data-testid="onyx-donor-session-list"]')
    const items = container.querySelectorAll('[data-testid="onyx-donor-session-item"]')

    expect(list?.className).toContain('onyx-donor-session-list')
    expect(items.length).toBeGreaterThan(0)
    expect(container.textContent).toContain('Summarize Most Recent 3')
    expect(container.textContent).toContain('Onyx AI Intro')
    expect(container.textContent).not.toContain('Starter session')
    expect(container.textContent).not.toContain('Conversation load failed')
    expect(container.textContent).not.toContain('Access denied')
  })

  it('does not request conversations for the default dev ask harness workspace shell and still renders donor placeholders', async () => {
    const { container } = await renderSidebar({
      activeXpertId: DEFAULT_DEV_ASK_HARNESS_XPERT_ID
    })

    expect(listConversationsMock).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="onyx-donor-session-list"]')?.className).toContain('onyx-donor-session-list')
    expect(container.textContent).toContain('Summarize Most Recent 3')
    expect(container.textContent).toContain('Onyx AI Latest News')
    expect(container.textContent).not.toContain('Starter session')
  })

  it('renders donor placeholder sessions when the workspace has no saved conversations yet', async () => {
    listConversationsMock.mockResolvedValue({
      items: [],
      total: 0
    })

    const { container } = await renderSidebar()

    expect(container.querySelector('[data-testid="onyx-donor-session-list"]')?.className).toContain('onyx-donor-session-list')
    expect(container.textContent).toContain('Summarize Most Recent 3')
    expect(container.textContent).toContain('POC Documents')
    expect(container.textContent).not.toContain('Starter session')
    expect(container.textContent).not.toContain('Try sending a message!')
  })

  it('shows the active live conversation even before the refreshed conversation list arrives', async () => {
    listConversationsMock.mockResolvedValue({
      items: [],
      total: 0
    })

    const { container } = await renderSidebar({
      activeConversationId: 'conv-live',
      preferActiveConversationFallback: true
    })

    expect(container.textContent).toContain('Current conversation')
    expect(container.textContent).toContain('conv-live')
    expect(container.textContent).not.toContain('Summarize Most Recent 3')
  })

  it('re-loads conversations when a new active conversation is created in the current workspace', async () => {
    listConversationsMock
      .mockResolvedValueOnce({
        items: [
          {
            conversationId: 'conv-1',
            memorySummary: 'Existing workspace thread',
            lastTurnAt: '2026-04-09T04:00:00.000Z'
          }
        ],
        total: 1
      })
      .mockResolvedValueOnce({
        items: [
          {
            conversationId: 'conv-3',
            memorySummary: 'Freshly created conversation',
            lastTurnAt: '2026-04-09T06:00:00.000Z'
          },
          {
            conversationId: 'conv-1',
            memorySummary: 'Existing workspace thread',
            lastTurnAt: '2026-04-09T04:00:00.000Z'
          }
        ],
        total: 2
      })

    const { container, root } = await renderSidebar({
      activeConversationId: 'conv-1'
    })

    expect(container.textContent).toContain('Existing workspace thread')
    expect(container.textContent).not.toContain('Freshly created conversation')
    expect(listConversationsMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.render(
        <AskConversationSidebarV2
          activeXpertId="workspace-alpha"
          activeConversationId="conv-3"
          preferActiveConversationFallback={false}
          handoff={{
            queryLogId: 'query-demo-01',
            traceKey: 'trace-demo-01'
          }}
        />
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(listConversationsMock).toHaveBeenCalledTimes(2)
    expect(listConversationsMock).toHaveBeenLastCalledWith('workspace-alpha', 30, 0)
    expect(container.textContent).toContain('Freshly created conversation')
  })
})
