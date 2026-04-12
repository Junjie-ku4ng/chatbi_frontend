function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function normalizeAxis(value: unknown, base: Record<string, unknown>) {
  if (Array.isArray(value)) {
    return value.map(item => {
      const axis = asRecord(item)
      return axis ? { ...base, ...axis } : base
    })
  }

  const axis = asRecord(value)
  return { ...base, ...(axis ?? {}) }
}

function normalizeSeries(value: unknown) {
  if (!Array.isArray(value)) {
    return value
  }

  return value.map(item => {
    const series = asRecord(item)
    if (!series) {
      return item
    }

    const type = typeof series.type === 'string' ? series.type : ''
    if (type === 'line') {
      return {
        ...series,
        smooth: series.smooth ?? true,
        showSymbol: series.showSymbol ?? false,
        lineStyle: {
          width: 2,
          ...(asRecord(series.lineStyle) ?? {})
        }
      }
    }

    return series
  })
}

export function applyNexusChartTheme(option: Record<string, unknown>) {
  const themed = { ...option }

  themed.backgroundColor = option.backgroundColor ?? 'transparent'
  themed.color = Array.isArray(option.color) && option.color.length > 0
    ? option.color
    : ['#2f67ea', '#2ea79d', '#f59e0b', '#6366f1', '#ef4444']

  const tooltip = asRecord(option.tooltip)
  themed.tooltip = {
    trigger: 'axis',
    confine: true,
    borderWidth: 1,
    borderColor: '#1f365c',
    backgroundColor: '#0f1b31',
    textStyle: {
      color: '#eaf0fc',
      fontSize: 12
    },
    ...(tooltip ?? {})
  }

  const grid = asRecord(option.grid)
  themed.grid = {
    left: 24,
    right: 16,
    top: 28,
    bottom: 20,
    containLabel: true,
    ...(grid ?? {})
  }

  const axisLabelBase = { color: '#64748b', fontSize: 11 }
  const axisLineBase = { lineStyle: { color: '#d0dced' } }
  const xAxisBase = {
    axisLabel: axisLabelBase,
    axisLine: axisLineBase,
    axisTick: { show: false }
  }
  const yAxisBase = {
    axisLabel: axisLabelBase,
    axisLine: axisLineBase,
    splitLine: { lineStyle: { color: '#e5edf7' } }
  }

  themed.xAxis = normalizeAxis(option.xAxis, xAxisBase)
  themed.yAxis = normalizeAxis(option.yAxis, yAxisBase)
  themed.series = normalizeSeries(option.series)

  return themed
}

