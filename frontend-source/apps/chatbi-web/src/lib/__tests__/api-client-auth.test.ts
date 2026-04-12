import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildAuthHeaders, buildRequestContextHeaders } from '@/lib/api-client'

const envBackup = {
  authMode: process.env.NEXT_PUBLIC_AUTH_MODE,
  bearerToken: process.env.NEXT_PUBLIC_AUTH_BEARER_TOKEN,
  devUserId: process.env.NEXT_PUBLIC_DEV_USER_ID,
  devRoles: process.env.NEXT_PUBLIC_DEV_ROLES,
  devTenant: process.env.NEXT_PUBLIC_DEV_TENANT,
  devOrganizationId: process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID,
  language: process.env.NEXT_PUBLIC_LANGUAGE,
  timeZone: process.env.NEXT_PUBLIC_TIME_ZONE
}

describe('api-client auth headers', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'dev_headers'
    process.env.NEXT_PUBLIC_DEV_USER_ID = 'dev-user'
    process.env.NEXT_PUBLIC_DEV_ROLES = 'allow:model:*'
    process.env.NEXT_PUBLIC_AUTH_BEARER_TOKEN = ''
    process.env.NEXT_PUBLIC_DEV_TENANT = ''
    process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID = ''
    process.env.NEXT_PUBLIC_LANGUAGE = ''
    process.env.NEXT_PUBLIC_TIME_ZONE = ''
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_AUTH_MODE = envBackup.authMode
    process.env.NEXT_PUBLIC_AUTH_BEARER_TOKEN = envBackup.bearerToken
    process.env.NEXT_PUBLIC_DEV_USER_ID = envBackup.devUserId
    process.env.NEXT_PUBLIC_DEV_ROLES = envBackup.devRoles
    process.env.NEXT_PUBLIC_DEV_TENANT = envBackup.devTenant
    process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID = envBackup.devOrganizationId
    process.env.NEXT_PUBLIC_LANGUAGE = envBackup.language
    process.env.NEXT_PUBLIC_TIME_ZONE = envBackup.timeZone
  })

  it('returns dev headers in dev_headers mode', () => {
    const headers = buildAuthHeaders()
    expect(headers).toEqual({
      'x-user-id': 'dev-user',
      'x-roles': 'allow:model:*'
    })
  })

  it('does not read NEXT_PUBLIC_AUTH_BEARER_TOKEN in bearer mode', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'bearer'
    process.env.NEXT_PUBLIC_AUTH_BEARER_TOKEN = 'secret-token'
    expect(buildAuthHeaders()).toEqual({})
  })

  it('builds language/time-zone context headers with env fallback', () => {
    process.env.NEXT_PUBLIC_LANGUAGE = 'zh-CN'
    process.env.NEXT_PUBLIC_TIME_ZONE = 'Asia/Shanghai'

    expect(buildRequestContextHeaders()).toMatchObject({
      Language: 'zh-CN',
      'Time-Zone': 'Asia/Shanghai'
    })
  })

  it('adds tenant and organization headers when configured', () => {
    process.env.NEXT_PUBLIC_LANGUAGE = 'en-US'
    process.env.NEXT_PUBLIC_TIME_ZONE = 'UTC'
    process.env.NEXT_PUBLIC_DEV_TENANT = 'tenant-dev'
    process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID = 'org-dev'

    expect(buildRequestContextHeaders()).toEqual({
      Language: 'en-US',
      'Time-Zone': 'UTC',
      'Tenant-Id': 'tenant-dev',
      'Organization-Id': 'org-dev',
      'x-tenant-id': 'tenant-dev',
      'x-org-id': 'org-dev'
    })
  })
})
