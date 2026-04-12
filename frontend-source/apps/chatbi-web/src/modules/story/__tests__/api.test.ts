import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addStoryWidget,
  cloneStory,
  createStory,
  getStory,
  getPublicStory,
  getStoryDesignerState,
  listStoryTemplates,
  listStoryVersions,
  promoteStoryTemplate,
  reorderStoryWidgetsBatch
} from '@/modules/story/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('story api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes clone payload to canonical stories clone endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          story: {
            id: '101',
            modelId: '1',
            title: 'Template Copy',
            status: 'draft',
            latestVersion: 1,
            items: []
          }
        }
      })
    )

    await cloneStory('99', {
      title: 'Template Copy',
      includeItems: false
    })

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/stories/99/clone')
    const payload = JSON.parse(String(options?.body))
    expect(payload.title).toBe('Template Copy')
    expect(payload.includeItems).toBe(false)
  })

  it('serializes create story payload to the canonical stories endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          story: {
            id: 'story-1',
            modelId: 'model-1',
            title: 'Revenue story',
            status: 'draft',
            latestVersion: 1,
            items: []
          }
        }
      })
    )

    await createStory({
      modelId: 'model-1',
      title: 'Revenue story',
      summary: 'saved from chat',
      traceKey: 'trace-1',
      metadata: {
        source: 'chat_answer_surface'
      }
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/stories')
    const payload = JSON.parse(String(options?.body))
    expect(payload).toEqual({
      modelId: 'model-1',
      title: 'Revenue story',
      summary: 'saved from chat',
      status: undefined,
      metadata: {
        source: 'chat_answer_surface'
      },
      traceKey: 'trace-1'
    })
  })

  it('lists versions through the canonical story versions endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [],
          total: 0
        }
      })
    )

    await listStoryVersions('88', {
      limit: 20,
      offset: 40
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/stories/88/versions')
    expect(parsed.searchParams.get('limit')).toBe('20')
    expect(parsed.searchParams.get('offset')).toBe('40')
  })

  it('serializes list story templates filters to the canonical stories templates endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [],
          total: 0
        }
      })
    )

    await listStoryTemplates('88', {
      q: 'supply',
      status: 'published',
      limit: 10,
      offset: 20
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/stories/templates')
    expect(parsed.searchParams.get('modelId')).toBe('88')
    expect(parsed.searchParams.get('q')).toBe('supply')
    expect(parsed.searchParams.get('status')).toBe('published')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('offset')).toBe('20')
  })

  it('serializes promote story template payload to the canonical stories template route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          story: {
            id: '101',
            modelId: '1',
            title: 'story',
            status: 'draft',
            latestVersion: 2,
            metadata: { template: { isTemplate: true } },
            items: []
          },
          template: {
            storyId: '101',
            modelId: '1',
            title: 'story',
            status: 'draft',
            isTemplate: true,
            promotedAt: '2026-01-01T00:00:00.000Z',
            sourceStoryId: '101',
            reason: 'reuse'
          }
        }
      })
    )

    await promoteStoryTemplate('101', {
      reason: 'reuse'
    })

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/stories/101/templates/promote')
    const payload = JSON.parse(String(options?.body))
    expect(payload.reason).toBe('reuse')
  })

  it('loads designer state from the canonical stories designer state endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          story: {
            id: '77',
            modelId: '1',
            title: 'Story 77',
            status: 'draft',
            latestVersion: 1,
            items: []
          },
          canvas: null,
          widgets: [],
          versions: {
            items: [],
            total: 0
          },
          shareLinks: {
            items: [],
            total: 0
          },
          templateMeta: {},
          capabilities: {
            canEdit: true
          }
        }
      })
    )

    await getStoryDesignerState('77', { limit: 10, offset: 20 })

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/stories/77/designer/state')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('offset')).toBe('20')
  })

  it('serializes widget reorder batch payload to xpert story-widget endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            { widgetId: 'w1', status: 'updated', sortOrder: 1 },
            { widgetId: 'w2', status: 'updated', sortOrder: 0 }
          ],
          summary: { total: 2, succeeded: 2, failed: 0 }
        }
      })
    )

    await reorderStoryWidgetsBatch('99', {
      items: [
        { widgetId: 'w1', sortOrder: 1 },
        { widgetId: 'w2', sortOrder: 0 }
      ]
    })

    expect(fetchMock.mock.calls).toHaveLength(1)
    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/stories/99/widgets/reorder-batch')
    const payload = JSON.parse(String(options?.body))
    expect(payload.items).toEqual([
      { widgetId: 'w1', sortOrder: 1 },
      { widgetId: 'w2', sortOrder: 0 }
    ])
  })

  it('serializes add story widget payload to the canonical story widgets endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          widget: {
            id: 'widget-1',
            storyId: 'story-1',
            widgetType: 'table',
            widgetKey: 'chat-answer-table',
            title: 'Revenue trend',
            payload: {
              queryLogId: 'query-log-1'
            },
            layout: {
              x: 0,
              y: 0,
              w: 6,
              h: 4
            },
            sortOrder: 0,
            status: 'active'
          }
        }
      })
    )

    await addStoryWidget('story-1', {
      widgetType: 'table',
      widgetKey: 'chat-answer-table',
      title: 'Revenue trend',
      payload: {
        queryLogId: 'query-log-1'
      },
      layout: {
        x: 0,
        y: 0,
        w: 6,
        h: 4
      },
      sortOrder: 0
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/stories/story-1/widgets')
    const payload = JSON.parse(String(options?.body))
    expect(payload).toEqual({
      widgetType: 'table',
      widgetKey: 'chat-answer-table',
      title: 'Revenue trend',
      payload: {
        queryLogId: 'query-log-1'
      },
      layout: {
        x: 0,
        y: 0,
        w: 6,
        h: 4
      },
      sortOrder: 0
    })
  })

  it('requests public stories through the canonical public stories route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          story: {
            id: '77',
            modelId: '1',
            title: 'Shared Story',
            status: 'published',
            latestVersion: 1,
            items: []
          },
          canvas: {
            storyId: '77',
            version: 1,
            canvas: {},
            metadata: {},
            widgets: []
          },
          shareLink: {
            id: 'link-1',
            status: 'active'
          }
        }
      })
    )

    await getPublicStory('token-1')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/public/stories/token-1')
  })

  it('returns empty instead of a synthetic story in strict mode when the detail is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Story not found' }),
      headers: new Headers()
    } as Response)

    await expect(getStory('story-77', { fallbackToDefault: false })).resolves.toBeNull()
  })

  it('returns an empty public story payload when both canonical and fallback story lookups miss', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Story not found' }),
      headers: new Headers()
    } as Response)

    await expect(getPublicStory('token-77')).resolves.toMatchObject({
      story: null,
      canvas: null,
      shareLink: {
        token: 'token-77',
        storyId: 'token'
      }
    })
  })

  it('rethrows story detail lookup failures in strict mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Story lookup failed' }),
      headers: new Headers()
    } as Response)

    await expect(getStory('story-77', { fallbackToDefault: false })).rejects.toMatchObject({
      message: 'Story lookup failed'
    })
  })
})
