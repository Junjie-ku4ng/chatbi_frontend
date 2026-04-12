// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskConversationReplayV2 } from '../ask-conversation-replay-v2'

const { listConversationTurnsMock } = vi.hoisted(() => ({
  listConversationTurnsMock: vi.fn()
}))

vi.mock('@/lib/ask-data', () => ({
  listConversationTurns: listConversationTurnsMock
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

async function renderReplay() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(<AskConversationReplayV2 conversationId="conv-2" />)
    await Promise.resolve()
  })

  return container
}

describe('AskConversationReplayV2', () => {
  it('loads persisted turns for the active conversation', async () => {
    listConversationTurnsMock.mockResolvedValue({
      items: [
        {
          turnId: 'turn-1',
          role: 'user',
          userQuestion: 'Show month over month revenue'
        },
        {
          turnId: 'turn-2',
          role: 'assistant',
          userQuestion: 'Revenue declined 6.2% versus prior month.'
        }
      ],
      total: 2
    })

    const container = await renderReplay()

    expect(listConversationTurnsMock).toHaveBeenCalledWith('conv-2', 12, 0)
    expect(container.textContent).toContain('Conversation Replay')
    expect(container.textContent).toContain('Show month over month revenue')
    expect(container.textContent).toContain('Revenue declined 6.2% versus prior month.')
  })
})
