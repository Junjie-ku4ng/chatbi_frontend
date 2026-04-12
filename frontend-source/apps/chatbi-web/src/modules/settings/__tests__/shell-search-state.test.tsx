// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsShell } from '../shell'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings'
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusCard: ({ children, ...props }: MockElementProps) => ReactModule.createElement('div', props, children),
    NexusInput: (props: Record<string, unknown>) => ReactModule.createElement('input', props)
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

async function renderShell() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      React.createElement(
        SettingsShell,
        null,
        React.createElement('div', { 'data-testid': 'settings-shell-child' }, 'child content')
      )
    )
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('settings shell search state', () => {
  it('filters visible settings nav links from the active search input', async () => {
    const container = await renderShell()
    const searchInput = container.querySelector('[data-testid="settings-search-launcher"]') as HTMLInputElement | null

    expect(searchInput).not.toBeNull()
    expect(container.textContent).toContain('Users')
    expect(container.textContent).toContain('ChatBI')

    await act(async () => {
      if (searchInput) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeValueSetter?.call(searchInput, 'chat')
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(searchInput?.value).toBe('chat')
    expect(container.textContent).toContain('ChatBI')
    expect(container.textContent).not.toContain('Users')
  })
})
