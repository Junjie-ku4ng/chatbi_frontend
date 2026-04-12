import { expect, test } from '@playwright/test'
import { ensureSemanticApprovalQueueFixture, pickModelFixture } from './helpers/api-fixture'

test('semantic governance supports queue batch vote and publish gate feedback', async ({ page }) => {
  const model = await pickModelFixture()
  await ensureSemanticApprovalQueueFixture(model.id)

  await page.goto('/models')
  await expect(page.getByTestId('bi-models-runtime-governance').getByText('Semantic Governance')).toBeVisible()
  const queueRows = page.locator('[data-testid^="semantic-queue-row-"]')
  if ((await queueRows.count()) > 0) {
    await queueRows.first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('[data-testid^="semantic-queue-select-"]').first().check({ force: true })
    await page.getByTestId('semantic-queue-batch-vote').click()
    await expect(page.getByTestId('semantic-queue-status-message')).toContainText(/Batch vote completed|failed/i)
    await expect(page.getByTestId('semantic-queue-status-message')).toContainText(/roleGaps=/i)
    await expect(page.getByTestId('semantic-queue-retry-failed')).toBeVisible()
  }

  await page.goto(`/models/${encodeURIComponent(model.id)}`)
  await expect(page.getByTestId('bi-models-runtime-detail').getByText('Semantic Model Detail')).toBeVisible()

  await page.getByTestId('semantic-vote-review').click()
  await expect(page.getByTestId('semantic-action-status')).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('semantic-publish').click()
  await expect(page.getByTestId('semantic-action-status')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('semantic-action-status')).toContainText(/workflow|publish|review|approve|completed|failed|blocked/i)
})
