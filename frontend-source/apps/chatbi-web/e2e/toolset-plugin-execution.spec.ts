import { expect, test } from '@playwright/test'
import { pickModelFixture, triggerToolsetExecutionFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

async function selectModelIfAvailable(input: { page: Parameters<typeof test>[0]['page']; testId: string; modelId: string }) {
  const select = input.page.getByTestId(input.testId)
  await expect(select).toBeVisible()

  const optionValue = await select.evaluate((element, modelId) => {
    const options = Array.from((element as HTMLSelectElement).options)
    return options.some(option => option.value === modelId) ? modelId : options[0]?.value ?? null
  }, input.modelId)

  if (optionValue) {
    await select.selectOption(optionValue)
  }
}

test('toolset plugin lifecycle and learning executions are visible', async ({ page }) => {
  const model = await pickModelFixture()
  const pluginCode = createE2EId('e2e-plugin')
  const pluginName = `E2E Plugin ${pluginCode}`

  await page.goto('/toolset/plugins')
  await expect(page.getByText('Toolset Plugins')).toBeVisible()

  await page.getByTestId('toolset-plugin-code').fill(pluginCode)
  await page.getByTestId('toolset-plugin-name').fill(pluginName)
  await page.getByTestId('toolset-plugin-create-submit').click()
  await expect(page.getByTestId('toolset-plugin-status')).toContainText(/Plugin created|already exists|duplicate/i)

  const pluginRow = page.locator('article').filter({ hasText: pluginName }).first()
  const selectButton = pluginRow.getByRole('button', { name: 'Select' })
  const selectTestId = (await selectButton.getAttribute('data-testid')) ?? ''
  const pluginId = selectTestId.replace('toolset-plugin-select-', '')
  expect(pluginId).not.toBe('')
  await selectButton.click()

  await page.getByTestId('toolset-plugin-version').fill('v1')
  await page.getByTestId('toolset-plugin-signature').fill(createE2EId('sig'))
  await page.getByTestId('toolset-plugin-version-submit').click()
  await expect(page.getByTestId('toolset-plugin-status')).toContainText(/version created|failed|exists/i)

  await page.getByTestId('toolset-plugin-publish-submit').click()
  await expect(page.getByTestId('toolset-plugin-status')).toContainText(/published|failed|signature/i)

  await page.getByTestId('toolset-plugin-policy-payload').fill('64')
  await page.getByTestId('toolset-plugin-policy-domains').fill('indicator_governance')
  await page.getByTestId('toolset-plugin-policy-submit').click()
  await expect(page.getByTestId('toolset-plugin-status')).toContainText(/policy saved|failed/i)

  await triggerToolsetExecutionFixture(model.id, { payload: { oversized: 'x'.repeat(300) } }).catch(() => undefined)

  await page.goto('/toolset/learning')
  await expect(page.locator('strong', { hasText: 'Toolset Learning' })).toBeVisible()
  await selectModelIfAvailable({ page, testId: 'toolset-learning-model-select', modelId: model.id })
  await page.getByTestId('toolset-learning-plugin-id').fill(pluginId)
  await page.getByTestId('toolset-learning-policy-violation').selectOption('violated')
  await page.getByTestId('toolset-learning-filter-submit').click()
  await page.getByTestId('toolset-learning-replay-submit').click()
  await expect(page.getByTestId('toolset-learning-status-message')).toContainText(/Replay completed|failed/i)
  await expect(page.getByText('Learning insights')).toBeVisible()
  await expect(page.getByTestId('toolset-ops-summary-status-breakdown')).toBeVisible()
  await expect(page.getByTestId('toolset-ops-summary-p95')).toBeVisible()
  const executionRows = page.getByTestId('toolset-learning-execution-table').locator('tbody tr')
  if ((await executionRows.count()) > 0) {
    await executionRows.first().click()
    const drawer = page.getByTestId('toolset-learning-detail-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Overview')).toBeVisible()
    await expect(drawer.getByText('Operational Fields')).toBeVisible()
    await expect(drawer.getByText('Diagnostics')).toBeVisible()
    await expect(drawer.getByText('Advanced JSON')).toBeVisible()
  } else {
    await expect(page.getByTestId('loadable-empty-state')).toContainText('No execution rows')
  }
})
