import { expect, test } from '@playwright/test'
import { createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio keeps readonly bridge skips explicit for operators', async ({ page }) => {
  const model = await createSemanticModelFixture({
    name: `e2e-sync-bridge-${Date.now()}`
  })

  await page.goto(`/semantic-studio/${model.id}`)

  await expect(page.getByTestId('semantic-sync-bridge-warning')).toContainText(/Data Model Release/i)
  await page.getByTestId('semantic-sync-profile-mode').selectOption('readonly_binding')
  await page.getByTestId('semantic-sync-profile-datasource').fill(model.dataSourceId ?? '')
  await page.getByTestId('semantic-sync-profile-save').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(/Sync profile updated/i)
  const href = await page.getByTestId('semantic-sync-bridge-link').getAttribute('href')
  const params = new URL(href ?? '', 'http://localhost').searchParams

  expect(params.get('modelId')).toBe(model.id)
  expect(params.get('dataSourceId')).toBe(model.dataSourceId)

  await page.getByTestId('semantic-sync-preview-refresh').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Sync preview')

  await page.getByTestId('semantic-sync-run-manual').click()
  await expect(page.getByTestId('semantic-sync-runs-table')).toBeVisible()
  await expect(page.getByTestId('semantic-sync-runs-table')).toContainText(/readonly_binding_bridge/i)
})
