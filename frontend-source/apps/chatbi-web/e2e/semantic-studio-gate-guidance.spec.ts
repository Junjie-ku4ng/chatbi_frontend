import { expect, test } from '@playwright/test'
import { apiGet, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test('semantic studio impact panel shows blocker owner guidance', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const state = await apiGet<{ catalog?: { dimensions?: Array<{ name: string }> } }>(
    `/semantic-model/${encodeURIComponent(model.id)}/editor/state`
  )
  const dimensions = (state.catalog?.dimensions ?? []).map(item => item.name).filter(Boolean)
  test.skip(dimensions.length < 2, 'Need at least two dimensions to create risky relation')

  const relationId = createE2EId('REL_GUIDE_E2E')
  const sourceDimension = dimensions[0]
  const targetDimension = dimensions[1]

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await page.getByTestId('semantic-graph-source-dimension').selectOption(sourceDimension)
  await page.getByTestId('semantic-graph-target-dimension').selectOption(targetDimension)
  await page.getByTestId('semantic-graph-create-relation').click()

  await page.getByTestId('semantic-relation-id').fill(relationId)
  await page.getByTestId('semantic-relation-source-key').fill('id')
  await page.getByTestId('semantic-relation-target-key').fill('id')
  await page.getByTestId('semantic-relation-cardinality').selectOption('n:n')
  await page.getByTestId('semantic-relation-apply').click()

  await expect(page.getByTestId('semantic-studio-status')).toContainText('Operation applied')
  await page.getByTestId('semantic-studio-preview').click()

  await expect(page.getByTestId('semantic-impact-blockers')).toContainText('relation_cardinality_high_risk')
  await expect(page.getByTestId('semantic-impact-blocker-copy-relation_cardinality_high_risk')).toBeVisible()
  await expect(page.getByTestId('semantic-impact-blockers')).toContainText(/owner:/i)
})
