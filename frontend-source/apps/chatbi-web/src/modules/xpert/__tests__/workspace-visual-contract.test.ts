// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { XpertWorkspaceIndexShell, XpertWorkspacePageShell } from '../workspace'

const { useMutationMock, useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

const { archiveXpertWorkspaceMock, listMyXpertWorkspacesMock } = vi.hoisted(() => ({
  archiveXpertWorkspaceMock: vi.fn(),
  listMyXpertWorkspacesMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')

  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
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

vi.mock('./workspace-api', () => ({
  archiveXpertWorkspace: archiveXpertWorkspaceMock,
  listMyXpertWorkspaces: listMyXpertWorkspacesMock
}))

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')

  return {
    NexusBadge: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('div', props, children),
    NexusInput: (props: Record<string, unknown>) => ReactModule.createElement('input', props)
  }
})

const workspaceId = 'ws-1'
const tabKeys = ['xperts', 'knowledges', 'custom', 'builtin', 'mcp', 'database'] as const
const legacyOwnershipHrefs = new Set([
  '/ai/models',
  '/ai/bindings',
  '/toolset/plugins',
  '/toolset/actions',
  '/toolset/scenarios',
  '/models'
])

function renderWorkspaceShell() {
  const html = renderToStaticMarkup(
    React.createElement(XpertWorkspacePageShell, {
      workspaceId,
      title: 'Workspace',
      summary: 'Summary',
      activeTab: 'xperts'
    })
  )
  const container = document.createElement('div')
  container.innerHTML = html
  const tabNav = container.querySelector('[data-testid="xpert-workspace-tab-nav"]')

  expect(tabNav).not.toBeNull()

  return container
}

function mockWorkspaceIndexQuery(options?: {
  items?: Array<{ id: string; name?: string; code?: string; description?: string; archivedAt?: string | null }>
  total?: number
  error?: unknown
  isLoading?: boolean
}) {
  const items = options?.items ?? []
  useQueryMock.mockReturnValue({
    data: {
      items,
      total: options?.total ?? items.length
    },
    error: options?.error ?? null,
    isLoading: options?.isLoading ?? false,
    refetch: vi.fn()
  })
  useMutationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false
  })
}

function renderWorkspaceIndexShell() {
  const html = renderToStaticMarkup(React.createElement(XpertWorkspaceIndexShell))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('xpert workspace visual shell contract', () => {
  it('uses canonical xpert workspace hrefs for primary tab navigation ownership', () => {
    const container = renderWorkspaceShell()
    const tabNav = container.querySelector('[data-testid="xpert-workspace-tab-nav"]') as HTMLElement

    for (const tabKey of tabKeys) {
      const link = tabNav.querySelector(`[data-testid="xpert-workspace-tab-${tabKey}"]`)

      expect(link).not.toBeNull()
      expect(link.getAttribute('href')).toBe(`/xpert/w/${workspaceId}/${tabKey}`)
    }
  })

  it('does not use legacyHref-owned routes as primary tab navigation links', () => {
    const container = renderWorkspaceShell()
    const tabNav = container.querySelector('[data-testid="xpert-workspace-tab-nav"]') as HTMLElement

    for (const tabKey of tabKeys) {
      const link = tabNav.querySelector(`[data-testid="xpert-workspace-tab-${tabKey}"]`)

      expect(link).not.toBeNull()
      expect(legacyOwnershipHrefs.has(link.getAttribute('href') ?? '')).toBe(false)
    }
  })

  it('does not render legacy module ownership links anywhere in the workspace shell', () => {
    const container = renderWorkspaceShell()
    const links = Array.from(container.querySelectorAll('a'))

    expect(links.length).toBeGreaterThan(0)

    for (const link of links) {
      expect(legacyOwnershipHrefs.has(link.getAttribute('href') ?? '')).toBe(false)
    }
  })

  it('keeps builtin related links in xpert-owned language instead of governance toolset labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(XpertWorkspacePageShell, {
        workspaceId,
        title: 'Workspace',
        summary: 'Summary',
        activeTab: 'builtin'
      })
    )
    const container = document.createElement('div')
    container.innerHTML = html

    expect(container.textContent).toContain('Builtin toolsets')
    expect(container.textContent).not.toContain('Toolset actions')
    expect(container.textContent).not.toContain('Toolset learning')
  })

  it('shows empty state instead of fallback preset workspaces on successful empty responses', () => {
    mockWorkspaceIndexQuery({
      items: [],
      total: 0
    })

    const container = renderWorkspaceIndexShell()

    expect(container.textContent).toContain('No workspace available')
    expect(container.textContent).not.toContain('core')
    expect(container.textContent).not.toContain('growth')
    expect(container.textContent).not.toContain('finance')
  })

  it('shows explicit error state instead of synthetic fallback workspaces when the workspace api fails', () => {
    mockWorkspaceIndexQuery({
      items: [],
      total: 0,
      error: new Error('workspace api unavailable')
    })

    const container = renderWorkspaceIndexShell()

    expect(container.querySelector('[data-testid="loadable-error"]')).not.toBeNull()
    expect(container.textContent).toContain('workspace api unavailable')
    expect(container.textContent).not.toContain('core')
    expect(container.textContent).not.toContain('growth')
    expect(container.textContent).not.toContain('finance')
  })

  it('shows loading truth in the header status badge while workspace data is still loading', () => {
    mockWorkspaceIndexQuery({
      items: [],
      total: 0,
      isLoading: true
    })

    const container = renderWorkspaceIndexShell()
    const statusBadge = container.querySelector('[data-testid="xpert-workspace-status"]')

    expect(statusBadge?.textContent).toContain('loading workspaces...')
    expect(statusBadge?.textContent).not.toContain('synced')
    expect(container.textContent).toContain('loading')
  })

  it('shows settled workspace counts instead of synced or ready fallbacks after loading finishes', () => {
    mockWorkspaceIndexQuery({
      items: [{ id: workspaceId, name: 'Workspace', code: 'ws-1' }],
      total: 1
    })

    const container = renderWorkspaceIndexShell()
    const statusBadge = container.querySelector('[data-testid="xpert-workspace-status"]')
    const metrics = container.querySelector('[data-testid="xpert-workspace-metrics"]')

    expect(statusBadge?.textContent).toContain('1 workspace loaded')
    expect(statusBadge?.textContent).not.toContain('synced')
    expect(metrics?.textContent).toContain('1 loaded')
    expect(metrics?.textContent).not.toContain('ready')
  })

  it('declares workspace search inputs as active filters', () => {
    mockWorkspaceIndexQuery({
      items: [{ id: workspaceId, name: 'Workspace', code: 'ws-1' }]
    })

    const indexContainer = renderWorkspaceIndexShell()
    const indexSearch = indexContainer.querySelector('[data-testid="xpert-workspace-search-launcher"]') as HTMLInputElement | null

    expect(indexSearch).not.toBeNull()
    expect(indexSearch?.readOnly).toBe(false)

    const shellContainer = renderWorkspaceShell()
    const tabSearch = shellContainer.querySelector('[data-testid="xpert-workspace-tab-filter-launcher"]') as HTMLInputElement | null

    expect(tabSearch).not.toBeNull()
    expect(tabSearch?.readOnly).toBe(false)
  })

  it('declares route truth explicitly on index and workspace shells', () => {
    mockWorkspaceIndexQuery({
      items: [{ id: workspaceId, name: 'Workspace', code: 'ws-1' }]
    })

    const indexContainer = renderWorkspaceIndexShell()
    expect(indexContainer.querySelector('[data-testid="xpert-workspace-index-route-truth"]')?.textContent).toContain(
      'workspace inventory surface'
    )

    const shellContainer = renderWorkspaceShell()
    expect(shellContainer.querySelector('[data-testid="xpert-workspace-route-truth"]')?.textContent).toContain(
      'resource inventory surface'
    )
  })

  it('freezes hero, toolbar and status anchors across both workspace shells', () => {
    mockWorkspaceIndexQuery({
      items: [
        {
          id: workspaceId,
          name: 'Workspace',
          code: 'ws-1',
          description: 'Canonical workspace shell for xpert assets.'
        }
      ]
    })

    const indexContainer = renderWorkspaceIndexShell()
    const indexSearch = indexContainer.querySelector('[data-testid="xpert-workspace-search-launcher"]') as HTMLInputElement | null

    expect(indexContainer.querySelector('[data-testid="xpert-workspace-header"]')).not.toBeNull()
    expect(indexContainer.querySelector('[data-testid="xpert-workspace-toolbar"]')?.className).toContain('nx-shell-panel')
    expect(indexContainer.querySelector('[data-testid="xpert-workspace-metrics"]')?.className).toContain('nx-shell-panel')
    expect(indexContainer.querySelector('[data-testid="xpert-workspace-status"]')?.parentElement?.className).toContain('nx-shell-meta-row')
    expect(indexContainer.querySelector('[data-testid="xpert-workspace-item-meta"]')?.className).toContain('nx-shell-meta-row')
    expect(indexSearch?.readOnly).toBe(false)

    const shellContainer = renderWorkspaceShell()
    const tabSearch = shellContainer.querySelector('[data-testid="xpert-workspace-tab-filter-launcher"]') as HTMLInputElement | null

    expect(shellContainer.querySelector('[data-testid="xpert-workspace-header"]')).not.toBeNull()
    expect(shellContainer.querySelector('[data-testid="xpert-workspace-breadcrumb"]')).not.toBeNull()
    expect(shellContainer.querySelector('[data-testid="xpert-workspace-route-truth"]')).not.toBeNull()
    expect(tabSearch?.readOnly).toBe(false)
    expect(shellContainer.querySelector('[data-testid="xpert-workspace-content"]')).not.toBeNull()
    expect(tabSearch?.closest('.xpert-workspace-toolbar')?.className).toContain('nx-shell-panel')
  })

  it('url-encodes workspace card links in the index shell', () => {
    const workspaceRecord = {
      id: 'ops/main workspace',
      name: 'Ops Main',
      code: 'ops-main'
    }
    mockWorkspaceIndexQuery({
      items: [workspaceRecord]
    })

    const container = renderWorkspaceIndexShell()
    const links = Array.from(container.querySelectorAll('a'))
    const openLink = links.find(link => link.textContent?.trim() === 'Open workspace')
    const xpertsLink = links.find(link => link.textContent?.trim() === 'Xperts')

    expect(openLink?.getAttribute('href')).toBe(`/xpert/w/${encodeURIComponent(workspaceRecord.id)}`)
    expect(xpertsLink?.getAttribute('href')).toBe(`/xpert/w/${encodeURIComponent(workspaceRecord.id)}/xperts`)
  })
})
