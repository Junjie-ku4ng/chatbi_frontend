import { expect, test } from '@playwright/test'
import { apiGet, apiPost, createSemanticModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

function buildWindowingRelations(prefix: string, count: number) {
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
      active: true,
      label: `Window ${index}`
    }
  }))
}

test('semantic studio graph v2 supports windowed loading for large relation graph', async ({ page }) => {
  const model = await createSemanticModelFixture()
  const prefix = createE2EId('REL_WIN_V2')
  await apiPost(`/semantic-model/${encodeURIComponent(model.id)}/editor/operations`, {
    operations: buildWindowingRelations(prefix, 260)
  })

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await expect(page.getByTestId('semantic-graph-canvas')).toBeVisible()
  await expect(page.getByTestId('semantic-graph-mode')).toContainText(/mode:\s*window/i)

  const loadMoreButton = page.getByTestId('semantic-graph-load-more')
  await expect(loadMoreButton).toBeVisible()
  await expect(loadMoreButton).toBeEnabled()

  await loadMoreButton.click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Graph window loaded')

  const state = await apiGet<{ graphMeta?: { modeApplied?: string; truncated?: boolean } }>(
    `/semantic-model/${encodeURIComponent(model.id)}/editor/state?graphMode=auto`
  )
  expect(state.graphMeta?.modeApplied).toBe('window')
  expect(state.graphMeta?.truncated).toBe(true)
})
