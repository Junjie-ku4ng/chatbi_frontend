import { expect, test } from '@playwright/test'
import { createE2EId } from './helpers/ids'
import { apiGet, createSemanticModelFixture } from './helpers/api-fixture'

test('semantic studio can create and apply relation template', async ({ page }) => {
  const model = await createSemanticModelFixture()
  const state = await apiGet<{ catalog?: { dimensions?: Array<{ name: string }> } }>(
    `/semantic-model/${encodeURIComponent(model.id)}/editor/state`
  )
  const dimensions = (state.catalog?.dimensions ?? []).map(item => item.name).filter(Boolean)
  test.skip(dimensions.length < 2, 'Need at least two dimensions to create relation template')

  const relationId = createE2EId('REL_TPL_E2E')
  const templateName = createE2EId('TPL')
  const sourceDimension = dimensions[0]
  const targetDimension = dimensions[1]

  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)

  await expect(page.getByTestId('semantic-graph-canvas')).toBeVisible()
  await page.getByTestId('semantic-graph-source-dimension').selectOption(sourceDimension)
  await page.getByTestId('semantic-graph-target-dimension').selectOption(targetDimension)
  await page.getByTestId('semantic-graph-create-relation').click()

  await page.getByTestId('semantic-relation-id').fill(relationId)
  await page.getByTestId('semantic-relation-source-key').fill('id')
  await page.getByTestId('semantic-relation-target-key').fill('id')
  await page.getByTestId('semantic-relation-apply').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Operation applied')

  await page.getByTestId('semantic-template-name').fill(templateName)
  await page.getByTestId('semantic-template-description').fill('template from e2e')
  await page.getByTestId('semantic-template-create').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Relation template created')

  await page.getByTestId('semantic-relation-template-drawer').getByText(templateName).first().click()
  await page.getByTestId('semantic-template-apply').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(/Template applied/) 
  await expect(page.getByTestId(`semantic-graph-edge-${relationId}`)).toBeVisible()
})
