import { expect, test } from '@playwright/test'
import { createE2EId } from './helpers/ids'
import { createStoryFixture, pickModelFixture } from './helpers/api-fixture'

test.setTimeout(120_000)

test('story designer supports visual widget flow and public share lifecycle', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  const story = await createStoryFixture(model.id, { title: createE2EId('Designer Story') })
  const widgetTitle = createE2EId('Designer Widget')
  const widgetContent = `Story insight ${Date.now()}`

  await page.goto(`/project/${story.id}/designer`)
  await expect(page.getByTestId('story-designer-widget-form')).toBeVisible()

  await page.getByTestId('story-designer-widget-type').selectOption('text')
  await page.getByTestId('story-designer-widget-title').fill(widgetTitle)
  await page.getByTestId('story-designer-widget-text-content').fill(widgetContent)
  await page.getByTestId('story-designer-widget-add').click()

  await expect(page.getByTestId('story-designer-status')).toContainText(/Widget added|Widget updated/)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText(widgetTitle)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText(widgetContent)

  await page.getByTestId('story-designer-share-create').click()
  await expect(page.getByTestId('story-designer-share-list')).toContainText('/public/story/')

  const firstPublicLink = page.locator('[data-testid^="story-designer-share-open-"]').first()
  const href = await firstPublicLink.getAttribute('href')
  expect(href).toBeTruthy()

  await page.goto(href as string)
  await expect(page.getByText(widgetTitle)).toBeVisible()
  await expect(page.getByText(widgetContent)).toBeVisible()
})
