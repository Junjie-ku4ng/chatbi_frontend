import { expect, test } from '@playwright/test'
import { apiPost, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test('indicator ops executes import job and shows item detail workflow', async ({ page }) => {
  const model = await pickModelFixture()
  const code = createE2EId('E2E_IMPORT_JOB')
  const createdJob = await apiPost<{ id: string }>('/indicators/import-jobs', {
    modelId: model.id,
    sourceType: 'manual',
    triggeredBy: 'e2e-user',
    payload: {
      items: [
        {
          code,
          name: `${code} Name`,
          type: 'measure'
        }
      ]
    }
  })

  await page.goto('/indicator-app')
  await page.getByTestId('indicator-ops-model-select').selectOption(model.id)

  const executeButton = page.getByTestId(`indicator-ops-import-execute-${createdJob.id}`)
  await expect(executeButton).toBeVisible()
  await executeButton.click()

  await expect(page.getByTestId('indicator-ops-status')).toContainText('Import executed')

  await page.getByTestId(`indicator-ops-import-view-${createdJob.id}`).click()
  await expect(page.getByTestId('indicator-ops-job-detail-drawer')).toBeVisible()
  await expect(page.getByTestId('indicator-ops-job-items-table')).toBeVisible()
})
