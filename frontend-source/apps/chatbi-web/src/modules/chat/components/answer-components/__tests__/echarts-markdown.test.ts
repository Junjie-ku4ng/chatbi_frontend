import { describe, expect, it } from 'vitest'
import { splitAssistantTextWithEcharts } from '../echarts-markdown'

describe('splitAssistantTextWithEcharts', () => {
  it('returns text segment when no echarts block exists', () => {
    const segments = splitAssistantTextWithEcharts('这是普通文本')
    expect(segments).toEqual([{ kind: 'text', text: '这是普通文本' }])
  })

  it('extracts echarts option from fenced block', () => {
    const segments = splitAssistantTextWithEcharts(
      '先看图表\n```echarts\n{"xAxis":{"type":"category","data":["1月"]},"yAxis":{"type":"value"},"series":[{"type":"line","data":[12]}]}\n```\n再看结论'
    )

    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({ kind: 'text', text: '先看图表\n' })
    expect(segments[1]).toMatchObject({
      kind: 'echarts',
      option: {
        xAxis: { type: 'category', data: ['1月'] },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: [12] }]
      }
    })
    expect(segments[2]).toEqual({ kind: 'text', text: '\n再看结论' })
  })

  it('falls back to text when echarts block json is invalid', () => {
    const text = '```echarts\n{invalid json}\n```'
    const segments = splitAssistantTextWithEcharts(text)
    expect(segments).toEqual([{ kind: 'text', text }])
  })
})

