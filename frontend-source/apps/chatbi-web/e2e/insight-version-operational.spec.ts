import { expect, test } from '@playwright/test'
import { createInsightFixture, pickModelFixture } from './helpers/api-fixture'

test('insight version timeline renders structured summary sections', async ({ page }) => {
  const model = await pickModelFixture()
  const insight = await createInsightFixture(model.id)

  await page.goto(`/dashboard/${encodeURIComponent(insight.id)}`)

  await expect(page.getByText('Version Timeline')).toBeVisible()
  await expect(page.getByText('Snapshot').first()).toBeVisible()
  await expect(page.getByText('Change Summary').first()).toBeVisible()
  await expect(page.getByText('Advanced JSON').first()).toBeVisible()
})
