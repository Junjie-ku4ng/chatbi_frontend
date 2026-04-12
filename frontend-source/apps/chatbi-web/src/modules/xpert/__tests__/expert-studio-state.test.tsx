// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { XpertExpertWorkflowStudioCard } from '../expert-studio'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock
}))

vi.mock('@/modules/shared/states/loadable-state', async () => {
  const ReactModule = await import('react')

  return {
    LoadablePanel: ({
      children,
      loading,
      error,
      empty,
      loadingLabel,
      emptyLabel
    }: MockElementProps & {
      loading?: boolean
      error?: unknown
      empty?: boolean
      loadingLabel?: string
      emptyLabel?: string
    }) => {
      if (loading) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-loading-state' }, loadingLabel ?? 'Loading...')
      }
      if (error) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-error-state' }, String(error))
      }
      if (empty) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-empty-state' }, emptyLabel ?? 'Nothing here')
      }
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    }
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')

  return {
    NexusBadge: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('span', props, children),
    NexusCard: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('div', props, children)
  }
})

vi.mock('@/modules/chat/runtime/chat-runtime-store', () => ({
  useChatRuntimeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      runtimeControlState: { phase: 'observing' },
      taskRuntimeHints: { sourceEvent: 'xpert_runtime_observer', statusHint: 'active' },
      ingestRuntimeControlResult: vi.fn()
    })
}))

vi.mock('@/modules/shared/workbench/workbench-machine', () => ({
  useWorkbenchMachine: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeConversationId: null,
      activeTraceKey: null,
      setActiveConversationId: vi.fn(),
      setActiveTraceKey: vi.fn()
    })
}))

function createQueryResult(data: unknown, overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function renderComponent() {
  const html = renderToStaticMarkup(React.createElement(XpertExpertWorkflowStudioCard, { expertId: 'expert-42' }))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('expert studio shared states', () => {
  it('uses specific loading copy while expert executions are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'xpert-execution-list') {
        return createQueryResult(undefined, { isLoading: true })
      }
      if (queryKey[0] === 'xpert-execution-log') {
        return createQueryResult(undefined)
      }
      if (queryKey[0] === 'xpert-execution-state') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })

    const container = renderComponent()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading expert executions...')
  })

  it('uses specific loading copy while expert execution detail is loading', () => {
    useQueryMock.mockImplementation(({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      if (queryKey[0] === 'xpert-execution-list') {
        return createQueryResult({ items: [{ id: 'exec-1', title: 'Primary workflow', status: 'running', subExecutions: [] }] })
      }
      if (enabled === false) {
        return createQueryResult(undefined)
      }
      if (queryKey[0] === 'xpert-execution-log') {
        return createQueryResult(undefined, { isLoading: true })
      }
      if (queryKey[0] === 'xpert-execution-state') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })

    const container = renderComponent()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading expert execution detail...'
    )
  })

  it('uses an explicit empty state when no workflow executions are available', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'xpert-execution-list') {
        return createQueryResult({ items: [] })
      }
      if (queryKey[0] === 'xpert-execution-log') {
        return createQueryResult(undefined)
      }
      if (queryKey[0] === 'xpert-execution-state') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })

    const container = renderComponent()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No workflow executions found for this expert.'
    )
  })
})
