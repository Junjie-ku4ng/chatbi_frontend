import { NextRequest, NextResponse } from 'next/server'
import {
  buildSessionFromToken,
  exchangeClientCredentials,
  getAccessCookieName,
  getCredentialCookieName,
  pickCredentialInput,
  resolveAuthMode,
  resolveRefreshContextTtlSeconds,
  sealCredentialContext,
  shouldUseSecureCookies,
  unsealCredentialContext
} from '@/modules/auth/server-session'

const API_VERSION = 'v1'

export async function POST(request: NextRequest) {
  if (resolveAuthMode() !== 'bearer') {
    return NextResponse.json(
      {
        message: 'refresh is only available in bearer mode'
      },
      { status: 400 }
    )
  }

  const sealedContext = request.cookies.get(getCredentialCookieName())?.value
  const fromCookie = unsealCredentialContext(sealedContext)
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  let credentials:
    | {
        clientId: string
        clientSecret: string
        scope?: string
      }
    | undefined
  if (fromCookie) {
    credentials = {
      clientId: fromCookie.clientId,
      clientSecret: fromCookie.clientSecret,
      scope: fromCookie.scope
    }
  } else {
    try {
      credentials = pickCredentialInput(body)
    } catch (error) {
      return NextResponse.json(
        {
          message: error instanceof Error ? error.message : 'missing refresh credentials'
        },
        { status: 401 }
      )
    }
  }

  try {
    const token = await exchangeClientCredentials(credentials)
    const response = NextResponse.json({
      apiVersion: API_VERSION,
      data: {
        session: buildSessionFromToken(token)
      }
    })
    response.cookies.set(getAccessCookieName(), token.accessToken, {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: token.expiresIn
    })
    response.cookies.set(
      getCredentialCookieName(),
      sealCredentialContext({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        scope: credentials.scope,
        createdAt: new Date().toISOString()
      }),
      {
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'lax',
        path: '/',
        maxAge: resolveRefreshContextTtlSeconds()
      }
    )
    return response
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'refresh failed'
      },
      { status: 401 }
    )
  }
}
