import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

export class StreamTransportError extends Error {
  status?: number
  retryable: boolean

  constructor(message: string, status?: number, retryable = false) {
    super(message)
    this.name = 'StreamTransportError'
    this.status = status
    this.retryable = retryable
  }
}

type RetryDelay = number | ((attempt: number) => number)

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value
    }
    return acc
  }, {})
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  return error.name === 'AbortError' || /aborted/i.test(error.message)
}

function defaultShouldRetry(error: unknown) {
  if (isAbortError(error)) {
    return false
  }

  if (error instanceof StreamTransportError) {
    if (error.status && [401, 403, 422].includes(error.status)) {
      return false
    }
    return error.retryable || !error.status || error.status >= 500
  }

  if (!(error instanceof Error)) {
    return false
  }

  return /network|fetch|timeout/i.test(error.message)
}

async function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = () => {
      cleanup()
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (signal?.aborted) {
      cleanup()
      reject(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export type SseTransportOptions<TEvent> = {
  url: string
  body: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  maxAttempts?: number
  retryDelayMs?: RetryDelay
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => void
  parseEventBlock: (block: string) => TEvent | null
  onEvent?: (event: TEvent, response: Response) => void
  expectedContentType?: string
  onUnauthorized?: (error: StreamTransportError) => Promise<boolean | void> | boolean | void
  fetchImpl?: FetchImpl
  fetchEventSourceImpl?: typeof fetchEventSource
}

async function runSseTransportOnce<TEvent>(options: SseTransportOptions<TEvent>) {
  const fetchEventSourceImpl = options.fetchEventSourceImpl ?? fetchEventSource
  let streamResponse: Response | undefined
  const expectedContentType = (options.expectedContentType ?? EventStreamContentType).toLowerCase()

  await fetchEventSourceImpl(options.url, {
    method: 'POST',
    headers: normalizeHeaders(options.headers),
    body: JSON.stringify(options.body),
    signal: options.signal,
    openWhenHidden: true,
    fetch: options.fetchImpl,
    async onopen(response) {
      streamResponse = response
      if (!response.ok) {
        const payload = await response
          .clone()
          .json()
          .catch(async () => {
            const rawText = await response.clone().text().catch(() => '')
            return rawText ? { message: rawText } : {}
          })
        const record = asRecord(payload)
        const message = typeof record?.message === 'string' ? record.message : `Stream request failed: ${response.status}`
        throw new StreamTransportError(message, response.status, response.status >= 500)
      }

      const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
      if (!contentType.startsWith(expectedContentType)) {
        throw new StreamTransportError(
          `Unexpected stream content-type: ${contentType || 'unknown'}. Expected: ${expectedContentType}`,
          response.status
        )
      }
    },
    onmessage(message) {
      if (!message.data || message.data === '[DONE]') {
        return
      }

      const blockLines: string[] = []
      if (typeof message.event === 'string' && message.event.trim() !== '') {
        blockLines.push(`event: ${message.event}`)
      }
      for (const line of message.data.split('\n')) {
        blockLines.push(`data: ${line}`)
      }

      const parsed = options.parseEventBlock(blockLines.join('\n'))
      if (parsed && streamResponse) {
        options.onEvent?.(parsed, streamResponse)
      }
    },
    onerror(error) {
      if (error instanceof StreamTransportError) {
        throw error
      }
      if (isAbortError(error)) {
        throw error
      }
      if (error instanceof Error) {
        throw error
      }
      throw new StreamTransportError('Unknown stream transport error')
    }
  })

  if (!streamResponse) {
    throw new StreamTransportError('Stream response is empty')
  }
}

export async function runSseTransport<TEvent>(options: SseTransportOptions<TEvent>) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2)
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry
  let unauthorizedRetried = false

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await runSseTransportOnce(options)
      return
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) {
        throw error
      }

      if (
        error instanceof StreamTransportError &&
        error.status === 401 &&
        options.onUnauthorized &&
        !unauthorizedRetried
      ) {
        unauthorizedRetried = true
        const refreshed = await options.onUnauthorized(error)
        if (refreshed !== false) {
          continue
        }
      }

      const isLastAttempt = attempt >= maxAttempts - 1
      if (isLastAttempt || !shouldRetry(error)) {
        throw error
      }

      const nextAttempt = attempt + 1
      options.onRetry?.(nextAttempt, error)

      const delayOption = options.retryDelayMs ?? 0
      const delayMs = typeof delayOption === 'function' ? delayOption(nextAttempt) : delayOption
      await sleep(delayMs, options.signal)
    }
  }
}
