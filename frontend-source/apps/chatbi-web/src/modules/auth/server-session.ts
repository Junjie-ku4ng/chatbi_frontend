import crypto from 'node:crypto'
import type { AuthMode, AuthSession } from './types'
import { resolvePaApiBaseUrlFromEnv } from '@/modules/shared/env/api-base'

export type OAuthTokenResult = {
  accessToken: string
  tokenType: string
  expiresIn: number
  scope: string
  serviceAccount?: {
    id?: string
    clientId?: string
    tenant?: string
  }
  requestId?: string
}

export type CredentialContext = {
  clientId: string
  clientSecret: string
  scope?: string
  createdAt: string
}

const ACCESS_COOKIE_NAME = 'chatbi_access_token'
const CREDENTIAL_COOKIE_NAME = 'chatbi_auth_ctx'
const DEFAULT_SESSION_TTL_SECONDS = 3600

export function resolveAuthMode(): AuthMode {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'bearer' ? 'bearer' : 'dev_headers'
}

export function resolvePaApiBaseUrl() {
  return resolvePaApiBaseUrlFromEnv(process.env)
}

export function getAccessCookieName() {
  return ACCESS_COOKIE_NAME
}

export function getCredentialCookieName() {
  return CREDENTIAL_COOKIE_NAME
}

export function decodeJwtExp(token: string) {
  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<string, unknown>
    const exp = Number(payload.exp)
    if (Number.isFinite(exp) && exp > 0) {
      return Math.floor(exp)
    }
    return null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const exp = decodeJwtExp(token)
  if (!exp) {
    return true
  }
  return nowSeconds >= exp
}

export function resolveSessionTtlSeconds() {
  const raw = Number(process.env.PA_WEB_AUTH_SESSION_TTL_SECONDS)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw)
  }
  return DEFAULT_SESSION_TTL_SECONDS
}

export function resolveRefreshContextTtlSeconds() {
  const raw = Number(process.env.PA_WEB_AUTH_REFRESH_CONTEXT_TTL_SECONDS)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw)
  }
  return 7 * 24 * 60 * 60
}

export function shouldUseSecureCookies() {
  return process.env.NODE_ENV === 'production'
}

export function resolveCookieSecret() {
  const configured = process.env.PA_WEB_AUTH_COOKIE_SECRET?.trim()
  if (configured && configured.length >= 16) {
    return configured
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PA_WEB_AUTH_COOKIE_SECRET must be configured in production')
  }
  return 'pa-chatbi-web-dev-cookie-secret'
}

export function shouldAllowDynamicCredentials() {
  if (process.env.PA_WEB_AUTH_ALLOW_DYNAMIC_CREDENTIALS === 'true') return true
  if (process.env.PA_WEB_AUTH_ALLOW_DYNAMIC_CREDENTIALS === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function resolveDefaultCredentials() {
  const clientId = normalizeText(process.env.PA_WEB_AUTH_CLIENT_ID)
  const clientSecret = normalizeText(process.env.PA_WEB_AUTH_CLIENT_SECRET)
  const scope = normalizeText(process.env.PA_WEB_AUTH_SCOPE)
  return {
    clientId,
    clientSecret,
    scope
  }
}

export function buildSessionFromToken(token: OAuthTokenResult): AuthSession {
  const exp = decodeJwtExp(token.accessToken)
  return {
    mode: 'bearer',
    authenticated: true,
    authType: 'service_account',
    serviceAccountId: token.serviceAccount?.id,
    tenant: token.serviceAccount?.tenant,
    scope: normalizeScope(token.scope),
    expiresAt: exp ? new Date(exp * 1000).toISOString() : undefined,
    requestId: token.requestId
  }
}

export function buildUnauthenticatedSession(mode: AuthMode): AuthSession {
  if (mode === 'dev_headers') {
    return {
      mode,
      authenticated: true,
      authType: 'dev',
      userId: process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'chatbi-web'
    }
  }
  return {
    mode,
    authenticated: false,
    authType: 'jwt'
  }
}

export async function exchangeClientCredentials(input: {
  clientId: string
  clientSecret: string
  scope?: string
}) {
  const requestId = crypto.randomUUID()
  const response = await fetch(`${resolvePaApiBaseUrl()}/auth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: input.clientId,
      client_secret: input.clientSecret,
      scope: input.scope
    }),
    cache: 'no-store'
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : 'Authentication failed'
    const error = new Error(message)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  const result = data as Record<string, unknown>
  const accessToken = normalizeText(result.accessToken)
  if (!accessToken) {
    throw new Error('token response missing accessToken')
  }
  const expiresInRaw = Number(result.expiresIn)
  const expiresIn = Number.isFinite(expiresInRaw) && expiresInRaw > 0 ? Math.floor(expiresInRaw) : resolveSessionTtlSeconds()
  return {
    accessToken,
    tokenType: normalizeText(result.tokenType) ?? 'Bearer',
    expiresIn,
    scope: normalizeText(result.scope) ?? '',
    serviceAccount: getServiceAccount(result.serviceAccount),
    requestId
  } satisfies OAuthTokenResult
}

export function sealCredentialContext(context: CredentialContext) {
  const key = crypto.createHash('sha256').update(resolveCookieSecret()).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const payload = Buffer.from(JSON.stringify(context), 'utf-8')
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function unsealCredentialContext(value?: string): CredentialContext | null {
  const raw = normalizeText(value)
  if (!raw) return null
  try {
    const blob = Buffer.from(raw, 'base64url')
    const iv = blob.subarray(0, 12)
    const tag = blob.subarray(12, 28)
    const encrypted = blob.subarray(28)
    const key = crypto.createHash('sha256').update(resolveCookieSecret()).digest()
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8')
    const parsed = JSON.parse(decrypted) as Record<string, unknown>
    const clientId = normalizeText(parsed.clientId)
    const clientSecret = normalizeText(parsed.clientSecret)
    if (!clientId || !clientSecret) {
      return null
    }
    return {
      clientId,
      clientSecret,
      scope: normalizeText(parsed.scope),
      createdAt: normalizeText(parsed.createdAt) ?? new Date().toISOString()
    }
  } catch {
    return null
  }
}

export function pickCredentialInput(body: Record<string, unknown>) {
  const providedClientId = normalizeText(body.clientId) ?? normalizeText(body.client_id)
  const providedClientSecret = normalizeText(body.clientSecret) ?? normalizeText(body.client_secret)
  const providedScope = normalizeText(body.scope)

  const defaults = resolveDefaultCredentials()
  if (providedClientId && providedClientSecret) {
    if (!shouldAllowDynamicCredentials()) {
      throw new Error('dynamic credentials are disabled')
    }
    return {
      clientId: providedClientId,
      clientSecret: providedClientSecret,
      scope: providedScope ?? defaults.scope
    }
  }

  if (!defaults.clientId || !defaults.clientSecret) {
    throw new Error('missing default machine credentials')
  }
  return {
    clientId: defaults.clientId,
    clientSecret: defaults.clientSecret,
    scope: providedScope ?? defaults.scope
  }
}

function normalizeScope(raw?: string) {
  if (!raw) return []
  return raw
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function getServiceAccount(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return {
    id: normalizeText(record.id),
    clientId: normalizeText(record.clientId),
    tenant: normalizeText(record.tenant)
  }
}
