import { expect, test } from '@playwright/test'
import { createE2EId } from './helpers/ids'
import { pickModelFixture } from './helpers/api-fixture'

test('semantic studio supports operation apply + validate + preview workflow', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const measureCode = createE2EId('E2E_MEASURE')

  await page.goto(`/semantic-studio/${model.id}`)

  await expect(page.getByTestId('semantic-studio-entity-search')).toBeVisible()
  await expect(page.getByTestId('semantic-studio-field-specs')).toBeVisible()
  await expect(page.getByTestId('semantic-studio-measure-form')).toBeVisible()
  await page.getByTestId('semantic-studio-measure-code').fill(measureCode)
  await page.getByTestId('semantic-studio-measure-apply').click()

  await expect(page.getByTestId('semantic-studio-status')).toContainText('Operation applied')
  await expect(page.getByTestId('semantic-studio-operations-table')).toContainText(measureCode)

  await page.getByTestId('semantic-studio-validate').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Validation completed')

  await page.getByTestId('semantic-studio-preview').click()
  await expect(page.getByTestId('semantic-studio-preview-table')).toBeVisible()
  await expect(page.getByTestId('semantic-studio-preview-risk')).toBeVisible()
  await expect(page.getByTestId('semantic-studio-preview-table')).toContainText('measure:')
  await expect(page.getByTestId('semantic-studio-preview-table')).toContainText(/added|removed|updated/)
})
