import { describe, expect, it } from 'vitest'
import { resolvePaApiBaseUrlFromEnv } from '@/modules/shared/env/api-base'

describe('resolvePaApiBaseUrlFromEnv', () => {
  it('uses PA_API_BASE_URL when provided', () => {
    expect(
      resolvePaApiBaseUrlFromEnv({
        PA_API_BASE_URL: 'http://127.0.0.1:4000',
        NEXT_PUBLIC_PA_API_BASE_URL: 'http://127.0.0.1:5000'
      })
    ).toBe('http://127.0.0.1:4000')
  })

  it('falls back to NEXT_PUBLIC_PA_API_BASE_URL', () => {
    expect(
      resolvePaApiBaseUrlFromEnv({
        NEXT_PUBLIC_PA_API_BASE_URL: 'http://127.0.0.1:5000'
      })
    ).toBe('http://127.0.0.1:5000')
  })

  it('uses localhost:3000 as default', () => {
    expect(resolvePaApiBaseUrlFromEnv({})).toBe('http://localhost:3000')
  })
})
