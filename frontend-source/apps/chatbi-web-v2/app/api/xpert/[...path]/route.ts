import { NextRequest, NextResponse } from 'next/server'
import { getAccessCookieName, resolveAuthMode, resolvePaApiBaseUrl } from '@/modules/auth/server-session'
import {
  resolveDevAuthHarnessOrganizationId,
  resolveDevAuthHarnessRoles,
  resolveDevAuthHarnessTenantId,
  resolveDevAuthHarnessUserId
} from '@/modules/auth/dev-auth-harness'

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
  const targetBaseUrl = resolvePaApiBaseUrl().replace(/\/+$/, '')
  const targetCandidates = [`${targetBaseUrl}/api/${targetPath}${search}`, `${targetBaseUrl}/${targetPath}${search}`]

  const headers = new Headers(request.headers)
  headers.delete('host')

  if (authMode === 'bearer') {
    const accessToken = request.cookies.get(getAccessCookieName())?.value
    if (!accessToken) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }
    headers.set('authorization', `Bearer ${accessToken}`)
    headers.delete('x-user-id')
    headers.delete('x-roles')
    headers.delete('x-tenant')
  } else {
    headers.set('x-user-id', resolveDevAuthHarnessUserId() ?? 'chatbi-web-v2')
    headers.set('x-roles', resolveDevAuthHarnessRoles())
    const tenantId = resolveDevAuthHarnessTenantId()
    if (tenantId) {
      headers.set('x-tenant', tenantId)
      headers.set('Tenant-Id', tenantId)
      headers.set('x-tenant-id', tenantId)
    }
    const organizationId = resolveDevAuthHarnessOrganizationId()
    if (organizationId) {
      headers.set('Organization-Id', organizationId)
      headers.set('x-org-id', organizationId)
    }
  }

  const requestBody = request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined

  for (let index = 0; index < targetCandidates.length; index += 1) {
    const upstream = await fetch(targetCandidates[index], {
      method: request.method,
      headers,
      cache: 'no-store',
      redirect: 'manual',
      body: requestBody
    })
    if (index === 0 && upstream.status === 404) {
      continue
    }
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

  return NextResponse.json({ message: 'Not Found' }, { status: 404 })
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
