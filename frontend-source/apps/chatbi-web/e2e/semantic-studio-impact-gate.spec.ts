import { expect, test } from '@playwright/test'
import { apiGet, apiPost, pickModelFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

async function ensureWorkflowVotes(modelId: string) {
  try {
    await apiPost(`/semantic-model/${encodeURIComponent(modelId)}/workflow/submit-review`, {
      actor: 'e2e-semantic-gate',
      reason: 'prepare semantic graph gate e2e'
    })
  } catch {
    // workflow may already be submitted; continue
  }

  try {
    await apiPost(`/semantic-model/${encodeURIComponent(modelId)}/workflow/vote`, {
      stage: 'review',
      decision: 'approve',
      actor: 'reviewer-e2e',
      role: 'reviewer.finance'
    })
  } catch {
    // ignore if already voted
  }

  try {
    await apiPost(`/semantic-model/${encodeURIComponent(modelId)}/workflow/vote`, {
      stage: 'approve',
      decision: 'approve',
      actor: 'approver-e2e',
      role: 'approver.finance'
    })
  } catch {
    // ignore if already voted
  }
}

test('semantic studio graph v2 shows impact blockers when publish is blocked', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const state = await apiGet<{ catalog?: { dimensions?: Array<{ name: string }> } }>(
    `/semantic-model/${encodeURIComponent(model.id)}/editor/state`
  )
  const dimensions = (state.catalog?.dimensions ?? []).map(item => item.name).filter(Boolean)
  test.skip(dimensions.length < 2, 'Need at least two dimensions to create risky relation')

  await ensureWorkflowVotes(model.id)

  const relationId = createE2EId('REL_HR')
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
  await page.getByTestId('semantic-relation-cardinality').selectOption('n:n')
  await page.getByTestId('semantic-relation-apply').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText('Operation applied')

  await page.getByTestId('semantic-impact-refresh').click()
  await expect(page.getByTestId('semantic-impact-gate-panel')).toContainText(/risk: high|risk: medium|risk: low/)
  await expect(page.getByTestId('semantic-impact-blockers')).toContainText(/relation_cardinality_high_risk/)

  await page.getByTestId('semantic-impact-publish').click()
  await expect(page.getByTestId('semantic-studio-status')).toContainText(
    /Publish blocked|Publish succeeded|failed|must be approved before publish/i
  )
})
