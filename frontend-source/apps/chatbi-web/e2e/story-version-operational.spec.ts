import { expect, test } from '@playwright/test'
import { createStoryFixture, pickModelFixture, publishStoryFixture } from './helpers/api-fixture'

test('story version list renders operational summary panels', async ({ page }) => {
  const model = await pickModelFixture()
  const story = await createStoryFixture(model.id, { title: `E2E story version ${Date.now()}` })
  await publishStoryFixture(story.id)

  await page.goto(`/project/${encodeURIComponent(story.id)}`)

  await expect(page.getByText('Versions')).toBeVisible()
  await expect(page.getByText('Snapshot').first()).toBeVisible()
  await expect(page.getByText('Change Summary').first()).toBeVisible()
  await expect(page.getByText('Advanced JSON').first()).toBeVisible()
})
