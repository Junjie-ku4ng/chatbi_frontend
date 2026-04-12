import { expect, test } from '@playwright/test'
import { apiPost, createSemanticModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test('semantic studio graph v2 expands neighbors and keeps relation editing flow', async ({ page }) => {
  const model = await createSemanticModelFixture()
  const relationPrefix = createE2EId('REL_NEIGHBOR_V2')

  await apiPost(`/semantic-model/${encodeURIComponent(model.id)}/editor/operations`, {
    operations: [
      {
        operationType: 'add',
        targetType: 'relation',
        targetKey: `${relationPrefix}_1`,
        payload: {
          id: `${relationPrefix}_1`,
          sourceDimension: 'Product',
          sourceKey: 'SKU',
          targetDimension: 'Region',
          targetKey: 'Region',
          joinType: 'inner',
          cardinality: '1:n',
          active: true
        }
      },
      {
        operationType: 'add',
        targetType: 'relation',
        targetKey: `${relationPrefix}_2`,
        payload: {
          id: `${relationPrefix}_2`,
          sourceDimension: 'Region',
          sourceKey: 'Region',
          targetDimension: 'Period',
          targetKey: 'Month',
          joinType: 'left',
          cardinality: '1:n',
          active: true
        }
      }
    ]
  })

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await expect(page.getByTestId('semantic-graph-canvas')).toBeVisible()
  await page.getByTestId('semantic-graph-neighbor-center').selectOption('Region')
  await page.getByTestId('semantic-graph-expand-neighbors').click()

  await expect(page.getByTestId('semantic-studio-status')).toContainText('Graph neighbors expanded')
  await expect(page.getByTestId('semantic-graph-mode')).toContainText(/neighbors/i)
  await expect(page.getByTestId('semantic-studio-operations-table')).toContainText(`${relationPrefix}_1`)
  await expect(page.getByTestId('semantic-studio-operations-table')).toContainText(`${relationPrefix}_2`)

  await expect(page.getByTestId('semantic-relation-panel')).toBeVisible()
})
