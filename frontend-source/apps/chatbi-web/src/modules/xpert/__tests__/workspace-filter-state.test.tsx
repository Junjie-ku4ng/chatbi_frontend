// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XpertWorkspaceIndexShell, XpertWorkspacePageShell } from '../workspace'
import { XpertWorkspaceXpertsPanel } from '../workspace-tab-content'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useMutationMock, useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

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

vi.mock('@/modules/shared/errors/ui-error', () => ({
  normalizeUiError: (error: unknown) => ({ message: String(error ?? '') })
}))

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: MockElementProps) => ReactModule.createElement('div', props, children),
    NexusInput: (props: Record<string, unknown>) => ReactModule.createElement('input', props)
  }
})

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

function mockQueries() {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'xpert-workspace-my') {
      return {
        data: {
          items: [
            { id: 'ws-alpha', name: 'Alpha Workspace', code: 'alpha' },
            { id: 'ws-beta', name: 'Beta Workspace', code: 'beta' }
          ],
          total: 2
        },
        error: null,
        isLoading: false,
        refetch: vi.fn()
      }
    }
    if (key === 'xpert-workspace-tab-xperts') {
      return {
        data: {
          items: [
            { id: 'xpert-alpha', name: 'Alpha Agent', category: 'sales' },
            { id: 'xpert-beta', name: 'Beta Agent', category: 'finance' }
          ],
          total: 2
        },
        error: null,
        isLoading: false,
        refetch: vi.fn()
      }
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useMutationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false
  })
}

async function renderIndexShell() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(React.createElement(XpertWorkspaceIndexShell))
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

async function renderWorkspaceShell() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      React.createElement(
        XpertWorkspacePageShell,
        {
          workspaceId: 'ws-alpha',
          title: 'Workspace Xperts',
          summary: 'Manage xpert agents and bindings for this workspace.',
          activeTab: 'xperts'
        },
        React.createElement(XpertWorkspaceXpertsPanel, { workspaceId: 'ws-alpha' })
      )
    )
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('xpert workspace launcher state', () => {
  it('filters visible workspace cards from the index search input', async () => {
    mockQueries()
    const container = await renderIndexShell()
    const searchInput = container.querySelector('[data-testid="xpert-workspace-search-launcher"]') as HTMLInputElement | null

    expect(container.textContent).toContain('Alpha Workspace')
    expect(container.textContent).toContain('Beta Workspace')

    await act(async () => {
      if (searchInput) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeValueSetter?.call(searchInput, 'beta')
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(searchInput?.value).toBe('beta')
    expect(container.textContent).not.toContain('Alpha Workspace')
    expect(container.textContent).toContain('Beta Workspace')
  })

  it('filters current tab rows from the workspace tab filter input', async () => {
    mockQueries()
    const container = await renderWorkspaceShell()
    const searchInput = container.querySelector('[data-testid="xpert-workspace-tab-filter-launcher"]') as HTMLInputElement | null

    expect(container.textContent).toContain('Alpha Agent')
    expect(container.textContent).toContain('Beta Agent')

    await act(async () => {
      if (searchInput) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeValueSetter?.call(searchInput, 'beta')
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(searchInput?.value).toBe('beta')
    expect(container.textContent).not.toContain('Alpha Agent')
    expect(container.textContent).toContain('Beta Agent')
  })
})
