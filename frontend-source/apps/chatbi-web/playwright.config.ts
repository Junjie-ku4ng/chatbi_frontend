import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import path from 'node:path'

const appRoot = path.resolve(__dirname, '../..')
loadEnvConfig(appRoot, process.env.NODE_ENV !== 'production')

const crossBrowser = process.env.PW_CROSS_BROWSER === 'true'
const useDevServer = process.env.PW_USE_DEV_SERVER === 'true'
const shouldStartApiServer = process.env.PW_START_API_SERVER !== 'false'
const paApiPort = Number(process.env.PA_API_PORT ?? '3100')
const paApiBaseUrl =
  process.env.PA_API_BASE_URL || process.env.NEXT_PUBLIC_PA_API_BASE_URL || `http://127.0.0.1:${paApiPort}`

const webAppServer = {
  command: useDevServer ? 'yarn dev' : 'yarn build && yarn start',
  port: 3300,
  timeout: 120_000,
  reuseExistingServer: false,
  env: {
    ...process.env,
    PA_API_BASE_URL: process.env.PA_API_BASE_URL || process.env.NEXT_PUBLIC_PA_API_BASE_URL || paApiBaseUrl,
    NEXT_PUBLIC_PA_API_BASE_URL: process.env.NEXT_PUBLIC_PA_API_BASE_URL || process.env.PA_API_BASE_URL || paApiBaseUrl,
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE || 'dev_headers',
    NEXT_PUBLIC_ROUTE_PARITY_RELEASE_MODE: process.env.NEXT_PUBLIC_ROUTE_PARITY_RELEASE_MODE || 'canonical',
    NEXT_PUBLIC_DEV_ROLES:
      process.env.NEXT_PUBLIC_DEV_ROLES ||
      'allow:model:*,allow:write:model:*,allow:cube:*,allow:indicator:*,allow:dimension:*,allow:data-source:*,allow:write:data-source:*,allow:source-model:*,allow:write:source-model:*',
    NEXT_PUBLIC_DEV_TENANT: process.env.NEXT_PUBLIC_DEV_TENANT || 'local',
    NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2: process.env.NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2 || 'true',
    NEXT_PUBLIC_SEMANTIC_SYNC_V1: process.env.NEXT_PUBLIC_SEMANTIC_SYNC_V1 || 'true',
    NEXT_PUBLIC_ASK_INCLUDE_TEST_MODELS: process.env.NEXT_PUBLIC_ASK_INCLUDE_TEST_MODELS || 'true',
    NEXT_PUBLIC_INDICATOR_OPS_V2: process.env.NEXT_PUBLIC_INDICATOR_OPS_V2 || 'true',
    NEXT_PUBLIC_INDICATOR_OPS_V2_ALLOWLIST: process.env.NEXT_PUBLIC_INDICATOR_OPS_V2_ALLOWLIST || ''
  }
}

const apiServer = shouldStartApiServer
  ? {
      command: process.env.PW_API_SERVER_COMMAND || 'yarn --cwd ../.. start:api',
      port: paApiPort,
      timeout: 180_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        PORT: String(paApiPort),
        PA_ALLOW_DEV_AUTH: process.env.PA_ALLOW_DEV_AUTH || 'true'
      }
    }
  : undefined

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://127.0.0.1:3300',
    trace: 'on-first-retry'
  },
  projects: crossBrowser
    ? [
        {
          name: 'chrome',
          use: { ...devices['Desktop Chrome'], channel: 'chrome' }
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] }
        }
      ]
    : [
        {
          name: 'chrome',
          use: { ...devices['Desktop Chrome'], channel: 'chrome' }
        }
      ],
  webServer: apiServer ? [apiServer, webAppServer] : webAppServer
})
