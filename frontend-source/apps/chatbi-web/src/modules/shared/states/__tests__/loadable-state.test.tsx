// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/lib/api-client'
import { LoadablePanel } from '../loadable-state'

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('LoadablePanel shared states', () => {
  it('renders stable loading and empty state anchors', async () => {
    const loadingContainer = await renderIntoDom(
      React.createElement(LoadablePanel, {
        loading: true,
        loadingLabel: 'Loading rows',
        children: React.createElement('div', null, 'content')
      })
    )

    expect(loadingContainer.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading rows')

    const emptyContainer = await renderIntoDom(
      React.createElement(LoadablePanel, {
        empty: true,
        emptyLabel: 'Nothing here',
        children: React.createElement('div', null, 'content')
      })
    )

    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Nothing here')
  })

  it('renders stable unauthorized, forbidden, and retryable error anchors', async () => {
    const unauthorizedContainer = await renderIntoDom(
      React.createElement(LoadablePanel, {
        error: new ApiRequestError({ status: 401, message: 'Login required' }),
        children: React.createElement('div', null, 'content')
      })
    )
    expect(unauthorizedContainer.querySelector('[data-testid="loadable-unauthorized-state"]')?.textContent).toContain('Login required')

    const forbiddenContainer = await renderIntoDom(
      React.createElement(LoadablePanel, {
        error: new ApiRequestError({ status: 403, message: 'No access' }),
        children: React.createElement('div', null, 'content')
      })
    )
    expect(forbiddenContainer.querySelector('[data-testid="loadable-forbidden-state"]')?.textContent).toContain('No access')

    const retry = vi.fn()
    const retryableContainer = await renderIntoDom(
      React.createElement(LoadablePanel, {
        error: new ApiRequestError({ status: 503, message: 'Try again later' }),
        retry,
        children: React.createElement('div', null, 'content')
      })
    )
    const retryButton = retryableContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null
    expect(retryableContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Try again later')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(retry).toHaveBeenCalledTimes(1)
  })
})
