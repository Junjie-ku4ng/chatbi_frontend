import { apiRequest, buildAuthHeaders } from '@/lib/api-client'

export type AccessRequirement = {
  scopes?: string[]
}

export type RbacCapabilities = {
  authType?: 'dev' | 'jwt' | 'service_account'
  tenant?: string
  userId?: string
  serviceAccountId?: string
  policyVersion?: string
  resolvedAt?: string
  grantedScopes?: string[]
  missingScopesHints?: string[]
  requestAccessUrl?: string
  scopes: {
    read: string[]
    write: string[]
    denyRead: string[]
    denyWrite: string[]
  }
}

export type ActionPermissionState = 'enabled' | 'disabled_missing_scope' | 'hidden'

export type ActionPermission = {
  state: ActionPermissionState
  reason?: string
  missingScopes?: string[]
  missingScopesHints?: string[]
  requestAccessUrl?: string
}

function normalizeRoles(raw: string | undefined) {
  if (!raw) return []
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function matchScope(required: string, actual: string) {
  const requiredParts = required.split(':')
  const actualParts = actual.split(':')
  const max = Math.max(requiredParts.length, actualParts.length)
  for (let index = 0; index < max; index += 1) {
    const left = requiredParts[index]
    const right = actualParts[index]
    if (left === '*' || right === '*') {
      continue
    }
    if (left !== right) {
      return false
    }
  }
  return true
}

function toAllowScope(scope: string) {
  return scope.startsWith('deny:') ? `allow:${scope.slice('deny:'.length)}` : scope
}

function isWriteScope(scope: string) {
  return scope.includes(':write:')
}

function parseRoleScopes(roles: string[]) {
  const parsed = {
    read: [] as string[],
    write: [] as string[],
    denyRead: [] as string[],
    denyWrite: [] as string[]
  }
  for (const role of roles) {
    if (!role.includes(':')) continue
    const normalized = role.trim()
    if (!normalized) continue
    const deny = normalized.startsWith('deny:')
    const write = isWriteScope(normalized)
    if (deny && write) {
      parsed.denyWrite.push(normalized)
    } else if (deny) {
      parsed.denyRead.push(normalized)
    } else if (write) {
      parsed.write.push(normalized)
    } else {
      parsed.read.push(normalized)
    }
  }
  return parsed
}

function defaultBearerCapabilities(): RbacCapabilities {
  return {
    authType: 'jwt',
    scopes: {
      read: [],
      write: [],
      denyRead: [],
      denyWrite: []
    }
  }
}

export function fallbackCapabilitiesFromHeaders(): RbacCapabilities {
  const authHeaders = buildAuthHeaders()
  if (process.env.NEXT_PUBLIC_AUTH_MODE === 'bearer') {
    return defaultBearerCapabilities()
  }
  const roles = normalizeRoles(authHeaders['x-roles'])
  const parsed = parseRoleScopes(roles)
  return {
    authType: 'dev',
    userId: authHeaders['x-user-id'],
    scopes: {
      read: parsed.read,
      write: parsed.write,
      denyRead: parsed.denyRead,
      denyWrite: parsed.denyWrite
    }
  }
}

export async function fetchRbacCapabilities() {
  return apiRequest<RbacCapabilities>('/auth/capabilities')
}

function hasRequiredScope(required: string, capabilities: RbacCapabilities) {
  const writeScope = isWriteScope(required)
  const allowScopes = writeScope ? capabilities.scopes.write : capabilities.scopes.read
  const denyScopes = writeScope ? capabilities.scopes.denyWrite : capabilities.scopes.denyRead

  const denied = denyScopes.some(scope => matchScope(required, toAllowScope(scope)))
  if (denied) {
    return false
  }
  return allowScopes.some(scope => matchScope(required, toAllowScope(scope)))
}

function findMissingScopes(requiredScopes: string[], capabilities: RbacCapabilities) {
  return requiredScopes.filter(required => !hasRequiredScope(required, capabilities))
}

export function hasAccess(requirement: AccessRequirement, capabilities?: RbacCapabilities) {
  if (!requirement.scopes || requirement.scopes.length === 0) {
    return true
  }
  const current = capabilities ?? fallbackCapabilitiesFromHeaders()
  return findMissingScopes(requirement.scopes, current).length === 0
}

export function resolveActionPermission(requirement: AccessRequirement, capabilities: RbacCapabilities): ActionPermission {
  if (!requirement.scopes || requirement.scopes.length === 0) {
    return { state: 'enabled' }
  }
  const missingScopes = findMissingScopes(requirement.scopes, capabilities)
  if (missingScopes.length === 0) {
    return { state: 'enabled' }
  }
  return {
    state: 'disabled_missing_scope',
    reason: accessDeniedMessage(missingScopes, capabilities.missingScopesHints, capabilities.requestAccessUrl),
    missingScopes,
    missingScopesHints: capabilities.missingScopesHints,
    requestAccessUrl: capabilities.requestAccessUrl
  }
}

export function accessDeniedMessage(scopes?: string[], hints?: string[], requestAccessUrl?: string) {
  const hintText = Array.isArray(hints) && hints.length > 0 ? ` Hints: ${hints.join(' ')}` : ''
  const requestText = requestAccessUrl ? ` Request access: ${requestAccessUrl}` : ''
  if (!scopes || scopes.length === 0) {
    return `Access denied. Contact your platform administrator to request missing scopes.${hintText}${requestText}`
  }
  return `Missing required scopes: ${scopes.join(', ')}.${hintText}${requestText}`
}
