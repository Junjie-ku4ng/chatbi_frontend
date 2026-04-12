import { expect, test } from '@playwright/test'

test('insights pages render in xpert contract mode', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByTestId('bi-dashboard-runtime-insights')).toBeVisible({ timeout: 30_000 })

  const firstInsight = page.locator('[data-testid="insights-page-root"] a[href^="/dashboard/"]').first()
  if (await firstInsight.isVisible().catch(() => false)) {
    await firstInsight.click()
    await expect(page.getByTestId('insight-feedback-correct')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('insight-comment-input').fill(`e2e-comment-${Date.now()}`)
    await page.getByTestId('insight-comment-submit').click()
    await expect(page.getByTestId('insight-status-message')).toBeVisible({ timeout: 30_000 })
  }
})
