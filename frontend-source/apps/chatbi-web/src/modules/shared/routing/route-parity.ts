export type RouteParityReleaseMode = 'dual' | 'canonical'

export type RouteParityEntry = {
  canonicalPath: string
  aliasPaths: string[]
}

export const defaultRouteParityReleaseMode: RouteParityReleaseMode = 'canonical'

export const routeParityRegistry: RouteParityEntry[] = []

function normalizePathname(pathname: string) {
  if (!pathname) {
    return '/'
  }
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1)
  }
  return normalized
}

export function resolveCanonicalPath(pathname: string) {
  return normalizePathname(pathname)
}

export function resolveAliasPath(pathname: string) {
  return normalizePathname(pathname)
}

export function resolveRouteParityReleaseMode(rawMode = process.env.NEXT_PUBLIC_ROUTE_PARITY_RELEASE_MODE) {
  void rawMode
  return defaultRouteParityReleaseMode
}
