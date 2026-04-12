import { expect, test } from '@playwright/test'
import { apiPost, pickModelFixture } from './helpers/api-fixture'

test('governance worklist supports quick retry/ack actions', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })

  const importJob = await apiPost<{ id?: string }>(`/indicators/import-jobs`, {
    modelId: model.id,
    sourceType: 'manual',
    payload: {
      items: [
        {
          code: `E2E_GOV_WORKLIST_${Date.now()}`,
          name: 'governance-worklist-indicator',
          type: 'measure',
          simulateTransientFailure: true
        }
      ]
    },
    triggeredBy: 'e2e-worklist'
  })
  const jobId = String((importJob as Record<string, unknown>)?.id || '')
  expect(jobId).not.toBe('')

  await apiPost(`/indicators/import-jobs/${encodeURIComponent(jobId)}/execute`, {
    actor: 'e2e-worklist'
  })

  await page.goto('/governance?hub=1&hubActions=1')
  await page.getByTestId('governance-overview-model').selectOption(model.id)

  await page.getByTestId('governance-worklist-domain-filter').selectOption('indicator')
  const retryButton = page.locator('button', { hasText: 'Retry failed' }).first()
  await expect(retryButton).toBeVisible({ timeout: 30_000 })
  await retryButton.click()

  await expect(page.getByTestId('governance-worklist-action-status')).toContainText(/Action executed successfully|Batch executed/i, {
    timeout: 30_000
  })

  await page.getByTestId('governance-worklist-domain-filter').selectOption('ops')
  const ackButton = page.locator('button', { hasText: 'Ack alert' }).first()
  if (await ackButton.isVisible().catch(() => false)) {
    await ackButton.click()
    await expect(page.getByTestId('governance-worklist-action-status')).toContainText(/Action executed successfully|Batch executed/i, {
      timeout: 30_000
    })
  }
})
