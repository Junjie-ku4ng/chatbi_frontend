import { describe, expect, it } from 'vitest'
import { buildAnalysisPatch } from '../analysis-panel'

describe('buildAnalysisPatch', () => {
  it('preserves canonical member metadata from analysis-panel filter state', () => {
    const patch = buildAnalysisPatch({
      topN: '10',
      sortBy: 'Orders',
      sortDir: 'DESC',
      filter: {
        dimension: 'OP Geography',
        member: 'East',
        memberKey: '[OP Geography].[OP Geography].[East]',
        hierarchy: 'OP Geography',
        level: 'Region'
      },
      time: {
        mode: 'last_n',
        lastN: 1
      },
      pivotRows: '',
      columnMode: 'metrics_only',
      derivedMetrics: []
    })

    expect(patch.filters).toEqual([
      {
        dimension: 'OP Geography',
        hierarchy: 'OP Geography',
        level: 'Region',
        op: 'IN',
        members: ['East'],
        memberHints: ['[OP Geography].[OP Geography].[East]']
      }
    ])
  })
})
