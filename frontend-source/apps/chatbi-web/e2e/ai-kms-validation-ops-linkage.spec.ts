import { expect, test } from '@playwright/test'
import { e2eApiBaseUrl, e2eAuthHeaders } from './helpers/auth'
import { createE2EId } from './helpers/ids'

test('ai governance validation history links to ops alert event filtering', async ({ page }) => {
  const ruleName = `E2E AI Crypto Rule ${createE2EId('kms')}`
  const tenant = process.env.NEXT_PUBLIC_DEV_TENANT || 'local'

  await apiRequest('/api/ops/alerts/rules', {
    method: 'POST',
    tenant,
    body: {
      scope: 'tenant',
      ruleCode: 'ai_crypto_event',
      name: ruleName,
      channel: 'webhook',
      target: 'http://127.0.0.1:9/e2e-kms-alert',
      status: 'active',
      config: {
        eventCodes: ['ai_crypto.live_validation_failed']
      }
    }
  })

  await apiRequest('/api/ai/governance/crypto/policy', {
    method: 'PUT',
    tenant,
    body: {
      policyMode: 'strict',
      allowMock: false,
      requireProviderValidation: false,
      validationTtlHours: 24
    }
  })

  const validateResult = await apiRequest<{ mode?: string; valid?: boolean }>('/api/ai/governance/crypto/providers/validate', {
    method: 'POST',
    tenant,
    body: {
      provider: 'local-aes',
      mode: 'live'
    }
  })
  expect(validateResult.mode).toBe('live')
  expect(validateResult.valid).toBe(false)

  const eventId = await waitForEventId('ai_crypto.live_validation_failed', tenant)
  expect(eventId).toBeTruthy()

  await page.goto('/ai/governance')
  await expect(page.getByText('AI Governance', { exact: true })).toBeVisible()
  await expect(page.getByTestId('ai-crypto-validation-history')).toBeVisible()
  await expect(page.getByTestId('ai-crypto-validation-history')).toContainText('local-aes')

  await page.goto('/ops/alerts')
  await expect(page.getByText('Alert Events', { exact: true })).toBeVisible()
  await page.getByTestId('ops-alert-event-code-filter').selectOption('ai_crypto.live_validation_failed')

  const selectEventButton = page.getByTestId(`ops-alert-select-event-${eventId}`)
  await expect(selectEventButton).toBeVisible()
  const eventCard = selectEventButton.locator('xpath=ancestor::article[1]')
  const governanceLink = eventCard.getByRole('link', { name: 'Open AI Governance' })
  await expect(governanceLink).toBeVisible()

  await expect(governanceLink).toHaveAttribute('href', '/ai/governance')
  await page.goto('/ai/governance')
  await expect(page).toHaveURL(/\/ai\/governance$/)
})

async function waitForEventId(eventCode: string, tenant: string) {
  const startedAt = Date.now()
  const timeoutMs = 8_000
  while (Date.now() - startedAt < timeoutMs) {
    const page = await apiRequest<{ items?: Array<{ id?: string; eventCode?: string }> }>(
      `/api/ops/alerts/events?eventCode=${encodeURIComponent(eventCode)}&limit=20&offset=0`,
      { tenant }
    )
    const items = page.items ?? []
    const event = items.find(item => String(item.eventCode ?? '') === eventCode)
    if (event?.id) {
      return String(event.id)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${eventCode} alert event`)
}

async function apiRequest<T>(
  path: string,
  input?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT'
    tenant?: string
    body?: unknown
  }
) {
  const response = await fetch(`${e2eApiBaseUrl}${path}`, {
    method: input?.method ?? 'GET',
    headers: {
      ...e2eAuthHeaders(),
      'x-tenant': input?.tenant ?? '',
      'content-type': 'application/json'
    },
    body: input?.body === undefined ? undefined : JSON.stringify(input.body)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`API ${input?.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`)
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }
  return payload as T
}
