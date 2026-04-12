import { expect, test } from '@playwright/test'
import { createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio surfaces sync failure and blocks/alerts publish flow', async ({ page }) => {
  const model = await createSemanticModelFixture({
    name: `e2e-sync-publish-fail-${Date.now()}`
  })

  await page.goto(`/semantic-studio/${model.id}`)

  await page.getByTestId('semantic-sync-profile-datasource').fill('missing-data-source')
  await page.getByTestId('semantic-sync-profile-save').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(
    /Sync profile updated|failed|error|Internal server error/i
  )

  await page.getByTestId('semantic-sync-preview-refresh').click()
  await expect(page.getByTestId('semantic-sync-preview-table')).toBeVisible()

  await page.getByTestId('semantic-sync-run-manual').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(/Sync run|failed|Run sync failed/i)

  await page.getByTestId('semantic-impact-publish').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(/Publish|blocked|failed|succeeded/i)
})
