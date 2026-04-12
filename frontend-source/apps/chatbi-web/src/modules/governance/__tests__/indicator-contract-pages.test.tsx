import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indicatorContractsPagePath = path.resolve(__dirname, '../../../../app/(workspace)/indicator-contracts/page.tsx')
const indicatorContractDetailPagePath = path.resolve(__dirname, '../../../../app/(workspace)/indicator-contracts/[id]/page.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('indicator contracts shared state labels', () => {
  it('uses specific loading copy across indicator contract list panels', () => {
    const source = readSource(indicatorContractsPagePath)

    expect(source).toContain('loadingLabel="Loading governance summary..."')
    expect(source).toContain('loadingLabel="Loading indicator contracts..."')
  })

  it('uses specific loading copy across indicator contract detail panels', () => {
    const source = readSource(indicatorContractDetailPagePath)

    expect(source).toContain('loadingLabel="Loading indicator contract presentation..."')
    expect(source).toContain('loadingLabel="Loading indicator contract diff..."')
  })
})
