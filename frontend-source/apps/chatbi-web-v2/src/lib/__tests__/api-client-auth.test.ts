import { afterEach, describe, expect, it } from 'vitest'
import { buildAuthHeaders, buildRequestContextHeaders } from '../api-client'

const envBackup = {
  authMode: process.env.NEXT_PUBLIC_AUTH_MODE,
  devUserId: process.env.NEXT_PUBLIC_DEV_USER_ID,
  devTenant: process.env.NEXT_PUBLIC_DEV_TENANT,
  devOrganizationId: process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID,
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
  language: process.env.NEXT_PUBLIC_LANGUAGE,
  timeZone: process.env.NEXT_PUBLIC_TIME_ZONE
}

afterEach(() => {
  process.env.NEXT_PUBLIC_AUTH_MODE = envBackup.authMode
  process.env.NEXT_PUBLIC_DEV_USER_ID = envBackup.devUserId
  process.env.NEXT_PUBLIC_DEV_TENANT = envBackup.devTenant
  process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID = envBackup.devOrganizationId
  process.env.NEXT_PUBLIC_ORGANIZATION_ID = envBackup.organizationId
  process.env.NEXT_PUBLIC_LANGUAGE = envBackup.language
  process.env.NEXT_PUBLIC_TIME_ZONE = envBackup.timeZone
})

describe('api-client dev auth harness defaults', () => {
  it('uses the canonical ask harness identity when dev auth env vars are absent', () => {
    delete process.env.NEXT_PUBLIC_AUTH_MODE
    delete process.env.NEXT_PUBLIC_DEV_USER_ID
    delete process.env.NEXT_PUBLIC_DEV_TENANT
    delete process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID
    delete process.env.NEXT_PUBLIC_ORGANIZATION_ID
    process.env.NEXT_PUBLIC_LANGUAGE = 'en-US'
    process.env.NEXT_PUBLIC_TIME_ZONE = 'Asia/Shanghai'

    expect(buildAuthHeaders()).toMatchObject({
      'x-user-id': '33333333-3333-4333-8333-333333333333'
    })

    expect(buildRequestContextHeaders()).toMatchObject({
      'Tenant-Id': '11111111-1111-4111-8111-111111111111',
      'x-tenant-id': '11111111-1111-4111-8111-111111111111',
      'Organization-Id': '22222222-2222-4222-8222-222222222222',
      'x-org-id': '22222222-2222-4222-8222-222222222222'
    })
  })
})
