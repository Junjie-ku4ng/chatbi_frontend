import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTrace, listTraceActions, listTraceTimeline, listTraces, runTraceAction } from '@/modules/trace/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('trace api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests canonical ops trace list endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'trace-row-1',
              traceKey: 'trace-1',
              modelId: 'model-1',
              rootType: 'query',
              conversationId: 'conv-1',
              queryLogId: 'query-1',
              status: 'open',
              startedAt: '2026-03-08T01:00:00.000Z'
            }
          ],
          total: 1,
          limit: 25,
          offset: 10
        }
      })
    )

    const page = await listTraces({
      modelId: 'model-1',
      status: 'open',
      rootType: 'query',
      q: 'trace-1',
      limit: 25,
      offset: 10
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/ops/traces?')
    expect(String(url)).toContain('modelId=model-1')
    expect(String(url)).toContain('status=open')
    expect(String(url)).toContain('rootType=query')
    expect(String(url)).toContain('q=trace-1')
    expect(String(url)).toContain('limit=25')
    expect(String(url)).toContain('offset=10')
    expect(String(url)).not.toContain('/chat-conversation/')
    expect(page.total).toBe(1)
    expect(page.items[0]).toMatchObject({
      traceKey: 'trace-1',
      modelId: 'model-1',
      conversationId: 'conv-1',
      queryLogId: 'query-1',
      status: 'open'
    })
  })

  it('gets trace detail from canonical ops and analysis resources', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input)

      if (url.includes('/api/xpert/ops/traces/trace-123')) {
        return mockJsonResponse({
          data: {
            run: {
              id: 'trace-row-1',
              traceKey: 'trace-123',
              modelId: 'model-1',
              rootType: 'query',
              conversationId: 'conv-1',
              queryLogId: 'query-1',
              status: 'open',
              startedAt: '2026-03-08T01:00:00.000Z',
              createdAt: '2026-03-08T01:00:00.000Z',
              updatedAt: '2026-03-08T01:05:00.000Z'
            },
            links: [
              {
                id: 'link-1',
                traceRunId: 'trace-row-1',
                linkType: 'query_log',
                refId: 'query-1',
                createdAt: '2026-03-08T01:01:00.000Z'
              }
            ],
            actionRuns: [
              {
                id: 'action-1',
                traceRunId: 'trace-row-1',
                actionType: 'ack_alert',
                status: 'applied',
                createdAt: '2026-03-08T01:02:00.000Z'
              }
            ],
            timeline: [
              {
                kind: 'run',
                at: '2026-03-08T01:00:00.000Z',
                data: {
                  status: 'open'
                }
              }
            ]
          }
        })
      }

      if (url.includes('/api/xpert/analysis-conversations/conv-1')) {
        return mockJsonResponse({
          data: {
            conversationId: 'conv-1',
            modelId: 'model-1',
            checkpoints: [
              {
                id: 'checkpoint-1',
                traceKey: 'trace-123'
              }
            ]
          }
        })
      }

      if (url.includes('/api/xpert/analysis-executions?')) {
        return mockJsonResponse({
          data: {
            items: [
              {
                runKey: 'exec-1',
                modelId: 'model-1',
                status: 'running',
                startedAt: '2026-03-08T01:00:30.000Z',
                references: {
                  conversationId: 'conv-1',
                  traceKey: 'trace-123'
                }
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        })
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const detail = await getTrace('trace-123')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(requestedUrls.some(url => url.includes('/api/xpert/ops/traces/trace-123'))).toBe(true)
    expect(requestedUrls.some(url => url.includes('/api/xpert/analysis-conversations/conv-1'))).toBe(true)
    const executionUrl = requestedUrls.find(url => url.includes('/api/xpert/analysis-executions?')) ?? ''
    expect(executionUrl).toContain('modelId=model-1')
    expect(executionUrl).toContain('conversationId=conv-1')
    expect(executionUrl).toContain('limit=20')
    expect(executionUrl).toContain('offset=0')
    expect(requestedUrls.some(url => url.includes('/chat-conversation/'))).toBe(false)
    expect(requestedUrls.some(url => url.includes('/chat-message/'))).toBe(false)
    expect(detail.run.traceKey).toBe('trace-123')
    expect(detail.conversation?.conversationId).toBe('conv-1')
    expect(detail.execution?.runKey).toBe('exec-1')
    expect(detail.timeline[0]?.at).toBe('2026-03-08T01:00:00.000Z')
  })

  it('posts trace actions to the canonical ops trace action endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          actionRun: {
            id: 'action-1',
            traceRunId: 'trace-row-1',
            actionType: 'ack_alert',
            status: 'applied',
            createdAt: '2026-03-08T02:00:00.000Z'
          }
        }
      })
    )

    const payload = await runTraceAction('trace-123', {
      action: 'ack_alert',
      params: {
        eventId: 'event-1'
      }
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/ops/traces/trace-123/actions')
    expect((options as RequestInit | undefined)?.method).toBe('POST')
    expect(String((options as RequestInit | undefined)?.body)).toContain('"action":"ack_alert"')
    expect(payload.actionRun?.actionType ?? null).toBe('ack_alert')
  })

  it('lists trace actions from the canonical ops trace endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'action-2',
              traceRunId: 'trace-row-1',
              actionType: 'replay_dlq',
              status: 'partial',
              createdAt: '2026-03-08T02:15:00.000Z'
            }
          ],
          total: 1,
          limit: 20,
          offset: 40
        }
      })
    )

    const page = await listTraceActions('trace-123', {
      status: 'failed',
      actionType: 'replay_dlq',
      limit: 20,
      offset: 40
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/ops/traces/trace-123/actions?')
    expect(String(url)).toContain('status=failed')
    expect(String(url)).toContain('actionType=replay_dlq')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=40')
    expect(page.total).toBe(1)
    expect(page.items[0]?.actionType).toBe('replay_dlq')
  })

  it('lists trace timeline from the canonical ops trace timeline endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          traceKey: 'trace-123',
          page: 1,
          pageSize: 5,
          total: 1,
          items: [
            {
              kind: 'action',
              at: '2026-03-08T03:00:00.000Z',
              data: {
                status: 'applied'
              },
              presentation: {
                eventSummary: 'action • applied'
              }
            }
          ]
        }
      })
    )

    const page = await listTraceTimeline('trace-123', {
      kind: 'action',
      status: 'applied',
      view: 'operational',
      page: 1,
      pageSize: 5
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/ops/traces/trace-123/timeline?')
    expect(String(url)).toContain('kind=action')
    expect(String(url)).toContain('status=applied')
    expect(String(url)).toContain('view=operational')
    expect(String(url)).toContain('page=1')
    expect(String(url)).toContain('pageSize=5')
    expect(page.items[0]?.presentation?.eventSummary).toBe('action • applied')
  })
})
