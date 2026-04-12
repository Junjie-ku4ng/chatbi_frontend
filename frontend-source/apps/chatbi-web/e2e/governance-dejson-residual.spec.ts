import { expect, test } from '@playwright/test'
import { pickModelFixture, triggerToolsetExecutionFixture } from './helpers/api-fixture'

async function selectModelIfAvailable(input: {
  page: Parameters<typeof test>[0]['page']
  modelId: string
  testId?: string
  locator?: ReturnType<Parameters<typeof test>[0]['page']['getByRole']>
}) {
  const select = input.locator ?? input.page.getByTestId(input.testId ?? '')
  await expect(select).toBeVisible()

  const optionValue = await select.evaluate((element, modelId) => {
    const options = Array.from((element as HTMLSelectElement).options)
    return options.some(option => option.value === modelId) ? modelId : options[0]?.value ?? null
  }, input.modelId)

  if (optionValue) {
    await select.selectOption(optionValue)
  }
}

test('residual governance drawers render structured operational sections', async ({ page }) => {
  const model = await pickModelFixture()

  await page.goto('/indicator-consumers')
  await expect(page.getByText('Indicator Consumers')).toBeVisible()
  await selectModelIfAvailable({
    page,
    locator: page.getByRole('combobox').first(),
    modelId: model.id
  })
  const indicatorRows = page.getByTestId('indicator-consumers-table').locator('tbody tr')
  if ((await indicatorRows.count()) > 0) {
    await indicatorRows.first().click()
    const indicatorDrawer = page.getByTestId('indicator-consumers-detail-drawer')
    await expect(indicatorDrawer).toBeVisible()
    await expect(indicatorDrawer.getByText('Overview')).toBeVisible()
    await expect(indicatorDrawer.getByText('Operational Fields')).toBeVisible()
    await expect(indicatorDrawer.getByText('Diagnostics')).toBeVisible()
    await indicatorDrawer.getByRole('button', { name: 'Close' }).click()
  } else {
    await expect(page.getByTestId('loadable-empty-state')).toContainText('No consumer registrations')
  }

  await page.goto('/toolset/learning')
  await expect(page.getByTestId('toolset-learning-filter-form')).toBeVisible()
  await triggerToolsetExecutionFixture(model.id).catch(() => undefined)
  await selectModelIfAvailable({ page, testId: 'toolset-learning-model-select', modelId: model.id })
  await page.getByTestId('toolset-learning-filter-submit').click()
  const toolsetRows = page.getByTestId('toolset-learning-execution-table').locator('tbody tr')
  if ((await toolsetRows.count()) > 0) {
    await toolsetRows.first().click()
    const toolsetDrawer = page.getByTestId('toolset-learning-detail-drawer')
    await expect(toolsetDrawer).toBeVisible()
    await expect(toolsetDrawer.getByText('Overview')).toBeVisible()
    await expect(toolsetDrawer.getByText('Operational Fields')).toBeVisible()
    await expect(toolsetDrawer.getByText('Diagnostics')).toBeVisible()
    await expect(toolsetDrawer.getByText('Advanced JSON')).toBeVisible()
    await toolsetDrawer.getByRole('button', { name: 'Close' }).click()
  } else {
    await expect(page.getByTestId('loadable-empty-state')).toContainText('No execution rows')
  }

  await page.goto('/ops')
  await expect(page.getByText('Ops Dashboard')).toBeVisible()
  const opsRows = page.getByTestId('ops-dashboard-consumption-table').locator('tbody tr')
  if ((await opsRows.count()) > 0) {
    await opsRows.first().click()
    const opsDrawer = page.getByTestId('ops-dashboard-detail-drawer')
    await expect(opsDrawer).toBeVisible()
    await expect(opsDrawer.getByText('Overview')).toBeVisible()
    await expect(opsDrawer.getByText('Operational Fields')).toBeVisible()
    await expect(opsDrawer.getByText('Diagnostics')).toBeVisible()
    await expect(opsDrawer.getByText('Advanced JSON')).toBeVisible()
    await opsDrawer.getByRole('button', { name: 'Close' }).click()
  } else {
    await expect(page.getByText(/No report rows|No data/i)).toBeVisible()
  }
})
