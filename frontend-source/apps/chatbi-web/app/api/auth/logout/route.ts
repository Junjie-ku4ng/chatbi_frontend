import { NextResponse } from 'next/server'
import { getAccessCookieName, getCredentialCookieName, shouldUseSecureCookies } from '@/modules/auth/server-session'

const API_VERSION = 'v1'

export async function POST() {
  const response = NextResponse.json({
    apiVersion: API_VERSION,
    data: {
      ok: true
    }
  })
  response.cookies.set(getAccessCookieName(), '', {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
  response.cookies.set(getCredentialCookieName(), '', {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
  return response
}
