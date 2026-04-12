import { expect, test } from '@playwright/test'
import { apiPost, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test('semantic studio relation timeline shows relation operations with filters', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const relationId = createE2EId('REL_TL_E2E')

  await apiPost(`/semantic-model/${encodeURIComponent(model.id)}/editor/operations`, {
    operations: [
      {
        operationType: 'add',
        targetType: 'relation',
        targetKey: relationId,
        payload: {
          id: relationId,
          sourceDimension: 'Product',
          sourceKey: 'SKU',
          targetDimension: 'Region',
          targetKey: 'Region',
          joinType: 'inner',
          cardinality: '1:n',
          active: true
        }
      }
    ]
  })

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await expect(page.getByTestId('semantic-relation-timeline')).toBeVisible()
  await page.getByTestId('semantic-relation-timeline-relation-filter').fill(relationId)
  await page.getByTestId('semantic-relation-timeline-apply').click()

  await expect(page.getByTestId('semantic-relation-timeline-table')).toContainText(relationId)
  await expect(page.getByTestId('semantic-relation-timeline-table')).toContainText('add')
})
