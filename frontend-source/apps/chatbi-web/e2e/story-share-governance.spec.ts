import { expect, test } from '@playwright/test'
import { createStoryFixture, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test.setTimeout(120_000)

test('story designer share governance shows usage and supports renew/revoke', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const story = await createStoryFixture(model.id, { title: createE2EId('Share Governance Story') })

  await page.goto(`/project/${story.id}/designer`)
  await page.getByTestId('story-designer-share-create').click()
  await expect(page.getByTestId('story-designer-share-list')).toContainText('/public/story/')

  const firstOpen = page.locator('[data-testid^=\"story-designer-share-open-\"]').first()
  const href = await firstOpen.getAttribute('href')
  expect(href).toBeTruthy()

  await page.goto(href as string)
  await expect(page.getByText('Shared Story')).toBeVisible()

  await page.goto(`/project/${story.id}/designer`)
  const usageButton = page.locator('[data-testid^=\"story-designer-share-usage-\"]').first()
  await usageButton.click()
  await expect(page.getByTestId('story-designer-share-list')).toContainText(/visits:/)

  const renewButton = page.locator('[data-testid^=\"story-designer-share-renew-\"]').first()
  await renewButton.click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Share link updated/)

  const revokeButton = page.locator('[data-testid^=\"story-designer-share-revoke-\"]').first()
  await revokeButton.click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Share link revoked/)
})
