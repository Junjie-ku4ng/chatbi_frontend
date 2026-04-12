import { expect, test } from '@playwright/test'
import { ensureIndicatorContractFixture, pickModelFixture } from './helpers/api-fixture'

test('indicator contract detail renders compatibility diff fields', async ({ page }) => {
  const model = await pickModelFixture()
  const contractId = await ensureIndicatorContractFixture(model.id)

  await page.goto('/indicator-contracts')
  await page.getByTestId('indicator-contract-model-select').selectOption(model.id)
  await expect(page.getByTestId('indicator-contract-summary-contracts')).toBeVisible()
  await expect(page.getByTestId('indicator-contract-summary-breaking')).toBeVisible()
  await expect(page.getByTestId('indicator-contract-summary-incompatible')).toBeVisible()

  await page.goto(`/indicator-contracts/${encodeURIComponent(contractId)}`)
  await expect(page.getByText('Indicator Contract Detail')).toBeVisible()
  await page.locator('details').first().locator('summary').click()
  await expect(page.getByTestId('indicator-contract-json')).toBeVisible()
  const unavailable = page.getByTestId('indicator-contract-diff-unavailable')
  const diffJson = page.getByTestId('indicator-contract-diff-json')
  if (await unavailable.isVisible().catch(() => false)) {
    await expect(unavailable).toBeVisible()
  } else {
    await expect(diffJson).toBeVisible()
    await expect(page.getByTestId('indicator-contract-changed-count')).toBeVisible()
    await expect(page.getByTestId('indicator-contract-breaking-count')).toBeVisible()
  }
})
