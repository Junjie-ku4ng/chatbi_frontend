import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyAnalysisTemplate,
  buildAnalysisConsoleHref,
  createAnalysisTemplate,
  listAnalysisHistory,
  listAnalysisSuggestions,
  listAnalysisTemplates,
  previewAnalysis,
  replayAnalysisHistoryRun
} from '@/modules/chat/analysis/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('chat analysis api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes analysis suggestions query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          kind: 'member',
          items: []
        }
      })
    )

    await listAnalysisSuggestions('123', {
      kind: 'member',
      dimension: 'Region',
      q: 'East',
      topK: 5
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/chat/query/123/analysis/suggestions?')
    expect(String(url)).toContain('kind=member')
    expect(String(url)).toContain('dimension=Region')
    expect(String(url)).toContain('q=East')
    expect(String(url)).toContain('topK=5')
  })

  it('serializes analysis preview payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          baseQueryLogId: '1',
          previewPlan: {},
          changes: [],
          risk: 'low'
        }
      })
    )

    await previewAnalysis('1', {
      prompt: '继续分析',
      analysisAction: 'analysis_panel_preview',
      compareToRunId: '55',
      patch: {
        topN: 5
      }
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/chat/query/1/analysis/preview')
    const payload = JSON.parse(String(options?.body))
    expect(payload.analysisAction).toBe('analysis_panel_preview')
    expect(payload.compareToRunId).toBe('55')
    expect(payload.patch.topN).toBe(5)
  })

  it('serializes analysis console deep links with canonical draft payloads', () => {
    const href = buildAnalysisConsoleHref({
      queryLogId: 'query-log-1',
      traceKey: 'trace-1',
      draft: {
        prompt: '继续分析当前结果',
        analysisAction: 'open_analysis',
        baseQueryLogId: 'query-log-1',
        patch: {
          topN: 5,
          sort: {
            by: 'Revenue',
            dir: 'ASC'
          },
          filters: [
            {
              dimension: 'Region',
              op: 'IN',
              members: ['West']
            }
          ]
        }
      }
    })

    const url = new URL(href, 'https://chatbi.local')
    expect(url.pathname).toBe('/chat')
    expect(url.hash).toBe('#analysis')
    expect(url.searchParams.get('queryLogId')).toBe('query-log-1')
    expect(url.searchParams.get('traceKey')).toBe('trace-1')
    expect(JSON.parse(url.searchParams.get('analysisDraft') ?? '{}')).toEqual({
      prompt: '继续分析当前结果',
      analysisAction: 'open_analysis',
      baseQueryLogId: 'query-log-1',
      patch: {
        topN: 5,
        sort: {
          by: 'Revenue',
          dir: 'ASC'
        },
        filters: [
          {
            dimension: 'Region',
            op: 'IN',
            members: ['West']
          }
        ]
      }
    })
  })

  it('serializes history paging', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          queryLogId: '1',
          items: [],
          total: 0
        }
      })
    )

    await listAnalysisHistory('1', {
      limit: 20,
      offset: 40,
      cursor: '80',
      status: 'failed'
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/chat/query/1/analysis/history?')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=40')
    expect(String(url)).toContain('cursor=80')
    expect(String(url)).toContain('status=failed')
  })

  it('serializes history replay endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          replayedFromRunId: '9',
          status: 'success'
        }
      })
    )

    await replayAnalysisHistoryRun('10', '9', {
      strategy: 'exact_with_prompt_override',
      promptOverride: '继续分析失败项',
      analysisAction: 'analysis_panel_replay'
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/chat/query/10/analysis/history/9/replay')
    const payload = JSON.parse(String(options?.body))
    expect(payload.strategy).toBe('exact_with_prompt_override')
    expect(payload.promptOverride).toBe('继续分析失败项')
    expect(payload.analysisAction).toBe('analysis_panel_replay')
  })

  it('serializes template create/apply endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            template: { id: '1' }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            followup: { id: '10' }
          }
        })
      )

    await createAnalysisTemplate({
      modelId: 'model-1',
      name: 'top5',
      config: {
        patch: { topN: 5 }
      }
    })
    await applyAnalysisTemplate('200', '1', '继续分析')

    const [createUrl] = fetchMock.mock.calls[0] ?? []
    expect(String(createUrl)).toContain('/chat/query-analysis/templates')
    const [applyUrl, applyOptions] = fetchMock.mock.calls[1] ?? []
    expect(String(applyUrl)).toContain('/chat/query/200/analysis/templates/1/apply')
    const applyPayload = JSON.parse(String(applyOptions?.body))
    expect(applyPayload.prompt).toBe('继续分析')
  })

  it('serializes template listing filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [],
          total: 0
        }
      })
    )

    await listAnalysisTemplates({
      modelId: '11',
      q: 'top',
      status: 'active',
      limit: 10,
      offset: 5
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/chat/query-analysis/templates?')
    expect(String(url)).toContain('modelId=11')
    expect(String(url)).toContain('q=top')
    expect(String(url)).toContain('status=active')
    expect(String(url)).toContain('limit=10')
    expect(String(url)).toContain('offset=5')
  })
})
