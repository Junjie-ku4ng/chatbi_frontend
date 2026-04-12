import { expect, test } from '@playwright/test'
import { apiPost, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

type IndicatorSeed = {
  id: string
}

test('indicator ops approval queue supports retrying failed batch results', async ({ page }) => {
  const model = await pickModelFixture()
  const code = createE2EId('E2E_APPROVAL')
  const indicator = await apiPost<IndicatorSeed>('/indicators', {
    modelId: model.id,
    code,
    name: `${code} Name`,
    type: 'measure',
    description: 'E2E indicator ops approval retry fixture'
  })

  await page.goto('/indicator-app')
  await page.getByTestId('indicator-ops-model-select').selectOption(model.id)

  const checkbox = page.getByTestId(`indicator-ops-approval-select-${indicator.id}`)
  await expect(checkbox).toBeVisible()
  await checkbox.check()

  await page.getByTestId('indicator-ops-approve-selected').click()
  await expect(page.getByTestId('indicator-ops-status')).toContainText('Batch vote finished')

  const retryButton = page.getByTestId('indicator-ops-retry-failed')
  await expect(retryButton).toBeVisible()
  await retryButton.click()

  await expect(page.getByTestId('indicator-ops-status')).toContainText('Batch vote finished')
  await expect(page.getByTestId('indicator-ops-approval-history-table')).toBeVisible()
})
