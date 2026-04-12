import { expect, test } from '@playwright/test'
import { createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio can generate sync delete confirmation token', async ({ page }) => {
  const model = await createSemanticModelFixture({
    name: `e2e-sync-delete-${Date.now()}`,
    schemaSnapshot: {
      measures: ['Revenue'],
      dimensions: [
        { name: 'Product', hierarchies: ['Product'], levels: ['Product'], members: ['All Products'] },
        { name: 'Measures', hierarchies: ['Measures'], levels: ['Measures'], members: ['Revenue'] }
      ]
    }
  })

  await page.goto(`/semantic-studio/${model.id}`)
  await page.getByTestId('semantic-sync-preview-refresh').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Sync preview')

  const openDeleteGuardButton = page.getByTestId('semantic-sync-delete-confirm-open')
  await expect(openDeleteGuardButton).toBeVisible()
  await openDeleteGuardButton.click()

  await page.getByTestId('semantic-sync-delete-generate').click()
  await expect(page.getByTestId('semantic-sync-delete-token')).toContainText('token ready')
})
