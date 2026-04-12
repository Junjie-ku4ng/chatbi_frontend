// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AggregationRole, Semantics } from '@metad/ocap-core'
import { afterEach, describe, expect, it } from 'vitest'
import { propertyIcon, ReactEntityProperty } from './react-entity-property'

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

describe('ReactEntityProperty', () => {
  it('uses the same icon semantics as xpert for calendar dimensions', async () => {
    const icon = propertyIcon({
      name: '[Time Calendar]',
      caption: 'Time Calendar',
      role: AggregationRole.dimension,
      semantics: {
        semantic: Semantics.Calendar
      }
    } as never)

    expect(icon).toMatchObject({
      icon: 'schedule',
      label: 'Calendar'
    })

    const container = await renderIntoDom(
      <ReactEntityProperty
        property={{
          name: '[Time Calendar]',
          caption: 'Time Calendar',
          role: AggregationRole.dimension,
          semantics: {
            semantic: Semantics.Calendar
          }
        }}
      />
    )

    expect(container.textContent).toContain('schedule')
    expect(container.textContent).toContain('Time Calendar')
  })
})
