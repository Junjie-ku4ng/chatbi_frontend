import { expect, test } from '@playwright/test'
import { createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio sync workspace supports preview and manual run', async ({ page }) => {
  const model = await createSemanticModelFixture({
    name: `e2e-sync-preview-${Date.now()}`
  })

  await page.goto(`/semantic-studio/${model.id}`)

  await expect(page.getByTestId('semantic-sync-preview-refresh')).toBeVisible()
  await expect(page.getByTestId('semantic-sync-bridge-warning')).toContainText(/transition-only/i)
  await page.getByTestId('semantic-sync-profile-datasource').fill(model.dataSourceId ?? '')
  await page.getByTestId('semantic-sync-profile-save').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(/Sync profile updated/i)
  await page.getByTestId('semantic-sync-preview-refresh').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Sync preview')
  await expect(page.getByTestId('semantic-sync-preview-hierarchy-writes')).toContainText(/hierarch/i)
  await expect(page.getByTestId('semantic-sync-preview-level-writes')).toContainText(/level/i)
  await expect(page.getByTestId('semantic-sync-preview-relation-metadata-writes')).toContainText(/relation/i)

  await page.getByTestId('semantic-sync-run-manual').click()
  await expect(page.getByTestId('semantic-sync-runs-table')).toBeVisible()
  await expect(page.getByTestId('semantic-sync-run-timeline-warning')).toContainText(/Data Model Release/i)
  const href = await page.getByTestId('semantic-sync-run-timeline-warning').getByRole('link', { name: /Data Model Release/i }).getAttribute('href')
  const params = new URL(href ?? '', 'http://localhost').searchParams
  expect(params.get('modelId')).toBe(model.id)
  expect(params.get('dataSourceId')).toBe(model.dataSourceId)
  await expect(page.getByTestId('semantic-sync-runs-table')).toContainText(/transition_only/i)
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Sync run')
})
