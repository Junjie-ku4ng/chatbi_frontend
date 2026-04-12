import { NextRequest, NextResponse } from 'next/server'
import {
  buildSessionFromToken,
  buildUnauthenticatedSession,
  exchangeClientCredentials,
  getAccessCookieName,
  getCredentialCookieName,
  pickCredentialInput,
  resolveAuthMode,
  resolveRefreshContextTtlSeconds,
  sealCredentialContext,
  shouldUseSecureCookies
} from '@/modules/auth/server-session'

const API_VERSION = 'v1'

export async function POST(request: NextRequest) {
  const mode = resolveAuthMode()
  if (mode !== 'bearer') {
    return NextResponse.json({
      apiVersion: API_VERSION,
      data: {
        session: buildUnauthenticatedSession(mode)
      }
    })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  let credentialInput
  try {
    credentialInput = pickCredentialInput(body)
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Invalid credential payload'
      },
      { status: 400 }
    )
  }

  try {
    const token = await exchangeClientCredentials(credentialInput)
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
        clientId: credentialInput.clientId,
        clientSecret: credentialInput.clientSecret,
        scope: credentialInput.scope,
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
        message: error instanceof Error ? error.message : 'Authentication failed'
      },
      { status: 401 }
    )
  }
}
