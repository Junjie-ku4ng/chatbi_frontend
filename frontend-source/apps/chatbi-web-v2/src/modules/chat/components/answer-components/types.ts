export type AnswerSurfaceView = 'table' | 'chart' | 'kpi'

export type AnswerSurfaceInteraction = {
  availableViews?: AnswerSurfaceView[]
  defaultView?: AnswerSurfaceView
  sort?: {
    enabled: boolean
    metrics?: string[]
    current?: { by: string; dir: 'ASC' | 'DESC' }
  }
  ranking?: {
    enabled: boolean
    currentLimit?: number
    presets?: number[]
  }
  slicers?: {
    enabled: boolean
    dimensions?: string[]
    applied?: Array<Record<string, unknown>>
  }
  explain?: {
    enabled: boolean
    warnings?: string[]
    queryLogId?: string
    traceKey?: string
    refs?: Array<Record<string, unknown>>
  }
  story?: {
    enabled: boolean
    widgetType: AnswerSurfaceView
    title?: string
    widgetPayload?: Record<string, unknown>
  }
  fullscreen?: {
    enabled: boolean
    title?: string
  }
}

export type AnswerComponentPayload = Record<string, unknown> & {
  columns?: string[]
  rows?: Array<Record<string, unknown>>
  option?: Record<string, unknown>
  componentType?: AnswerSurfaceView
  modelId?: string
  cube?: string
  queryLogId?: string
  traceKey?: string
  dataSettings?: Record<string, unknown>
  chartSettings?: Record<string, unknown>
  analysisHandoff?: Record<string, unknown>
  interaction?: AnswerSurfaceInteraction
}

export type AnswerComponent = {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
}
