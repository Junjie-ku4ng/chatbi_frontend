import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInsight, listInsightVersions, listInsights } from '@/modules/insight/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('insight api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes insight search filters to the canonical insights endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listInsights('model-2', {
      q: 'sales',
      statuses: ['active', 'draft'],
      tags: ['monthly', 'revenue'],
      cursor: 40,
      limit: 20
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/insights')
    expect(parsed.searchParams.get('modelId')).toBe('model-2')
    expect(parsed.searchParams.get('q')).toBe('sales')
    expect(parsed.searchParams.get('statuses')).toBe('active,draft')
    expect(parsed.searchParams.get('tags')).toBe('monthly,revenue')
    expect(parsed.searchParams.get('cursor')).toBe('40')
    expect(parsed.searchParams.get('limit')).toBe('20')
  })

  it('targets the canonical insight versions endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listInsightVersions('insight-7', { limit: 10, offset: 5 })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/insights/insight-7/versions')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('offset')).toBe('5')
  })

  it('does not fall back to deprecated collection detail owners', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Insight not found' }),
      headers: new Headers()
    } as Response)

    const insight = await getInsight('insight-7')

    expect(insight.id).toBe('insight-7')
    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/insights/insight-7')
  })

  it('returns empty instead of a synthetic insight in strict mode when the detail is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Insight not found' }),
      headers: new Headers()
    } as Response)

    await expect(getInsight('insight-7', { fallbackToDefault: false })).resolves.toBeNull()
  })

  it('rethrows insight detail lookup failures in strict mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Insight lookup failed' }),
      headers: new Headers()
    } as Response)

    await expect(getInsight('insight-7', { fallbackToDefault: false })).rejects.toMatchObject({
      message: 'Insight lookup failed'
    })
  })
})
