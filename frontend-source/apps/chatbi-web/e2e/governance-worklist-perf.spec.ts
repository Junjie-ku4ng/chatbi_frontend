import { expect, test } from '@playwright/test'

async function mockGovernancePerfApis(page: import('@playwright/test').Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'perf-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })

  await page.route('**/api/xpert/semantic-model?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'model-perf', name: 'Perf Model', cube: 'sales', runtime: 'chatbi' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/governance/overview?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: 'model-perf',
          windowHours: 72,
          generatedAt: new Date().toISOString(),
          model: { id: 'model-perf', name: 'Perf Model', cube: 'sales' },
          domains: {
            semantic: { queueItems: 1, blockers: 0, roleGaps: 0, status: 'ok', riskLevel: 'low' },
            indicator: { contracts: 1, published: 1, breakingIndicators: 0, incompatibleConsumers: 0 },
            ai: { bindings: 1, unhealthyBindings: 0, rotationFailureRate: 0 },
            toolset: { totalOutcomes: 1, failureCount: 0, p95LatencyMs: 80 },
            ops: { totalAlerts: 1, openAlerts: 0, ackedAlerts: 1, closedAlerts: 0 }
          },
          worklistSummary: {
            totalOpen: 1,
            criticalOpen: 0,
            actionableCount: 1
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/governance/risks/hotspots?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ domain: 'semantic', key: 'queue', label: 'queue', value: 1, severity: 'warn' }]
        }
      }
    })
  })

  await page.route('**/api/xpert/governance/activity/recent?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: 'model-perf',
          windowHours: 72,
          generatedAt: new Date().toISOString(),
          items: [{ domain: 'semantic', signal: 'queue_update', value: 1, recordedAt: new Date().toISOString() }],
          total: 1,
          limit: 20,
          offset: 0,
          nextCursor: null
        }
      }
    })
  })

  await page.route('**/api/xpert/governance/worklist?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: 'model-perf',
          windowHours: 72,
          generatedAt: new Date().toISOString(),
          items: [
            {
              id: 'work-item-1',
              domain: 'semantic',
              severity: 'warn',
              status: 'open',
              title: 'Review semantic queue',
              summary: '1 item pending',
              resource: { type: 'semantic_model', id: 'model-perf' },
              actionType: 'open_detail',
              actionPayload: {},
              route: '/models/model-perf',
              createdAt: new Date().toISOString()
            }
          ],
          total: 1,
          limit: 50,
          offset: 0,
          nextCursor: null
        }
      }
    })
  })
}

test('governance worklist reaches ready state within budget', async ({ page }) => {
  await mockGovernancePerfApis(page)

  const startedAt = Date.now()
  await page.goto(`/governance?hub=1&hubActions=1`)
  await page.getByTestId('governance-overview-model').selectOption('model-perf')
  await expect(page.getByTestId('governance-worklist-ready')).toBeVisible({ timeout: 30_000 })
  const elapsed = Date.now() - startedAt

  expect(elapsed).toBeLessThan(1500)
})
