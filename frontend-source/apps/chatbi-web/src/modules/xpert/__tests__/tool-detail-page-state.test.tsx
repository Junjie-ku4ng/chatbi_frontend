// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import XpertToolDetailPage from '../../../../app/(workspace)/xpert/tool/[id]/page'

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
  getToolsetPluginPolicy: vi.fn()
}))

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(XpertToolDetailPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('xpert tool detail shared states', () => {
  it('uses specific loading copy while tool policy is loading', () => {
    useParamsMock.mockReturnValue({ id: 'plugin-77' })
    useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading tool policy...')
  })

  it('uses an explicit empty state when no tool policy is configured', () => {
    useParamsMock.mockReturnValue({ id: 'plugin-77' })
    useQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Tool policy is not configured.')
  })

  it('declares the page as a read-only policy view', () => {
    useParamsMock.mockReturnValue({ id: 'plugin-77' })
    useQueryMock.mockReturnValue({
      data: {
        pluginId: 'plugin-77',
        timeoutMs: 5000,
        maxPayloadBytes: 262144,
        maxActionsPerMinute: 120,
        allowedDomains: ['indicator_governance'],
        status: 'active'
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="xpert-tool-route-truth"]')?.textContent).toContain('read-only policy view')
  })

  it('does not render a green success badge for disabled tool policies', () => {
    useParamsMock.mockReturnValue({ id: 'plugin-77' })
    useQueryMock.mockReturnValue({
      data: {
        pluginId: 'plugin-77',
        timeoutMs: 5000,
        maxPayloadBytes: 262144,
        maxActionsPerMinute: 120,
        allowedDomains: ['indicator_governance'],
        status: 'disabled'
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    const container = renderPage()
    const status = container.querySelector('[data-testid="xpert-tool-policy-status"]')

    expect(status?.textContent).toContain('disabled')
    expect(status?.getAttribute('class')).toContain('badge-warn')
    expect(status?.getAttribute('class')).not.toContain('badge-ok')
  })
})
