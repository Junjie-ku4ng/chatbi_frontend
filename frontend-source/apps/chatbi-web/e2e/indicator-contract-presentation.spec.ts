import { expect, test } from '@playwright/test'
import { ensureIndicatorContractFixture, pickModelFixture } from './helpers/api-fixture'

test('indicator contract detail uses operational presentation as primary view', async ({ page }) => {
  const model = await pickModelFixture()
  const contractId = await ensureIndicatorContractFixture(model.id)

  await page.goto(`/indicator-contracts/${encodeURIComponent(contractId)}`)
  await expect(page.getByTestId('indicator-contract-presentation-strip')).toBeVisible()
  await expect(page.getByTestId('indicator-contract-presentation-table')).toBeVisible()

  await page.getByTestId('indicator-contract-presentation-table').locator('tbody tr').first().click()
  await expect(page.getByTestId('indicator-contract-detail-drawer')).toBeVisible()

  const contractJsonOpen = await page.getByTestId('indicator-contract-json').evaluate(node => {
    const details = node.closest('details') as HTMLDetailsElement | null
    return details?.open ?? false
  })
  expect(contractJsonOpen).toBe(false)
})
