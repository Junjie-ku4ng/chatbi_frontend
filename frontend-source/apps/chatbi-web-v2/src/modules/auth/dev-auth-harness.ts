type DevAuthEnv = NodeJS.ProcessEnv

export const DEFAULT_DEV_AUTH_HARNESS_USER_ID = '33333333-3333-4333-8333-333333333333'
export const DEFAULT_DEV_AUTH_HARNESS_TENANT_ID = '11111111-1111-4111-8111-111111111111'
export const DEFAULT_DEV_AUTH_HARNESS_ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222'
export const DEFAULT_DEV_AUTH_HARNESS_ROLES =
  'allow:model:*,allow:write:model:*,allow:cube:*,allow:indicator:*,allow:dimension:*,allow:data-source:*,allow:write:data-source:*,allow:source-model:*,allow:write:source-model:*'

function normalizeEnvValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function shouldUseHarnessDefaults(env: DevAuthEnv) {
  return env.NODE_ENV !== 'production'
}

export function resolveDevAuthHarnessUserId(env: DevAuthEnv = process.env) {
  const explicit = normalizeEnvValue(env.NEXT_PUBLIC_DEV_USER_ID)
  if (explicit) {
    return explicit
  }
  return shouldUseHarnessDefaults(env) ? DEFAULT_DEV_AUTH_HARNESS_USER_ID : undefined
}

export function resolveDevAuthHarnessTenantId(env: DevAuthEnv = process.env) {
  const explicit = normalizeEnvValue(env.NEXT_PUBLIC_DEV_TENANT)
  if (explicit) {
    return explicit
  }
  return shouldUseHarnessDefaults(env) ? DEFAULT_DEV_AUTH_HARNESS_TENANT_ID : undefined
}

export function resolveDevAuthHarnessOrganizationId(env: DevAuthEnv = process.env) {
  const explicit = normalizeEnvValue(env.NEXT_PUBLIC_DEV_ORGANIZATION_ID ?? env.NEXT_PUBLIC_ORGANIZATION_ID)
  if (explicit) {
    return explicit
  }
  return shouldUseHarnessDefaults(env) ? DEFAULT_DEV_AUTH_HARNESS_ORGANIZATION_ID : undefined
}

export function resolveDevAuthHarnessRoles(env: DevAuthEnv = process.env) {
  return normalizeEnvValue(env.NEXT_PUBLIC_DEV_ROLES) ?? DEFAULT_DEV_AUTH_HARNESS_ROLES
}
