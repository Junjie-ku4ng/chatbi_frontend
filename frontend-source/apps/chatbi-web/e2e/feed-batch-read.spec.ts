import { expect, test } from '@playwright/test'
import { createStoryFixture, pickModelFixture, publishStoryFixture } from './helpers/api-fixture'

test('feed page supports multi-select batch read workflow', async ({ page }) => {
  const model = await pickModelFixture()
  const story = await createStoryFixture(model.id, {
    title: `E2E Feed Batch ${Date.now()}`
  })
  await publishStoryFixture(story.id)

  await page.goto(`/feed?modelId=${encodeURIComponent(model.id)}`)
  await page.getByTestId('feed-model-select').selectOption(model.id)
  await expect(page.getByTestId('feed-select-all')).toBeVisible({ timeout: 20_000 })

  const rowCheckboxes = page.locator('input[data-testid^="feed-select-"]:not([data-testid="feed-select-all"])')
  await expect(rowCheckboxes.first()).toBeVisible({ timeout: 20_000 })

  const totalRows = await rowCheckboxes.count()
  const toSelect = Math.min(2, totalRows)
  for (let index = 0; index < toSelect; index += 1) {
    await rowCheckboxes.nth(index).check()
  }

  await expect(page.getByTestId('feed-selected-count')).toContainText(`selected: ${toSelect}`)
  await page.getByTestId('feed-batch-read-submit').click()
  await expect(page.getByTestId('feed-status')).toContainText(/Batch read:/i, { timeout: 20_000 })
  await expect(page.getByTestId('feed-selected-count')).toContainText('selected: 0')
})
