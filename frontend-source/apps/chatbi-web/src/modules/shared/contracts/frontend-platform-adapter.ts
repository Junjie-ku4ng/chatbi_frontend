import {
  formatAskRuntimeEventClock,
  formatAskRuntimeEventLabel,
  groupAskRuntimeEvents,
  resolveAskRuntimeEventGroup,
  resolveAskRuntimeEventTone
} from './ask-runtime-event-contract'
import {
  buildAskHref,
  frontendContractAnchors,
  frontendHandoffKeys,
  frontendPlatformRouteMatrix,
  frontendPlatformRouteRegistry,
  frontendResourceAccessMatrix,
  resolveStoryItemPrefill
} from './frontend-platform-contract'

type PlatformRouteSurface = (typeof frontendPlatformRouteMatrix)[number]
type PlatformRouteSurfaceId = PlatformRouteSurface['id']
type PlatformResourceAccess = (typeof frontendResourceAccessMatrix)[number]
type PlatformResourceAccessId = PlatformResourceAccess['id']
type PlatformResourceParams = Record<string, string | number>
type AskRuntimeEventEntries = Parameters<typeof groupAskRuntimeEvents>[0]

function invariant<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message)
  }
  return value
}

function fillPathTemplate(pathTemplate: string, params: PlatformResourceParams = {}) {
  return pathTemplate.replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Missing platform resource param: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

export function getPlatformRouteSurface(id: PlatformRouteSurfaceId) {
  return invariant(
    frontendPlatformRouteMatrix.find(surface => surface.id === id),
    `Unknown platform route surface: ${id}`
  )
}

export function getPlatformResourceAccess(id: PlatformResourceAccessId) {
  return invariant(
    frontendResourceAccessMatrix.find(resource => resource.id === id),
    `Unknown platform resource access: ${id}`
  )
}

export function buildPlatformResourceRequest(id: PlatformResourceAccessId, params?: PlatformResourceParams) {
  const resource = getPlatformResourceAccess(id)
  return {
    id: resource.id,
    owner: resource.owner,
    track: resource.track,
    path: fillPathTemplate(resource.path, params)
  } as const
}

export function resolveAskShellContract() {
  return {
    anchors: frontendContractAnchors,
    route: frontendPlatformRouteRegistry.askWorkspace,
    handoffKeys: frontendHandoffKeys
  } as const
}

export const frontendPlatformAdapter = {
  ask: {
    buildHref: buildAskHref,
    resolveShellContract: resolveAskShellContract,
    formatRuntimeEventLabel: formatAskRuntimeEventLabel,
    formatRuntimeEventClock: formatAskRuntimeEventClock,
    resolveRuntimeEventTone: resolveAskRuntimeEventTone,
    resolveRuntimeEventGroup: resolveAskRuntimeEventGroup,
    groupRuntimeEvents: (entries: AskRuntimeEventEntries, limit?: number) => groupAskRuntimeEvents(entries, limit)
  },
  story: {
    resolveItemPrefill: resolveStoryItemPrefill
  },
  routes: {
    get: getPlatformRouteSurface
  },
  resources: {
    get: getPlatformResourceAccess,
    build: buildPlatformResourceRequest
  }
} as const
