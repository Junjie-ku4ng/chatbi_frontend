// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OnboardingSemanticReadonlyPage from '../../../../app/onboarding/semantic-readonly/page'

const { useMutationMock, useQueryMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('@/modules/onboarding/api', () => ({
  getOnboardingPACubeMetadata: vi.fn(),
  isOnboardingEnabled: () => true,
  listOnboardingPACubes: vi.fn(),
  onboardReadonlySemanticModel: vi.fn()
}))

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function createMutationResult(
  overrides?: Partial<{
    error: unknown
    isPending: boolean
    mutate: ReturnType<typeof vi.fn>
  }>
) {
  return {
    error: null,
    isPending: false,
    mutate: vi.fn(),
    reset: vi.fn(),
    ...overrides
  }
}

type MutationOptions = {
  mutationFn?: () => Promise<unknown> | unknown
  onSuccess?: (...args: any[]) => void
  onError?: (...args: any[]) => void
}

const capturedMutations: MutationOptions[] = []

function mockMutations(options?: {
  cubes?: ReturnType<typeof createMutationResult>
  metadata?: ReturnType<typeof createMutationResult>
  onboard?: ReturnType<typeof createMutationResult>
}) {
  capturedMutations.length = 0
  useQueryMock.mockReturnValue({
    data: {
      items: []
    },
    error: null,
    isLoading: false
  })
  const mutations = [options?.cubes, options?.metadata, options?.onboard]
  useMutationMock.mockImplementation((mutationOptions?: MutationOptions) => {
    capturedMutations.push(mutationOptions ?? {})
    return (
      mutations.shift() ??
      createMutationResult({
        mutate: vi.fn(async () => {
          try {
            const result = await mutationOptions?.mutationFn?.()
            mutationOptions?.onSuccess?.(result)
          } catch (error) {
            mutationOptions?.onError?.(error)
          }
        })
      })
    )
  })
}

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
  capturedMutations.length = 0
})

async function renderPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(React.createElement(OnboardingSemanticReadonlyPage))
    await Promise.resolve()
    await Promise.resolve()
  })

  return { container }
}

describe('readonly semantic onboarding shared states', () => {
  it('renders shared loading state while cube discovery is pending', async () => {
    mockMutations({
      cubes: createMutationResult({
        isPending: true
      })
    })

    const { container } = await renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading cubes...')
  })

  it('renders shared guidance state before metadata is loaded', async () => {
    mockMutations()

    const { container } = await renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Select a cube to load metadata.')
  })

  it('shows a canonical release link after readonly onboarding succeeds', async () => {
    mockMutations()

    const { container } = await renderPage()

    const dataSourceInput = container.querySelector('[data-testid="onboarding-datasource"]') as HTMLInputElement | null
    expect(dataSourceInput).not.toBeNull()

    await act(async () => {
      if (dataSourceInput) {
        dataSourceInput.value = 'source-7'
        dataSourceInput.dispatchEvent(new Event('input', { bubbles: true }))
        dataSourceInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
      await Promise.resolve()
    })

    await act(async () => {
      capturedMutations[2]?.onSuccess?.({
        model: {
          id: 'model-77'
        }
      })
      await Promise.resolve()
    })

    const releaseLink = container.querySelector('[data-testid="onboarding-open-canonical-release"]') as HTMLAnchorElement | null
    expect(releaseLink).not.toBeNull()
    expect(releaseLink?.getAttribute('href')).toContain('/data-model-release?')
    expect(releaseLink?.getAttribute('href')).toContain('modelId=model-77')
  })
})
