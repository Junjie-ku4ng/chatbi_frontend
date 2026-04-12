import { expect, test } from '@playwright/test'

type CapabilityMode = 'full' | 'readOnly'

function mockCapabilities(page: import('@playwright/test').Page, mode: CapabilityMode = 'full') {
  const writeScopes = mode === 'full' ? ['allow:write:model:*'] : []
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: writeScopes,
        denyRead: [],
        denyWrite: []
      }
    }
  }

  const routes = ['**/api/pa/auth/capabilities*', '**/api/xpert/auth/capabilities*']
  return Promise.all(
    routes.map(pattern =>
      page.route(pattern, async route => {
        await route.fulfill({ json: payload })
      })
    )
  )
}

async function mockTenantSettingApi(page: import('@playwright/test').Page) {
  let updateCount = 0
  const updated = {
    tenantName: 'PA Nexus',
    timezone: 'Asia/Shanghai',
    defaultLanguage: 'zh-CN'
  }

  await page.route('**/api/xpert/tenant-setting*', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: updated
        }
      })
      return
    }
    if (method === 'POST') {
      updateCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: updated
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getUpdateCount: () => updateCount
  }
}

async function mockUsersApi(page: import('@playwright/test').Page) {
  let deactivateCount = 0

  await page.route('**/api/xpert/user-organization?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'uo-1',
              isActive: true,
              role: { name: 'Analyst' },
              user: { id: 'user-1', name: 'Alice', email: 'alice@pa.ai' }
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/user-organization/*', async route => {
    if (route.request().method() === 'PUT') {
      deactivateCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'uo-1',
            isActive: false,
            user: { id: 'user-1', name: 'Alice', email: 'alice@pa.ai' }
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDeactivateCount: () => deactivateCount
  }
}

async function mockOrganizationsApi(page: import('@playwright/test').Page) {
  let demoCount = 0

  await page.route('**/api/xpert/organization?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'org-1',
              name: 'Growth BU',
              tenantId: 'tenant-1'
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/organization/*/demo', async route => {
    if (route.request().method() === 'POST') {
      demoCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            ok: true
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDemoCount: () => demoCount
  }
}

async function mockRolesApi(page: import('@playwright/test').Page) {
  let deleteCount = 0

  await page.route('**/api/xpert/roles*', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            items: [
              {
                id: 'role-1',
                name: 'ANALYST'
              }
            ],
            total: 1
          }
        }
      })
      return
    }
    await route.fallback()
  })

  await page.route('**/api/xpert/roles/*', async route => {
    if (route.request().method() === 'DELETE') {
      deleteCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'role-1'
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDeleteCount: () => deleteCount
  }
}

async function mockKnowledgebaseApi(page: import('@playwright/test').Page) {
  let deleteCount = 0

  await page.route('**/api/xpert/knowledgebase?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'kb-1', name: 'Revenue KB' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/knowledgebase/*', async route => {
    if (route.request().method() === 'DELETE') {
      deleteCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'kb-1'
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDeleteCount: () => deleteCount
  }
}

async function mockIntegrationApi(page: import('@playwright/test').Page) {
  let deleteCount = 0

  await page.route('**/api/xpert/integration?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'int-1', name: 'DingTalk Bot', provider: 'dingtalk' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/integration/*', async route => {
    if (route.request().method() === 'DELETE') {
      deleteCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'int-1'
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDeleteCount: () => deleteCount
  }
}

async function mockFeatureToggleApi(page: import('@playwright/test').Page) {
  let toggleCount = 0

  await page.route('**/api/xpert/feature/toggle**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            items: [{ id: 'fo-1', feature: { code: 'chat' }, isEnabled: true }],
            total: 1
          }
        }
      })
      return
    }
    if (method === 'POST') {
      toggleCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: [true]
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getToggleCount: () => toggleCount
  }
}

async function mockPluginApi(page: import('@playwright/test').Page) {
  let uninstallCount = 0

  await page.route('**/api/xpert/plugin**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: [{ name: 's3-loader', meta: { title: 'S3 Loader' }, isGlobal: false }]
        }
      })
      return
    }
    if (method === 'DELETE') {
      uninstallCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: null
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getUninstallCount: () => uninstallCount
  }
}

async function mockDataSourcesApi(page: import('@playwright/test').Page) {
  let deleteCount = 0

  await page.route('**/api/xpert/data-source?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'ds-1', name: 'Sales Warehouse', type: 'postgres' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/data-source/*', async route => {
    if (route.request().method() === 'DELETE') {
      deleteCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'ds-1'
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getDeleteCount: () => deleteCount
  }
}

async function mockAccountProfileApi(page: import('@playwright/test').Page) {
  let updateCount = 0
  const me = {
    id: 'user-1',
    firstName: 'Fengdong',
    lastName: 'Gu',
    email: 'fengdong@pa.ai',
    username: 'fg',
    preferredLanguage: 'zh-CN',
    timeZone: 'Asia/Shanghai',
    imageUrl: '',
    tags: ['owner']
  }

  await page.route('**/api/xpert/user/me*', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: me
        }
      })
      return
    }
    if (method === 'PUT') {
      updateCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: me
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getUpdateCount: () => updateCount
  }
}

async function mockAccountPasswordApi(page: import('@playwright/test').Page) {
  let passwordCount = 0

  await page.route('**/api/xpert/user/me*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'user-1',
          email: 'fengdong@pa.ai'
        }
      }
    })
  })

  await page.route('**/api/xpert/user/*/password', async route => {
    if (route.request().method() === 'POST') {
      passwordCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            ok: true
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getPasswordCount: () => passwordCount
  }
}

test('settings routes are reachable and include xpert parity entries', async ({ page }) => {
  await mockCapabilities(page, 'full')

  await page.goto('/settings')
  await expect(page.getByTestId('settings-shell-title')).toContainText('Settings')
  await expect(page.getByTestId('settings-tab-knowledgebase')).toBeVisible()
  await expect(page.getByTestId('settings-tab-chatbi')).toBeVisible()
  await expect(page.getByTestId('settings-tab-copilot')).toBeVisible()
  await expect(page.getByTestId('settings-tab-email-templates')).toBeVisible()
  await expect(page.getByTestId('settings-tab-custom-smtp')).toBeVisible()

  const routes = [
    { key: 'account-profile', path: '/settings/account/profile', marker: 'settings-page-account-profile' },
    { key: 'account-password', path: '/settings/account/password', marker: 'settings-page-account-password' },
    { key: 'users', path: '/settings/users', marker: 'settings-page-users' },
    { key: 'roles', path: '/settings/roles', marker: 'settings-page-roles' },
    { key: 'business-area', path: '/settings/business-area', marker: 'settings-page-business-area' },
    { key: 'certification', path: '/settings/certification', marker: 'settings-page-certification' },
    { key: 'chatbi', path: '/settings/chatbi', marker: 'settings-page-chatbi' },
    { key: 'copilot', path: '/settings/copilot', marker: 'settings-page-copilot' },
    { key: 'email-templates', path: '/settings/email-templates', marker: 'settings-page-email-templates' },
    { key: 'custom-smtp', path: '/settings/custom-smtp', marker: 'settings-page-custom-smtp' },
    { key: 'data-sources', path: '/settings/data-sources', marker: 'settings-page-data-sources' },
    { key: 'integration', path: '/settings/integration', marker: 'settings-page-integration' },
    { key: 'plugins', path: '/settings/plugins', marker: 'settings-page-plugins' },
    { key: 'features', path: '/settings/features', marker: 'settings-page-features' },
    { key: 'tenant', path: '/settings/tenant', marker: 'settings-page-tenant' },
    { key: 'organizations', path: '/organization', marker: 'settings-page-organizations' },
    { key: 'knowledgebase', path: '/settings/knowledgebase', marker: 'settings-page-knowledgebase' }
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
    await expect(page.getByTestId('settings-tab-nav')).toBeVisible()
    await expect(page.getByTestId(route.marker)).toBeVisible()
  }
})

test('settings shell-only parity pages declare read-only preview mode explicitly', async ({ page }) => {
  await mockCapabilities(page, 'full')

  const previewRoutes = [
    '/settings/business-area',
    '/settings/certification',
    '/settings/chatbi',
    '/settings/copilot',
    '/settings/email-templates',
    '/settings/custom-smtp'
  ]

  for (const path of previewRoutes) {
    await page.goto(path)
    await expect(page.getByTestId('settings-preview-notice')).toContainText('Read-only preview')
    await expect(page.getByTestId('settings-preview-scope')).toContainText('route truth')
    await expect(page.getByTestId('settings-preview-durability')).toContainText('No durable save on this route')
  }
})

test('settings copilot preview route links back to canonical workbench selection instead of a fabricated deep link', async ({
  page
}) => {
  await mockCapabilities(page, 'full')

  await page.goto('/settings/copilot')

  await expect(page.getByTestId('settings-copilot-workbench-link')).toHaveAttribute('href', '/xpert/w')
  await expect(page.getByTestId('settings-copilot-workbench-link')).toContainText('Choose expert in Workbench')
})

test('settings users page shows disabled write action in read-only mode', async ({ page }) => {
  await mockCapabilities(page, 'readOnly')
  await mockUsersApi(page)

  await page.goto('/settings/users')

  await expect(page.getByTestId('settings-users-write-warning')).toBeVisible()
  await expect(page.getByTestId('settings-users-invite')).toBeDisabled()
})

test('settings account profile page loads profile and allows save in full mode', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const accountProfileApi = await mockAccountProfileApi(page)

  await page.goto('/settings/account/profile')

  await expect(page.getByTestId('settings-profile-first-name')).toHaveValue('Fengdong')
  await expect(page.getByTestId('settings-profile-email')).toHaveValue('fengdong@pa.ai')
  await page.getByTestId('settings-profile-save').click()

  await expect(page.getByTestId('settings-profile-status')).toContainText('saved')
  await expect.poll(() => accountProfileApi.getUpdateCount()).toBe(1)
})

test('settings account password page validates and allows save in full mode', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const accountPasswordApi = await mockAccountPasswordApi(page)

  await page.goto('/settings/account/password')

  await page.getByTestId('settings-password-current').fill('old-password')
  await page.getByTestId('settings-password-next').fill('new-password-123')
  await page.getByTestId('settings-password-confirm').fill('new-password-123')
  await page.getByTestId('settings-password-save').click()

  await expect(page.getByTestId('settings-password-status')).toContainText('saved')
  await expect.poll(() => accountPasswordApi.getPasswordCount()).toBe(1)
})

test('settings account password page shows disabled write action in read-only mode', async ({ page }) => {
  await mockCapabilities(page, 'readOnly')
  await mockAccountPasswordApi(page)

  await page.goto('/settings/account/password')

  await expect(page.getByTestId('settings-password-write-warning')).toBeVisible()
  await expect(page.getByTestId('settings-password-save')).toBeDisabled()
})

test('settings tenant page loads settings and allows save in full mode', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const tenantApi = await mockTenantSettingApi(page)

  await page.goto('/settings/tenant')

  await expect(page.getByTestId('settings-tenant-name')).toHaveValue('PA Nexus')
  await expect(page.getByTestId('settings-tenant-timezone')).toHaveValue('Asia/Shanghai')
  await page.getByTestId('settings-tenant-save').click()

  await expect(page.getByTestId('settings-tenant-status')).toContainText('saved')
  await expect.poll(() => tenantApi.getUpdateCount()).toBe(1)
})

test('settings users page loads user directory and supports deactivate action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const usersApi = await mockUsersApi(page)

  await page.goto('/settings/users')

  await expect(page.getByTestId('settings-users-row-uo-1')).toContainText('Alice')
  await page.getByTestId('settings-users-deactivate-uo-1').click()

  await expect(page.getByTestId('settings-users-status')).toContainText('inactive')
  await expect.poll(() => usersApi.getDeactivateCount()).toBe(1)
})

test('settings organizations page loads organizations and supports demo action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const organizationsApi = await mockOrganizationsApi(page)

  await page.goto('/organization')

  await expect(page.getByTestId('settings-organizations-row-org-1')).toContainText('Growth BU')
  await page.getByTestId('settings-organizations-demo-org-1').click()

  await expect(page.getByTestId('settings-organizations-status')).toContainText('demo')
  await expect.poll(() => organizationsApi.getDemoCount()).toBe(1)
})

test('settings roles page loads roles and supports delete action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const rolesApi = await mockRolesApi(page)

  await page.goto('/settings/roles')

  await expect(page.getByTestId('settings-roles-row-role-1')).toContainText('ANALYST')
  await page.getByTestId('settings-roles-delete-role-1').click()

  await expect(page.getByTestId('settings-roles-status')).toContainText('deleted')
  await expect.poll(() => rolesApi.getDeleteCount()).toBe(1)
})

test('settings knowledgebase page loads rows and supports delete action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const knowledgebaseApi = await mockKnowledgebaseApi(page)

  await page.goto('/settings/knowledgebase')

  await expect(page.getByTestId('settings-knowledgebase-row-kb-1')).toContainText('Revenue KB')
  await page.getByTestId('settings-knowledgebase-delete-kb-1').click()

  await expect(page.getByTestId('settings-knowledgebase-status')).toContainText('deleted')
  await expect.poll(() => knowledgebaseApi.getDeleteCount()).toBe(1)
})

test('settings integration page loads rows and supports delete action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const integrationApi = await mockIntegrationApi(page)

  await page.goto('/settings/integration')

  await expect(page.getByTestId('settings-integration-row-int-1')).toContainText('DingTalk Bot')
  await page.getByTestId('settings-integration-delete-int-1').click()

  await expect(page.getByTestId('settings-integration-status')).toContainText('deleted')
  await expect.poll(() => integrationApi.getDeleteCount()).toBe(1)
})

test('settings features page loads toggle rows and supports flip action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const featureApi = await mockFeatureToggleApi(page)

  await page.goto('/settings/features')

  await expect(page.getByTestId('settings-features-row-fo-1')).toContainText('chat')
  await page.getByTestId('settings-features-toggle-fo-1').click()

  await expect(page.getByTestId('settings-features-status')).toContainText('updated')
  await expect.poll(() => featureApi.getToggleCount()).toBe(1)
})

test('settings plugins page loads plugin rows and supports uninstall action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const pluginApi = await mockPluginApi(page)

  await page.goto('/settings/plugins')

  await expect(page.getByTestId('settings-plugins-row-s3-loader')).toContainText('S3 Loader')
  await page.getByTestId('settings-plugins-uninstall-s3-loader').click()

  await expect(page.getByTestId('settings-plugins-status')).toContainText('uninstalled')
  await expect.poll(() => pluginApi.getUninstallCount()).toBe(1)
})

test('settings data-sources page loads rows and supports delete action', async ({ page }) => {
  await mockCapabilities(page, 'full')
  const dataSourcesApi = await mockDataSourcesApi(page)

  await page.goto('/settings/data-sources')

  await expect(page.getByTestId('settings-data-sources-row-ds-1')).toContainText('Sales Warehouse')
  await page.getByTestId('settings-data-sources-delete-ds-1').click()

  await expect(page.getByTestId('settings-data-sources-status')).toContainText('deleted')
  await expect.poll(() => dataSourcesApi.getDeleteCount()).toBe(1)
})
