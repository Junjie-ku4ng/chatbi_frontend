import { NextRequest, NextResponse } from 'next/server'
import { getAccessCookieName, resolveAuthMode, resolvePaApiBaseUrl } from '@/modules/auth/server-session'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length'
])

async function proxy(request: NextRequest, params: { path: string[] }) {
  const authMode = resolveAuthMode()
  const search = request.nextUrl.search || ''
  const targetPath = params.path.join('/')
  const targetUrl = `${resolvePaApiBaseUrl()}/${targetPath}${search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  if (authMode === 'bearer') {
    const accessToken = request.cookies.get(getAccessCookieName())?.value
    if (!accessToken) {
      return NextResponse.json(
        {
          message: 'Authentication required'
        },
        { status: 401 }
      )
    }
    headers.set('authorization', `Bearer ${accessToken}`)
    headers.delete('x-user-id')
    headers.delete('x-roles')
    headers.delete('x-tenant')
  } else {
    headers.set('x-user-id', process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'chatbi-web')
    headers.set(
      'x-roles',
      process.env.NEXT_PUBLIC_DEV_ROLES ??
        'allow:model:*,allow:write:model:*,allow:cube:*,allow:indicator:*,allow:dimension:*'
    )
    if (process.env.NEXT_PUBLIC_DEV_TENANT) {
      headers.set('x-tenant', process.env.NEXT_PUBLIC_DEV_TENANT)
    }
  }

  const requestInit: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'manual'
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    requestInit.body = await request.arrayBuffer()
  }

  const upstream = await fetch(targetUrl, requestInit)
  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await context.params)
}
