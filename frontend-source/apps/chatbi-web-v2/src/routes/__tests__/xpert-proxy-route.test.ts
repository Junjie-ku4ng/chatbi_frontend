import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../../../app/api/xpert/[...path]/route'

const {
  getAccessCookieNameMock,
  resolveAuthModeMock,
  resolvePaApiBaseUrlMock,
  resolveDevAuthHarnessOrganizationIdMock,
  resolveDevAuthHarnessRolesMock,
  resolveDevAuthHarnessTenantIdMock,
  resolveDevAuthHarnessUserIdMock
} = vi.hoisted(() => ({
  getAccessCookieNameMock: vi.fn(),
  resolveAuthModeMock: vi.fn(),
  resolvePaApiBaseUrlMock: vi.fn(),
  resolveDevAuthHarnessOrganizationIdMock: vi.fn(),
  resolveDevAuthHarnessRolesMock: vi.fn(),
  resolveDevAuthHarnessTenantIdMock: vi.fn(),
  resolveDevAuthHarnessUserIdMock: vi.fn()
}))

vi.mock('@/modules/auth/server-session', () => ({
  getAccessCookieName: getAccessCookieNameMock,
  resolveAuthMode: resolveAuthModeMock,
  resolvePaApiBaseUrl: resolvePaApiBaseUrlMock
}))

vi.mock('@/modules/auth/dev-auth-harness', () => ({
  resolveDevAuthHarnessOrganizationId: resolveDevAuthHarnessOrganizationIdMock,
  resolveDevAuthHarnessRoles: resolveDevAuthHarnessRolesMock,
  resolveDevAuthHarnessTenantId: resolveDevAuthHarnessTenantIdMock,
  resolveDevAuthHarnessUserId: resolveDevAuthHarnessUserIdMock
}))

describe('v2 xpert proxy route', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('proxies xpert chat requests through the canonical /api path', async () => {
    resolveAuthModeMock.mockReturnValue('dev_headers')
    resolvePaApiBaseUrlMock.mockReturnValue('http://localhost:3100')
    resolveDevAuthHarnessUserIdMock.mockReturnValue('dev-user')
    resolveDevAuthHarnessRolesMock.mockReturnValue('owner,admin')
    resolveDevAuthHarnessTenantIdMock.mockReturnValue('tenant-1')
    resolveDevAuthHarnessOrganizationIdMock.mockReturnValue('org-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('stream', {
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        }
      })
    )

    const request = new NextRequest('http://localhost:3400/api/xpert/chat', {
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
      headers: {
        'content-type': 'application/json'
      }
    })

    const response = await POST(request, {
      params: Promise.resolve({
        path: ['chat']
      })
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3100/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers)
      })
    )
    const upstreamHeaders = (vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as { headers?: Headers } | undefined)?.headers
    expect(upstreamHeaders?.get('x-user-id')).toBe('dev-user')
    expect(upstreamHeaders?.get('x-roles')).toBe('owner,admin')
    expect(upstreamHeaders?.get('x-tenant')).toBe('tenant-1')
    expect(upstreamHeaders?.get('Tenant-Id')).toBe('tenant-1')
    expect(upstreamHeaders?.get('x-tenant-id')).toBe('tenant-1')
    expect(upstreamHeaders?.get('Organization-Id')).toBe('org-1')
    expect(upstreamHeaders?.get('x-org-id')).toBe('org-1')
    expect(response.status).toBe(200)
  })

  it('falls back to the direct upstream path when the /api variant returns 404', async () => {
    resolveAuthModeMock.mockReturnValue('dev_headers')
    resolvePaApiBaseUrlMock.mockReturnValue('http://localhost:3100')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const request = new NextRequest('http://localhost:3400/api/xpert/custom/path', {
      method: 'GET'
    })

    const response = await POST(
      new NextRequest(request.url, { method: 'POST', body: '{}' }),
      {
        params: Promise.resolve({
          path: ['custom', 'path']
        })
      }
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3100/api/custom/path',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3100/custom/path',
      expect.objectContaining({ method: 'POST' })
    )
    expect(response.status).toBe(200)
  })

  it('serves deterministic mock SSE for /api/xpert/chat without hitting upstream fetch when mock mode is requested', async () => {
    resolveAuthModeMock.mockReturnValue('dev_headers')
    resolvePaApiBaseUrlMock.mockReturnValue('http://localhost:3100')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const request = new NextRequest('http://localhost:3400/api/xpert/chat', {
      method: 'POST',
      body: JSON.stringify({
        request: {
          input: {
            input: 'Show a monthly revenue chart for the current workspace.',
            files: []
          }
        }
      }),
      headers: {
        'content-type': 'application/json',
        'x-chatbi-mock-scenario': 'chart',
        'x-chatbi-mock-latency-ms': '0'
      }
    })

    const response = await POST(request, {
      params: Promise.resolve({
        path: ['chat']
      })
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    const payload = await response.text()
    expect(payload).toContain('"event":"on_conversation_start"')
    expect(payload).toContain('"event":"on_message_end"')
    expect(payload).toContain('"type":"message"')
    expect(payload).toContain('"type":"chart"')
  })
})
