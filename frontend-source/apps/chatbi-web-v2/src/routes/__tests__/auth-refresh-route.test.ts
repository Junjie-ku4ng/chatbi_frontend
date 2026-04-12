import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../../../app/api/auth/refresh/route'

const {
  buildSessionFromTokenMock,
  exchangeClientCredentialsMock,
  getAccessCookieNameMock,
  getCredentialCookieNameMock,
  pickCredentialInputMock,
  resolveAuthModeMock,
  resolveRefreshContextTtlSecondsMock,
  sealCredentialContextMock,
  shouldUseSecureCookiesMock,
  unsealCredentialContextMock
} = vi.hoisted(() => ({
  buildSessionFromTokenMock: vi.fn(),
  exchangeClientCredentialsMock: vi.fn(),
  getAccessCookieNameMock: vi.fn(),
  getCredentialCookieNameMock: vi.fn(),
  pickCredentialInputMock: vi.fn(),
  resolveAuthModeMock: vi.fn(),
  resolveRefreshContextTtlSecondsMock: vi.fn(),
  sealCredentialContextMock: vi.fn(),
  shouldUseSecureCookiesMock: vi.fn(),
  unsealCredentialContextMock: vi.fn()
}))

vi.mock('@/modules/auth/server-session', () => ({
  buildSessionFromToken: buildSessionFromTokenMock,
  exchangeClientCredentials: exchangeClientCredentialsMock,
  getAccessCookieName: getAccessCookieNameMock,
  getCredentialCookieName: getCredentialCookieNameMock,
  pickCredentialInput: pickCredentialInputMock,
  resolveAuthMode: resolveAuthModeMock,
  resolveRefreshContextTtlSeconds: resolveRefreshContextTtlSecondsMock,
  sealCredentialContext: sealCredentialContextMock,
  shouldUseSecureCookies: shouldUseSecureCookiesMock,
  unsealCredentialContext: unsealCredentialContextMock
}))

describe('v2 auth refresh route', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('returns a dev-mode response instead of 404 when bearer auth is disabled', async () => {
    resolveAuthModeMock.mockReturnValue('dev_headers')

    const response = await POST(
      new NextRequest('http://localhost:3400/api/auth/refresh', {
        method: 'POST'
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      message: 'refresh is only available in bearer mode'
    })
  })

  it('refreshes bearer credentials and sets cookies', async () => {
    resolveAuthModeMock.mockReturnValue('bearer')
    getCredentialCookieNameMock.mockReturnValue('chatbi_auth_ctx')
    getAccessCookieNameMock.mockReturnValue('chatbi_access_token')
    unsealCredentialContextMock.mockReturnValue(null)
    pickCredentialInputMock.mockReturnValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scope: 'scope-a'
    })
    exchangeClientCredentialsMock.mockResolvedValue({
      accessToken: 'token-1',
      expiresIn: 300,
      tokenType: 'Bearer',
      scope: 'scope-a'
    })
    buildSessionFromTokenMock.mockReturnValue({
      mode: 'bearer',
      authenticated: true
    })
    shouldUseSecureCookiesMock.mockReturnValue(false)
    sealCredentialContextMock.mockReturnValue('sealed')
    resolveRefreshContextTtlSecondsMock.mockReturnValue(1200)

    const response = await POST(
      new NextRequest('http://localhost:3400/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'scope-a'
        }),
        headers: {
          'content-type': 'application/json'
        }
      })
    )

    expect(response.status).toBe(200)
    expect(exchangeClientCredentialsMock).toHaveBeenCalledWith({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scope: 'scope-a'
    })
    expect(response.cookies.get('chatbi_access_token')?.value).toBe('token-1')
    expect(response.cookies.get('chatbi_auth_ctx')?.value).toBe('sealed')
  })
})
