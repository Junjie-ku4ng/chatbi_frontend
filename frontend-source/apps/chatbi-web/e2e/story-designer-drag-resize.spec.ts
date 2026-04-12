import { expect, test } from '@playwright/test'
import { createE2EId } from './helpers/ids'
import { createStoryFixture, pickModelFixture } from './helpers/api-fixture'

test.setTimeout(120_000)

test('story designer supports drag reorder and resize/save workflow', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const story = await createStoryFixture(model.id, { title: createE2EId('Designer Drag Story') })

  await page.goto(`/project/${story.id}/designer`)
  await expect(page.getByTestId('story-designer-widget-form')).toBeVisible()

  await page.getByTestId('story-designer-widget-type').selectOption('text')
  await page.getByTestId('story-designer-widget-title').fill('Widget A')
  await page.getByTestId('story-designer-widget-text-content').fill('A content')
  await page.getByTestId('story-designer-widget-add').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Widget added|Widget updated/)

  await page.getByTestId('story-designer-widget-title').fill('Widget B')
  await page.getByTestId('story-designer-widget-text-content').fill('B content')
  await page.getByTestId('story-designer-widget-add').click()
  await expect(page.getByTestId('story-designer-widget-list')).toContainText('Widget B')

  const cards = page.locator('[data-testid^=\"story-designer-widget-card-\"]')
  await expect(cards).toHaveCount(2)
  const firstCardId = await cards.nth(0).getAttribute('data-testid')
  const secondCardId = await cards.nth(1).getAttribute('data-testid')
  expect(firstCardId).toBeTruthy()
  expect(secondCardId).toBeTruthy()
  const firstHandle = `${firstCardId?.replace('card', 'handle')}`
  const secondHandle = `${secondCardId?.replace('card', 'handle')}`

  await page.dragAndDrop(`[data-testid=\"${secondHandle}\"]`, `[data-testid=\"${firstCardId}\"]`)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText('Widget B')

  await page.locator(`[data-testid=\"${secondCardId}\"]`).click()
  await page.getByTestId('story-designer-properties-layout-w').fill('8')
  await page.getByTestId('story-designer-properties-layout-h').fill('5')
  await page.getByTestId('story-designer-properties-save').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Widget updated/)
})
