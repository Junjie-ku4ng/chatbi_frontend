// @vitest-environment jsdom

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OnboardingSemanticReadonlyPage from '../../../../app/onboarding/semantic-readonly/page'

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

vi.mock('@/modules/onboarding/api', () => ({
  getOnboardingPACubeMetadata: vi.fn(),
  isOnboardingEnabled: () => true,
  listOnboardingPACubes: vi.fn(),
  onboardReadonlySemanticModel: vi.fn()
}))

vi.mock('@/modules/settings/api', () => ({
  listDataSources: vi.fn()
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
  const html = renderToStaticMarkup(React.createElement(OnboardingSemanticReadonlyPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('OnboardingSemanticReadonlyPage datasource selection', () => {
  it('renders a datasource picker when registry data is available', () => {
    useQueryMock.mockReturnValue(
      createQueryResult({
        items: [
          {
            id: 'ds-1',
            name: 'Finance Warehouse'
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

    expect(container.querySelector('[data-testid="onboarding-datasource-select"]')).not.toBeNull()
    expect(container.textContent).toContain('Finance Warehouse')
    expect(container.querySelector('[data-testid="onboarding-datasource"]')).toBeNull()
  })
})
