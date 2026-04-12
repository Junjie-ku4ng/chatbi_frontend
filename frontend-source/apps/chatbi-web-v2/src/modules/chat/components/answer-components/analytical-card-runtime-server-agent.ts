'use client'

import { Observable, Subject, from, of } from 'rxjs'
import {
  buildAuthHeaders,
  buildRequestContextHeaders,
  resolveApiBaseUrlByTrack,
  type ApiTrack
} from '@/lib/api-client'
import {
  AgentStatusEnum,
  AgentType,
  type Agent,
  type AgentStatus,
  type DataSourceOptions
} from '@metad/ocap-core'

type RuntimeServerAgentOptions = {
  track?: ApiTrack
}

type RequestInput = {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
  catalog?: string
  table?: string
  statement?: string
  forceRefresh?: boolean
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

async function readResponsePayload(response: Response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof payload?.message === 'string' ? payload.message : `Request failed: ${response.status}`
    throw new Error(message)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data
  }

  return payload
}

function buildHeaders(input?: Record<string, string>) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(buildAuthHeaders())) {
    headers.set(key, value)
  }

  for (const [key, value] of Object.entries(buildRequestContextHeaders())) {
    headers.set(key, value)
  }

  for (const [key, value] of Object.entries(input ?? {})) {
    headers.set(key, value)
  }

  return headers
}

function normalizeMethod(value?: string) {
  return String(value ?? 'get').trim().toUpperCase()
}

export class AnalyticalCardRuntimeServerAgent implements Agent {
  readonly type = AgentType.Server

  readonly #errors = new Subject<unknown>()
  readonly #track: ApiTrack

  constructor(options: RuntimeServerAgentOptions = {}) {
    this.#track = options.track ?? 'xpert'
  }

  selectStatus(): Observable<AgentStatus | AgentStatusEnum> {
    return of(AgentStatusEnum.ONLINE)
  }

  selectError(): Observable<unknown> {
    return this.#errors.asObservable()
  }

  error(err: unknown): void {
    this.#errors.next(err)
  }

  _request(dataSource: DataSourceOptions, options: unknown): Observable<unknown> {
    return from(this.request(dataSource, options))
  }

  async request(dataSource: DataSourceOptions, options: unknown): Promise<unknown> {
    const request = asRecord(options) as RequestInput | undefined
    const method = normalizeMethod(request?.method)
    const baseUrl = resolveApiBaseUrlByTrack(this.#track)

    try {
      if (dataSource.type === 'XMLA') {
        const xmlaBody =
          typeof request?.body === 'string'
            ? { statement: request.body }
            : asRecord(request?.body) ?? { statement: String(request?.body ?? '') }

        const response = await fetch(
          `${baseUrl}/semantic-model/${encodeURIComponent(String(dataSource.id))}/xmla`,
          {
            method: 'POST',
            headers: (() => {
              const headers = buildHeaders(request?.headers)
              headers.set('content-type', 'application/json')
              return headers
            })(),
            body: JSON.stringify(xmlaBody),
            cache: 'no-store'
          }
        )

        return readResponsePayload(response)
      }

      if (dataSource.type === 'SQL') {
        const dataSourceId =
          typeof dataSource.settings?.dataSourceId === 'string' && dataSource.settings.dataSourceId.trim()
            ? dataSource.settings.dataSourceId.trim()
            : undefined

        if (!dataSourceId) {
          throw new Error('SQL runtime requires dataSourceId')
        }

        if (request?.url === 'schema') {
          const query = new URLSearchParams()
          if (request.catalog) query.set('catalog', request.catalog)
          if (request.table) query.set('table', request.table)
          if (request.statement) query.set('statement', request.statement)
          const response = await fetch(
            `${baseUrl}/data-source/${encodeURIComponent(dataSourceId)}/schema${
              query.toString() ? `?${query.toString()}` : ''
            }`,
            {
              method,
              headers: buildHeaders(request.headers),
              cache: 'no-store'
            }
          )
          return readResponsePayload(response)
        }

        if (request?.url === 'catalogs') {
          const response = await fetch(
            `${baseUrl}/data-source/${encodeURIComponent(dataSourceId)}/catalogs`,
            {
              method,
              headers: buildHeaders(request.headers),
              cache: 'no-store'
            }
          )
          return readResponsePayload(response)
        }

        if (request?.url === 'query') {
          const response = await fetch(
            `${baseUrl}/semantic-model/${encodeURIComponent(String(dataSource.id))}/query`,
            {
              method: 'POST',
              headers: (() => {
                const headers = buildHeaders(request.headers)
                headers.set('content-type', 'application/json')
                return headers
              })(),
              body: JSON.stringify(request.body ?? {}),
              cache: 'no-store'
            }
          )
          return readResponsePayload(response)
        }
      }

      throw new Error(`Unsupported analytical-card runtime request: ${String(request?.url ?? dataSource.type)}`)
    } catch (error) {
      this.error(error)
      throw error
    }
  }
}
