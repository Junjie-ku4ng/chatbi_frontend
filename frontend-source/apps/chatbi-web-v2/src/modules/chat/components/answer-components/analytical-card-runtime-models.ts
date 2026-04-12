'use client'

import type {
  ISemanticModel
} from '../../../../../../../packages/contracts/src/analytics/semantic-model'
import type { IIndicator } from '../../../../../../../packages/contracts/src/analytics/indicator'
import { IndicatorStatusEnum } from '../../../../../../../packages/contracts/src/analytics/indicator'
import { AgentType, Syntax, type DataSourceOptions, type Indicator } from '@metad/ocap-core'
import { cloneDeep, omit } from 'lodash-es'

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

function resolveRuntimeSchema(model: ISemanticModel & Record<string, unknown>) {
  const schemaFromOptions = asRecord(model.options)?.schema
  if (schemaFromOptions && typeof schemaFromOptions === 'object') {
    return schemaFromOptions
  }

  const schemaSnapshot = asRecord(model.schemaSnapshot)
  if (schemaSnapshot) {
    return schemaSnapshot
  }

  return {}
}

function normalizeProtocol(model: ISemanticModel) {
  const raw = (model.dataSource?.type as { protocol?: string } | undefined)?.protocol
  return typeof raw === 'string' ? raw.trim().toUpperCase() : undefined
}

export function getAnalyticalCardRuntimeModelKey(model: ISemanticModel) {
  if (typeof model.id === 'string' && model.id.trim()) {
    return model.id
  }

  if (typeof model.key === 'string' && model.key.trim()) {
    return model.key
  }

  if (typeof model.name === 'string' && model.name.trim()) {
    return model.name
  }

  return 'analytical-card-runtime-model'
}

export function getSQLSourceName(key: string) {
  return `${key}_SQL_SOURCE`
}

export function getXmlaSourceName(key: string) {
  return `${key}_XMLA_SOURCE`
}

function convertOcapIndicatorResult(result: IIndicator): Indicator {
  return {
    ...omit(result, 'options'),
    description: (result as { business?: string }).business,
    ...((result as { options?: Record<string, unknown> }).options ?? {})
  } as Indicator
}

function filterReleasedIndicators(indicators?: IIndicator[]) {
  return indicators
    ?.filter(item => !item.status || item.status === IndicatorStatusEnum.RELEASED)
    .map(convertOcapIndicatorResult)
}

export function buildAnalyticalCardRuntimeModels(
  model: ISemanticModel & { isDraft?: boolean; isIndicatorsDraft?: boolean }
) {
  const modelKey = getAnalyticalCardRuntimeModelKey(model)
  const agentType = isNil(model.dataSource)
    ? AgentType.Wasm
    : model.dataSource?.useLocalAgent
      ? AgentType.Local
      : AgentType.Server
  const dialect =
    (model.dataSource?.type as { type?: string } | undefined)?.type === 'agent'
      ? 'sqlite'
      : agentType === AgentType.Wasm
        ? 'duckdb'
        : (model.dataSource?.type as { type?: string } | undefined)?.type
  const catalog = agentType === AgentType.Wasm ? model.catalog || 'main' : model.catalog
  const semanticModel = {
    ...omit(model, 'indicators'),
    key: modelKey,
    catalog,
    dialect,
    agentType,
    mode: 'server',
    settings: {
      dataSourceInfo: (model.dataSource?.options as { data_source_info?: string } | undefined)?.data_source_info as string,
      dataSourceId: model.dataSource?.id ?? model.dataSourceId
    } as DataSourceOptions['settings'],
    schema: {
      ...resolveRuntimeSchema(model as ISemanticModel & Record<string, unknown>),
      indicators: filterReleasedIndicators(model.indicators)
    }
  } as DataSourceOptions

  const protocol = normalizeProtocol(model)
  const models: DataSourceOptions[] = []

  if (protocol === 'SQL') {
    semanticModel.settings = semanticModel.settings
      ? { ...semanticModel.settings }
      : {
          ignoreUnknownProperty: true
        }
    semanticModel.settings.dataSourceId = model.dataSource?.id
  }

  if (model.type === 'XMLA') {
    semanticModel.syntax = Syntax.MDX
    if (protocol === 'SQL') {
      models.push({
        ...semanticModel,
        key: getSQLSourceName(modelKey),
        type: 'SQL',
        syntax: Syntax.SQL,
        isDraft: model.isDraft
      })

      models.push({
        ...semanticModel,
        catalog: model.name,
        settings: {
          ...(semanticModel.settings ?? {}),
          dataSourceInfo: model.isDraft ? `${model.id}/draft` : model.id
        } as DataSourceOptions['settings'],
        isDraft: model.isDraft
      })
    } else {
      models.push({
        ...semanticModel,
        key: getXmlaSourceName(modelKey),
        settings: {
          ...semanticModel.settings,
          dataSourceInfo: (model.dataSource?.options as { data_source_info?: string } | undefined)?.data_source_info
        } as DataSourceOptions['settings'],
        schema: undefined,
        isDraft: model.isDraft
      })

      models.push({
        ...semanticModel,
        settings: {
          ...semanticModel.settings,
          dataSourceInfo: (model.dataSource?.options as { data_source_info?: string } | undefined)?.data_source_info
        } as DataSourceOptions['settings'],
        isDraft: model.isDraft
      })
    }
  } else {
    models.push({
      ...semanticModel,
      syntax: Syntax.SQL,
      settings: {
        ...semanticModel.settings,
        dataSourceInfo: (model.dataSource?.options as { data_source_info?: string } | undefined)?.data_source_info
      } as DataSourceOptions['settings'],
      isDraft: model.isDraft
    })
  }

  return models
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

export function resolveAnalyticalCardRuntimeModelForPayload(
  models: DataSourceOptions[],
  payload: Record<string, unknown>
) {
  const dataSettings = asRecord(payload.dataSettings)
  const dataSourceKey =
    typeof dataSettings?.dataSource === 'string' && dataSettings.dataSource.trim()
      ? dataSettings.dataSource.trim()
      : undefined

  if (!dataSourceKey) {
    return undefined
  }

  const resolved =
    models.find(item => item.key === dataSourceKey) ??
    models.find(item => item.id === dataSourceKey) ??
    models.find(item => item.name === dataSourceKey)

  return resolved ? (cloneDeep(resolved) as DataSourceOptions) : undefined
}
