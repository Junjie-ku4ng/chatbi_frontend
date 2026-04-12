import { expect, test } from '@playwright/test'
import { createStoryFixture, pickModelFixture } from './helpers/api-fixture'

test('story template promote and reuse flow works from stories workspace', async ({ page }) => {
  const model = await pickModelFixture()
  const story = await createStoryFixture(model.id, {
    title: `E2E Template Source ${Date.now()}`
  })

  await page.goto(`/project?modelId=${encodeURIComponent(model.id)}`)
  await page.getByTestId('stories-model-select').selectOption(model.id)
  await expect(page.getByTestId(`story-row-${story.id}`)).toBeVisible({ timeout: 20_000 })

  await page.getByTestId(`story-template-promote-${story.id}`).click()
  await expect(page.getByTestId('stories-status-message')).toContainText(/Promoted as template/i, { timeout: 20_000 })

  await expect(page.getByTestId(`story-template-row-${story.id}`)).toBeVisible({ timeout: 20_000 })
  await page.getByTestId(`story-template-clone-${story.id}`).click()
  await expect(page.getByTestId('stories-status-message')).toContainText(/Template reused/i, { timeout: 20_000 })
})
