import { describe, expect, it, vi } from 'vitest'
import { runSseTransport, StreamTransportError } from '../stream-transport'

type TestEvent = {
  event: string
  data: Record<string, unknown>
}

function parseTestEvent(block: string): TestEvent | null {
  const lines = block
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const eventLine = lines.find(line => line.startsWith('event:'))
  const dataLine = lines.find(line => line.startsWith('data:'))
  if (!eventLine || !dataLine) return null

  return {
    event: eventLine.replace('event:', '').trim(),
    data: JSON.parse(dataLine.replace('data:', '').trim()) as Record<string, unknown>
  }
}

function createSseResponse(blocks: string[], status = 200) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const block of blocks) {
        controller.enqueue(encoder.encode(`${block}\n\n`))
      }
      controller.close()
    }
  })

  return new Response(stream, {
    status,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
}

describe('runSseTransport', () => {
  it('uses fetchEventSource adapter and forwards parsed events', async () => {
    const events: TestEvent[] = []
    const responses: Response[] = []
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
        event: 'done',
        data: '{"ok":true}'
      })
    })

    await runSseTransport<TestEvent>({
      url: '/chatbi/query/stream',
      body: { question: 'q' },
      parseEventBlock: parseTestEvent,
      fetchEventSourceImpl: fetchEventSourceImpl as never,
      onEvent: (event, response) => {
        events.push(event)
        responses.push(response)
      },
      maxAttempts: 1
    })

    expect(fetchEventSourceImpl).toHaveBeenCalledTimes(1)
    expect(events).toEqual([{ event: 'done', data: { ok: true } }])
    expect(responses).toHaveLength(1)
    expect(responses[0]?.headers.get('content-type')).toBe('text/event-stream')
  })

  it('retries once with backoff on retryable status and then succeeds', async () => {
    const events: TestEvent[] = []
    const retryAttempts: number[] = []
    const backoffAttempts: number[] = []

    const fetchImpl = vi
      .fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'temporary unavailable' }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(createSseResponse(['event: done\ndata: {"ok":true}']))

    await runSseTransport<TestEvent>({
      url: '/chatbi/query/stream',
      body: { question: 'q' },
      parseEventBlock: parseTestEvent,
      fetchImpl,
      onEvent: event => events.push(event),
      onRetry: attempt => retryAttempts.push(attempt),
      retryDelayMs: attempt => {
        backoffAttempts.push(attempt)
        return 0
      }
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(retryAttempts).toEqual([1])
    expect(backoffAttempts).toEqual([1])
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: 'done', data: { ok: true } })
  })

  it('does not retry when aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const fetchImpl = vi.fn(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    })

    await expect(
      runSseTransport<TestEvent>({
        url: '/chatbi/query/stream',
        body: { question: 'q' },
        parseEventBlock: parseTestEvent,
        fetchImpl,
        signal: controller.signal,
        maxAttempts: 3
      })
    ).rejects.toThrow()

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('raises stream transport error for non-ok response', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'invalid request' }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      })
    })

    await expect(
      runSseTransport<TestEvent>({
        url: '/chatbi/query/stream',
        body: { question: 'q' },
        parseEventBlock: parseTestEvent,
        fetchImpl,
        maxAttempts: 1
      })
    ).rejects.toBeInstanceOf(StreamTransportError)
  })

  it('raises stream transport error when content-type is not event stream', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('ok', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    })

    await expect(
      runSseTransport<TestEvent>({
        url: '/chatbi/query/stream',
        body: { question: 'q' },
        parseEventBlock: parseTestEvent,
        fetchImpl,
        maxAttempts: 1
      })
    ).rejects.toBeInstanceOf(StreamTransportError)
  })

  it('refreshes once on 401 and retries', async () => {
    const events: TestEvent[] = []
    const onUnauthorized = vi.fn(async () => true)
    const fetchImpl = vi
      .fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(createSseResponse(['event: done\ndata: {"ok":true}']))

    await runSseTransport<TestEvent>({
      url: '/chatbi/query/stream',
      body: { question: 'q' },
      parseEventBlock: parseTestEvent,
      fetchImpl,
      maxAttempts: 2,
      onUnauthorized,
      onEvent: event => events.push(event)
    })

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(events).toEqual([{ event: 'done', data: { ok: true } }])
  })
})
