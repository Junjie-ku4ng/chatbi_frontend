import { expect, test } from '@playwright/test'
import { bindAiModelFixture, createAiModelFixture, createAiProviderFixture, pickModelFixture } from './helpers/api-fixture'

test('ai bindings drawer renders structured operational fields', async ({ page }) => {
  const model = await pickModelFixture()
  const provider = await createAiProviderFixture()
  const aiModel = await createAiModelFixture(provider.id, 'llm')
  await bindAiModelFixture({
    semanticModelId: model.id,
    aiModelId: aiModel.id,
    task: 'nl2plan_llm'
  })

  await page.goto('/ai/bindings')
  await page.getByRole('combobox').first().selectOption(model.id)

  const matrixRows = page.getByTestId('ai-bindings-matrix-table').locator('tbody tr')
  const resolvedRows = page.getByTestId('ai-bindings-resolve-table').locator('tbody tr')

  if ((await matrixRows.count()) > 0) {
    await expect(matrixRows.first()).toBeVisible({ timeout: 20_000 })
    await matrixRows.first().click()
  } else {
    await expect(resolvedRows.first()).toBeVisible({ timeout: 20_000 })
    await resolvedRows.first().click()
  }

  const drawer = page.getByTestId('ai-bindings-detail-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Overview')).toBeVisible()
  await expect(drawer.getByText('Operational Fields')).toBeVisible()
  await expect(drawer.getByText('Diagnostics')).toBeVisible()
  await expect(drawer.getByText('Advanced JSON')).toBeVisible()
})
