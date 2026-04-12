import { expect, test } from '@playwright/test'
import {
  bindAiModelFixture,
  createAiModelFixture,
  createAiProviderFixture,
  pickModelFixture
} from './helpers/api-fixture'

test('ai bindings page exposes resolution matrix operational table and detail drawer', async ({ page }) => {
  const semanticModel = await pickModelFixture()
  const provider = await createAiProviderFixture()
  const aiModel = await createAiModelFixture(provider.id, 'llm')
  await bindAiModelFixture({
    semanticModelId: semanticModel.id,
    aiModelId: aiModel.id,
    task: 'nl2plan_llm'
  })

  await page.route('**/api/pa/ai/model-bindings/resolution-matrix**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          generatedAt: '2026-02-19T10:00:00.000Z',
          summary: {
            total: 1,
            healthy: 1,
            degraded: 0,
            failed: 0
          },
          items: [
            {
              bindingId: 'binding-e2e',
              modelId: semanticModel.id,
              task: 'nl2plan_llm',
              strict: true,
              status: 'healthy',
              profile: {
                model: { id: aiModel.id, code: 'e2e-llm', name: 'E2E LLM', status: 'active' },
                provider: { id: provider.id, code: provider.code, name: provider.name, status: 'active' }
              },
              reason: null
            }
          ]
        }
      }
    })
  })

  await page.goto('/ai/bindings')
  await page.getByRole('combobox').first().selectOption(semanticModel.id)

  await expect(page.getByTestId('ai-bindings-matrix-strip')).toBeVisible()
  await expect(page.getByTestId('ai-bindings-matrix-table')).toBeVisible()
  await expect(page.getByTestId('ai-bindings-matrix-table').locator('tbody tr').first()).toBeVisible()

  await page.getByTestId('ai-bindings-matrix-table').locator('tbody tr').first().click()
  await expect(page.getByTestId('ai-bindings-detail-drawer')).toBeVisible()

  const matrixJsonOpen = await page.getByTestId('ai-bindings-matrix-json').evaluate(node => {
    const details = node.closest('details') as HTMLDetailsElement | null
    return details?.open ?? false
  })
  expect(matrixJsonOpen).toBe(false)
})
