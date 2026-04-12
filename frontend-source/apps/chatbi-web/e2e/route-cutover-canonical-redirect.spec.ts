import { expect, test } from '@playwright/test'

const removedLegacyRoutes = [
  '/ask',
  '/chatbi?modelId=model-cutover',
  '/insights',
  '/insights/insight-cutover',
  '/semantic-model/model-cutover/impact?fromVersion=1',
  '/stories/story-cutover/designer',
  '/indicator-ops',
  '/settings/organizations'
]

test('canonical release mode removes legacy aliases with 404', async ({ request }) => {
  for (const path of removedLegacyRoutes) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(404)
  }
})
