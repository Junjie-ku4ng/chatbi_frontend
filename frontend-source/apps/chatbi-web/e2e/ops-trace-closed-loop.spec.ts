import { expect, test } from '@playwright/test'

test('ops trace pages render list and detail in xpert mode', async ({ page }) => {
  await page.goto('/ops/traces')

  await expect(page.getByTestId('ops-trace-filter-form')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ops-trace-refresh')).toBeVisible({ timeout: 30_000 })

  const firstTraceLink = page.getByRole('link', { name: /Open/i }).first()
  if (await firstTraceLink.isVisible().catch(() => false)) {
    await firstTraceLink.click()
    await expect(page.getByTestId('trace-detail-key')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('trace-timeline-kind-filter')).toBeVisible({ timeout: 30_000 })
  }
})
