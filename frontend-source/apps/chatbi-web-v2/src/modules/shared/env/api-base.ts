export const DEFAULT_PA_API_BASE_URL = 'http://localhost:3000'

type ApiBaseEnv = {
  [key: string]: string | undefined
}

function normalizeEnvValue(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function resolvePaApiBaseUrlFromEnv(env: ApiBaseEnv = process.env as ApiBaseEnv) {
  return normalizeEnvValue(env.PA_API_BASE_URL) || normalizeEnvValue(env.NEXT_PUBLIC_PA_API_BASE_URL) || DEFAULT_PA_API_BASE_URL
}
