import { expect, test } from '@playwright/test'
import { createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio can onboard an existing PA cube as readonly binding', async ({ page }) => {
  const model = await createSemanticModelFixture({
    name: `e2e-sync-onboard-${Date.now()}`
  })

  await page.goto(`/semantic-studio/${model.id}`)

  await page.getByTestId('semantic-sync-open-onboard').click()
  await expect(page.getByTestId('semantic-sync-onboard-datasource-badge')).toBeVisible()
  await page.getByTestId('semantic-sync-onboard-search').click()

  const firstCube = page.locator('[data-testid^="semantic-sync-onboard-cube-"]').first()
  await expect(firstCube).toBeVisible()
  await firstCube.click()

  await page.getByTestId('semantic-sync-onboard-metadata').click()
  await page.getByTestId('semantic-sync-onboard-apply').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Onboarded model')
})
