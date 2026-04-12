import { expect, test } from '@playwright/test'
import { pickModelFixture } from './helpers/api-fixture'

test('semantic impact page renders operational-first layout with expandable advanced JSON', async ({ page }) => {
  const model = await pickModelFixture()

  await page.route(`**/api/pa/semantic-model/${encodeURIComponent(model.id)}/impact/summary**`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: model.id,
          generatedAt: '2026-02-19T10:00:00.000Z',
          windowHours: 168,
          risk: {
            level: 'medium',
            blockers: ['NO_OWNER'],
            blockersBySeverity: { error: 1, warning: 0, info: 0 }
          },
          affected: {
            queries: { total: 2, topItems: [] },
            stories: { total: 1, topItems: [] },
            indicators: { total: 1, topItems: [] }
          },
          blockerDetails: [
            {
              code: 'NO_OWNER',
              severity: 'error',
              ownerHint: 'data-governance',
              retryable: false
            }
          ],
          suggestedActions: ['Assign owner']
        }
      }
    })
  })

  await page.route(`**/api/pa/semantic-model/${encodeURIComponent(model.id)}/impact/cross-model**`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          blocked: true,
          summary: {
            impactedCount: 1,
            riskLevel: 'high'
          },
          impactedModels: [{ modelId: 'peer-model', relation: 'depends_on' }]
        }
      }
    })
  })

  await page.goto(`/models/${encodeURIComponent(model.id)}/impact`)
  await expect(page.getByTestId('semantic-impact-summary-strip')).toBeVisible()
  await expect(page.getByTestId('semantic-impact-blockers-table')).toBeVisible()

  await page.getByTestId('semantic-impact-blockers-table').locator('tbody tr').first().click()
  await expect(page.getByTestId('semantic-impact-detail-drawer')).toBeVisible()

  const summaryJsonOpen = await page.getByTestId('semantic-impact-summary-json').evaluate(node => {
    const details = node.closest('details') as HTMLDetailsElement | null
    return details?.open ?? false
  })
  expect(summaryJsonOpen).toBe(false)
})
