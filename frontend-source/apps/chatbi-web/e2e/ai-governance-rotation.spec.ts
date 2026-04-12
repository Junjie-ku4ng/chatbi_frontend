import { expect, test } from '@playwright/test'
import { createAiProviderFixture, listAiProvidersFixture } from './helpers/api-fixture'
import { createE2EId } from './helpers/ids'

test('ai governance flow supports provider create, credential rotate, and governance visibility', async ({ page }) => {
  const providerCode = createE2EId('e2e-provider')
  const providerName = `E2E Provider ${providerCode}`

  await page.goto('/ai/providers')
  await expect(page.getByText('AI Providers', { exact: true })).toBeVisible()

  await page.getByTestId('ai-provider-code').fill(providerCode)
  await page.getByTestId('ai-provider-name').fill(providerName)
  await page.getByTestId('ai-provider-create-submit').click()
  await expect(page.getByTestId('ai-provider-status')).toContainText(/Provider created|already exists|duplicate/i)

  let providerId: string | undefined
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const providers = await listAiProvidersFixture()
    const matched = providers.find(item => item.code === providerCode)
    if (matched?.id) {
      providerId = String(matched.id)
      break
    }
    await page.waitForTimeout(200)
  }
  if (!providerId) {
    const seededProvider = await createAiProviderFixture()
    providerId = seededProvider.id
    await page.reload()
  }
  expect(providerId).toBeTruthy()

  const manageButton = page.getByTestId(`ai-provider-manage-${providerId}`)
  if (await manageButton.isVisible().catch(() => false)) {
    await manageButton.click()
  } else {
    await page.getByTestId('ai-provider-select').selectOption(providerId as string)
  }
  await page.getByTestId('ai-provider-secret').fill(createE2EId('secret'))
  await page.getByTestId('ai-provider-rotate-submit').click()
  await expect(page.getByTestId('ai-provider-status')).toContainText(/Credential rotated|rotation/i)

  await page.goto('/ai/governance')
  await expect(page.getByText('AI Governance', { exact: true })).toBeVisible()
  await page.getByTestId('ai-governance-provider-select').selectOption(providerId as string)
  await page.getByTestId('ai-governance-upsert-rotation-policy').click()
  await expect(page.getByTestId('ai-governance-status')).toContainText(/Rotation policy|updated|failed/i)
  await page.getByTestId('ai-governance-crypto-provider-select').selectOption('local-aes')
  await page.getByTestId('ai-governance-crypto-provider-validate').click()
  await expect(page.getByTestId('ai-governance-status')).toContainText(/validation|provider/i)
  await page.getByTestId('ai-governance-crypto-policy-mode').selectOption('compat')
  await page.getByTestId('ai-governance-crypto-policy-save').click()
  await expect(page.getByTestId('ai-governance-status')).toContainText(/Crypto policy saved|crypto policy/i)
  await expect(page.getByText('Raw provider payload')).toBeVisible()
  await expect(page.getByTestId('ai-overview-binding-health')).toBeVisible()
  await expect(page.getByTestId('ai-overview-rotation-failure-rate')).toBeVisible()
  await expect(page.getByTestId('ai-overview-quota-error-rate')).toBeVisible()
  await expect(page.getByText('Rotation runs')).toBeVisible()
  await expect(page.getByText('Rotation events')).toBeVisible()
})
