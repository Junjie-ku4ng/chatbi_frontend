import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createSemanticModelFixture, pickModelFixture } from './helpers/api-fixture'

function assertNoSevereViolations(result: { violations: Array<{ impact?: string | null }> }) {
  const severe = (result.violations || []).filter(item => item.impact === 'critical' || item.impact === 'serious')
  expect(severe, JSON.stringify(severe, null, 2)).toHaveLength(0)
}

async function selectModelIfAvailable(input: { page: Parameters<typeof test>[0]['page']; testId: string; modelId: string }) {
  const select = input.page.getByTestId(input.testId)
  await expect(select).toBeVisible()

  const optionValue = await select.evaluate((element, modelId) => {
    const options = Array.from((element as HTMLSelectElement).options)
    return options.some(option => option.value === modelId) ? modelId : options[0]?.value ?? null
  }, input.modelId)

  if (optionValue) {
    await select.selectOption(optionValue)
  }
}

async function mockNexusCapabilities(page: import('@playwright/test').Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*', 'allow:data-source:*', 'allow:source-model:*'],
        write: ['allow:write:model:*', 'allow:write:data-source:*', 'allow:write:source-model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
}

async function mockAiGovernanceA11yApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/ai/providers*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'provider-a11y-1', code: 'finance-llm', name: 'Finance LLM' }],
          total: 1
        }
      }
    })
  })
  await page.route('**/api/xpert/ai/providers/*/rotation-runs*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'rotation-run-a11y-1', status: 'succeeded', createdAt: '2026-04-06T10:00:00.000Z' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/providers/*/rotation-events*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'rotation-event-a11y-1', eventType: 'credential_rotated', createdAt: '2026-04-06T10:05:00.000Z' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/governance/quotas', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'quota-a11y-1', task: 'nl2plan_llm', dailyLimit: 1000, status: 'active' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/governance/quotas/usage', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'usage-a11y-1', task: 'nl2plan_llm', windowHour: 24, used: 342 }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/governance/policy-templates', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'policy-template-a11y-1', name: 'Standard Rotation', code: 'standard_rotation' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/governance/overview*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          providers: { total: 2, active: 2, disabled: 0 },
          models: { total: 5, active: 5, disabled: 0 },
          bindings: { total: 4, healthyCount: 4, unhealthyCount: 0 },
          rotation: { totalRuns: 12, failedRuns: 1, failureRate: 0.08 },
          quota: { requestCount: 120, successCount: 118, errorCount: 2, errorRate: 0.02, tokenCount: 5000 },
          alerts: { open: 1 }
        }
      }
    })
  })
  await page.route('**/api/xpert/ai/governance/crypto/providers', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: [{ adapterId: 'aws-kms', provider: 'aws-kms', configured: true, liveReady: true, lastValidationAt: '2026-04-06T10:30:00.000Z', lastErrorCode: null }] } })
  })
  await page.route('**/api/xpert/ai/governance/crypto/validations*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'crypto-validation-a11y-1', provider: 'aws-kms', mode: 'live', success: true, requestId: 'req-a11y-1', createdAt: '2026-04-06T10:35:00.000Z' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ai/governance/crypto/policy', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { policyMode: 'compat', allowMock: true, requireProviderValidation: false, validationTtlHours: 24 } } })
  })
}

async function mockOpsReportsA11yApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/ops/reports/consumption/table*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ groupKey: 'tenant-alpha', deliveries: 128, success: 123, failed: 5, dlq: 1 }], total: 1, summary: { subscriptionCount: 24, deliveries: 128, failed: 5, dlq: 1, audits: 17 } } } })
  })
  await page.route('**/api/xpert/indicator-webhooks/governance/reports/consumption*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { windowHours: 720, items: [{ groupKey: 'tenant-alpha', deliveries: 128, failed: 5 }] } } })
  })
  await page.route('**/api/xpert/ask-review/cases/*/summary*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { totalCases: 8, pendingDecisionCases: 2, slaBreachedCases: 1 } } })
  })
  await page.route('**/api/xpert/ask-certifications/lanes/*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { status: 'blocked', blockers: ['review_backlog'], metrics: { reviewState: 'backlog', certificationBlockerClass: 'review_backlog' } } } })
  })
  await page.route('**/api/xpert/ops/alerts/events*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'alert-event-a11y-1', metricCode: 'ask_quality_guard' }], total: 1 } } })
  })
  await page.route('**/api/xpert/ops/alerts/events/*/dispatch-logs*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'dispatch-log-a11y-1', channel: 'email', status: 'failed', createdAt: '2026-04-06T11:00:00.000Z', traceKey: 'trace-a11y-1', errorMessage: 'SMTP timeout' }], total: 1 } } })
  })
}

async function mockDataModelReleaseA11yApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/source-model-drafts/*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { id: 'draft-a11y-1', name: 'Sales Release Draft', draftVersion: 4, latestIntrospection: { tables: 2, relations: 1, inferredAt: '2026-04-06T09:00:00.000Z' }, tables: [{ id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' }, { id: 'dim-product', sourcePath: 'public.dim_product', role: 'dimension' }], relations: [{ fromTableId: 'fact-sales', toTableId: 'dim-product', joinType: 'left' }] } } })
  })
  await page.route('**/api/xpert/semantic-model/model-a11y-1', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { id: 'model-a11y-1', name: 'Sales Semantic Draft', cube: 'Sales' } } })
  })
  await page.route('**/api/xpert/pa-deployments/deployment-a11y-1', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { id: 'deployment-a11y-1', semanticModelId: 'model-a11y-1', status: 'draft', targetCube: 'Sales' } } })
  })
  await page.route('**/api/xpert/pa-deployments/deployment-a11y-1/load-jobs', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'load-job-a11y-1', mode: 'incremental', status: 'failed', retryCount: 2, reconciliation: { status: 'failed' } }], total: 1 } } })
  })
  await page.route('**/api/xpert/pa-deployments/deployment-a11y-1/refresh-policies', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { deploymentId: 'deployment-a11y-1', mode: 'scheduled', cadence: '0 */2 * * *', incrementalKey: 'updated_at', watermark: { maxValue: '2026-04-06T12:00:00.000Z' } } } })
  })
  await page.route('**/api/xpert/pa-deployments/deployment-a11y-1/refresh-runs', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [{ id: 'refresh-run-a11y-1', mode: 'incremental', status: 'failed', reconciliation: { status: 'failed' }, watermarkAfter: { maxValue: '2026-04-06T12:00:00.000Z' } }], total: 1 } } })
  })
  await page.route('**/api/xpert/pa-deployments/deployment-a11y-1/release', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { deploymentId: 'deployment-a11y-1', status: 'blocked', blockers: ['freshness_budget_exceeded'], freshness: { lagMinutes: 120, budgetMinutes: 60 }, sourceReconciliation: { scope: 'refresh_run', status: 'failed' } } } })
  })
}

test('home page passes axe checks', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('login page passes axe checks', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('semantic studio graph v2 page passes axe checks', async ({ page }) => {
  const model = await createSemanticModelFixture()
  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('ask workspace page passes axe checks', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto(`/chat?modelId=${encodeURIComponent(model.id)}&analysisV2=1`)
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('governance hub page passes axe checks', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto('/governance?hub=1')
  await selectModelIfAvailable({ page, testId: 'governance-overview-model', modelId: model.id })
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('indicator ops page passes axe checks', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto('/indicator-app')
  await selectModelIfAvailable({ page, testId: 'indicator-ops-model-select', modelId: model.id })
  await expect(page.getByRole('main')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('ai governance page passes axe checks', async ({ page }) => {
  await mockAiGovernanceA11yApis(page)
  await page.goto('/ai/governance')
  await expect(page.getByTestId('ai-governance-overview-table')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('ops reports page passes axe checks', async ({ page }) => {
  await mockOpsReportsA11yApis(page)
  await page.goto('/ops/reports')
  await expect(page.getByTestId('ops-reports-table')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})

test('data model release page passes axe checks', async ({ page }) => {
  await mockDataModelReleaseA11yApis(page)
  await page.goto('/data-model-release?dataSourceId=source-a11y-1&draftId=draft-a11y-1&modelId=model-a11y-1&deploymentId=deployment-a11y-1')
  await expect(page.getByTestId('data-model-release-page')).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  assertNoSevereViolations(result)
})
