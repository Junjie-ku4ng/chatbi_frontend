// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskWorkspaceClientV2 } from '../ask-workspace-client-v2'
import { resetChatSourceRailStore, useChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'

const { framePropsMock, sidebarPropsMock, chatPagePropsMock, sourceRailPropsMock } = vi.hoisted(() => ({
  framePropsMock: vi.fn(),
  sidebarPropsMock: vi.fn(),
  chatPagePropsMock: vi.fn(),
  sourceRailPropsMock: vi.fn()
}))

vi.mock('../onyx/onyx-app-frame-v2', () => ({
  OnyxAppFrameV2: ({
    sidebar,
    main,
    rail,
    sourceRailOpen
  }: {
    sidebar: React.ReactNode
    main: React.ReactNode
    rail?: React.ReactNode
    sourceRailOpen?: boolean
  }) => {
    framePropsMock({ sourceRailOpen })
    return React.createElement(
      'div',
      {
        'data-testid': 'ask-workspace-frame-v2',
        'data-source-rail-open': sourceRailOpen ? 'true' : 'false'
      },
      sidebar,
      main,
      sourceRailOpen ? rail : null
    )
  }
}))

vi.mock('../onyx/onyx-sidebar-v2', () => ({
  OnyxSidebarV2: (props: {
    activeXpertId?: string
    activeConversationId?: string
    preferActiveConversationFallback?: boolean
    handoff: {
      queryLogId?: string
      traceKey?: string
      analysisDraft?: string
    }
  }) => {
    sidebarPropsMock(props)
    return React.createElement(
      'div',
      {
        'data-testid': 'workspace-sidebar',
        'data-active-conversation-id': props.activeConversationId ?? ''
      },
      props.activeConversationId ?? 'no-conversation'
    )
  }
}))

vi.mock('../onyx/onyx-chat-page-v2', () => ({
  OnyxChatPageV2: (props: {
    activeXpertId?: string
    initialConversationId?: string
    handoff: {
      queryLogId?: string
      traceKey?: string
      analysisDraft?: string
    }
    shellAnchors: {
      askThreadStage: string
      askDiagnosticsDrawer: string
      askComposerDock: string
    }
    onConversationIdChange?: (conversationId?: string) => void
  }) => {
    chatPagePropsMock(props)
    return React.createElement(
      'button',
      {
        'data-testid': 'workspace-chat-page',
        onClick: () => props.onConversationIdChange?.('conv-live')
      },
      'create conversation'
    )
  }
}))

vi.mock('../onyx/onyx-source-rail-v2', () => ({
  OnyxSourceRailV2: (props: {
    items: Array<{
      id: string
      title: string
      body: string
      eyebrow?: string
      meta?: string
      kind?: 'document' | 'mail' | 'chat' | 'insight' | 'search'
    }>
  }) => {
    sourceRailPropsMock(props)
    return React.createElement(
      'div',
      { 'data-testid': 'workspace-source-rail' },
      props.items.map(item =>
        React.createElement('span', { key: item.id, 'data-source-title': item.title }, item.title)
      )
    )
  }
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
  resetChatSourceRailStore()
})

async function renderWorkspace({ sourceRailOpen = false }: { sourceRailOpen?: boolean } = {}) {
  if (sourceRailOpen) {
    useChatSourceRailStore.setState({ isRailOpen: true })
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <AskWorkspaceClientV2
        activeXpertId="workspace-alpha"
        initialConversationId={undefined}
        handoff={{
          queryLogId: 'query-demo-01',
          traceKey: 'trace-demo-01'
        }}
        modelId={undefined}
        shellAnchors={{
          askThreadStage: 'ask.thread.stage',
          askDiagnosticsDrawer: 'ask.diagnostics.drawer',
          askComposerDock: 'ask.composer.dock'
        }}
      />
    )
    await Promise.resolve()
  })

  return { container, root }
}

describe('AskWorkspaceClientV2', () => {
  it('hides the answer source rail until the source rail store opens it', async () => {
    const { container } = await renderWorkspace()

    expect(framePropsMock).toHaveBeenLastCalledWith({ sourceRailOpen: false })
    expect(container.querySelector('[data-testid="workspace-source-rail"]')).toBeNull()
    expect(sourceRailPropsMock).not.toHaveBeenCalled()
  })

  it('propagates the live conversationId to the sidebar and source rail after a new conversation starts', async () => {
    const { container } = await renderWorkspace({ sourceRailOpen: true })

    expect(sidebarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeConversationId: undefined
      })
    )
    expect(sourceRailPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: expect.not.arrayContaining([
          expect.objectContaining({ title: '当前会话' })
        ])
      })
    )
    expect(container.querySelector('[data-testid="workspace-source-rail"]')).not.toBeNull()

    const button = container.querySelector('[data-testid="workspace-chat-page"]')
    expect(button).toBeTruthy()

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(sidebarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeConversationId: 'conv-live'
      })
    )
    expect(sourceRailPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ title: '当前会话' })
        ])
      })
    )
    expect(container.querySelector('[data-testid="workspace-sidebar"]')?.getAttribute('data-active-conversation-id')).toBe(
      'conv-live'
    )
    expect(container.textContent).toContain('当前会话')
  })
})
