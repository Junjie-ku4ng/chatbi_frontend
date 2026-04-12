// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SettingsFeaturesPage from '../../../../app/(workspace)/settings/features/page'
import SettingsPluginsPage from '../../../../app/(workspace)/settings/plugins/page'
import SettingsRolesPage from '../../../../app/(workspace)/settings/roles/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { permissionReasonMock, permissionStateMock, useMutationMock, useQueryMock } = vi.hoisted(() => ({
  permissionReasonMock: vi.fn(() => 'read only'),
  permissionStateMock: vi.fn(() => 'disabled'),
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: useMutationMock,
  useQuery: useQueryMock
}))

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
  deleteRole: vi.fn(),
  listFeatureToggles: vi.fn(),
  listPlugins: vi.fn(),
  listRoles: vi.fn(),
  uninstallPlugin: vi.fn(),
  updateFeatureToggle: vi.fn()
}))

function createQueryResult<T>(data: T) {
  return {
    data,
    error: null,
    isLoading: false,
    refetch: vi.fn()
  }
}

function renderPage(element: React.ReactElement) {
  const html = renderToStaticMarkup(element)
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('settings write capability states', () => {
  it('shows read-only warning and disabled uninstall on plugins page', () => {
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [{ name: 's3-loader', meta: { title: 'S3 Loader' }, isGlobal: false }],
        total: 1
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage(React.createElement(SettingsPluginsPage))

    expect(container.querySelector('[data-testid="settings-plugins-write-warning"]')?.textContent).toContain('Read-only mode')
    expect(
      (container.querySelector('[data-testid="settings-plugins-uninstall-s3-loader"]') as HTMLButtonElement | null)?.disabled
    ).toBe(true)
  })

  it('shows read-only warning and disabled toggle on features page', () => {
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [{ id: 'fo-1', featureId: 'chat', feature: { code: 'chat' }, isEnabled: true }],
        total: 1
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage(React.createElement(SettingsFeaturesPage))

    expect(container.querySelector('[data-testid="settings-features-write-warning"]')?.textContent).toContain('Read-only mode')
    expect(
      (container.querySelector('[data-testid="settings-features-toggle-fo-1"]') as HTMLButtonElement | null)?.disabled
    ).toBe(true)
  })

  it('shows read-only warning and disabled delete on roles page', () => {
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [{ id: 'role-1', name: 'ANALYST' }],
        total: 1
      })
    )
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage(React.createElement(SettingsRolesPage))

    expect(container.querySelector('[data-testid="settings-roles-write-warning"]')?.textContent).toContain('Read-only mode')
    expect(
      (container.querySelector('[data-testid="settings-roles-delete-role-1"]') as HTMLButtonElement | null)?.disabled
    ).toBe(true)
  })
})
