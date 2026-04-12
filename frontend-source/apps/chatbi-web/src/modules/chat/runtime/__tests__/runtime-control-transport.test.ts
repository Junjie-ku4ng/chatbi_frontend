import { describe, expect, it, vi } from 'vitest'
import { StreamTransportError } from '../stream-transport'
import { runXpertRuntimeControlTransport } from '../runtime-control-transport'

describe('runXpertRuntimeControlTransport', () => {
  it('sends canonical runtime control requests over the native /api/chat SSE ingress and captures stream envelopes', async () => {
    const fetchEventSourceImpl = vi.fn(async (_url: string, init: Record<string, unknown>) => {
      const onopen = init.onopen as (response: Response) => Promise<void> | void
      const onmessage = init.onmessage as (message: { event?: string; data?: string }) => void

      await onopen(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        })
      )

      onmessage({
        data: JSON.stringify({
          type: 'event',
          event: 'on_message_end',
          data: {
            status: 'success',
            conversationId: 'conv-1'
          }
        })
      })
    })

    const result = await runXpertRuntimeControlTransport({
      action: 'resume',
      conversationId: 'conv-1',
      resume: {
        threadId: 'thread-1',
        executionId: 'execution-1'
      },
      fetchEventSourceImpl: fetchEventSourceImpl as never,
      maxAttempts: 1
    })

    expect(fetchEventSourceImpl).toHaveBeenCalledTimes(1)
    expect(fetchEventSourceImpl.mock.calls[0]?.[0]).toBe('/api/chat')
    expect(result.transportCompleted).toBe(true)
    expect(result.conversationId).toBe('conv-1')
    expect(result.envelopes).toEqual([
      {
        type: 'event',
        event: 'on_message_end',
        data: {
          status: 'success',
          conversationId: 'conv-1'
        }
      }
    ])
  })

  it('requires a target conversationId', async () => {
    await expect(
      runXpertRuntimeControlTransport({
        action: 'resume',
        conversationId: '',
        resume: {
          threadId: 'thread-1',
          executionId: 'execution-1'
        }
      } as never)
    ).rejects.toThrow('Runtime control transport requires a conversationId.')
  })

  it('surfaces transport errors without inventing success state', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'invalid request' }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      })
    })

    await expect(
      runXpertRuntimeControlTransport({
        action: 'tool_call_update',
        conversationId: 'conv-1',
        toolCalls: [
          {
            id: 'tool-call-1',
            args: { approved: true }
          }
        ],
        fetchImpl,
        maxAttempts: 1
      })
    ).rejects.toBeInstanceOf(StreamTransportError)
  })

  it('does not report optimistic success when the stream completes without runtime evidence', async () => {
    const fetchEventSourceImpl = vi.fn(async (_url: string, init: Record<string, unknown>) => {
      const onopen = init.onopen as (response: Response) => Promise<void> | void

      await onopen(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        })
      )
    })

    const result = await runXpertRuntimeControlTransport({
      action: 'resume',
      conversationId: 'conv-1',
      resume: {
        threadId: 'thread-1',
        executionId: 'execution-1'
      },
      fetchEventSourceImpl: fetchEventSourceImpl as never,
      maxAttempts: 1
    })

    expect(result.transportCompleted).toBe(true)
    expect(result.envelopes).toEqual([])
    expect('success' in result).toBe(false)
  })

  it('rejects unsupported cancel and interrupt actions at the helper boundary', async () => {
    await expect(
      runXpertRuntimeControlTransport({
        action: 'cancel',
        conversationId: 'conv-1'
      } as never)
    ).rejects.toThrow('Unsupported runtime control action: cancel')

    await expect(
      runXpertRuntimeControlTransport({
        action: 'interrupt',
        conversationId: 'conv-1'
      } as never)
    ).rejects.toThrow('Unsupported runtime control action: interrupt')
  })
})
