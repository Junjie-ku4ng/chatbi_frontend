import { expect, test } from '@playwright/test'

test('ops reports page keeps operational table primary and advanced JSON collapsed', async ({ page }) => {
  await page.route('**/api/**/ops/reports/consumption/table**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          tenant: 'local',
          groupBy: 'tenant',
          window: '30d',
          from: '2026-01-20T00:00:00.000Z',
          to: '2026-02-19T00:00:00.000Z',
          page: 1,
          pageSize: 50,
          total: 1,
          items: [
            {
              groupKey: 'local',
              deliveries: 10,
              success: 9,
              failed: 1,
              dlq: 0
            }
          ],
          summary: {
            subscriptionCount: 1,
            activeSubscriptions: 1,
            pausedSubscriptions: 0,
            deliveries: 10,
            success: 9,
            failed: 1,
            dlq: 0,
            audits: 1,
            dlqOpen: 0
          }
        }
      }
    })
  })

  await page.route('**/api/**/indicator-webhooks/governance/reports/consumption**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: []
        }
      }
    })
  })

  await page.route('**/api/**/ops/alerts/events?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'event-e2e', metricCode: 'embedding_composite_drift' }],
          total: 1,
          limit: 50,
          offset: 0
        }
      }
    })
  })

  await page.route('**/api/**/ops/alerts/events/event-e2e/dispatch-logs**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'dispatch-e2e',
              channel: 'webhook',
              status: 'success',
              createdAt: '2026-02-19T10:00:00.000Z'
            }
          ],
          total: 1,
          page: 1,
          pageSize: 20
        }
      }
    })
  })

  await page.route('**/api/**/ask-review/cases/diagnostic_run/summary**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          lane: 'diagnostic_run',
          totalCases: 3,
          openCases: 1,
          needsMoreEvidenceCases: 0,
          resolvedCases: 2,
          approvedDecisions: 1,
          rejectedDecisions: 1,
          pendingDecisionCases: 1,
          overrideAuditCount: 0,
          avgDecisionLatencyMs: 1800000,
          oldestPendingRequestedAt: '2026-04-02T00:00:00.000Z',
          slaBreachedCases: 1,
          ageBuckets: {
            underOneHour: 0,
            underTwentyFourHours: 1,
            twentyFourHoursOrMore: 0
          }
        }
      }
    })
  })

  await page.route('**/api/**/ask-certifications/lanes/diagnostic_run**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          version: 'v1',
          lane: 'diagnostic_run',
          status: 'blocked',
          decision: 'blocked',
          blockers: ['review_decision_required'],
          metrics: {
            reviewState: 'backlog',
            certificationBlockerClass: 'review_backlog'
          },
          evidenceRefs: []
        }
      }
    })
  })

  await page.goto('/ops/reports')
  await expect(page.getByTestId('ops-reports-summary-strip')).toBeVisible()
  await expect(page.getByTestId('ops-reports-table')).toBeVisible()
  await expect(page.getByTestId('ops-reports-ask-ops-strip')).toBeVisible()
  await expect(page.getByTestId('ops-reports-certification-status')).toContainText(/blocked/i)
  await expect(page.getByTestId('ops-reports-certification-blockers')).toContainText('review_decision_required')

  await page.getByTestId('ops-reports-table').locator('tbody tr').first().click()
  await expect(page.getByTestId('ops-reports-detail-drawer')).toBeVisible()

  const tableJsonOpen = await page.getByTestId('ops-reports-table-json').evaluate(node => {
    const details = node.closest('details') as HTMLDetailsElement | null
    return details?.open ?? false
  })
  expect(tableJsonOpen).toBe(false)
})
