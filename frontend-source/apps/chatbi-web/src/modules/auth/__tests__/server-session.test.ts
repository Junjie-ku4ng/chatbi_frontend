import { describe, expect, it } from 'vitest'
import { decodeJwtExp, isTokenExpired } from '@/modules/auth/server-session'

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature`
}

describe('server session token helpers', () => {
  it('decodes exp from jwt payload', () => {
    const token = buildJwt({ sub: 'sa_1', exp: 2000 })
    expect(decodeJwtExp(token)).toBe(2000)
  })

  it('treats malformed jwt as expired', () => {
    expect(isTokenExpired('not-a-token', 1000)).toBe(true)
  })

  it('marks token expired when exp is in the past', () => {
    const token = buildJwt({ exp: 1000 })
    expect(isTokenExpired(token, 1001)).toBe(true)
  })

  it('marks token active when exp is in the future', () => {
    const token = buildJwt({ exp: 5000 })
    expect(isTokenExpired(token, 3000)).toBe(false)
  })
})
