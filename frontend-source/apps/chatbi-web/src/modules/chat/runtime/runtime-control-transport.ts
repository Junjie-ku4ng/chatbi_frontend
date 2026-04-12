import { buildAuthHeaders, buildRequestContextHeaders } from '@/lib/api-client'
import type { RuntimeControlRequestInput } from './runtime-control-request'
import { buildXpertRuntimeControlRequestBody } from './runtime-control-request'
import { runSseTransport, type SseTransportOptions } from './stream-transport'

type RuntimeControlEventEnvelope = {
  type?: string
  event?: string
  data?: unknown
}

type RuntimeControlTransportInput = RuntimeControlRequestInput & {
  signal?: AbortSignal
  maxAttempts?: number
  onUnauthorized?: SseTransportOptions<RuntimeControlEventEnvelope>['onUnauthorized']
  fetchImpl?: SseTransportOptions<RuntimeControlEventEnvelope>['fetchImpl']
  fetchEventSourceImpl?: SseTransportOptions<RuntimeControlEventEnvelope>['fetchEventSourceImpl']
}

type RuntimeControlTransportLooseInput = {
  action: string
  conversationId?: string
  signal?: AbortSignal
  maxAttempts?: number
  onUnauthorized?: SseTransportOptions<RuntimeControlEventEnvelope>['onUnauthorized']
  fetchImpl?: SseTransportOptions<RuntimeControlEventEnvelope>['fetchImpl']
  fetchEventSourceImpl?: SseTransportOptions<RuntimeControlEventEnvelope>['fetchEventSourceImpl']
} & Record<string, unknown>

export type RuntimeControlTransportResult = {
  conversationId: string
  envelopes: RuntimeControlEventEnvelope[]
  transportCompleted: true
}

// Runtime-control HTTP commands are frozen only on the native /api/chat ingress.
const NATIVE_CHAT_RUNTIME_CONTROL_INGRESS = '/api/chat'

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseRuntimeControlEnvelope(block: string): RuntimeControlEventEnvelope | null {
  const lines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const dataLines: string[] = []
  for (const line of lines) {
    const dataMatch = /^data:\s?(.*)$/.exec(line.trimStart())
    if (dataMatch) {
      dataLines.push(dataMatch[1])
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  const rawPayload = dataLines.join('\n').trim()
  if (!rawPayload || rawPayload === '[DONE]') {
    return null
  }

  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>
    return {
      type: typeof parsed.type === 'string' ? parsed.type : undefined,
      event: typeof parsed.event === 'string' ? parsed.event : undefined,
      data: parsed.data
    }
  } catch {
    return null
  }
}

export async function runXpertRuntimeControlTransport(
  input: RuntimeControlTransportInput | RuntimeControlTransportLooseInput
): Promise<RuntimeControlTransportResult> {
  const conversationId = asNonEmptyString(input.conversationId)
  if (!conversationId) {
    throw new Error('Runtime control transport requires a conversationId.')
  }

  const body = buildXpertRuntimeControlRequestBody({
    ...input,
    conversationId
  } as RuntimeControlRequestInput)

  const envelopes: RuntimeControlEventEnvelope[] = []

  await runSseTransport<RuntimeControlEventEnvelope>({
    url: NATIVE_CHAT_RUNTIME_CONTROL_INGRESS,
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
      ...buildAuthHeaders(),
      ...buildRequestContextHeaders()
    },
    body,
    signal: input.signal,
    maxAttempts: input.maxAttempts ?? 1,
    expectedContentType: 'text/event-stream',
    onUnauthorized: input.onUnauthorized,
    fetchImpl: input.fetchImpl,
    fetchEventSourceImpl: input.fetchEventSourceImpl,
    parseEventBlock: parseRuntimeControlEnvelope,
    onEvent: envelope => {
      envelopes.push(envelope)
    }
  })

  return {
    conversationId,
    envelopes,
    transportCompleted: true
  }
}
