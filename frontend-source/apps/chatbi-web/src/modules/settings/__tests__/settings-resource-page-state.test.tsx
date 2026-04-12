// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SettingsFeaturesPage from '../../../../app/(workspace)/settings/features/page'
import SettingsPluginsPage from '../../../../app/(workspace)/settings/plugins/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

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

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children)
  }
})

vi.mock('@/modules/settings/shell', async () => {
  const ReactModule = await import('react')
  return {
    SettingsPanel: ({ children }: MockElementProps) => ReactModule.createElement('section', null, children)
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

vi.mock('@/modules/settings/api', () => ({
  listFeatureToggles: vi.fn(),
  updateFeatureToggle: vi.fn(),
  listPlugins: vi.fn(),
  uninstallPlugin: vi.fn()
}))

vi.mock('@/modules/shared/errors/ui-error', () => ({
  normalizeUiError: (error: unknown) => ({ message: String(error ?? '') })
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

describe('settings resource pages shared state labels', () => {
  it('uses specific loading copy for feature toggles', () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage(React.createElement(SettingsFeaturesPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading feature toggles...')
  })

  it('uses specific loading copy for plugin catalog', () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage(React.createElement(SettingsPluginsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading plugins...')
  })
})
