import { ApiRequestError } from '@/lib/api-client'
import type { AuthLoginResult, AuthSession } from './types'

async function authRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    },
    body: init.body,
    cache: 'no-store'
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiRequestError({
      message: typeof payload?.message === 'string' ? payload.message : `Request failed: ${response.status}`,
      status: response.status,
      code: typeof payload?.code === 'string' ? payload.code : undefined,
      details: payload?.details,
      requestId: response.headers.get('x-request-id') ?? undefined
    })
  }
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  return data as T
}

export async function login(input?: { clientId?: string; clientSecret?: string; scope?: string }) {
  return authRequest<AuthLoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input ?? {})
  })
}

export async function refreshSession() {
  return authRequest<AuthLoginResult>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export async function getSession() {
  const data = await authRequest<{ session: AuthSession }>('/api/auth/session')
  return data.session
}

export async function logout() {
  return authRequest<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({})
  })
}
