import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = path.resolve(__dirname, '../../../../app/(workspace)/settings/chatbi/page.tsx')

function readPageSource() {
  return fs.readFileSync(pagePath, 'utf8')
}

describe('settings chatbi page truthfulness contract', () => {
  it('avoids static synced claims without a backing runtime check', () => {
    const source = readPageSource()

    expect(source).not.toContain('xpert facade synced')
    expect(source).toContain('xpert facade surface')
  })
})
