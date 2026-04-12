// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { XpertExpertCopilotCreateCard, XpertExpertDetailShell, XpertExpertMonitorCard } from '../expert-detail'

const { permissionReasonMock, permissionStateMock } = vi.hoisted(() => ({
  permissionReasonMock: vi.fn(() => undefined),
  permissionStateMock: vi.fn(() => 'enabled')
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')

  return {
    default: ({ href, children, ...props }: Record<string, unknown>) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')

  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/rbac/action-guard', async () => {
  const ReactModule = await import('react')

  return {
    ActionGuard: ({ children }: { children?: React.ReactNode | ((permission: { state: string; reason?: string }) => React.ReactNode) }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        typeof children === 'function'
          ? children({ state: permissionStateMock(), reason: permissionReasonMock() })
          : children
      )
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')

  return {
    NexusBadge: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: Record<string, unknown>) => ReactModule.createElement('div', props, children)
  }
})

function renderCard(element: React.ReactElement) {
  const html = renderToStaticMarkup(element)
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('xpert expert secondary-route states', () => {
  it('keeps copilot publish action preview-only even when write capability exists', () => {
    permissionStateMock.mockReturnValue('enabled')
    permissionReasonMock.mockReturnValue(undefined)

    const container = renderCard(React.createElement(XpertExpertCopilotCreateCard, { expertId: 'expert-1' }))

    expect(container.querySelector('[data-testid="xpert-expert-copilot-preview-note"]')?.textContent).toContain('Preview-only action')
    expect((container.querySelector('[data-testid="xpert-expert-copilot-publish"]') as HTMLButtonElement | null)?.disabled).toBe(true)
  })

  it('surfaces route-specific truth on secondary detail shells', () => {
    const container = renderCard(
      React.createElement(
        XpertExpertDetailShell,
        {
          expertId: 'expert-1',
          activeTab: 'monitor',
          title: 'Expert Monitor',
          summary: 'Preview metrics surface for latency, quality, and throughput markers.',
          routeTruthLabel: 'preview metrics surface'
        },
        React.createElement(XpertExpertMonitorCard)
      )
    )

    expect(container.querySelector('[data-testid="xpert-expert-route-mode"]')?.textContent).toContain('Preview-only route')
    expect(container.querySelector('[data-testid="xpert-expert-route-truth-detail"]')?.textContent).toContain('preview metrics surface')
  })
})
