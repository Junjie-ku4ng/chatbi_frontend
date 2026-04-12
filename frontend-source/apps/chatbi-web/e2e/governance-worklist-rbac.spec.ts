import { expect, test } from '@playwright/test'
import { apiPost, pickModelFixture } from './helpers/api-fixture'

test('governance worklist disables quick actions when write scope is missing', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })

  const importJob = await apiPost<{ id?: string }>('/indicators/import-jobs', {
    modelId: model.id,
    sourceType: 'manual',
    payload: {
      items: [
        {
          code: `E2E_GOV_RBAC_${Date.now()}`,
          name: 'governance-rbac-indicator',
          type: 'measure',
          simulateTransientFailure: true
        }
      ]
    },
    triggeredBy: 'e2e-worklist-rbac'
  })
  const jobId = String((importJob as Record<string, unknown>)?.id || '')
  expect(jobId).not.toBe('')

  await apiPost(`/indicators/import-jobs/${encodeURIComponent(jobId)}/execute`, {
    actor: 'e2e-worklist-rbac'
  })

  await page.route('**/auth/capabilities*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: 'v1',
        data: {
          authType: 'dev',
          userId: 'e2e-rbac',
          scopes: {
            read: ['allow:model:*', 'allow:indicator:*'],
            write: [],
            denyRead: [],
            denyWrite: []
          },
          missingScopesHints: ['Request allow:write:model:* from platform admin.']
        }
      })
    })
  })

  await page.goto(`/governance?hub=1&hubActions=1&modelId=${encodeURIComponent(model.id)}`)
  await page.getByTestId('governance-overview-model').selectOption(model.id)
  await page.getByTestId('governance-worklist-domain-filter').selectOption('indicator')

  const actionButton = page.locator('[data-testid^="governance-worklist-action-"]').first()
  await expect(actionButton).toBeVisible({ timeout: 30_000 })
  await expect(actionButton).toBeDisabled()

  const reasonBadge = page.locator('[data-testid^="governance-worklist-action-reason-"]').first()
  await expect(reasonBadge).toBeVisible({ timeout: 30_000 })
  await expect(reasonBadge).toContainText(/Missing required scopes/i)

  const batchButton = page.getByTestId('governance-worklist-batch-run')
  await expect(batchButton).toBeDisabled()
  await expect(page.getByTestId('governance-worklist-batch-reason')).toContainText(/Missing required scopes/i)
})
