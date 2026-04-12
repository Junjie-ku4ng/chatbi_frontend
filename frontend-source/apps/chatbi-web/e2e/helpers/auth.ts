const e2eApiPort = Number(process.env.PA_API_PORT || '3100')

export const e2eApiBaseUrl = process.env.NEXT_PUBLIC_PA_API_BASE_URL || process.env.PA_API_BASE_URL || `http://127.0.0.1:${e2eApiPort}`
export const e2eWebBaseUrl = process.env.E2E_WEB_BASE_URL || 'http://127.0.0.1:3300'

export const e2eUserId = process.env.NEXT_PUBLIC_DEV_USER_ID || 'e2e-user'

export const e2eRoles =
  process.env.NEXT_PUBLIC_DEV_ROLES ||
  'allow:model:*,allow:write:model:*,allow:cube:*,allow:indicator:*,allow:dimension:*,allow:data-source:*,allow:write:data-source:*,allow:source-model:*,allow:write:source-model:*'

export const e2eTenant = process.env.NEXT_PUBLIC_DEV_TENANT || 'local'
export const e2eOrganizationId = process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID || 'local-org'

export function e2eAuthHeaders() {
  return {
    'x-user-id': e2eUserId,
    'x-roles': e2eRoles,
    'x-tenant': e2eTenant,
    'Tenant-Id': e2eTenant,
    'Organization-Id': e2eOrganizationId,
    'x-tenant-id': e2eTenant,
    'x-org-id': e2eOrganizationId,
    Language: 'en-US',
    'Time-Zone': 'UTC'
  }
}
