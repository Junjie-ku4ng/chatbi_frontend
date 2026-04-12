import { expect, test } from '@playwright/test'
import { createStoryFixture, pickModelFixture } from './helpers/api-fixture'

test('feed cards show payload highlights with advanced json fallback', async ({ page }) => {
  const model = await pickModelFixture()
  await createStoryFixture(model.id, { title: `E2E feed detail ${Date.now()}` })

  await page.goto(`/feed?modelId=${encodeURIComponent(model.id)}`)
  await page.getByTestId('feed-model-select').selectOption(model.id)

  const firstRow = page.locator('[data-testid^="feed-row-"]').first()
  await expect(firstRow).toBeVisible({ timeout: 20_000 })

  await expect(firstRow.getByText(/action:/i)).toBeVisible()
  await expect(firstRow.locator('[data-testid^="feed-payload-highlights-"]')).toBeVisible()
  await expect(firstRow.getByText('Advanced JSON')).toBeVisible()
})
