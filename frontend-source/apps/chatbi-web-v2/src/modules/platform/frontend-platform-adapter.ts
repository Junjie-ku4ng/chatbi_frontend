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
  frontendPlatformRouteRegistry,
  frontendResourceAccessRegistry,
  resolveStoryItemPrefill
} from './frontend-platform-contract'

type PlatformResourceParams = Record<string, string | number>
type PlatformResource = (typeof frontendResourceAccessRegistry)[keyof typeof frontendResourceAccessRegistry]
type PlatformResourceId = PlatformResource['id']
type AskRuntimeEventEntries = Parameters<typeof groupAskRuntimeEvents>[0]

function fillPathTemplate(pathTemplate: string, params: PlatformResourceParams = {}) {
  return pathTemplate.replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Missing platform resource param: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

function getPlatformResourceAccess(id: PlatformResourceId | keyof typeof frontendResourceAccessRegistry) {
  if (id in frontendResourceAccessRegistry) {
    return frontendResourceAccessRegistry[id as keyof typeof frontendResourceAccessRegistry]
  }

  const match = Object.values(frontendResourceAccessRegistry).find(resource => resource.id === id)
  if (!match) {
    throw new Error(`Unknown platform resource access: ${String(id)}`)
  }
  return match
}

function buildPlatformResourceRequest(id: PlatformResourceId | keyof typeof frontendResourceAccessRegistry, params?: PlatformResourceParams) {
  const resource = getPlatformResourceAccess(id)
  return {
    id: resource.id,
    owner: resource.owner,
    track: resource.track,
    path: fillPathTemplate(resource.path, params)
  } as const
}

function resolveAskShellContract() {
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
  resources: {
    get: getPlatformResourceAccess,
    build: buildPlatformResourceRequest
  }
} as const
