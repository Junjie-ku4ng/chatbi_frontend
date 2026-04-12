import { expect, test } from '@playwright/test'

function mockCapabilities(page: import('@playwright/test').Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  const routes = ['**/api/pa/auth/capabilities*', '**/api/xpert/auth/capabilities*']
  return Promise.all(routes.map(pattern => page.route(pattern, async route => route.fulfill({ json: payload }))))
}

test('semantic governance detail surfaces inherited policy templates and applies a recommended template', async ({ page }) => {
  const modelId = 'model-1'
  let effectiveSource: 'inherited' | 'explicit' = 'inherited'

  await mockCapabilities(page)

  await page.route(`**/api/xpert/semantic-model/${modelId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: modelId,
          name: 'Sales Model',
          cube: 'Sales',
          domain: 'sales',
          workflowStatus: 'review',
          schemaVersion: 4,
          riskLevel: 'medium'
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model/${modelId}/workflow/approvals?view=operational`, async route => {
    await route.fulfill({
      json: {
        data: {
          approvals: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model-governance/approval-queue**`, async route => {
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              modelId,
              name: 'Sales Model',
              cube: 'Sales',
              stage: 'review',
              status: 'review',
              blockers: [],
              quorum: {
                minReviewers: 1,
                minApprovers: 1,
                reviewApprovals: 0,
                approveApprovals: 0
              }
            }
          ],
          total: 1,
          limit: 1,
          offset: 0
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model-governance/models/${modelId}/effective-templates`, async route => {
    await route.fulfill({
      json: {
        data: {
          modelId,
          policyTemplate: {
            source: effectiveSource,
            template: {
              id: 'policy-sales',
              name: 'Sales Default',
              domain: 'sales'
            }
          },
          approvalTemplate: {
            source: 'inherited',
            template: {
              id: 'approval-sales',
              name: 'Sales Approval',
              domain: 'sales'
            }
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model-governance/policy-templates?**', async route => {
    await route.fulfill({
      json: {
        data: [
          {
            id: 'policy-sales',
            name: 'Sales Default',
            domain: 'sales',
            status: 'active',
            rules: {}
          }
        ]
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model-governance/models/${modelId}/policy-template/apply`, async route => {
    effectiveSource = 'explicit'
    await route.fulfill({
      json: {
        data: {
          modelId,
          policyTemplate: {
            id: 'policy-sales',
            name: 'Sales Default',
            domain: 'sales'
          }
        }
      }
    })
  })

  await page.goto(`/models/${modelId}`)

  await expect(page.getByTestId('semantic-policy-template-panel')).toContainText('inherited')
  await expect(page.getByTestId('semantic-policy-template-panel')).toContainText('Sales Default')

  await page.getByTestId('semantic-policy-template-apply').click()

  await expect(page.getByTestId('semantic-policy-template-panel')).toContainText('explicit')
  await expect(page.getByTestId('semantic-action-status')).toContainText('Policy template applied')
})
