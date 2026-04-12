// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReactBreadcrumbBar, type Step } from './react-breadcrumb-bar'

type MountedRoot = {
  container: HTMLDivElement
  root: Root
}

const mountedRoots: MountedRoot[] = []

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
})

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
  })

  return container
}

describe('ReactBreadcrumbBar', () => {
  it('reselects active steps using the xpert breadcrumb click semantics', async () => {
    const selectedChange = vi.fn()
    const close = vi.fn()
    const steps: Step[] = [
      { value: 'year', label: '2025', active: true },
      { value: 'month', label: '2025-01', active: true }
    ]

    const container = await renderIntoDom(
      <ReactBreadcrumbBar close={close} selectedChange={selectedChange} steps={steps} />
    )

    const monthButton = container.querySelector('[data-testid="react-breadcrumb-step-1"]') as HTMLButtonElement | null
    expect(monthButton?.textContent).toContain('2025-01')

    await act(async () => {
      monthButton?.click()
      await Promise.resolve()
    })

    expect(selectedChange).toHaveBeenCalledTimes(1)
    expect(selectedChange.mock.calls[0]?.[0]).toEqual([{ value: 'year', label: '2025', active: true }])

    const closeButton = container.querySelector('[data-testid="react-breadcrumb-close"]') as HTMLButtonElement | null
    expect(closeButton).not.toBeNull()

    await act(async () => {
      closeButton?.click()
      await Promise.resolve()
    })

    expect(close).toHaveBeenCalledTimes(1)
  })
})
