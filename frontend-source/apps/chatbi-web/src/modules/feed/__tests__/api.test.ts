import { afterEach, describe, expect, it, vi } from 'vitest'
import { batchReadFeedEvents, getFeedUnreadSummary, listFeed, markFeedEventRead } from '@/modules/feed/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

function mockJsonErrorResponse(status: number, payload: unknown) {
  return {
    ok: false,
    status,
    json: async () => payload,
    headers: new Headers()
  } as Response
}

describe('feed api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests unread summary by model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { modelId: '100', readerId: 'u1', unreadCount: 3 }
      })
    )

    await getFeedUnreadSummary('100')

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/feeds/unread-summary')
    expect(parsed.searchParams.get('modelId')).toBe('100')
  })

  it('lists feed through the canonical feeds endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listFeed('100', {
      eventType: 'story_published',
      resourceType: 'story',
      q: 'weekly',
      limit: 10,
      offset: 20
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/feeds')
    expect(parsed.searchParams.get('modelId')).toBe('100')
    expect(parsed.searchParams.get('eventType')).toBe('story_published')
    expect(parsed.searchParams.get('resourceType')).toBe('story')
    expect(parsed.searchParams.get('q')).toBe('weekly')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('offset')).toBe('20')
  })

  it('marks feed event as read with model binding', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { ok: true, read: { id: '1', eventId: '11', modelId: '100', readerId: 'u1', readAt: new Date().toISOString() } }
      })
    )

    await markFeedEventRead('11', {
      modelId: '100'
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/feeds/events/11/read')
    const payload = JSON.parse(String(options?.body))
    expect(payload.modelId).toBe('100')
  })

  it('does not fall back to the removed legacy feed event update route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonErrorResponse(404, { message: 'not found' }))

    await expect(
      markFeedEventRead('11', {
        modelId: '100'
      })
    ).rejects.toThrow()

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/feeds/events/11/read')
  })

  it('serializes batch-read payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          ok: true,
          summary: {
            total: 2,
            succeeded: 2,
            failed: 0
          },
          items: [
            { eventId: '1', status: 'read' },
            { eventId: '2', status: 'read' }
          ]
        }
      })
    )

    await batchReadFeedEvents({
      modelId: '100',
      eventIds: ['1', '2']
    })

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/feeds/events/batch-read')
    const payload = JSON.parse(String(options?.body))
    expect(payload.modelId).toBe('100')
    expect(payload.eventIds).toEqual(['1', '2'])
  })
})
