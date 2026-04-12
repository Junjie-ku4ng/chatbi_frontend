import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiGovernanceOverview, listAiCryptoValidations } from '@/modules/governance/ai/api'
import {
  executeIndicatorImportJob,
  getIndicatorContractGovernanceSummary,
  listIndicatorImportJobItems,
  listIndicatorApprovalHistory,
  listIndicatorImportJobs,
  retryFailedIndicatorImportJob
} from '@/modules/governance/indicator/api'
import {
  getGovernanceOverview,
  listGovernanceRecentActivity,
  listGovernanceRiskHotspots,
  listGovernanceWorklist
} from '@/modules/governance/overview/api'
import {
  applySemanticPolicyTemplate,
  getSemanticEffectiveTemplates,
  listSemanticApprovalQueue,
  listSemanticPolicyTemplates,
  voteSemanticApprovalQueueBatch
} from '@/modules/governance/semantic/api'
import { getToolsetOpsSummary, getToolsetPluginPolicy } from '@/modules/governance/toolset/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('governance api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes semantic approval queue filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, limit: 20, offset: 0 }
      })
    )

    await listSemanticApprovalQueue({
      tenant: 'local',
      domain: 'Sales',
      status: 'review',
      stage: 'review',
      modelId: 'm1',
      limit: 20,
      offset: 0
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model-governance/approval-queue?')
    expect(String(url)).toContain('tenant=local')
    expect(String(url)).toContain('domain=Sales')
    expect(String(url)).toContain('status=review')
    expect(String(url)).toContain('stage=review')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=0')
  })

  it('sends semantic batch vote payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [{ modelId: 'm1', stage: 'review', decision: 'approve', success: true }],
          summary: { total: 1, succeeded: 1, failed: 0 }
        }
      })
    )

    await voteSemanticApprovalQueueBatch({
      items: [{ modelId: 'm1', stage: 'review', decision: 'approve' }]
    })

    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(JSON.parse(String(options?.body))).toEqual({
      items: [{ modelId: 'm1', stage: 'review', decision: 'approve' }]
    })
  })

  it('serializes semantic policy template filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: []
      })
    )

    await listSemanticPolicyTemplates({
      domain: 'Sales',
      status: 'active'
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model-governance/policy-templates?')
    expect(String(url)).toContain('domain=Sales')
    expect(String(url)).toContain('status=active')
  })

  it('serializes semantic effective template lookup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          policyTemplate: { source: 'inherited', template: { id: 'pt-1' } },
          approvalTemplate: { source: 'inherited', template: { id: 'at-1' } }
        }
      })
    )

    await getSemanticEffectiveTemplates('m1')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model-governance/models/m1/effective-templates')
  })

  it('sends semantic policy template apply payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          policyTemplate: { id: 'pt-1', name: 'sales-default' }
        }
      })
    )

    await applySemanticPolicyTemplate('m1', {
      templateId: 'pt-1'
    })

    const [url, options] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model-governance/models/m1/policy-template/apply')
    expect(JSON.parse(String(options?.body))).toEqual({
      templateId: 'pt-1'
    })
  })

  it('serializes ai governance overview query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          windowHours: 24,
          generatedAt: '2026-01-01T00:00:00.000Z',
          providers: { total: 1, active: 1, disabled: 0 },
          models: { total: 1, active: 1, disabled: 0 },
          bindings: { total: 1, strictCount: 1, healthyCount: 1, unhealthyCount: 0 },
          rotation: { totalRuns: 1, failedRuns: 0, failureRate: 0 },
          quota: { requestCount: 0, successCount: 0, errorCount: 0, errorRate: 0, tokenCount: 0 },
          alerts: { total: 0, open: 0, acked: 0, closed: 0 }
        }
      })
    )

    await getAiGovernanceOverview({ tenant: 'local', windowHours: 48 })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ai/governance/overview?')
    expect(String(url)).toContain('tenant=local')
    expect(String(url)).toContain('windowHours=48')
  })

  it('serializes ai crypto validation query filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, limit: 20, offset: 40 }
      })
    )

    await listAiCryptoValidations({
      provider: 'aws-kms',
      mode: 'live',
      success: true,
      limit: 20,
      offset: 40
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/ai/governance/crypto/validations?')
    expect(String(url)).toContain('provider=aws-kms')
    expect(String(url)).toContain('mode=live')
    expect(String(url)).toContain('success=true')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=40')
  })

  it('serializes indicator governance summary query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          windowHours: 168,
          generatedAt: '2026-01-01T00:00:00.000Z',
          totals: {
            contracts: 1,
            published: 0,
            draft: 1,
            breakingIndicators: 0,
            incompatibleConsumers: 0
          },
          contractVersionBreakdown: [],
          riskBreakdown: [],
          consumers: { total: 0, active: 0, disabled: 0 },
          recentChanges: { publishedInWindow: 0, versionSnapshotsInWindow: 0 }
        }
      })
    )

    await getIndicatorContractGovernanceSummary({
      modelId: 'm1',
      tenant: 'local',
      windowHours: 72
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/indicator-contracts/governance/summary?')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('tenant=local')
    expect(String(url)).toContain('windowHours=72')
  })

  it('serializes toolset ops summary filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          windowHours: 24,
          generatedAt: '2026-01-01T00:00:00.000Z',
          summary: {
            totalOutcomes: 0,
            successCount: 0,
            failureCount: 0,
            statusBreakdown: { success: 0, failed: 0 },
            successRate: 1,
            avgDurationMs: 0,
            p95DurationMs: 0,
            p95LatencyMs: 0,
            totalSessions: 0,
            runningSessions: 0,
            answeredSessions: 0,
            errorSessions: 0
          },
          actionMetrics: [],
          topErrors: [],
          strategyMetrics: []
        }
      })
    )

    await getToolsetOpsSummary({
      modelId: 'm1',
      domain: 'indicator_governance',
      scenario: 'default-chatbi',
      windowHours: 12
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/pa/api/xpert-toolset/my')
    const data = JSON.parse(parsed.searchParams.get('data') ?? '{}') as { where?: Record<string, unknown> }
    expect(data.where?.modelId).toBe('m1')
  })

  it('returns empty instead of a synthetic default policy in strict mode when plugin policy is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          id: 'plugin-77',
          name: 'Plugin 77',
          status: 'active',
          options: {}
        }
      })
    )

    await expect(getToolsetPluginPolicy('plugin-77', { fallbackToDefault: false })).resolves.toBeNull()
  })

  it('rethrows plugin policy lookup failures in strict mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'Plugin lookup failed'
      }),
      headers: new Headers()
    } as Response)

    await expect(getToolsetPluginPolicy('plugin-77', { fallbackToDefault: false })).rejects.toMatchObject({
      message: 'Plugin lookup failed'
    })
  })

  it('serializes governance overview query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          windowHours: 72,
          generatedAt: '2026-01-01T00:00:00.000Z',
          model: { id: 'm1', name: 'Model', cube: 'Sales' },
          domains: {
            semantic: { queueItems: 1, blockers: 0, roleGaps: 0, status: 'review', riskLevel: 'medium' },
            indicator: { contracts: 1, published: 1, breakingIndicators: 0, incompatibleConsumers: 0 },
            ai: { bindings: 1, unhealthyBindings: 0, rotationFailureRate: 0 },
            toolset: { totalOutcomes: 1, failureCount: 0, p95LatencyMs: 100 },
            ops: { totalAlerts: 0, openAlerts: 0, ackedAlerts: 0, closedAlerts: 0 }
          }
        }
      })
    )

    await getGovernanceOverview({ modelId: 'm1', windowHours: 72 })
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/governance/overview?')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('windowHours=72')
  })

  it('serializes governance hotspots and recent activity query filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, limit: 20, offset: 0 }
      })
    )

    await listGovernanceRiskHotspots({ modelId: 'm1', windowHours: 48 })
    await listGovernanceRecentActivity({ modelId: 'm1', windowHours: 48, limit: 10, offset: 20, cursor: '30' })

    const [hotspotUrl] = fetchMock.mock.calls[0] ?? []
    const [recentUrl] = fetchMock.mock.calls[1] ?? []
    expect(String(hotspotUrl)).toContain('/governance/risks/hotspots?')
    expect(String(hotspotUrl)).toContain('modelId=m1')
    expect(String(hotspotUrl)).toContain('windowHours=48')
    expect(String(recentUrl)).toContain('/governance/activity/recent?')
    expect(String(recentUrl)).toContain('modelId=m1')
    expect(String(recentUrl)).toContain('windowHours=48')
    expect(String(recentUrl)).toContain('limit=10')
    expect(String(recentUrl)).toContain('offset=20')
    expect(String(recentUrl)).toContain('cursor=30')
  })

  it('serializes governance worklist filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, limit: 20, offset: 0, nextCursor: null }
      })
    )

    await listGovernanceWorklist({
      modelId: 'm1',
      windowHours: 72,
      domain: 'ops',
      severity: 'critical',
      status: 'open',
      limit: 30,
      cursor: '60'
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/governance/worklist?')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('windowHours=72')
    expect(String(url)).toContain('domain=ops')
    expect(String(url)).toContain('severity=critical')
    expect(String(url)).toContain('status=open')
    expect(String(url)).toContain('limit=30')
    expect(String(url)).toContain('cursor=60')
  })

  it('serializes indicator import jobs filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, page: 1, pageSize: 20, nextCursor: null }
      })
    )

    await listIndicatorImportJobs('m1', {
      status: 'failed',
      sourceType: 'manual',
      cursor: '40',
      limit: 30,
      page: 2,
      pageSize: 50
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/indicators/import-jobs?')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('status=failed')
    expect(String(url)).toContain('sourceType=manual')
    expect(String(url)).toContain('cursor=40')
    expect(String(url)).toContain('limit=30')
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('pageSize=50')
  })

  it('serializes indicator import item pagination with cursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, page: 1, pageSize: 100, nextCursor: null }
      })
    )

    await listIndicatorImportJobItems('job-1', {
      status: 'failed',
      cursor: '100',
      limit: 50,
      page: 2,
      pageSize: 50
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/indicators/import-jobs/job-1/items?')
    expect(String(url)).toContain('status=failed')
    expect(String(url)).toContain('cursor=100')
    expect(String(url)).toContain('limit=50')
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('pageSize=50')
  })

  it('serializes indicator import execute/retry payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: { run: { id: '1' }, summary: { total: 1, succeeded: 1, failed: 0 }, job: { id: '10' } }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: { run: { id: '2' }, summary: { total: 1, succeeded: 1, failed: 0 }, job: { id: '10' } }
        })
      )

    await executeIndicatorImportJob('10', { actor: 'ops-user' })
    await retryFailedIndicatorImportJob('10', { actor: 'ops-user', itemIds: ['item-1'] })

    const [executeUrl, executeOptions] = fetchMock.mock.calls[0] ?? []
    expect(String(executeUrl)).toContain('/indicators/import-jobs/10/execute')
    expect(JSON.parse(String(executeOptions?.body))).toEqual({ actor: 'ops-user' })

    const [retryUrl, retryOptions] = fetchMock.mock.calls[1] ?? []
    expect(String(retryUrl)).toContain('/indicators/import-jobs/10/retry-failed')
    expect(JSON.parse(String(retryOptions?.body))).toEqual({ actor: 'ops-user', itemIds: ['item-1'] })
  })

  it('serializes indicator approval history filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, page: 1, pageSize: 20, nextCursor: null }
      })
    )

    await listIndicatorApprovalHistory('m1', {
      stage: 'review',
      status: 'failed',
      actor: 'ops-user',
      cursor: '60',
      limit: 20,
      page: 3,
      pageSize: 25
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/indicators/approvals/history?')
    expect(String(url)).toContain('modelId=m1')
    expect(String(url)).toContain('stage=review')
    expect(String(url)).toContain('status=failed')
    expect(String(url)).toContain('actor=ops-user')
    expect(String(url)).toContain('cursor=60')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('page=3')
    expect(String(url)).toContain('pageSize=25')
  })
})
