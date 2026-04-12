import { expect, test } from '@playwright/test'
import { apiGet } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'
import { pickModelFixture } from './helpers/api-fixture'

test('semantic studio graph v2 can create and persist relation edge', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const state = await apiGet<{ catalog?: { dimensions?: Array<{ name: string }> } }>(
    `/semantic-model/${encodeURIComponent(model.id)}/editor/state`
  )
  const dimensions = (state.catalog?.dimensions ?? []).map(item => item.name).filter(Boolean)
  test.skip(dimensions.length < 2, 'Need at least two dimensions to create relation edge')

  const relationId = createE2EId('REL_E2E')
  const sourceDimension = dimensions[0]
  const targetDimension = dimensions[1]

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await expect(page.getByTestId('semantic-graph-canvas')).toBeVisible()
  await page.getByTestId('semantic-graph-source-dimension').selectOption(sourceDimension)
  await page.getByTestId('semantic-graph-target-dimension').selectOption(targetDimension)
  await page.getByTestId('semantic-graph-create-relation').click()

  await expect(page.getByTestId('semantic-relation-panel')).toBeVisible()
  await page.getByTestId('semantic-relation-id').fill(relationId)
  await page.getByTestId('semantic-relation-source-key').fill('id')
  await page.getByTestId('semantic-relation-target-key').fill('id')
  await page.getByTestId('semantic-relation-cardinality').selectOption('1:n')
  await page.getByTestId('semantic-relation-apply').click()

  await expect(page.getByTestId('semantic-studio-status')).toContainText('Operation applied')
  await expect(page.getByTestId('semantic-studio-operations-table')).toContainText(relationId)
  await expect(page.getByTestId(`semantic-graph-edge-${relationId}`)).toBeVisible()

  await page.getByTestId('semantic-relation-validate').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Validation completed')

  await page.getByTestId('semantic-studio-preview').click()
  await expect(page.getByTestId('semantic-studio-preview-table')).toBeVisible()
})
