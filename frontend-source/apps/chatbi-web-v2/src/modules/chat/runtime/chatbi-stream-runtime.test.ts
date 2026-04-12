import { describe, expect, it } from 'vitest'
import { toChatComponentEvent } from './chatbi-stream-runtime'

describe('toChatComponentEvent', () => {
  it('preserves analytical card payloads instead of wrapping the whole payload as an echarts option', () => {
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['2025-01'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', smooth: true, data: [1216675.04] }]
    }

    const event = toChatComponentEvent({
      type: 'component',
      data: {
        type: 'AnalyticalCard',
        data: {
          kind: 'line',
          title: '按月份看收入趋势',
          rows: [{ member_0: '2025-01', Measures: 1216675.04 }],
          series: [{ x: '2025-01', y: 1216675.04 }],
          option
        }
      }
    })

    expect(event).not.toBeNull()
    expect(event?.type).toBe('chart')
    expect(event?.payload).toMatchObject({
      title: '按月份看收入趋势',
      rows: [{ member_0: '2025-01', Measures: 1216675.04 }],
      series: [{ x: '2025-01', y: 1216675.04 }],
      option
    })
  })
})
