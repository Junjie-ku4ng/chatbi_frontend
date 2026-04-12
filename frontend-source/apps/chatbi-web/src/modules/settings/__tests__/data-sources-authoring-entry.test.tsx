// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SettingsDataSourcesPage from '../../../../app/(workspace)/settings/data-sources/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { permissionStateMock, permissionReasonMock, useQueryMock, useMutationMock } = vi.hoisted(() => ({
  permissionStateMock: vi.fn(() => 'enabled'),
  permissionReasonMock: vi.fn(() => undefined),
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

vi.mock('@/modules/shared/rbac/action-guard', async () => {
  const ReactModule = await import('react')
  return {
    ActionGuard: ({
      children
    }: {
      children?: React.ReactNode | ((permission: { state: string; reason?: string }) => React.ReactNode)
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        typeof children === 'function'
          ? children({ state: permissionStateMock(), reason: permissionReasonMock() })
          : children
      )
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

vi.mock('@/modules/settings/shell', async () => {
  const ReactModule = await import('react')
  return {
    SettingsPanel: ({ children }: MockElementProps) => ReactModule.createElement('section', null, children)
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children)
  }
})

vi.mock('@/modules/shared/errors/ui-error', () => ({
  normalizeUiError: (error: unknown) => ({ message: String(error ?? '') })
}))

vi.mock('@/modules/settings/api', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn()
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

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(SettingsDataSourcesPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('settings data-sources authoring entry', () => {
  it('shows explicit read-only state for authoring actions when write capability is missing', () => {
    permissionStateMock.mockReturnValue('disabled')
    permissionReasonMock.mockReturnValue('read only')
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [
          {
            id: 'ds-1',
            name: 'Sales Warehouse',
            type: 'pa-tm1'
          }
        ],
        total: 1
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="settings-data-sources-write-warning"]')?.textContent).toContain(
      'Read-only mode'
    )
    expect((container.querySelector('[data-testid="settings-data-sources-add"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect(
      (container.querySelector('[data-testid="settings-data-sources-delete-ds-1"]') as HTMLButtonElement | null)?.disabled
    ).toBe(true)
    expect(container.textContent).toContain('Start modeling')
    expect(container.querySelector('a[href="/data-model-release?dataSourceId=ds-1"]')).toBeNull()
  })

  it('exposes the authoring entry actions needed to start semantic modeling from a data source', () => {
    permissionStateMock.mockReturnValue('enabled')
    permissionReasonMock.mockReturnValue(undefined)
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [
          {
            id: 'ds-1',
            name: 'Sales Warehouse',
            type: 'pa-tm1'
          }
        ],
        total: 1
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.textContent).toContain('Add data source')
    expect(container.textContent).toContain('Edit')
    expect(container.textContent).toContain('Test connection')
    expect(container.textContent).toContain('Start modeling')
    expect(container.querySelector('a[href="/data-model-release?dataSourceId=ds-1"]')).not.toBeNull()
  })
})
