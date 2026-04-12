import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appLayoutPath = path.resolve(__dirname, '../../../../../app/layout.tsx')
const appProvidersPath = path.resolve(__dirname, '../../providers.tsx')
const antdProviderPath = path.resolve(__dirname, '../antd-provider.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('antd integration contract', () => {
  it('registers AntdRegistry in root app layout', () => {
    const source = readSource(appLayoutPath)

    expect(source).toContain("from '@ant-design/nextjs-registry'")
    expect(source).toContain('<AntdRegistry>')
  })

  it('wraps app providers with AntdProvider bridge', () => {
    const source = readSource(appProvidersPath)

    expect(source).toContain("from '@/modules/shared/ui/antd-provider'")
    expect(source).toContain('<AntdProvider>')
  })

  it('declares a stable readiness test id for visual/e2e checks', () => {
    const source = readSource(antdProviderPath)

    expect(source).toContain('data-testid="antd-provider-ready"')
    expect(source).toContain('ConfigProvider')
  })
})
