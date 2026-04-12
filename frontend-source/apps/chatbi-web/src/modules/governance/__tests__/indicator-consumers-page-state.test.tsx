// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import IndicatorConsumersPage from '../../../../app/(workspace)/indicator-consumers/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/lib/api-client', () => ({
  listSemanticModels: vi.fn()
}))

vi.mock('@/modules/governance/indicator/api', () => ({
  createConsumerRegistration: vi.fn(),
  listConsumerRegistrations: vi.fn()
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

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/panels/entity-detail-sections', async () => {
  const ReactModule = await import('react')
  return {
    EntityDetailSections: () => ReactModule.createElement('div')
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/chips/status-chip', async () => {
  const ReactModule = await import('react')
  return {
    StatusChip: ({ value }: { value: string }) => ReactModule.createElement('span', null, value)
  }
})

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
  const html = renderToStaticMarkup(React.createElement(IndicatorConsumersPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('indicator consumers shared states', () => {
  it('uses specific loading copy while semantic models are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'indicator-registrations') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading indicator consumer models...'
    )
  })

  it('uses an explicit empty state when no semantic model is available for registrations', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([])
      if (queryKey[0] === 'indicator-registrations') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'Select a semantic model to load consumer registrations.'
    )
  })

  it('uses specific loading copy while consumer registrations are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([{ id: 'model-1', name: 'Sales' }])
      if (queryKey[0] === 'indicator-registrations') return createQueryResult(undefined, { isLoading: true })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading consumer registrations...'
    )
  })
})
