// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OnboardFromPADrawer } from '../onboard-from-pa-drawer'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
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

async function renderDrawer(
  props?: Partial<React.ComponentProps<typeof OnboardFromPADrawer>>
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      React.createElement(OnboardFromPADrawer, {
        open: true,
        dataSourceId: 'ds-1',
        query: '',
        cubes: [],
        onSearch: vi.fn(),
        onLoadMetadata: vi.fn(),
        onOnboard: vi.fn(),
        ...props
      })
    )
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('OnboardFromPADrawer shared states', () => {
  it('renders locked data-source context instead of a free-text data-source field', async () => {
    const container = await renderDrawer({
      dataSourceId: 'ds-locked',
      onChangeDataSourceId: undefined
    })

    expect(container.textContent).toContain('Data source')
    expect(container.textContent).toContain('ds-locked')
    expect(container.querySelector('[data-testid="semantic-sync-onboard-datasource"]')).toBeNull()
  })

  it('renders shared loading and retryable error states for cube discovery', async () => {
    const loadingContainer = await renderDrawer({
      cubeBusy: true
    })

    expect(loadingContainer.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading cubes...')

    const retrySearch = vi.fn()
    const errorContainer = await renderDrawer({
      cubeError: new Error('Cube discovery failed'),
      onSearch: retrySearch
    })
    const retryButton = errorContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(errorContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Cube discovery failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(retrySearch).toHaveBeenCalledTimes(1)
  })

  it('renders shared empty state when no cubes are loaded', async () => {
    const container = await renderDrawer({
      cubes: []
    })

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('No cubes loaded.')
  })

  it('renders shared metadata loading, error, empty, and ready states', async () => {
    const loadingContainer = await renderDrawer({
      cubes: [{ name: 'Sales', dimensions: ['Region'] }],
      selectedCube: 'Sales',
      metadataBusy: true
    })

    expect(loadingContainer.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading metadata...')

    const retryMetadata = vi.fn()
    const errorContainer = await renderDrawer({
      cubes: [{ name: 'Sales', dimensions: ['Region'] }],
      selectedCube: 'Sales',
      metadataError: new Error('Metadata load failed'),
      onLoadMetadata: retryMetadata
    })
    const retryButton = errorContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(errorContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Metadata load failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(retryMetadata).toHaveBeenCalledTimes(1)

    const emptyContainer = await renderDrawer({
      cubes: [{ name: 'Sales', dimensions: ['Region'] }],
      selectedCube: 'Sales',
      metadata: null
    })

    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Load metadata for the selected cube.')

    const readyContainer = await renderDrawer({
      cubes: [{ name: 'Sales', dimensions: ['Region'] }],
      selectedCube: 'Sales',
      metadata: {
        cube: 'Sales',
        metricDimension: 'Measures',
        dimensions: ['Region', 'Time'],
        measures: ['Sales']
      }
    })

    expect(readyContainer.textContent).toContain('metricDimension: Measures')
    expect(readyContainer.textContent).toContain('dimensions: 2')
    expect(readyContainer.textContent).toContain('measures: 1')
  })

  it('renders explicit guidance when PA onboarding requires synthesized semantic level names', async () => {
    const container = await renderDrawer({
      cubes: [{ name: 'Allocation Calculation', dimensions: ['Version'] }],
      selectedCube: 'Allocation Calculation',
      metadata: {
        cube: 'Allocation Calculation',
        metricDimension: 'Measures',
        dimensions: ['Version'],
        measures: ['Amount'],
        synthesizedLevels: [
          {
            dimension: 'Allocation Calculation',
            hierarchy: 'Allocation Calculation',
            executionLevel: 'level000',
            semanticLevelName: 'Allocation Calculation Level 1'
          }
        ]
      } as any
    })

    expect(container.querySelector('[data-testid="semantic-sync-onboard-synthesized-warning"]')?.textContent).toContain(
      'Allocation Calculation Level 1'
    )
    expect(container.textContent).toContain('Review synthesized level semantics in Data Model Release before publish')
  })
})
