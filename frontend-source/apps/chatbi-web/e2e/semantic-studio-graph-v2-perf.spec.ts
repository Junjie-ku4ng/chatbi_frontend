import { expect, test } from '@playwright/test'
import { apiPost, createSemanticModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

function buildPerfRelations(prefix: string, count: number) {
  return Array.from({ length: count }).map((_, index) => ({
    operationType: 'add',
    targetType: 'relation',
    targetKey: `${prefix}_${index}`,
    payload: {
      id: `${prefix}_${index}`,
      sourceDimension: 'Product',
      sourceKey: `SKU_${index}`,
      targetDimension: 'Region',
      targetKey: `REGION_${index}`,
      joinType: 'inner',
      cardinality: '1:n',
      active: true
    }
  }))
}

test('semantic studio graph v2 reaches ready state under performance budget', async ({ page }) => {
  const model = await createSemanticModelFixture()
  const prefix = createE2EId('REL_PERF_V2')
  await apiPost(`/semantic-model/${encodeURIComponent(model.id)}/editor/operations`, {
    operations: buildPerfRelations(prefix, 260)
  })

  const start = Date.now()
  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)
  await expect(page.getByTestId('semantic-graph-flow-ready')).toBeVisible()
  await expect(page.getByTestId('semantic-graph-mode')).toContainText(/mode:\s*window/i)
  const elapsed = Date.now() - start

  expect(elapsed).toBeLessThan(8000)
})
