// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskRuntimeShellV2 } from '../ask-runtime-shell-v2'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useChatbiStreamRuntimeMock, useChatRuntimeStoreMock } = vi.hoisted(() => ({
  useChatbiStreamRuntimeMock: vi.fn(),
  useChatRuntimeStoreMock: vi.fn()
}))

const { listConversationThreadMessagesMock } = vi.hoisted(() => ({
  listConversationThreadMessagesMock: vi.fn()
}))

vi.mock('@assistant-ui/react', async () => {
  const ReactModule = await import('react')

  const passthrough =
    (Tag: 'div' | 'button' | 'textarea') =>
    ({ children, ...props }: MockElementProps) =>
      ReactModule.createElement(Tag, props, children)

  return {
    AssistantRuntimeProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement('div', { 'data-testid': 'assistant-runtime-provider' }, children),
    ComposerPrimitive: {
      Root: passthrough('div'),
      Input: (props: Record<string, unknown>) => ReactModule.createElement('textarea', props),
      Send: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
    },
    ThreadPrimitive: {
      Root: passthrough('div'),
      Viewport: passthrough('div'),
      Empty: passthrough('div'),
      Messages: () => ReactModule.createElement('div', { 'data-testid': 'ask-thread-messages' })
    }
  }
})

vi.mock('@/lib/chat-runtime-bridge', () => ({
  useChatbiStreamRuntime: useChatbiStreamRuntimeMock,
  useChatRuntimeStore: useChatRuntimeStoreMock,
  AssistantMessageCard: () => React.createElement('div', { 'data-testid': 'ask-assistant-message' }),
  UserMessageCard: () => React.createElement('div', { 'data-testid': 'ask-user-message' })
}))

vi.mock('@/lib/ask-data', () => ({
  listConversationThreadMessages: listConversationThreadMessagesMock
}))

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

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

async function renderShellWithProps(
  props: Partial<React.ComponentProps<typeof AskRuntimeShellV2>> = {}
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <AskRuntimeShellV2
        activeXpertId={props.activeXpertId ?? 'workspace-alpha'}
        initialConversationId={props.initialConversationId}
        mockChatScenario={props.mockChatScenario}
        mockChatLatencyMs={props.mockChatLatencyMs}
        renderRail={props.renderRail}
        handoff={props.handoff ?? {}}
        shellAnchors={
          props.shellAnchors ?? {
            askThreadStage: 'ask.thread.stage',
            askDiagnosticsDrawer: 'ask.diagnostics.drawer',
            askComposerDock: 'ask.composer.dock'
          }
        }
      />,
    )
    await Promise.resolve()
  })

  return { container, root }
}

describe('AskRuntimeShellV2', () => {
  it('renders the real runtime shell with provider, thread and Onyx-style composer controls', async () => {
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [
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
          }
        ],
        isStreaming: false,
        lastEvent: {
          event: 'progress',
          data: {
            phase: 'plan',
            category: 'agent',
            message: 'planning'
          }
        },
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    const { container } = await renderShellWithProps()

    expect(useChatbiStreamRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        xpertId: 'workspace-alpha',
        onEvent: expect.any(Function),
        onRuntimeError: expect.any(Function)
      })
    )
    expect(container.querySelector('[data-testid="assistant-runtime-provider"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-thread-messages"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-thread-viewport-shell"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-runtime-thread-viewport"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-thread-header-shell"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-thread-header-stack"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-question-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-rail-card-active-handoff"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-rail-card-runtime-status"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-rail-card-resource-requests"]')).not.toBeNull()
    expect(container.textContent).toContain('Deep Research')
    expect(container.textContent).toContain('GPT-5')
    expect(container.querySelector('#onyx-chat-input')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-composer-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-composer-stack"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-app-input-bar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-app-input-bar-textarea-zone"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-app-input-bar-toolbar-left"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-app-input-bar-toolbar-right"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-composer-controls-left"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-composer-controls-right"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-composer-attach-button"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-composer-tune-button"]')).not.toBeNull()
    expect(container.querySelector('#onyx-chat-input-send-button')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-composer-send-shell"]')).not.toBeNull()
    expect(
      (container.querySelector('[data-testid="onyx-donor-composer-send-shell"]') as HTMLSpanElement | null)?.className ?? ''
    ).toContain('onyx-donor-composer-send-shell-wrap')
    expect(container.querySelector('#onyx-chat-input-send-button svg')).not.toBeNull()
    expect((container.querySelector('#onyx-chat-input-send-button') as HTMLButtonElement | null)?.className).toContain('onyx-donor-composer-send')
    expect(container.querySelector('[data-testid="onyx-donor-composer-send-glyph"]')).not.toBeNull()
    expect((container.querySelector('#onyx-chat-input-send-button') as HTMLButtonElement | null)?.getAttribute('aria-label')).toBe('Send message')
    expect(container.querySelector('[data-testid="actions-container"]')).not.toBeNull()
    expect(container.querySelector('[data-contract="ask.composer.dock"]')).not.toBeNull()
  })

  it('passes deterministic mock chat harness settings into the runtime hook', async () => {
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    await renderShellWithProps({
      mockChatScenario: 'chart',
      mockChatLatencyMs: 180
    })

    expect(useChatbiStreamRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mockChatScenario: 'chart',
        mockChatLatencyMs: 180
      })
    )
  })

  it('initializes from handoff state and syncs the resolved conversation id back to the url', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    listConversationThreadMessagesMock.mockResolvedValue([])
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    await renderShellWithProps({
      activeXpertId: 'workspace-alpha',
      initialConversationId: 'conv-seed',
      handoff: {
        queryLogId: 'query-demo-01',
        traceKey: 'trace-demo-01',
        analysisDraft: 'story-outline'
      }
    })

    const runtimeOptions = useChatbiStreamRuntimeMock.mock.calls[0]?.[0]
    expect(runtimeOptions).toEqual(
      expect.objectContaining({
        xpertId: 'workspace-alpha',
        conversationId: 'conv-seed',
        onConversationId: expect.any(Function)
      })
    )

    await act(async () => {
      runtimeOptions.onConversationId('conv-live')
      await Promise.resolve()
    })

    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      {},
      '',
      expect.stringContaining(
        '?xpertId=workspace-alpha&conversationId=conv-live&queryLogId=query-demo-01&traceKey=trace-demo-01&analysisDraft=story-outline'
      )
    )
  })

  it('renders an Onyx-style center thread welcome state when the external source rail owns the right column', async () => {
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    const { container } = await renderShellWithProps({
      shellAnchors: {
        askThreadStage: 'ask.thread.stage',
        askDiagnosticsDrawer: 'ask.diagnostics.drawer',
        askComposerDock: 'ask.composer.dock'
      },
      renderRail: false
    })

    expect(container.textContent).not.toContain('Live Ask Runtime')
    expect(container.textContent).toContain('What is PA ChatBI?')
    expect(container.textContent).toContain('Deep Research')
    expect(container.textContent).toContain('GPT-5')
    expect(container.querySelector('[data-testid="onyx-donor-runtime-thread-viewport"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-stack"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-question-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-composer-dock"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-toolbar-row"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-copy-block"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-runtime-welcome-question-chip"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-runtime-welcome-answer-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-welcome-answer-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-runtime-welcome-source-button"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-toolbar"]')).not.toBeNull()
    expect(
      (container.querySelector('[data-testid="ask-runtime-toolbar"]') as HTMLDivElement | null)?.innerHTML ?? ''
    ).toContain('opal-select-button')
    expect(container.querySelector('[data-testid="ask-runtime-welcome-secondary-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-welcome-secondary-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-composer-secondary-controls"]')).not.toBeNull()
    expect((container.querySelector('[data-testid="ask-v2-input"]') as HTMLTextAreaElement | null)?.getAttribute('placeholder')).toBe(
      'Ask follow-up questions'
    )
  })

  it('keeps the donor welcome answer visible when the right-side source rail is rendered', async () => {
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    const { container } = await renderShellWithProps({
      renderRail: true
    })

    expect(container.querySelector('[data-contract="ask.diagnostics.drawer"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-thread-viewport-shell"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-runtime-thread-viewport"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-stack"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-question-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-composer-dock"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-toolbar-row"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-donor-welcome-copy-block"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-runtime-welcome-question-chip"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-runtime-welcome-answer-card"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onyx-native-donor-welcome-answer-card"]')).not.toBeNull()
    expect(container.textContent).toContain('What is PA ChatBI?')
  })

  it('hydrates persisted thread history when opening a conversation directly from the route', async () => {
    listConversationThreadMessagesMock.mockResolvedValue([
      {
        id: 'user-1',
        role: 'user',
        content: 'Persisted question'
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: [{ type: 'text', text: 'Persisted answer' }],
        status: { type: 'complete', reason: 'stop' }
      }
    ])
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    await renderShellWithProps({
      activeXpertId: 'workspace-alpha',
      initialConversationId: 'conv-seed'
    })

    expect(listConversationThreadMessagesMock).toHaveBeenCalledWith('conv-seed')
    expect(useChatbiStreamRuntimeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: 'conv-seed',
        initialMessages: expect.arrayContaining([
          expect.objectContaining({ id: 'user-1', role: 'user' }),
          expect.objectContaining({ id: 'assistant-1', role: 'assistant' })
        ])
      })
    )
  })

  it('re-syncs the active conversation when the route conversationId changes', async () => {
    listConversationThreadMessagesMock.mockResolvedValue([])
    useChatbiStreamRuntimeMock.mockReturnValue({ runtime: 'mock' })
    useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        runtimeEvents: [],
        isStreaming: false,
        lastEvent: null,
        ingestEvent: vi.fn(),
        clearRuntimeState: vi.fn()
      })
    )

    const { root } = await renderShellWithProps({
      activeXpertId: 'workspace-alpha',
      initialConversationId: 'conv-seed'
    })

    await act(async () => {
      root.render(
        <AskRuntimeShellV2
          activeXpertId="workspace-alpha"
          initialConversationId="conv-next"
          renderRail={false}
          handoff={{}}
          shellAnchors={{
            askThreadStage: 'ask.thread.stage',
            askDiagnosticsDrawer: 'ask.diagnostics.drawer',
            askComposerDock: 'ask.composer.dock'
          }}
        />,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(listConversationThreadMessagesMock).toHaveBeenLastCalledWith('conv-next')
    expect(useChatbiStreamRuntimeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: 'conv-next'
      })
    )
  })
})
