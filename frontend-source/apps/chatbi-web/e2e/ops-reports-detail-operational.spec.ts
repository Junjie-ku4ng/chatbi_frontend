import { expect, test } from '@playwright/test'

test('ops reports row drawer renders structured sections', async ({ page }) => {
  await page.goto('/ops/reports')
  await expect(page.getByText('Ops Reports')).toBeVisible()

  const rows = page.getByTestId('ops-reports-table').locator('tbody tr')
  const rowCount = await rows.count()
  if (rowCount === 0) {
    await expect(page.getByTestId('ops-reports-table')).toBeVisible()
    return
  }

  await rows.first().click()
  const drawer = page.getByTestId('ops-reports-detail-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Overview')).toBeVisible()
  await expect(drawer.getByText('Operational Fields')).toBeVisible()
  await expect(drawer.getByText('Diagnostics')).toBeVisible()
  await expect(drawer.getByText('Advanced JSON')).toBeVisible()
})
