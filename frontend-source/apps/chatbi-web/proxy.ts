import { NextRequest, NextResponse } from 'next/server'

const removedLegacyRoutePatterns = [
  /^\/ask(?:\/.*)?$/,
  /^\/chatbi(?:\/.*)?$/,
  /^\/insights(?:\/.*)?$/,
  /^\/semantic-model(?:\/.*)?$/,
  /^\/stories(?:\/.*)?$/,
  /^\/indicator-ops(?:\/.*)?$/,
  /^\/settings\/organizations(?:\/.*)?$/
]

function isRemovedLegacyRoute(pathname: string) {
  return removedLegacyRoutePatterns.some(pattern => pattern.test(pathname))
}

export function proxy(request: NextRequest) {
  if (isRemovedLegacyRoute(request.nextUrl.pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)']
}
