// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SemanticImpactPage from '../pages/semantic-model-impact-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useParamsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useParamsMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock
}))

vi.mock('next/navigation', () => ({
  useParams: useParamsMock
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
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

vi.mock('@/modules/governance/semantic/api', () => ({
  getSemanticCrossImpact: vi.fn(),
  getSemanticImpactSummary: vi.fn()
}))

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
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
  const html = renderToStaticMarkup(React.createElement(SemanticImpactPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('semantic model impact shared states', () => {
  it('uses specific loading copy while impact summary is loading', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-impact-summary') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'semantic-cross-impact') return createQueryResult({})
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading semantic impact summary...')
  })

  it('uses specific loading copy while cross-model impact is loading', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-impact-summary') return createQueryResult({})
      if (queryKey[0] === 'semantic-cross-impact') return createQueryResult(undefined, { isLoading: true })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading cross-model impact...')
  })
})
