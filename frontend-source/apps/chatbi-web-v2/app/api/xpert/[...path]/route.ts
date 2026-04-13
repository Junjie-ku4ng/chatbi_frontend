import { NextRequest, NextResponse } from 'next/server'
import { getAccessCookieName, resolveAuthMode, resolvePaApiBaseUrl } from '@/modules/auth/server-session'
import {
  resolveDevAuthHarnessOrganizationId,
  resolveDevAuthHarnessRoles,
  resolveDevAuthHarnessTenantId,
  resolveDevAuthHarnessUserId
} from '@/modules/auth/dev-auth-harness'
import { createDeterministicMockXpertChatResponse } from '@/modules/chat/mock/xpert-chat-mock-stream'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length'
])

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function parseJsonBody(body: ArrayBuffer | undefined) {
  if (!body || body.byteLength === 0) {
    return undefined
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function readQuestionFromMockBody(body: ArrayBuffer | undefined) {
  const payload = parseJsonBody(body)
  const request = payload?.request && typeof payload.request === 'object' ? payload.request as Record<string, unknown> : undefined
  const input = request?.input && typeof request.input === 'object' ? request.input as Record<string, unknown> : undefined
  return normalizeText(input?.input) ?? normalizeText(payload?.question)
}

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  })
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function isMockChatId(value: unknown) {
  return typeof value === 'string' && (value.startsWith('conv-sse-') || value.startsWith('msg-sse-'))
}

function readFeedbackQuery(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('data')
  if (!raw) {
    return undefined
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function isMockFeedbackLookup(request: NextRequest) {
  const query = readFeedbackQuery(request)
  const where = asRecord(query?.where)
  return isMockChatId(where?.conversationId) || isMockChatId(where?.messageId)
}

function isMockFeedbackBody(body: ArrayBuffer | undefined) {
  const payload = parseJsonBody(body)
  return isMockChatId(payload?.conversationId) || isMockChatId(payload?.messageId)
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const authMode = resolveAuthMode()
  const search = request.nextUrl.search || ''
  const targetPath = params.path.join('/')
  const targetBaseUrl = resolvePaApiBaseUrl().replace(/\/+$/, '')
  const targetCandidates = [`${targetBaseUrl}/api/${targetPath}${search}`, `${targetBaseUrl}/${targetPath}${search}`]
  const requestBody = request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined

  const headers = new Headers(request.headers)
  headers.delete('host')

  const mockScenario = normalizeText(headers.get('x-chatbi-mock-scenario'))
  if (request.method === 'POST' && targetPath === 'chat' && mockScenario) {
    const latencyMs = Number(headers.get('x-chatbi-mock-latency-ms'))
    return createDeterministicMockXpertChatResponse({
      scenario: mockScenario,
      question: readQuestionFromMockBody(requestBody),
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : undefined
    })
  }

  if (targetPath === 'chat-message-feedback/my' && request.method === 'GET' && isMockFeedbackLookup(request)) {
    return jsonResponse({ items: [], total: 0 })
  }

  if (targetPath === 'chat-message-feedback' && request.method === 'POST' && isMockFeedbackBody(requestBody)) {
    const payload = parseJsonBody(requestBody) ?? {}
    return jsonResponse(
      {
        id: `feedback-${normalizeText(payload.messageId) ?? 'sse'}`,
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        rating: payload.rating,
        createdAt: new Date().toISOString()
      },
      201
    )
  }

  if (targetPath.startsWith('chat-message-feedback/') && request.method === 'DELETE') {
    const feedbackId = targetPath.split('/').at(-1)
    if (feedbackId?.startsWith('feedback-msg-sse-')) {
      return jsonResponse({ ok: true })
    }
  }

  if (authMode === 'bearer') {
    const accessToken = request.cookies.get(getAccessCookieName())?.value
    if (!accessToken) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }
    headers.set('authorization', `Bearer ${accessToken}`)
    headers.delete('x-user-id')
    headers.delete('x-roles')
    headers.delete('x-tenant')
  } else {
    headers.set('x-user-id', resolveDevAuthHarnessUserId() ?? 'chatbi-web-v2')
    headers.set('x-roles', resolveDevAuthHarnessRoles())
    const tenantId = resolveDevAuthHarnessTenantId()
    if (tenantId) {
      headers.set('x-tenant', tenantId)
      headers.set('Tenant-Id', tenantId)
      headers.set('x-tenant-id', tenantId)
    }
    const organizationId = resolveDevAuthHarnessOrganizationId()
    if (organizationId) {
      headers.set('Organization-Id', organizationId)
      headers.set('x-org-id', organizationId)
    }
  }

  for (let index = 0; index < targetCandidates.length; index += 1) {
    const upstream = await fetch(targetCandidates[index], {
      method: request.method,
      headers,
      cache: 'no-store',
      redirect: 'manual',
      body: requestBody
    })
    if (index === 0 && upstream.status === 404) {
      continue
    }
    const responseHeaders = new Headers()
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    })
  }

  return NextResponse.json({ message: 'Not Found' }, { status: 404 })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}
