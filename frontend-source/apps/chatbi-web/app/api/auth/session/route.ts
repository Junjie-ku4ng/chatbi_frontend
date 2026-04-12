import { NextRequest, NextResponse } from 'next/server'
import {
  buildUnauthenticatedSession,
  decodeJwtExp,
  getAccessCookieName,
  isTokenExpired,
  resolveAuthMode
} from '@/modules/auth/server-session'
import type { AuthSession } from '@/modules/auth/types'

const API_VERSION = 'v1'

export async function GET(request: NextRequest) {
  const mode = resolveAuthMode()
  if (mode !== 'bearer') {
    return NextResponse.json({
      apiVersion: API_VERSION,
      data: {
        session: buildUnauthenticatedSession(mode)
      }
    })
  }

  const token = request.cookies.get(getAccessCookieName())?.value
  if (!token) {
    return NextResponse.json({
      apiVersion: API_VERSION,
      data: {
        session: buildUnauthenticatedSession(mode)
      }
    })
  }

  if (isTokenExpired(token)) {
    return NextResponse.json({
      apiVersion: API_VERSION,
      data: {
        session: buildUnauthenticatedSession(mode)
      }
    })
  }

  const exp = decodeJwtExp(token)
  const session: AuthSession = {
    mode,
    authenticated: true,
    authType: 'jwt',
    expiresAt: exp ? new Date(exp * 1000).toISOString() : undefined
  }
  return NextResponse.json({
    apiVersion: API_VERSION,
    data: { session }
  })
}
