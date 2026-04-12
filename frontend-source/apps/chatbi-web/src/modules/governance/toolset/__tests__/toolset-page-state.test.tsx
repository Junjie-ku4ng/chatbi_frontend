// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ToolsetActionsPage from '../../../../../app/(workspace)/toolset/actions/page'
import ToolsetPluginsPage from '../../../../../app/(workspace)/toolset/plugins/page'
import ToolsetScenariosPage from '../../../../../app/(workspace)/toolset/scenarios/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
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

vi.mock('@/modules/governance/toolset/compat-notice', async () => {
  const ReactModule = await import('react')
  return {
    ToolsetCompatNotice: () => ReactModule.createElement('div', { 'data-testid': 'toolset-compat-notice' })
  }
})

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

vi.mock('@/modules/governance/toolset/api', () => ({
  createScenarioProfile: vi.fn(),
  listScenarioProfiles: vi.fn(),
  patchScenarioProfile: vi.fn(),
  createToolsetAction: vi.fn(),
  listToolsetActions: vi.fn(),
  patchToolsetAction: vi.fn(),
  createToolsetPlugin: vi.fn(),
  createToolsetPluginVersion: vi.fn(),
  getToolsetPluginPolicy: vi.fn(),
  listToolsetPlugins: vi.fn(),
  publishToolsetPluginVersion: vi.fn(),
  upsertToolsetPluginPolicy: vi.fn()
}))

function createQueryResult<T>(data: T, overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function renderPage(element: React.ReactElement) {
  const html = renderToStaticMarkup(element)
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('toolset shared state labels', () => {
  it('uses specific loading copy for toolset actions', () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn()
    })

    const container = renderPage(React.createElement(ToolsetActionsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading toolset actions...')
  })

  it('uses specific loading copy for toolset scenarios', () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn()
    })

    const container = renderPage(React.createElement(ToolsetScenariosPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading toolset scenarios...')
  })

  it('uses specific loading copy for toolset plugins', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'toolset-plugins') {
        return createQueryResult(undefined, {
          isLoading: true
        })
      }
      if (queryKey[0] === 'toolset-plugin-policy') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn()
    })

    const container = renderPage(React.createElement(ToolsetPluginsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading toolset plugins...')
  })
})
