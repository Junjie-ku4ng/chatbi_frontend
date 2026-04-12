import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackCapabilitiesFromHeaders, hasAccess, resolveActionPermission, RbacCapabilities } from '@/modules/shared/rbac/access'

describe('rbac access', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
    vi.restoreAllMocks()
  })

  it('evaluates required scopes against capabilities', () => {
    const capabilities: RbacCapabilities = {
      authType: 'dev',
      scopes: {
        read: ['allow:model:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
    expect(hasAccess({ scopes: ['allow:model:100'] }, capabilities)).toBe(true)
    expect(hasAccess({ scopes: ['allow:write:model:100'] }, capabilities)).toBe(true)
    expect(hasAccess({ scopes: ['allow:indicator:*'] }, capabilities)).toBe(false)
  })

  it('returns disabled action state with missing scope reason', () => {
    const permission = resolveActionPermission(
      { scopes: ['allow:write:model:100'] },
      {
        authType: 'dev',
        scopes: {
          read: ['allow:model:*'],
          write: [],
          denyRead: [],
          denyWrite: []
        }
      }
    )
    expect(permission.state).toBe('disabled_missing_scope')
    expect(permission.reason).toContain('allow:write:model:100')
  })

  it('builds fallback capabilities from dev role headers', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'dev_headers'
    process.env.NEXT_PUBLIC_DEV_ROLES = 'allow:model:*,allow:write:model:*,deny:model:secret'
    const fallback = fallbackCapabilitiesFromHeaders()
    expect(fallback.authType).toBe('dev')
    expect(fallback.scopes.read).toContain('allow:model:*')
    expect(fallback.scopes.write).toContain('allow:write:model:*')
    expect(fallback.scopes.denyRead).toContain('deny:model:secret')
  })
})
