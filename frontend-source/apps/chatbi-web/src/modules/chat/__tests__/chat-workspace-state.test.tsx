// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatWorkspacePage } from '../pages/chat-workspace-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

const { runtimeTransportMock } = vi.hoisted(() => ({
  runtimeTransportMock: vi.fn()
}))

const { useChatbiStreamRuntimeMock } = vi.hoisted(() => ({
  useChatbiStreamRuntimeMock: vi.fn()
}))

const workbenchState = {
  activeConversationId: undefined as string | undefined,
  lastQueryLogId: undefined as string | undefined,
  setActiveConversationId: vi.fn(),
  setActiveTraceKey: vi.fn(),
  setLastIntentKind: vi.fn(),
  dispatch: vi.fn()
}

const runtimeStoreState = {
  isStreaming: false,
  lastEvent: null,
  runtimeEvents: [],
  lastDone: null,
  executionOrder: [],
  executionTree: {},
  taskRuntimeHints: { statusHint: 'idle' },
  taskRuntimeHintsByConversationId: {},
  ingestEvent: vi.fn(),
  ingestRuntimeControlResult: vi.fn(),
  clearRuntimeState: vi.fn()
}

const streamRuntimeCallbacks: {
  onRuntimeError?: (error: unknown) => void
} = {}

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('@assistant-ui/react', async () => {
  const ReactModule = await import('react')

  const passthrough =
    (Tag: 'div' | 'button' | 'textarea') =>
    ({ children, ...props }: MockElementProps) =>
      ReactModule.createElement(Tag, props, children)

  return {
    AssistantRuntimeProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
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
    },
    useAui: () => ({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
  }
})

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('@/modules/chat/api', () => ({
  createMessageFeedback: vi.fn(),
  deleteMessageFeedback: vi.fn(),
  getConversation: vi.fn(),
  getMessageFeedback: vi.fn(),
  listConversations: vi.fn(),
  listConversationTurns: vi.fn(),
  listSuggestedQuestions: vi.fn()
}))

vi.mock('@/modules/chat/analysis/analysis-panel', async () => {
  const ReactModule = await import('react')
  return {
    AskAnalysisPanel: () => ReactModule.createElement('div', { 'data-testid': 'analysis-panel-inner' })
  }
})

vi.mock('@/modules/auth/session-store', () => ({
  useSessionStore: (selector: (state: { session: { userId: string } }) => unknown) =>
    selector({ session: { userId: 'tester' } })
}))

vi.mock('@/modules/chat/components/message-renderer', async () => {
  const ReactModule = await import('react')
  return {
    AssistantMessageCard: () => ReactModule.createElement('div', { 'data-testid': 'ask-assistant-message' }),
    UserMessageCard: () => ReactModule.createElement('div', { 'data-testid': 'ask-user-message' })
  }
})

vi.mock('@/modules/chat/components/runtime-execution-panel', async () => {
  const ReactModule = await import('react')
  return {
    RuntimeExecutionPanel: (props: {
      runtimeControlActions?: {
        resume?: {
          onExecute?: () => void
          pending?: boolean
        }
        toolDecision?: {
          onConfirm?: () => void
          onReject?: () => void
          pending?: 'confirm' | 'reject' | null
        }
      }
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'ask-runtime-control-unavailable' },
        ReactModule.createElement(
          ReactModule.Fragment,
          null,
          props.runtimeControlActions?.resume
            ? ReactModule.createElement(
                'button',
                {
                  'data-testid': 'ask-runtime-control-resume-action',
                  disabled: Boolean(props.runtimeControlActions.resume.pending),
                  onClick: () => props.runtimeControlActions?.resume?.onExecute?.()
                },
                'resume-action'
              )
            : null,
          props.runtimeControlActions?.toolDecision
            ? ReactModule.createElement(
                ReactModule.Fragment,
                null,
                ReactModule.createElement(
                  'button',
                  {
                    'data-testid': 'ask-runtime-control-confirm-action',
                    disabled: Boolean(props.runtimeControlActions.toolDecision.pending),
                    onClick: () => props.runtimeControlActions?.toolDecision?.onConfirm?.()
                  },
                  'confirm-action'
                ),
                ReactModule.createElement(
                  'button',
                  {
                    'data-testid': 'ask-runtime-control-reject-action',
                    disabled: Boolean(props.runtimeControlActions.toolDecision.pending),
                    onClick: () => props.runtimeControlActions?.toolDecision?.onReject?.()
                  },
                  'reject-action'
                )
              )
            : null,
          !props.runtimeControlActions?.resume && !props.runtimeControlActions?.toolDecision ? 'no-runtime-actions' : null
        )
      )
  }
})

vi.mock('@/modules/chat/runtime/chatbi-stream-runtime', () => ({
  deriveAnswerMode: vi.fn(() => 'analysis'),
  useChatbiStreamRuntime: useChatbiStreamRuntimeMock.mockImplementation((options: {
    onRuntimeError?: (error: unknown) => void
  }) => {
    streamRuntimeCallbacks.onRuntimeError = options.onRuntimeError
    return { runtime: 'mock' }
  })
}))

vi.mock('@/modules/chat/runtime/runtime-control-transport', () => ({
  runXpertRuntimeControlTransport: runtimeTransportMock
}))

vi.mock('@/modules/chat/runtime/chat-runtime-store', () => ({
  useChatRuntimeStore: (selector: (state: typeof runtimeStoreState) => unknown) => selector(runtimeStoreState)
}))

vi.mock('@/modules/chat/runtime/chat-runtime-projection', () => ({
  resolveRuntimeControlState: vi.fn((statusHint: string) => {
    if (statusHint === 'paused') {
      return {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      }
    }
    if (statusHint === 'running') {
      return {
        phase: 'running',
        canInterrupt: true,
        canResume: false,
        canCancel: true
      }
    }
    return {
      phase: 'idle',
      canInterrupt: false,
      canResume: false,
      canCancel: false
    }
  })
}))

vi.mock('@/modules/shared/errors/ui-error', () => ({
  normalizeUiError: (error: unknown) => ({
    type: 'unknown',
    message: error instanceof Error ? error.message : String(error),
    retryable: true
  })
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: MockElementProps) => ReactModule.createElement('div', props, children),
    NexusInput: (props: Record<string, unknown>) => ReactModule.createElement('input', props)
  }
})

vi.mock('@/modules/shared/workbench/workbench-machine', () => ({
  useWorkbenchMachine: (selector: (state: typeof workbenchState) => unknown) => selector(workbenchState)
}))

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function createQueryResult(
  data: unknown,
  overrides?: Partial<{
    error: unknown
    isLoading: boolean
    refetch: ReturnType<typeof vi.fn>
  }>
) {
  return {
    data,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides
  }
}

function mockQueries(
  overrides?: Partial<{
    conversations: ReturnType<typeof createQueryResult>
    turns: ReturnType<typeof createQueryResult>
    suggestedQuestions: ReturnType<typeof createQueryResult>
    feedback: ReturnType<typeof createQueryResult>
  }>
) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'xpert-chat-conversations') {
      return (
        overrides?.conversations ??
        createQueryResult({
          items: [
            {
              conversationId: 'conv-existing',
              memorySummary: '历史会话',
              lastTurnAt: '2026-04-05T12:00:00.000Z'
            }
          ]
        })
      )
    }
    if (key === 'xpert-chat-turns') {
      return overrides?.turns ?? createQueryResult({ items: [] })
    }
    if (key === 'xpert-chat-conversation-detail') {
      return createQueryResult({
        id: 'conv-existing',
        threadId: 'thread-existing-1'
      })
    }
    if (key === 'xpert-suggested-questions') {
      return overrides?.suggestedQuestions ?? createQueryResult([])
    }
    if (key === 'xpert-message-feedback') {
      return overrides?.feedback ?? createQueryResult(null)
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
}

function mockMutations() {
  useMutationMock.mockReturnValue({
    isPending: false,
    mutate: vi.fn()
  })
}

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
  window.history.replaceState({}, '', '/chat')
  workbenchState.activeConversationId = undefined
  workbenchState.lastQueryLogId = undefined
  runtimeStoreState.taskRuntimeHints = { statusHint: 'idle' } as never
  runtimeStoreState.ingestRuntimeControlResult.mockClear()
  runtimeStoreState.clearRuntimeState.mockClear()
  useChatbiStreamRuntimeMock.mockClear()
  vi.clearAllMocks()
  streamRuntimeCallbacks.onRuntimeError = undefined
})

async function renderPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(React.createElement(ChatWorkspacePage))
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('ChatWorkspacePage state transitions', () => {
  it('clears analysis context when starting a new conversation', async () => {
    window.history.replaceState(
      {},
      '',
      '/chat?queryLogId=query-log-1&traceKey=trace-1&analysisDraft=%7B%22prompt%22%3A%22keep%22%7D'
    )
    mockQueries()
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="ask-analysis-panel-v2"]')).not.toBeNull()

    const newConversationButton = container.querySelector('[data-testid="ask-new-conversation"]') as HTMLButtonElement
    expect(newConversationButton).not.toBeNull()

    await act(async () => {
      newConversationButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeStoreState.clearRuntimeState).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="ask-analysis-panel-v2"]')).toBeNull()
  })

  it('clears analysis context when switching to another conversation', async () => {
    window.history.replaceState(
      {},
      '',
      '/chat?queryLogId=query-log-1&traceKey=trace-1&analysisDraft=%7B%22prompt%22%3A%22keep%22%7D'
    )
    mockQueries()
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="ask-analysis-panel-v2"]')).not.toBeNull()

    const conversationButton = container.querySelector('[data-testid="ask-conversation-item-conv-existing"]') as HTMLButtonElement
    expect(conversationButton).not.toBeNull()

    await act(async () => {
      conversationButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeStoreState.clearRuntimeState).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="ask-analysis-panel-v2"]')).toBeNull()
    expect(container.textContent).toContain('会话: conv-existing')
  })

  it('clears stale query status when switching conversations', async () => {
    window.history.replaceState({}, '', '/chat')
    mockQueries()
    mockMutations()

    const container = await renderPage()

    await act(async () => {
      streamRuntimeCallbacks.onRuntimeError?.(new Error('旧会话执行失败'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="ask-diagnostics-launcher"]')?.textContent).toContain('诊断')

    const conversationButton = container.querySelector('[data-testid="ask-conversation-item-conv-existing"]') as HTMLButtonElement
    expect(conversationButton).not.toBeNull()

    await act(async () => {
      conversationButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="ask-diagnostics-launcher"]')).toBeNull()
  })

  it('renders shared loadable loading state for conversation history', async () => {
    mockQueries({
      conversations: createQueryResult(undefined, { isLoading: true })
    })
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('加载会话...')
  })

  it('renders shared retryable error state and retries conversation loading', async () => {
    const refetch = vi.fn()
    mockQueries({
      conversations: createQueryResult(undefined, {
        error: new Error('会话加载失败'),
        refetch
      })
    })
    mockMutations()

    const container = await renderPage()
    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('会话加载失败')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders shared empty states for both no-history and filtered-no-match cases', async () => {
    mockQueries({
      conversations: createQueryResult({ items: [] })
    })
    mockMutations()

    const emptyContainer = await renderPage()
    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('暂无会话')

    mockQueries()
    mockMutations()
    const filteredContainer = await renderPage()
    const searchInput = filteredContainer.querySelector('[data-testid="ask-conversation-search"]') as HTMLInputElement | null

    await act(async () => {
      if (searchInput) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeValueSetter?.call(searchInput, '不存在的会话')
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(filteredContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('未匹配会话')
  })

  it('uses the header search control to drive the same conversation filter state', async () => {
    mockQueries({
      conversations: createQueryResult({
        items: [
          {
            conversationId: 'conv-alpha',
            memorySummary: 'Alpha workspace sync',
            lastTurnAt: '2026-04-05T12:00:00.000Z'
          },
          {
            conversationId: 'conv-beta',
            memorySummary: 'Beta governance review',
            lastTurnAt: '2026-04-05T13:00:00.000Z'
          }
        ]
      })
    })
    mockMutations()

    const container = await renderPage()
    const headerSearch = container.querySelector('[data-testid="ask-search-launcher"]') as HTMLInputElement | null
    const sidebarSearch = container.querySelector('[data-testid="ask-conversation-search"]') as HTMLInputElement | null

    expect(headerSearch).not.toBeNull()
    expect(sidebarSearch).not.toBeNull()

    await act(async () => {
      if (headerSearch) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeValueSetter?.call(headerSearch, 'beta')
        headerSearch.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(sidebarSearch?.value).toBe('beta')
    expect(container.querySelector('[data-testid="ask-conversation-item-conv-alpha"]')).toBeNull()
    expect(container.querySelector('[data-testid="ask-conversation-item-conv-beta"]')).not.toBeNull()
  })

  it('hydrates xpert targeting from the url and forwards it to runtime state', async () => {
    window.history.replaceState({}, '', '/chat?xpertId=xpert-42')
    mockQueries()
    mockMutations()

    const container = await renderPage()

    const xpertQuery = useQueryMock.mock.calls.find(
      ([input]) => Array.isArray(input.queryKey) && input.queryKey[0] === 'xpert-chat-conversations'
    )?.[0] as { queryKey?: unknown[] } | undefined

    expect(useChatbiStreamRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        xpertId: 'xpert-42'
      })
    )
    expect(xpertQuery?.queryKey).toEqual(['xpert-chat-conversations', 'xpert-42'])
    expect(container.textContent).toContain('xpert: xpert-42')
  })

  it('wires paused interrupt-backed conversations to the resume transport when thread context is resolved', async () => {
    runtimeStoreState.taskRuntimeHints = {
      statusHint: 'paused',
      messageId: null,
      sourceEvent: 'on_interrupt',
      conversationId: 'conv-existing',
      traceKey: 'trace-runtime-1',
      taskId: 'execution-runtime-1',
      progressPercent: 50,
      updatedAt: '2026-04-06T10:00:00.000Z'
    } as never
    runtimeTransportMock.mockResolvedValue({
      conversationId: 'conv-existing',
      envelopes: [],
      transportCompleted: true
    })
    mockQueries()
    mockMutations()

    const container = await renderPage()
    const toggle = container.querySelector('[data-testid="ask-diagnostics-launcher"]') as HTMLButtonElement | null

    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const resumeButton = container.querySelector('[data-testid="ask-runtime-control-resume-action"]') as HTMLButtonElement | null

    expect(resumeButton).not.toBeNull()

    await act(async () => {
      resumeButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeTransportMock).toHaveBeenCalledWith({
      action: 'resume',
      conversationId: 'conv-existing',
      resume: {
        threadId: 'thread-existing-1',
        executionId: 'execution-runtime-1'
      }
    })
  })

  it('wires paused tool confirmation to the runtime control transport only when real tool-call ids are resolved', async () => {
    runtimeStoreState.taskRuntimeHints = {
      statusHint: 'paused',
      messageId: null,
      sourceEvent: 'on_interrupt',
      conversationId: 'conv-existing',
      traceKey: 'trace-runtime-1',
      taskId: 'execution-runtime-1',
      progressPercent: 50,
      updatedAt: '2026-04-06T10:00:00.000Z'
    } as never
    runtimeTransportMock.mockResolvedValue({
      conversationId: 'conv-existing',
      envelopes: [],
      transportCompleted: true
    })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const key = queryKey[0]
      if (key === 'xpert-chat-conversations') {
        return createQueryResult({
          items: [
            {
              conversationId: 'conv-existing',
              memorySummary: '历史会话',
              lastTurnAt: '2026-04-05T12:00:00.000Z'
            }
          ]
        })
      }
      if (key === 'xpert-chat-turns') {
        return createQueryResult({ items: [] })
      }
      if (key === 'xpert-chat-conversation-detail') {
        return createQueryResult({
          id: 'conv-existing',
          threadId: 'thread-existing-1',
          operation: {
            tasks: [
              {
                id: 'pending-1',
                call: {
                  id: 'tool-call-1'
                }
              }
            ]
          }
        })
      }
      if (key === 'xpert-suggested-questions') {
        return createQueryResult([])
      }
      if (key === 'xpert-message-feedback') {
        return createQueryResult(null)
      }
      throw new Error(`unexpected query key: ${String(key)}`)
    })
    mockMutations()

    const container = await renderPage()
    const toggle = container.querySelector('[data-testid="ask-diagnostics-launcher"]') as HTMLButtonElement | null

    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const confirmButton = container.querySelector('[data-testid="ask-runtime-control-confirm-action"]') as HTMLButtonElement | null
    const resumeButton = container.querySelector('[data-testid="ask-runtime-control-resume-action"]') as HTMLButtonElement | null

    expect(confirmButton).not.toBeNull()
    expect(resumeButton).toBeNull()

    await act(async () => {
      confirmButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeTransportMock).toHaveBeenCalledWith({
      action: 'tool_call_update',
      conversationId: 'conv-existing',
      toolCalls: [
        {
          id: 'tool-call-1',
          args: {
            approved: true
          }
        }
      ]
    })
  })

  it('keeps runtime diagnostics collapsed until the operator opens the drawer', async () => {
    runtimeStoreState.taskRuntimeHints = {
      statusHint: 'running',
      conversationId: 'conv-existing',
      traceKey: 'trace-runtime-2',
      updatedAt: '2026-04-06T10:00:00.000Z'
    } as never
    mockQueries()
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="ask-diagnostics-launcher"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-thread-diagnostics-drawer"]')).toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-execution-panel"]')).toBeNull()

    const toggle = container.querySelector('[data-testid="ask-diagnostics-launcher"]') as HTMLButtonElement | null
    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="ask-thread-diagnostics-drawer"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-execution-panel"]')).not.toBeNull()
  })

  it('keeps tool decision transport disabled when paused runs do not expose real tool-call ids', async () => {
    runtimeStoreState.taskRuntimeHints = {
      statusHint: 'paused',
      messageId: null,
      sourceEvent: 'on_interrupt',
      conversationId: 'conv-existing',
      traceKey: 'trace-runtime-1',
      taskId: 'execution-runtime-1',
      progressPercent: 50,
      updatedAt: '2026-04-06T10:00:00.000Z'
    } as never
    mockQueries()
    mockMutations()

    const container = await renderPage()

    const toggle = container.querySelector('[data-testid="ask-diagnostics-launcher"]') as HTMLButtonElement | null
    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="ask-runtime-control-confirm-action"]')).toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-control-reject-action"]')).toBeNull()
    expect(container.querySelector('[data-testid="ask-runtime-control-resume-action"]')).not.toBeNull()
  })

  it('removes the duplicate footer turn list from the main surface', async () => {
    mockQueries()
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="ask-thread-messages"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ask-turns-list"]')).toBeNull()
  })

  it('attaches analysis follow-up to the active answer block instead of the footer dock', async () => {
    window.history.replaceState(
      {},
      '',
      '/chat?queryLogId=query-log-77&traceKey=trace-77&analysisDraft=%7B%22prompt%22%3A%22keep%22%7D'
    )
    mockQueries()
    mockMutations()

    const container = await renderPage()
    const answerCard = container.querySelector('[data-testid="ask-answer-analysis-card"]') as HTMLElement | null
    const composerDock = container.querySelector('[data-testid="ask-chat-composer-dock"]') as HTMLElement | null

    expect(answerCard).not.toBeNull()
    expect(answerCard?.getAttribute('data-analysis-query-log-id')).toBe('query-log-77')
    expect(answerCard?.querySelector('[data-testid="ask-analysis-panel-v2"]')).not.toBeNull()
    expect(composerDock?.contains(answerCard as Node)).toBe(false)
  })
})
