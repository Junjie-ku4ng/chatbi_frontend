import { expect, test, type Page } from '@playwright/test'

async function mockCapabilities(page: Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
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

async function mockSemanticLifecycleApis(page: Page) {
  const model = {
    id: 'model-lifecycle-e2e',
    name: 'Lifecycle Model',
    cube: 'sales',
    runtime: 'chatbi',
    workflowStatus: 'review',
    schemaVersion: 3,
    domain: 'finance',
    owner: 'alice'
  }

  await page.route('**/api/xpert/semantic-model?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [model],
          total: 1,
          limit: 50,
          offset: 0
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model-governance/approval-queue*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              modelId: model.id,
              name: model.name,
              cube: model.cube,
              domain: model.domain,
              workflowStatus: 'review',
              riskLevel: 'medium',
              stage: 'review',
              status: 'review',
              blockers: [],
              quorum: {
                minReviewers: 1,
                minApprovers: 1,
                reviewMet: true,
                approveMet: false,
                reviewApprovals: 1,
                approveApprovals: 0,
                missingRoleRequirements: []
              }
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/model-lifecycle-e2e/workflow/approvals?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          approvals: [{ stage: 'review', decision: 'approve', actor: 'alice', createdAt: '2026-02-25T10:00:00.000Z' }]
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/model-lifecycle-e2e/impact/summary?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: model.id,
          generatedAt: '2026-02-25T10:00:00.000Z',
          windowHours: 168,
          risk: { level: 'medium', blockers: ['schema_conflict'], blockersBySeverity: { error: 1, warning: 0, info: 0 } },
          affected: {
            queries: { total: 12, topItems: [] },
            stories: { total: 3, topItems: [] },
            indicators: { total: 2, topItems: [] }
          },
          blockerDetails: [{ code: 'schema_conflict', severity: 'error', ownerHint: 'owner-1', retryable: false }],
          suggestedActions: ['review impacted queries']
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/model-lifecycle-e2e/impact/cross-model*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          blocked: true,
          summary: { impactedCount: 2, riskLevel: 'high' },
          impactedModels: [
            { modelId: 'model-a', relation: 'depends_on' },
            { modelId: 'model-b', relation: 'joins_with' }
          ]
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/model-lifecycle-e2e', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: model
      }
    })
  })
}

test('models canonical routes host lifecycle runtime modules', async ({ page }) => {
  await mockCapabilities(page)
  await mockSemanticLifecycleApis(page)

  await page.goto('/models')
  await expect(page.getByTestId('bi-models-home')).toBeVisible()
  await expect(page.getByTestId('bi-models-runtime-governance')).toBeVisible()
  await expect(page.getByTestId('semantic-queue-filter-form')).toBeVisible()

  await page.goto('/models/model-lifecycle-e2e')
  await expect(page.getByTestId('bi-models-detail')).toBeVisible()
  await expect(page.getByTestId('bi-models-runtime-detail')).toBeVisible()
  await expect(page.getByTestId('semantic-model-detail-table')).toBeVisible()

  await page.goto('/models/model-lifecycle-e2e/impact')
  await expect(page.getByTestId('bi-models-impact')).toBeVisible()
  await expect(page.getByTestId('bi-models-runtime-impact')).toBeVisible()
  await expect(page.getByTestId('semantic-impact-summary-strip')).toBeVisible()
})
