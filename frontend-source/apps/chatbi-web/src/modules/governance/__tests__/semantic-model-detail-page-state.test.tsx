// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SemanticModelDetailPage from '../pages/semantic-model-detail-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock, useParamsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useParamsMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
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

vi.mock('@/modules/governance/semantic/api', () => ({
  approveSemanticModel: vi.fn(),
  applySemanticPolicyTemplate: vi.fn(),
  getSemanticEffectiveTemplates: vi.fn(),
  getSemanticModel: vi.fn(),
  getSemanticWorkflowApprovals: vi.fn(),
  listSemanticApprovalQueue: vi.fn(),
  listSemanticPolicyTemplates: vi.fn(),
  publishSemanticModel: vi.fn(),
  rejectSemanticModel: vi.fn(),
  submitSemanticReview: vi.fn(),
  voteSemanticWorkflow: vi.fn()
}))

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
  const html = renderToStaticMarkup(React.createElement(SemanticModelDetailPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

function createTemplateQueryResult() {
  return createQueryResult({
    modelId: 'model-1',
    policyTemplate: {
      source: 'inherited',
      template: {
        id: 'policy-sales',
        name: 'Sales Default',
        domain: 'sales'
      }
    },
    approvalTemplate: {
      source: 'inherited',
      template: {
        id: 'approval-sales',
        name: 'Sales Approval',
        domain: 'sales'
      }
    }
  })
}

function createPolicyTemplatesQueryResult() {
  return createQueryResult([
    {
      id: 'policy-sales',
      name: 'Sales Default',
      domain: 'sales',
      status: 'active',
      rules: {}
    }
  ])
}

describe('semantic model detail shared states', () => {
  it('uses specific loading copy while semantic model detail is loading', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-model') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'semantic-approvals') return createQueryResult({ approvals: [] })
      if (queryKey[0] === 'semantic-approval-queue-detail') return createQueryResult({ items: [] })
      if (queryKey[0] === 'semantic-effective-templates') return createTemplateQueryResult()
      if (queryKey[0] === 'semantic-policy-templates') return createPolicyTemplatesQueryResult()
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading semantic model detail...'
    )
  })

  it('uses specific loading copy while workflow approvals are loading', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-model') return createQueryResult({ id: 'model-1', status: 'draft' })
      if (queryKey[0] === 'semantic-approvals') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'semantic-approval-queue-detail') return createQueryResult({ items: [] })
      if (queryKey[0] === 'semantic-effective-templates') return createTemplateQueryResult()
      if (queryKey[0] === 'semantic-policy-templates') return createPolicyTemplatesQueryResult()
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading workflow approvals...'
    )
  })

  it('uses an explicit empty state when no workflow approvals are available', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-model') return createQueryResult({ id: 'model-1', status: 'draft' })
      if (queryKey[0] === 'semantic-approvals') return createQueryResult({ approvals: [] })
      if (queryKey[0] === 'semantic-approval-queue-detail') return createQueryResult({ items: [] })
      if (queryKey[0] === 'semantic-effective-templates') return createTemplateQueryResult()
      if (queryKey[0] === 'semantic-policy-templates') return createPolicyTemplatesQueryResult()
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No workflow approvals found.'
    )
  })

  it('renders the effective policy template panel with inherited template details', () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-model') {
        return createQueryResult({ id: 'model-1', status: 'draft', domain: 'sales', cube: 'Sales' })
      }
      if (queryKey[0] === 'semantic-approvals') return createQueryResult({ approvals: [] })
      if (queryKey[0] === 'semantic-approval-queue-detail') return createQueryResult({ items: [] })
      if (queryKey[0] === 'semantic-effective-templates') return createTemplateQueryResult()
      if (queryKey[0] === 'semantic-policy-templates') return createPolicyTemplatesQueryResult()
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="semantic-policy-template-panel"]')?.textContent).toContain(
      'Sales Default'
    )
    expect(container.querySelector('[data-testid="semantic-policy-template-panel"]')?.textContent).toContain(
      'inherited'
    )
    expect(container.querySelector('[data-testid="semantic-policy-template-apply"]')).not.toBeNull()
  })
})
