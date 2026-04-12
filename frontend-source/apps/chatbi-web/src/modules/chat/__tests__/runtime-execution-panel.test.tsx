// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RuntimeExecutionPanel } from '../components/runtime-execution-panel'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: MockElementProps) => ReactModule.createElement('div', props, children)
  }
})

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) {
      continue
    }
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
})

async function renderPanel(props?: Partial<React.ComponentProps<typeof RuntimeExecutionPanel>>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <RuntimeExecutionPanel
        conversationId="conv-42"
        nodes={[]}
        runtimeControlState={{
          phase: 'running',
          canInterrupt: true,
          canResume: false,
          canCancel: true
        }}
        taskRuntimeHints={{
          statusHint: 'running',
          messageId: null,
          sourceEvent: 'runtime_kernel',
          conversationId: 'conv-42',
          traceKey: 'trace-42',
          taskId: 'task-42',
          progressPercent: 50,
          updatedAt: '2026-04-06T10:00:00.000Z'
        }}
        {...props}
      />
    )
    await Promise.resolve()
  })

  return container
}

describe('RuntimeExecutionPanel', () => {
  it('surfaces available runtime capabilities with disabled controls when transport is not connected', async () => {
    const container = await renderPanel()

    expect(container.textContent).toContain('Action transport not connected in this surface.')
    expect(container.textContent).toContain('Interrupt')
    expect(container.textContent).toContain('Cancel')
    expect(container.querySelector('[data-testid="ask-runtime-control-resume"]')).toBeNull()
    expect((container.querySelector('[data-testid="ask-runtime-control-interrupt"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="ask-runtime-control-cancel"]') as HTMLButtonElement | null)?.disabled).toBe(true)
  })

  it('enables resume when the paused runtime has a transport-backed resume action', async () => {
    const onResume = vi.fn()
    const container = await renderPanel({
      runtimeControlState: {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      },
      taskRuntimeHints: {
        statusHint: 'paused',
        messageId: null,
        sourceEvent: 'on_interrupt',
        conversationId: 'conv-42',
        traceKey: 'trace-42',
        taskId: 'task-42',
        progressPercent: 50,
        updatedAt: '2026-04-06T10:00:00.000Z'
      },
      runtimeControlActions: {
        resume: {
          onExecute: onResume
        }
      }
    })

    const resumeButton = container.querySelector('[data-testid="ask-runtime-control-resume"]') as HTMLButtonElement | null
    expect(resumeButton).not.toBeNull()
    expect(resumeButton?.disabled).toBe(false)

    await act(async () => {
      resumeButton?.click()
      await Promise.resolve()
    })

    expect(onResume).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Cancel transport not connected in this surface.')
  })

  it('shows truthful pending and error labels for live runtime resume actions', async () => {
    const container = await renderPanel({
      runtimeControlState: {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      },
      taskRuntimeHints: {
        statusHint: 'paused',
        messageId: null,
        sourceEvent: 'on_interrupt',
        conversationId: 'conv-42',
        traceKey: 'trace-42',
        taskId: 'task-42',
        progressPercent: 50,
        updatedAt: '2026-04-06T10:00:00.000Z'
      },
      runtimeControlActions: {
        resume: {
          onExecute: vi.fn(),
          pending: true,
          error: 'resume failed'
        }
      }
    })

    const resumeButton = container.querySelector('[data-testid="ask-runtime-control-resume"]') as HTMLButtonElement | null
    expect(resumeButton?.disabled).toBe(true)
    expect(container.textContent).toContain('Resuming...')
    expect(container.textContent).toContain('resume failed')
  })

  it('enables confirm and reject when paused runtime has transport-backed tool decision actions', async () => {
    const onConfirm = vi.fn()
    const onReject = vi.fn()
    const container = await renderPanel({
      runtimeControlState: {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      },
      taskRuntimeHints: {
        statusHint: 'paused',
        messageId: null,
        sourceEvent: 'on_interrupt',
        conversationId: 'conv-42',
        traceKey: 'trace-42',
        taskId: 'task-42',
        progressPercent: 50,
        updatedAt: '2026-04-06T10:00:00.000Z'
      },
      runtimeControlActions: {
        toolDecision: {
          onConfirm,
          onReject
        }
      }
    })

    const confirmButton = container.querySelector('[data-testid="ask-runtime-control-confirm"]') as HTMLButtonElement | null
    const rejectButton = container.querySelector('[data-testid="ask-runtime-control-reject"]') as HTMLButtonElement | null
    expect(confirmButton).not.toBeNull()
    expect(rejectButton).not.toBeNull()
    expect(confirmButton?.disabled).toBe(false)
    expect(rejectButton?.disabled).toBe(false)
    expect(container.querySelector('[data-testid="ask-runtime-control-resume"]')).toBeNull()

    await act(async () => {
      confirmButton?.click()
      rejectButton?.click()
      await Promise.resolve()
    })

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Cancel transport not connected in this surface.')
  })

  it('shows truthful pending and error labels for live tool decision actions', async () => {
    const container = await renderPanel({
      runtimeControlState: {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      },
      taskRuntimeHints: {
        statusHint: 'paused',
        messageId: null,
        sourceEvent: 'on_interrupt',
        conversationId: 'conv-42',
        traceKey: 'trace-42',
        taskId: 'task-42',
        progressPercent: 50,
        updatedAt: '2026-04-06T10:00:00.000Z'
      },
      runtimeControlActions: {
        toolDecision: {
          onConfirm: vi.fn(),
          onReject: vi.fn(),
          pending: 'confirm',
          error: 'tool confirmation failed'
        }
      }
    })

    const confirmButton = container.querySelector('[data-testid="ask-runtime-control-confirm"]') as HTMLButtonElement | null
    const rejectButton = container.querySelector('[data-testid="ask-runtime-control-reject"]') as HTMLButtonElement | null
    expect(confirmButton?.disabled).toBe(true)
    expect(rejectButton?.disabled).toBe(true)
    expect(container.textContent).toContain('Confirming...')
    expect(container.textContent).toContain('tool confirmation failed')
  })

  it('switches to resume when the runtime is paused', async () => {
    const container = await renderPanel({
      runtimeControlState: {
        phase: 'paused',
        canInterrupt: false,
        canResume: true,
        canCancel: true
      },
      taskRuntimeHints: {
        statusHint: 'paused',
        messageId: null,
        sourceEvent: 'runtime_kernel',
        conversationId: 'conv-42',
        traceKey: 'trace-42',
        taskId: 'task-42',
        progressPercent: 50,
        updatedAt: '2026-04-06T10:00:00.000Z'
      }
    })

    expect(container.querySelector('[data-testid="ask-runtime-control-interrupt"]')).toBeNull()
    expect((container.querySelector('[data-testid="ask-runtime-control-resume"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="ask-runtime-control-cancel"]') as HTMLButtonElement | null)?.disabled).toBe(true)
  })
})
