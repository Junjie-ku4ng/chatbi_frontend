import { expect, test } from '@playwright/test'
import { pickModelFixture } from './helpers/api-fixture'

test('governance overview shows cross-domain governance snapshot', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })

  await page.goto('/governance')

  await page.getByTestId('governance-overview-model').selectOption(model.id)
  await expect(page.getByText('Governance Overview')).toBeVisible()
  await expect(page.getByText('Risk hotspots')).toBeVisible()
  await expect(page.getByText('Recent activity')).toBeVisible()
  await expect(page.getByTestId('governance-card-semantic')).toBeVisible()
  await expect(page.getByTestId('governance-card-indicator')).toBeVisible()
  await expect(page.getByTestId('governance-card-ai')).toBeVisible()
  await expect(page.getByTestId('governance-card-toolset')).toBeVisible()
})
