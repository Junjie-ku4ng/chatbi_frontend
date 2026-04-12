import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ackAlertEventsBatch,
  downloadConsumptionReportCsv,
  getAskReviewLaneSummary,
  getLatestAskCertificationReport,
  listAlertDispatchLogs,
  listAlertEvents,
  listWebhookDlq,
  replayWebhookDlqBatch
} from '@/modules/ops/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('ops api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes dispatch logs filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listAlertDispatchLogs('event-1', {
      status: 'failed',
      channel: 'email',
      page: 2,
      pageSize: 25
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ops/alerts/events/event-1/dispatch-logs?')
    expect(String(url)).toContain('status=failed')
    expect(String(url)).toContain('channel=email')
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('pageSize=25')
  })

  it('downloads csv reports as plain text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'tenant,count\nacme,10'
    } as Response)

    const csv = await downloadConsumptionReportCsv({
      windowHours: 168,
      groupBy: 'tenant'
    })

    expect(csv).toContain('tenant,count')
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('format=csv')
    expect(String(url)).toContain('groupBy=tenant')
  })

  it('serializes dlq list offset pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { modelId: '100', items: [] }
      })
    )

    await listWebhookDlq({
      modelId: '100',
      status: 'open',
      limit: 50,
      offset: 100
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/indicator-webhooks/dlq?')
    expect(String(url)).toContain('modelId=100')
    expect(String(url)).toContain('status=open')
    expect(String(url)).toContain('limit=50')
    expect(String(url)).toContain('offset=100')
  })

  it('sends targeted dlq replay payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { requested: 2, replayed: 1, failed: 1, remainingOpen: 1, items: [] }
      })
    )

    await replayWebhookDlqBatch({
      modelId: '100',
      dlqIds: ['1', '2'],
      replayedBy: 'tester'
    })

    const [, options] = fetchMock.mock.calls[0] ?? []
    const payload = JSON.parse(String(options?.body))
    expect(payload.modelId).toBe('100')
    expect(payload.dlqIds).toEqual(['1', '2'])
    expect(payload.replayedBy).toBe('tester')
  })

  it('sends batch ack payload with optional trace key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          total: 2,
          acked: 1,
          failed: 1,
          items: []
        }
      })
    )

    await ackAlertEventsBatch({
      ids: ['11', '12'],
      traceKey: 'trace-x'
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ops/alerts/events/batch-ack')
    const payload = JSON.parse(String(options?.body))
    expect(payload.ids).toEqual(['11', '12'])
    expect(payload.traceKey).toBe('trace-x')
  })

  it('serializes alert eventCode filter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listAlertEvents({
      status: 'open',
      eventCode: 'ai_crypto.kms_policy_violation',
      limit: 30,
      offset: 10
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ops/alerts/events?')
    expect(String(url)).toContain('status=open')
    expect(String(url)).toContain('eventCode=ai_crypto.kms_policy_violation')
    expect(String(url)).toContain('limit=30')
    expect(String(url)).toContain('offset=10')
  })

  it('serializes ask review lane summary lookup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          lane: 'diagnostic_run',
          totalCases: 0
        }
      })
    )

    await getAskReviewLaneSummary('diagnostic_run', {
      slaHours: 12
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ask-review/cases/diagnostic_run/summary?')
    expect(String(url)).toContain('slaHours=12')
  })

  it('serializes latest ask certification report lookup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          lane: 'federated_query',
          status: 'blocked'
        }
      })
    )

    await getLatestAskCertificationReport('federated_query', {
      modelId: 'model-ops-1'
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ask-certifications/lanes/federated_query?')
    expect(String(url)).toContain('modelId=model-ops-1')
  })
})
