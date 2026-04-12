// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { XpertExpertDetailShell } from '../expert-detail'
import { XpertExpertWorkflowStudioCard } from '../expert-studio'
import XpertExpertWorkflowPage from '../../../../app/(workspace)/xpert/x/[id]/workflow/page'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn()
}))

const {
  refetchMock,
  setActiveConversationIdMock,
  setActiveTraceKeyMock,
  ingestRuntimeControlResultMock,
  runtimeTransportMock
} = vi.hoisted(() => ({
  refetchMock: vi.fn(),
  setActiveConversationIdMock: vi.fn(),
  setActiveTraceKeyMock: vi.fn(),
  ingestRuntimeControlResultMock: vi.fn(),
  runtimeTransportMock: vi.fn()
}))

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const executionRecord = {
  id: 'exec-1',
  title: 'Primary workflow',
  status: 'running',
  totalTokens: 42,
  elapsedTime: 180,
  subExecutions: []
}

const executionLogRecord = {
  id: 'exec-1',
  title: 'Primary workflow',
  status: 'running',
  traceKey: 'trace-42',
  executionLifecycle: { status: 'running' },
  toolExecutions: [{ id: 'call-1', name: 'answer_question', status: 'running' }],
  messages: [{ id: 'message-1', role: 'assistant', text: 'xpert tool call', createdAt: '2026-03-09T10:00:00.000Z' }]
}

const executionStateRecord = {
  executionLifecycle: { status: 'running', transitions: ['queued', 'running'] },
  runtimeControl: { command: 'queue_followup', status: 'ready' },
  conversationId: 'session-42',
  traceKey: 'trace-42',
  threadId: 'thread-7',
  turnId: 'turn-9',
  pendingActions: [{ id: 'follow-up' }],
  toolExecutions: [{ id: 'call-1', name: 'answer_question', status: 'running' }],
  stateTools: { builtin: true }
}

const runtimeStoreState = {
  runtimeControlState: {
    phase: 'running',
    canInterrupt: true,
    canResume: false,
    canCancel: true
  },
  taskRuntimeHints: { sourceEvent: 'xpert_runtime_observer', statusHint: 'running' },
  ingestRuntimeControlResult: ingestRuntimeControlResultMock
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')

  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'expert-42' })
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')

  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/rbac/action-guard', async () => {
  const ReactModule = await import('react')

  return {
    ActionGuard: ({ children }: { children?: React.ReactNode | ((permission: { state: string; reason?: string }) => React.ReactNode) }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        typeof children === 'function' ? children({ state: 'enabled' }) : children
      )
  }
})

vi.mock('@/modules/shared/states/loadable-state', async () => {
  const ReactModule = await import('react')

  return {
    LoadablePanel: ({
      children,
      empty,
      emptyLabel,
      error,
      loading
    }: {
      children?: React.ReactNode
      empty?: boolean
      emptyLabel?: string
      error?: unknown
      loading?: boolean
    }) => {
      if (loading) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-loading' }, 'loading')
      }
      if (error) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-error' }, String(error))
      }
      if (empty) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-empty' }, emptyLabel)
      }
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    }
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')

  return {
    NexusBadge: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('div', props, children)
  }
})

vi.mock('@/modules/chat/runtime/chat-runtime-store', () => ({
  useChatRuntimeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(runtimeStoreState)
}))

vi.mock('@/modules/chat/runtime/runtime-control-transport', () => ({
  runXpertRuntimeControlTransport: runtimeTransportMock
}))

vi.mock('@/modules/shared/workbench/workbench-machine', () => ({
  useWorkbenchMachine: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeConversationId: 'session-current',
      activeTraceKey: 'trace-current',
      setActiveConversationId: setActiveConversationIdMock,
      setActiveTraceKey: setActiveTraceKeyMock
    })
}))

function createQueryResult(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    refetch: refetchMock
  }
}

function mockWorkflowQueries() {
  useQueryMock.mockImplementation(({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    const key = queryKey[0]

    if (key === 'xpert-execution-list') {
      return createQueryResult({ items: [executionRecord] })
    }

    if (enabled === false) {
      return createQueryResult(undefined)
    }

    if (key === 'xpert-execution-log') {
      return createQueryResult(executionLogRecord)
    }

    if (key === 'xpert-execution-state') {
      return createQueryResult(executionStateRecord)
    }

    throw new Error(`unexpected query key: ${String(key)}`)
  })
}

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) {
      continue
    }
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
  runtimeStoreState.runtimeControlState = {
    phase: 'running',
    canInterrupt: true,
    canResume: false,
    canCancel: true
  }
  runtimeStoreState.taskRuntimeHints = { sourceEvent: 'xpert_runtime_observer', statusHint: 'running' }
  vi.clearAllMocks()
})

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

function getByTestId(container: ParentNode, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  expect(element).not.toBeNull()
  return element as HTMLElement
}

describe('xpert expert studio contract', () => {
  it('renders workflow tab in expert detail shell', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    mountedRoots.push({ container, root })

    act(() => {
      root.render(
      React.createElement(
        XpertExpertDetailShell,
        {
          expertId: 'expert-42',
          activeTab: 'workflow',
          title: 'Expert Workflow Studio',
          summary: 'Workflow graph, runtime state and tool activity.'
        },
        React.createElement('div', null, 'workflow child')
      )
      )
    })

    const workflowTab = getByTestId(container, 'xpert-expert-tab-workflow')

    expect(workflowTab.getAttribute('href')).toBe('/xpert/x/expert-42/workflow')
    expect(container.textContent).toContain('Workflow')
  })

  it('renders workflow page with the workflow shell entrypoint', async () => {
    mockWorkflowQueries()

    const container = await renderIntoDom(React.createElement(XpertExpertWorkflowPage))

    expect(getByTestId(container, 'xpert-expert-breadcrumb').textContent).toContain('workflow')
    expect(getByTestId(container, 'xpert-expert-workflow-studio')).toBeTruthy()
  })

  it('renders workflow/debug/toolset anchors through xpert runtime copy instead of source grep', async () => {
    mockWorkflowQueries()

    const container = await renderIntoDom(React.createElement(XpertExpertWorkflowStudioCard, { expertId: 'expert-42' }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('session: session-42')
    expect(container.textContent).toContain('Execution graph, runtime state and tool activity routed through xpert workflows.')
    expect(container.textContent).toContain('Action transport not connected in this surface.')
    expect(container.textContent).not.toContain('conversation:')
    expect(container.textContent).not.toContain('Current execution has no resolved conversation id')
    expect(getByTestId(container, 'xpert-expert-execution-refresh')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-auto-refresh')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-operation-control')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-structured-execution')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-structured-state')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-message-timeline')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-node-detail')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-debug-state')).toBeTruthy()
    expect(getByTestId(container, 'xpert-expert-toolset-summary')).toBeTruthy()
    expect(container.querySelector('[data-testid="xpert-expert-operation-control-unavailable"]')).toBeNull()
    expect((getByTestId(container, 'xpert-expert-operation-interrupt') as HTMLButtonElement).disabled).toBe(true)
    expect(container.querySelector('[data-testid="xpert-expert-operation-resume"]')).toBeNull()
    expect((getByTestId(container, 'xpert-expert-operation-cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables resume only when paused workflow state has transport-backed execution context', async () => {
    runtimeStoreState.runtimeControlState = {
      phase: 'paused',
      canInterrupt: false,
      canResume: true,
      canCancel: true
    }
    runtimeStoreState.taskRuntimeHints = { sourceEvent: 'on_interrupt', statusHint: 'paused' }
    runtimeTransportMock.mockResolvedValue({
      conversationId: 'session-42',
      envelopes: [],
      transportCompleted: true
    })
    useQueryMock.mockImplementation(({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      const key = queryKey[0]
      if (key === 'xpert-execution-list') {
        return createQueryResult({ items: [{ ...executionRecord, status: 'interrupted' }] })
      }
      if (enabled === false) {
        return createQueryResult(undefined)
      }
      if (key === 'xpert-execution-log') {
        return createQueryResult({
          ...executionLogRecord,
          status: 'interrupted'
        })
      }
      if (key === 'xpert-execution-state') {
        return createQueryResult({
          ...executionStateRecord,
          executionLifecycle: { status: 'requires_action', transitions: ['queued', 'running', 'requires_action'] },
          runtimeControl: { command: 'interrupt', status: 'requires_action' },
          pendingActions: [],
          toolExecutions: []
        })
      }
      throw new Error(`unexpected query key: ${String(key)}`)
    })

    const container = await renderIntoDom(React.createElement(XpertExpertWorkflowStudioCard, { expertId: 'expert-42' }))
    const resumeButton = container.querySelector('[data-testid="xpert-expert-operation-resume"]') as HTMLButtonElement | null

    expect(resumeButton).not.toBeNull()
    expect(resumeButton?.disabled).toBe(false)

    await act(async () => {
      resumeButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeTransportMock).toHaveBeenCalledWith({
      action: 'resume',
      conversationId: 'session-42',
      resume: {
        threadId: 'thread-7',
        executionId: 'exec-1'
      }
    })
  })

  it('enables confirm and reject when paused workflow state exposes pending tool-call ids', async () => {
    runtimeStoreState.runtimeControlState = {
      phase: 'paused',
      canInterrupt: false,
      canResume: true,
      canCancel: true
    }
    runtimeStoreState.taskRuntimeHints = { sourceEvent: 'on_interrupt', statusHint: 'paused' }
    runtimeTransportMock.mockResolvedValue({
      conversationId: 'session-42',
      envelopes: [],
      transportCompleted: true
    })
    useQueryMock.mockImplementation(({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      const key = queryKey[0]
      if (key === 'xpert-execution-list') {
        return createQueryResult({ items: [{ ...executionRecord, status: 'interrupted' }] })
      }
      if (enabled === false) {
        return createQueryResult(undefined)
      }
      if (key === 'xpert-execution-log') {
        return createQueryResult({
          ...executionLogRecord,
          status: 'interrupted'
        })
      }
      if (key === 'xpert-execution-state') {
        return createQueryResult({
          ...executionStateRecord,
          executionLifecycle: { status: 'requires_action', transitions: ['queued', 'running', 'requires_action'] },
          runtimeControl: { command: 'interrupt', status: 'requires_action' },
          pendingActions: [{ id: 'pending-1', action: 'create_indicator' }],
          toolExecutions: [{ callId: 'call-1', tool: 'create_indicator', status: 'requires_confirmation' }]
        })
      }
      throw new Error(`unexpected query key: ${String(key)}`)
    })

    const container = await renderIntoDom(React.createElement(XpertExpertWorkflowStudioCard, { expertId: 'expert-42' }))
    const confirmButton = container.querySelector('[data-testid="xpert-expert-operation-confirm"]') as HTMLButtonElement | null
    const rejectButton = container.querySelector('[data-testid="xpert-expert-operation-reject"]') as HTMLButtonElement | null

    expect(confirmButton).not.toBeNull()
    expect(rejectButton).not.toBeNull()
    expect(container.querySelector('[data-testid="xpert-expert-operation-resume"]')).toBeNull()

    await act(async () => {
      confirmButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(runtimeTransportMock).toHaveBeenCalledWith({
      action: 'tool_call_update',
      conversationId: 'session-42',
      toolCalls: [
        {
          id: 'call-1',
          args: {
            approved: true
          }
        }
      ]
    })
  })
})
