'use client'

type TextSegment = {
  kind: 'text'
  text: string
}

type EchartsSegment = {
  kind: 'echarts'
  option: Record<string, unknown>
  raw: string
}

export type AssistantTextSegment = TextSegment | EchartsSegment

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function parseEchartsJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown
    return asRecord(parsed)
  } catch {
    return undefined
  }
}

export function splitAssistantTextWithEcharts(text: string) {
  if (!text) {
    return [] as AssistantTextSegment[]
  }

  const segments: AssistantTextSegment[] = []
  const fencePattern = /```echarts\s*([\s\S]*?)```/gi
  let cursor = 0

  while (true) {
    const match = fencePattern.exec(text)
    if (!match) {
      break
    }

    const [fullBlock, jsonBlock = ''] = match
    const blockStart = match.index
    if (blockStart > cursor) {
      segments.push({
        kind: 'text',
        text: text.slice(cursor, blockStart)
      })
    }

    const option = parseEchartsJson(jsonBlock.trim())
    if (option) {
      segments.push({
        kind: 'echarts',
        option,
        raw: jsonBlock.trim()
      })
    } else {
      segments.push({
        kind: 'text',
        text: fullBlock
      })
    }

    cursor = blockStart + fullBlock.length
  }

  if (cursor < text.length) {
    segments.push({
      kind: 'text',
      text: text.slice(cursor)
    })
  }

  return segments
}

