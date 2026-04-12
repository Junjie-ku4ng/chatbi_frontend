export type ApiAuthMode = 'dev_headers' | 'bearer'
export type ApiTrack = 'pa' | 'xpert'

const DEFAULT_API_BASE_URL = '/api/pa'
const XPERT_API_BASE_URL = '/api/xpert'
const DEFAULT_API_TRACK: ApiTrack = 'xpert'

function resolveAuthMode(): ApiAuthMode {
  const raw = process.env.NEXT_PUBLIC_AUTH_MODE
  return raw === 'bearer' ? 'bearer' : 'dev_headers'
}

export function resolveApiBaseUrl() {
  return resolveApiBaseUrlByTrack(resolveApiTrack())
}

export function resolveApiTrack(): ApiTrack {
  const raw = String(process.env.NEXT_PUBLIC_API_TRACK ?? '').trim().toLowerCase()
  if (raw === 'xpert') {
    return 'xpert'
  }
  return DEFAULT_API_TRACK
}

export function resolveApiBaseUrlByTrack(track: ApiTrack) {
  return track === 'xpert' ? XPERT_API_BASE_URL : DEFAULT_API_BASE_URL
}

export function buildAuthHeaders(): Record<string, string> {
  const mode = resolveAuthMode()
  if (mode === 'bearer') {
    return {}
  }

  return {
    'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'chatbi-web',
    'x-roles':
      process.env.NEXT_PUBLIC_DEV_ROLES ??
      'allow:model:*,allow:write:model:*,allow:cube:*,allow:indicator:*,allow:dimension:*,allow:data-source:*,allow:write:data-source:*,allow:source-model:*,allow:write:source-model:*'
  }
}

function normalizeTextHeader(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function resolveLanguageHeader() {
  const fromEnv = normalizeTextHeader(process.env.NEXT_PUBLIC_LANGUAGE)
  if (fromEnv) {
    return fromEnv
  }
  if (typeof navigator !== 'undefined') {
    const fromNavigator = normalizeTextHeader(navigator.language)
    if (fromNavigator) {
      return fromNavigator
    }
  }
  return 'en-US'
}

function resolveTimeZoneHeader() {
  const fromEnv = normalizeTextHeader(process.env.NEXT_PUBLIC_TIME_ZONE)
  if (fromEnv) {
    return fromEnv
  }
  try {
    const fromIntl = normalizeTextHeader(Intl.DateTimeFormat().resolvedOptions().timeZone)
    if (fromIntl) {
      return fromIntl
    }
  } catch {
    // fallback to UTC when Intl timezone is unavailable
  }
  return 'UTC'
}

export function buildRequestContextHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Language: resolveLanguageHeader(),
    'Time-Zone': resolveTimeZoneHeader()
  }

  const tenantId = normalizeTextHeader(process.env.NEXT_PUBLIC_DEV_TENANT)
  if (tenantId) {
    headers['Tenant-Id'] = tenantId
    headers['x-tenant-id'] = tenantId
  }

  const organizationId = normalizeTextHeader(
    process.env.NEXT_PUBLIC_DEV_ORGANIZATION_ID ?? process.env.NEXT_PUBLIC_ORGANIZATION_ID
  )
  if (organizationId) {
    headers['Organization-Id'] = organizationId
    headers['x-org-id'] = organizationId
  }

  return headers
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  track?: ApiTrack
}

export class ApiRequestError extends Error {
  status: number
  code?: string
  details?: unknown
  requestId?: string

  constructor(input: { message: string; status: number; code?: string; details?: unknown; requestId?: string }) {
    super(input.message)
    this.name = 'ApiRequestError'
    this.status = input.status
    this.code = input.code
    this.details = input.details
    this.requestId = input.requestId
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {})
  headers.set('content-type', 'application/json')
  for (const [key, value] of Object.entries(buildAuthHeaders())) {
    headers.set(key, value)
  }
  for (const [key, value] of Object.entries(buildRequestContextHeaders())) {
    headers.set(key, value)
  }

  const response = await fetch(`${resolveApiBaseUrlByTrack(options.track ?? resolveApiTrack())}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store'
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : `Request failed: ${response.status}`
    throw new ApiRequestError({
      message,
      status: response.status,
      code: typeof payload?.code === 'string' ? payload.code : undefined,
      details: payload?.details,
      requestId: response.headers.get('x-request-id') ?? undefined
    })
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

export type SemanticModelSummary = {
  id: string
  name: string
  cube?: string
  source?: string
  sourceType?: string
  runtime?: string
  connectorType?: string
  queryCapable?: boolean
  hasEmbedding?: boolean
  provider?: string
  providerType?: string
}

type ExclusionMatcher = (value: string) => boolean

function buildMatcher(pattern: string): ExclusionMatcher {
  const trimmed = pattern.trim()
  if (!trimmed) {
    return () => false
  }

  if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
    try {
      const compiled = new RegExp(trimmed.slice(1, -1), 'i')
      return value => compiled.test(value)
    } catch {
      // fallback to plain contains when regex is invalid
    }
  }

  return value => value.includes(trimmed.toLowerCase())
}

function readExcludePatterns(): ExclusionMatcher[] {
  const envPatterns = (process.env.NEXT_PUBLIC_ASK_EXCLUDE_MODEL_PATTERNS ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  const builtinPatterns = ['mock', 'demo', 'sample', '示例', 'sandbox', 'fake', 'dummy']
    .concat(envPatterns)

  return Array.from(
    new Set(builtinPatterns.map(item => item.toLowerCase()))
  ).map(item => buildMatcher(item))
}

function readCSVEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.toLowerCase())
}

function hasTruthyBooleanField(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return false
}

function normalizeTextField(item: unknown) {
  return typeof item === 'string' ? item.toLowerCase().trim() : ''
}

function toMatchText(item: SemanticModelSummary) {
  const name = item.name ?? ''
  const cube = item.cube ?? ''
  return `${item.id} ${name} ${cube}`.toLowerCase()
}

function isSourceAllowed(item: SemanticModelSummary, allowlist: string[]) {
  if (allowlist.length === 0) return true
  const sourceCandidates = [
    normalizeTextField(item.source),
    normalizeTextField(item.sourceType),
    normalizeTextField(item.runtime),
    normalizeTextField(item.connectorType),
    normalizeTextField(item.provider),
    normalizeTextField(item.providerType)
  ]
  return sourceCandidates.some(candidate => candidate && allowlist.includes(candidate))
}

function parseBooleanEnv(name: string, fallback = false) {
  if (process.env[name] === 'true') return true
  if (process.env[name] === 'false') return false
  return fallback
}

function isModelAllowedForChat(item: SemanticModelSummary) {
  const requireRuntimeChatbi = parseBooleanEnv('NEXT_PUBLIC_ASK_REQUIRE_RUNTIME_CHATBI', false)
  const requireQueryCapable = parseBooleanEnv('NEXT_PUBLIC_ASK_REQUIRE_QUERY_CAPABLE', false)
  const requireEmbeddingAware = parseBooleanEnv('NEXT_PUBLIC_ASK_REQUIRE_EMBEDDING_AWARE', false)
  const sourceFilter = readCSVEnv('NEXT_PUBLIC_ASK_MODEL_SOURCE_FILTER')

  if (!isSourceAllowed(item, sourceFilter)) {
    return false
  }
  if (requireRuntimeChatbi && item.runtime && item.runtime.toLowerCase() !== 'chatbi') {
    return false
  }
  if (requireQueryCapable && !hasTruthyBooleanField(item.queryCapable)) {
    return false
  }
  if (requireEmbeddingAware && !hasTruthyBooleanField(item.hasEmbedding)) {
    return false
  }
  return true
}

function isModelExcluded(item: SemanticModelSummary) {
  const matchText = toMatchText(item)
  const patterns = readExcludePatterns()
  return patterns.some(matcher => matcher(matchText))
}

function filterModels(items: SemanticModelSummary[]) {
  return items.filter(item => !isModelExcluded(item) && isModelAllowedForChat(item))
}

function asSemanticModelSummary(item: unknown): SemanticModelSummary | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null
  }
  const row = item as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : undefined
  const name =
    typeof row.name === 'string'
      ? row.name
      : typeof row.entity === 'string'
        ? row.entity
        : undefined
  if (!id || !name) {
    return null
  }
  return {
    id,
    name,
    cube: typeof row.cube === 'string' ? row.cube : undefined,
    source: typeof row.source === 'string' ? row.source : undefined,
    sourceType: typeof row.sourceType === 'string' ? row.sourceType : undefined,
    runtime: typeof row.runtime === 'string' ? row.runtime : undefined,
    connectorType: typeof row.connectorType === 'string' ? row.connectorType : undefined,
    queryCapable: typeof row.queryCapable === 'boolean' ? row.queryCapable : undefined,
    hasEmbedding: typeof row.hasEmbedding === 'boolean' ? row.hasEmbedding : undefined,
    provider: typeof row.provider === 'string' ? row.provider : undefined,
    providerType: typeof row.providerType === 'string' ? row.providerType : undefined
  }
}

function normalizeSemanticModels(input: unknown) {
  const rows =
    Array.isArray(input)
      ? input
      : input && typeof input === 'object' && Array.isArray((input as { items?: unknown[] }).items)
        ? ((input as { items: unknown[] }).items ?? [])
        : []
  return rows
    .map(row => asSemanticModelSummary(row))
    .filter((row): row is SemanticModelSummary => Boolean(row))
}

export async function listSemanticModels() {
  const allowlist = (process.env.NEXT_PUBLIC_ASK_MODEL_ALLOWLIST ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const includeTestModels = process.env.NEXT_PUBLIC_ASK_INCLUDE_TEST_MODELS === 'true'
  const query = new URLSearchParams()
  const runtime = String(process.env.NEXT_PUBLIC_ASK_MODEL_RUNTIME ?? '').trim()
  if (runtime) {
    query.set('runtime', runtime)
  }
  if (includeTestModels) {
    query.set('includeTestModels', 'true')
  }

  const filterAllowlist = (items: SemanticModelSummary[]) => {
    if (allowlist.length === 0) return items
    const allowed = new Set(allowlist)
    return items.filter(item => allowed.has(item.id))
  }

  const normalizedQuery = query.toString()
  try {
    const semanticModelsPayload = await apiRequest<unknown>(`/semantic-model${normalizedQuery ? `?${normalizedQuery}` : ''}`)
    const semanticModels = normalizeSemanticModels(semanticModelsPayload)
    if (semanticModels.length > 0) {
      return filterAllowlist(filterModels(semanticModels))
    }
  } catch {
    // fallback to legacy endpoints below
  }

  const legacyMyPayload = await apiRequest<unknown>(
    `/semantic-model/my?${new URLSearchParams({
      data: JSON.stringify({
        take: 200,
        skip: 0,
        order: {
          updatedAt: 'DESC'
        }
      })
    }).toString()}`
  )
  const legacyMyModels = normalizeSemanticModels(legacyMyPayload)
  if (legacyMyModels.length > 0) {
    return filterAllowlist(filterModels(legacyMyModels))
  }

  const legacyPayload = await apiRequest<unknown>('/semantic-model')
  return filterAllowlist(filterModels(normalizeSemanticModels(legacyPayload)))
}
