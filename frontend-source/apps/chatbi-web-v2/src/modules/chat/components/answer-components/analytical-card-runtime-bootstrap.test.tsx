// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticalCardRuntimeFactoryOptions } from './create-analytical-card-service'
import { AnalyticalCardRuntimeBootstrap } from './analytical-card-runtime-bootstrap'

const { registerRuntimeFactorySpy, clearRuntimeFactorySpy } = vi.hoisted(() => ({
  registerRuntimeFactorySpy: vi.fn(),
  clearRuntimeFactorySpy: vi.fn()
}))

vi.mock('./create-analytical-card-service', () => ({
  registerAnalyticalCardRuntimeFactory: registerRuntimeFactorySpy,
  clearDefaultAnalyticalCardServiceFactory: clearRuntimeFactorySpy
}))

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
  registerRuntimeFactorySpy.mockReset()
  clearRuntimeFactorySpy.mockReset()
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

  return { container, root }
}

describe('AnalyticalCardRuntimeBootstrap', () => {
  it('registers the analytical-card runtime factory when the resolver returns runtime options', async () => {
    const runtimeOptions = {
      agents: [],
      factories: [],
      resolveDataSourceOptions: vi.fn()
    } satisfies AnalyticalCardRuntimeFactoryOptions
    const resolveRuntimeOptions = vi.fn(async () => runtimeOptions)

    await renderIntoDom(
      <AnalyticalCardRuntimeBootstrap
        activeXpertId="workspace-alpha"
        resolveRuntimeOptions={resolveRuntimeOptions}
      />
    )

    expect(resolveRuntimeOptions).toHaveBeenCalledWith({
      activeXpertId: 'workspace-alpha',
      modelId: undefined
    })
    expect(clearRuntimeFactorySpy).toHaveBeenCalledTimes(1)
    expect(registerRuntimeFactorySpy).toHaveBeenCalledWith(runtimeOptions)
  })

  it('clears the registered runtime factory when the bootstrap unmounts', async () => {
    const runtimeOptions = {
      agents: [],
      factories: [],
      resolveDataSourceOptions: vi.fn()
    } satisfies AnalyticalCardRuntimeFactoryOptions

    const mounted = await renderIntoDom(
      <AnalyticalCardRuntimeBootstrap
        activeXpertId="workspace-alpha"
        resolveRuntimeOptions={async () => runtimeOptions}
      />
    )

    await act(async () => {
      mounted.root.unmount()
      await Promise.resolve()
    })

    expect(clearRuntimeFactorySpy).toHaveBeenCalledTimes(2)
  })
})
