import { expect, test } from '@playwright/test'

test('trace detail timeline page remains operational-first with collapsed advanced JSON', async ({ page }) => {
  const model = { id: 'e2e-model' }
  const traceKey = `e2e-trace-${Date.now()}`

  await page.route(`**/api/pa/conversations/${traceKey}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: traceKey,
          status: 'completed',
          createdAt: '2026-02-19T09:00:00.000Z',
          updatedAt: '2026-02-19T09:01:00.000Z',
          options: {
            modelId: model.id
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/my?**', async route => {
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              id: 'msg-1',
              conversationId: traceKey,
              role: 'assistant',
              status: 'success',
              content: 'seeded timeline row',
              createdAt: '2026-02-19T09:00:00.000Z'
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.goto(`/ops/traces/${encodeURIComponent(traceKey)}`)
  await expect(page.getByTestId('trace-run-summary-strip')).toBeVisible()
  await expect(page.getByTestId('trace-timeline')).toBeVisible()

  await page.getByTestId('trace-timeline').locator('tbody tr').first().click()
  const drawer = page.getByTestId('trace-timeline-detail-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Overview')).toBeVisible()
  await expect(drawer.getByText('Operational Fields')).toBeVisible()
  await expect(drawer.getByText('Diagnostics')).toBeVisible()
  await expect(drawer.getByText('Advanced JSON')).toBeVisible()

  const timelineJsonOpen = await page.getByTestId('trace-timeline-json').evaluate(node => {
    const details = node.closest('details') as HTMLDetailsElement | null
    return details?.open ?? false
  })
  expect(timelineJsonOpen).toBe(false)
})
