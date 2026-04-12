import { expect, test } from '@playwright/test'

test('loads home and navigates to ask', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ChatBI Product Workspace' })).toBeVisible()
  await page.getByRole('link', { name: 'Ask Workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Ask Workspace' })).toBeVisible()
})
