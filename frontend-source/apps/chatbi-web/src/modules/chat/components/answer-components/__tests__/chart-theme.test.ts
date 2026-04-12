import { describe, expect, it } from 'vitest'
import { applyNexusChartTheme } from '../chart-theme'

describe('applyNexusChartTheme', () => {
  it('injects default visual tokens for minimal option', () => {
    const option = applyNexusChartTheme({
      xAxis: { type: 'category', data: ['1月', '2月'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [10, 20] }]
    })

    expect(option.backgroundColor).toBe('transparent')
    expect(Array.isArray(option.color)).toBe(true)
    expect((option.tooltip as { backgroundColor: string }).backgroundColor).toBe('#0f1b31')
    expect((option.grid as { containLabel: boolean }).containLabel).toBe(true)
    expect(((option.series as Array<Record<string, unknown>>)[0]).smooth).toBe(true)
  })

  it('keeps caller overrides when provided', () => {
    const option = applyNexusChartTheme({
      color: ['#111111'],
      tooltip: { trigger: 'item' },
      xAxis: { axisLabel: { color: '#222222' } },
      yAxis: { splitLine: { show: false } },
      series: [{ type: 'bar', data: [1, 2] }]
    })

    expect(option.color).toEqual(['#111111'])
    expect((option.tooltip as { trigger: string }).trigger).toBe('item')
    expect(((option.xAxis as Record<string, unknown>).axisLabel as { color: string }).color).toBe('#222222')
    expect((((option.yAxis as Record<string, unknown>).splitLine as Record<string, unknown>).show)).toBe(false)
    expect(((option.series as Array<Record<string, unknown>>)[0]).type).toBe('bar')
  })
})

