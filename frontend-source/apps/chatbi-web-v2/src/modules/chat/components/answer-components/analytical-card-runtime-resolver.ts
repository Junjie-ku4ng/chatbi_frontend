'use client'

import { getDataSourceById, getSemanticModelById, type DataSourceDetail } from '@/lib/api-client'
import type { ISemanticModel } from '../../../../../../../packages/contracts/src/analytics/semantic-model'
import type { Agent, DataSourceFactory } from '@metad/ocap-core'
import { SQLDataSource } from '@metad/ocap-sql'
import type { AnalyticalCardRuntimeFactoryOptions } from './create-analytical-card-service'
import {
  buildAnalyticalCardRuntimeModels,
  resolveAnalyticalCardRuntimeModelForPayload
} from './analytical-card-runtime-models'
import { AnalyticalCardRuntimeServerAgent } from './analytical-card-runtime-server-agent'
import { AnalyticalCardRuntimeXmlaDataSource } from './analytical-card-runtime-xmla-data-source'

export type AnalyticalCardRuntimeBootstrapInput = {
  activeXpertId?: string
  modelId?: string
}

type ResolveAnalyticalCardRuntimeOptionsDeps = {
  loadSemanticModel?: (modelId: string) => Promise<ISemanticModel | undefined>
  loadDataSource?: (dataSourceId: string) => Promise<DataSourceDetail | undefined>
  createRuntimeAgent?: () => Agent
  sqlFactory?: DataSourceFactory
  xmlaFactory?: DataSourceFactory
}

const defaultSqlFactory: DataSourceFactory = async () => SQLDataSource as unknown as Awaited<ReturnType<DataSourceFactory>>

const defaultXmlaFactory: DataSourceFactory = async () =>
  AnalyticalCardRuntimeXmlaDataSource as unknown as Awaited<ReturnType<DataSourceFactory>>

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

function resolveRuntimeModelType(model: ISemanticModel, dataSource?: DataSourceDetail) {
  const explicitType = normalizeText(model.type)?.toUpperCase()
  if (explicitType === 'XMLA' || explicitType === 'SQL') {
    return explicitType
  }

  const existingProtocol = normalizeText(
    (model.dataSource?.type as { protocol?: string } | undefined)?.protocol
  )?.toUpperCase()
  if (existingProtocol === 'XMLA') {
    return 'XMLA'
  }
  if (existingProtocol === 'SQL') {
    return 'SQL'
  }

  const typeCode = normalizeText(dataSource?.typeCode)?.toLowerCase()
  if (typeCode === 'pa-tm1') {
    return 'XMLA'
  }

  const onboardingSource = normalizeText(asRecord(asRecord(model.options)?.onboarding)?.source)?.toLowerCase()
  if (onboardingSource === 'pa') {
    return 'XMLA'
  }

  return undefined
}

function enrichSemanticModelForRuntime(model: ISemanticModel, dataSource?: DataSourceDetail): ISemanticModel {
  const runtimeType = resolveRuntimeModelType(model, dataSource)
  const existingDataSource = model.dataSource
  const runtimeProtocol =
    normalizeText((existingDataSource?.type as { protocol?: string } | undefined)?.protocol)?.toUpperCase() ??
    runtimeType

  const normalizedOptions = asRecord(existingDataSource?.options)
  const normalizedSchemaSnapshot = asRecord((model as Record<string, unknown>).schemaSnapshot)
  const normalizedModelOptions = asRecord(model.options)
  const mergedDataSourceOptions = {
    ...(dataSource?.options ?? {}),
    ...(existingDataSource?.options ?? {})
  }
  const existingDataSourceType = existingDataSource?.type as
    | NonNullable<ISemanticModel['dataSource']>['type']
    | undefined

  return {
    ...model,
    ...(runtimeType ? { type: runtimeType } : {}),
    options:
      normalizedSchemaSnapshot && !normalizedModelOptions?.schema
        ? {
            ...(model.options ?? {}),
            schema: normalizedSchemaSnapshot
          }
        : model.options,
    dataSource:
      existingDataSource || dataSource || runtimeType
        ? ({
            ...(existingDataSource ?? {}),
            ...(dataSource
              ? {
                  id: existingDataSource?.id ?? dataSource.id,
                  name: existingDataSource?.name ?? dataSource.name,
                  useLocalAgent: existingDataSource?.useLocalAgent ?? dataSource.useLocalAgent ?? false
                }
              : {}),
            ...(runtimeType
              ? {
                  type:
                    (existingDataSourceType
                      ? {
                          ...existingDataSourceType,
                          protocol: existingDataSourceType.protocol ?? runtimeProtocol,
                          type: existingDataSourceType.type ?? runtimeType
                        }
                      : undefined) ??
                    ({
                      type: runtimeType,
                      protocol: runtimeProtocol
                    } as NonNullable<ISemanticModel['dataSource']>['type'])
                }
              : {}),
            options:
              runtimeType === 'XMLA' && !normalizedOptions?.data_source_info
                ? {
                    ...mergedDataSourceOptions,
                    data_source_info: model.id
                  }
                : mergedDataSourceOptions
          } as NonNullable<ISemanticModel['dataSource']>)
        : model.dataSource
  }
}

export async function resolveAnalyticalCardRuntimeOptions(
  input: AnalyticalCardRuntimeBootstrapInput,
  deps: ResolveAnalyticalCardRuntimeOptionsDeps = {}
): Promise<AnalyticalCardRuntimeFactoryOptions | undefined> {
  const resolvedModelId = normalizeText(input.modelId)
  if (!resolvedModelId) {
    return undefined
  }

  const loadSemanticModel =
    deps.loadSemanticModel ??
    (async (modelId: string) => {
      try {
        return (await getSemanticModelById(modelId)) as ISemanticModel
      } catch {
        return undefined
      }
    })

  const model = await loadSemanticModel(resolvedModelId)
  if (!model) {
    return undefined
  }

  const loadDataSource =
    deps.loadDataSource ??
    (async (dataSourceId: string) => {
      try {
        return await getDataSourceById(dataSourceId)
      } catch {
        return undefined
      }
    })

  const shouldHydrateDataSource =
    !!normalizeText(model.dataSourceId) &&
    (!model.dataSource ||
      !normalizeText(model.type) ||
      !normalizeText((model.dataSource?.type as { protocol?: string } | undefined)?.protocol))

  const dataSource = shouldHydrateDataSource
    ? await loadDataSource(normalizeText(model.dataSourceId) as string)
    : undefined

  const runtimeModel = enrichSemanticModelForRuntime(model, dataSource)

  const runtimeModels = buildAnalyticalCardRuntimeModels(runtimeModel)
  if (runtimeModels.length === 0) {
    return undefined
  }

  const createRuntimeAgent =
    deps.createRuntimeAgent ??
    (() => {
      return new AnalyticalCardRuntimeServerAgent()
    })

  return {
    agents: [createRuntimeAgent()],
    factories: [
      {
        type: 'SQL',
        factory: deps.sqlFactory ?? defaultSqlFactory
      },
      {
        type: 'XMLA',
        factory: deps.xmlaFactory ?? defaultXmlaFactory
      }
    ],
    resolveDataSourceOptions(payload) {
      return resolveAnalyticalCardRuntimeModelForPayload(runtimeModels, payload)
    }
  }
}
