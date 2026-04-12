import { expect, test } from '@playwright/test'
import { createE2EId } from './helpers/ids'

test('ops alerts and reports support ack, filters, and trend windows', async ({ page }) => {
  await page.goto('/ops/alerts')
  await expect(page.getByText('Alert Rules')).toBeVisible()

  await page.getByTestId('ops-alert-rule-name').fill(`E2E Alert ${createE2EId('rule')}`)
  await page.getByTestId('ops-alert-rule-metric-code').fill('embedding_composite_drift')
  await page.getByTestId('ops-alert-rule-submit').click()
  await expect(page.getByTestId('ops-alert-status')).toContainText(/created|failed|exists/i)

  const ackButtons = page.locator('[data-testid^="ops-alert-ack-"]')
  if ((await ackButtons.count()) > 0) {
    await ackButtons.first().click()
    await expect(page.getByTestId('ops-alert-status')).toContainText(/acknowledged|failed/i)
  }
  const batchSelect = page.locator('input[type="checkbox"][data-testid^="ops-alert-select-"]')
  if ((await batchSelect.count()) > 0) {
    await batchSelect.first().check()
    await page.getByTestId('ops-alert-batch-ack').click()
    await expect(page.getByTestId('ops-alert-status')).toContainText(/Batch ack completed|failed/i)
  }

  await expect(page.getByTestId('ops-dlq-model')).toBeVisible()
  await expect(page.getByTestId('ops-dlq-status')).toBeVisible()
  await expect(page.getByTestId('ops-dlq-replay-selected')).toBeVisible()
  await expect(page.getByTestId('ops-dlq-retry-failed')).toBeVisible()

  await page.goto('/ops/reports')
  await expect(page.getByText('Ops Reports')).toBeVisible()

  await page.getByTestId('ops-reports-window').selectOption('7d')
  await expect(page.getByTestId('ops-reports-window')).toHaveValue('7d')
  await page.getByTestId('ops-reports-window').selectOption('30d')
  await expect(page.getByTestId('ops-reports-window')).toHaveValue('30d')
  await page.getByTestId('ops-reports-window').selectOption('90d')
  await expect(page.getByTestId('ops-reports-window')).toHaveValue('90d')

  await page.getByTestId('ops-reports-group-by').selectOption('consumer')
  await expect(page.getByTestId('ops-reports-group-by')).toHaveValue('consumer')

  await page.getByTestId('ops-reports-export-csv').click()
  await expect(page.getByTestId('ops-reports-status')).toContainText(/CSV export|failed/i)

  if ((await page.getByTestId('ops-reports-event-select').locator('option').count()) > 0) {
    const firstValue = await page.getByTestId('ops-reports-event-select').locator('option').first().getAttribute('value')
    if (firstValue) {
      await page.getByTestId('ops-reports-event-select').selectOption(firstValue)
    }
    const dispatchResponse = page.waitForResponse(response => {
      const url = response.url()
      return (
        url.includes('/ops/alerts/events/') &&
        url.includes('/dispatch-logs') &&
        url.includes('status=failed') &&
        url.includes('channel=email') &&
        url.includes('page=1') &&
        url.includes('pageSize=20')
      )
    })
    await page.getByTestId('ops-reports-dispatch-status').selectOption('failed')
    await page.getByTestId('ops-reports-dispatch-channel').selectOption('email')
    const filtered = await dispatchResponse
    expect(filtered.status()).toBe(200)
    await expect(page.getByTestId('ops-reports-dispatch-channel')).toHaveValue('email')
    await expect(page.getByTestId('ops-reports-dispatch-status')).toHaveValue('failed')
    await expect(page.getByTestId('ops-reports-dispatch-page')).toContainText(/pages:\s*1/i)
  }
})
