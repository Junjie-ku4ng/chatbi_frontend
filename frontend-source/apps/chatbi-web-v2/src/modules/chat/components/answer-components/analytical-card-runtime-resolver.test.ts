import type { DataSourceDetail } from '@/lib/api-client'
import { DataSourceProtocolEnum } from '../../../../../../../packages/contracts/src/analytics/data-source-type'
import type { ISemanticModel } from '../../../../../../../packages/contracts/src/analytics/semantic-model'
import { AgentStatusEnum, AgentType, Syntax, type Agent } from '@metad/ocap-core'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { resolveAnalyticalCardRuntimeOptions } from './analytical-card-runtime-resolver'

function buildAgentMock(): Agent {
  return {
    type: AgentType.Server,
    selectStatus: () => of(AgentStatusEnum.ONLINE),
    selectError: () => of(null),
    error: vi.fn(),
    request: vi.fn(async () => ({}))
  }
}

function buildSqlModel(): ISemanticModel {
  return {
    id: 'model-sql-1',
    name: 'Revenue Model',
    type: 'SQL',
    catalog: 'finance',
    cube: 'SalesOrder',
    dataSourceId: 'source-sql-1',
    dataSource: {
      id: 'source-sql-1',
      name: 'Warehouse',
      useLocalAgent: false,
      type: {
        type: 'SQL',
        protocol: DataSourceProtocolEnum.SQL
      },
      options: {
        data_source_info: 'warehouse-main'
      }
    } as unknown as ISemanticModel['dataSource'],
    options: {
      schema: {
        cubes: [{ name: 'SalesOrder' }]
      }
    }
  }
}

function buildXmlaOverSqlModel(): ISemanticModel {
  return {
    id: 'model-xmla-1',
    name: 'Manufacturing Semantic',
    type: 'XMLA',
    catalog: 'manufacturing',
    cube: 'Production Cost',
    dataSourceId: 'source-xmla-1',
    dataSource: {
      id: 'source-xmla-1',
      name: 'Warehouse XMLA',
      useLocalAgent: false,
      type: {
        type: 'XMLA',
        protocol: DataSourceProtocolEnum.SQL
      },
      options: {
        data_source_info: 'warehouse-xmla'
      }
    } as unknown as ISemanticModel['dataSource'],
    options: {
      schema: {
        cubes: [{ name: 'Production Cost' }]
      }
    }
  }
}

function buildLivePAOnboardedModel(): ISemanticModel {
  return {
    id: 'model-pa-live-1',
    name: 'Supermart Grocery Sales',
    cube: 'Supermart Grocery Sales',
    dataSourceId: 'source-pa-live-1',
    options: {
      onboarding: {
        mode: 'readonly_binding',
        source: 'pa'
      },
      metricDimension: 'Measures',
      metricHierarchy: 'Measures'
    },
    schemaSnapshot: {
      measures: [{ name: 'Sales' }],
      dimensions: [{ name: 'Time Calendar' }, { name: 'Region' }]
    }
  } as ISemanticModel
}

function buildLivePADataSource(): DataSourceDetail {
  return {
    id: 'source-pa-live-1',
    name: 'verify-ds',
    typeCode: 'pa-tm1',
    host: 'http://pa.example.test'
  }
}

describe('resolveAnalyticalCardRuntimeOptions', () => {
  it('converts workspace model context into runtime options that resolve the payload dataSource key', async () => {
    const loadSemanticModel = vi.fn(async () => buildSqlModel())
    const createRuntimeAgent = vi.fn(() => buildAgentMock())

    const runtimeOptions = await resolveAnalyticalCardRuntimeOptions(
      {
        activeXpertId: 'workspace-alpha',
        modelId: 'model-sql-1'
      },
      {
        loadSemanticModel,
        createRuntimeAgent
      }
    )

    expect(loadSemanticModel).toHaveBeenCalledWith('model-sql-1')
    expect(createRuntimeAgent).toHaveBeenCalledTimes(1)
    expect(runtimeOptions).toBeDefined()
    expect(runtimeOptions?.agents).toEqual([expect.objectContaining({ type: AgentType.Server })])
    expect(runtimeOptions?.factories.map(item => item.type)).toEqual(['SQL', 'XMLA'])

    const resolved = runtimeOptions?.resolveDataSourceOptions({
      dataSettings: {
        dataSource: 'model-sql-1',
        entitySet: 'SalesOrder'
      }
    })

    expect(resolved).toMatchObject({
      id: 'model-sql-1',
      key: 'model-sql-1',
      catalog: 'finance',
      type: 'SQL',
      syntax: Syntax.SQL,
      agentType: AgentType.Server,
      settings: {
        dataSourceInfo: 'warehouse-main',
        dataSourceId: 'source-sql-1'
      }
    })
  })

  it('keeps xpert XMLA-over-SQL dual registration semantics when selecting runtime models from payload dataSource', async () => {
    const runtimeOptions = await resolveAnalyticalCardRuntimeOptions(
      {
        activeXpertId: 'workspace-alpha',
        modelId: 'model-xmla-1'
      },
      {
        loadSemanticModel: async () => buildXmlaOverSqlModel(),
        createRuntimeAgent: () => buildAgentMock()
      }
    )

    const xmlaModel = runtimeOptions?.resolveDataSourceOptions({
      dataSettings: {
        dataSource: 'model-xmla-1',
        entitySet: 'Production Cost'
      }
    })
    const sqlSourceModel = runtimeOptions?.resolveDataSourceOptions({
      dataSettings: {
        dataSource: 'model-xmla-1_SQL_SOURCE',
        entitySet: 'Production Cost'
      }
    })

    expect(xmlaModel).toMatchObject({
      key: 'model-xmla-1',
      type: 'XMLA',
      syntax: Syntax.MDX,
      catalog: 'Manufacturing Semantic',
      settings: {
        dataSourceInfo: 'model-xmla-1',
        dataSourceId: 'source-xmla-1'
      }
    })
    expect(sqlSourceModel).toMatchObject({
      key: 'model-xmla-1_SQL_SOURCE',
      type: 'SQL',
      syntax: Syntax.SQL,
      catalog: 'manufacturing',
      settings: {
        dataSourceInfo: 'warehouse-xmla',
        dataSourceId: 'source-xmla-1'
      }
    })
  })

  it('returns no runtime when the workspace cannot resolve semantic model metadata', async () => {
    const loadSemanticModel = vi.fn(async () => undefined)

    const runtimeOptions = await resolveAnalyticalCardRuntimeOptions(
      {
        activeXpertId: 'workspace-alpha',
        modelId: 'missing-model'
      },
      {
        loadSemanticModel,
        createRuntimeAgent: () => buildAgentMock()
      }
    )

    expect(loadSemanticModel).toHaveBeenCalledWith('missing-model')
    expect(runtimeOptions).toBeUndefined()
  })

  it('does not treat active xpert workspace id as a semantic model id fallback', async () => {
    const loadSemanticModel = vi.fn(async () => buildSqlModel())

    const runtimeOptions = await resolveAnalyticalCardRuntimeOptions(
      {
        activeXpertId: 'workspace-alpha',
        modelId: undefined
      },
      {
        loadSemanticModel,
        createRuntimeAgent: () => buildAgentMock()
      }
    )

    expect(loadSemanticModel).not.toHaveBeenCalled()
    expect(runtimeOptions).toBeUndefined()
  })

  it('hydrates a live PA onboarded model into an XMLA runtime using data source detail when semantic-model detail is missing xpert relation fields', async () => {
    const loadSemanticModel = vi.fn(async () => buildLivePAOnboardedModel())
    const loadDataSource = vi.fn(async () => buildLivePADataSource())

    const runtimeOptions = await resolveAnalyticalCardRuntimeOptions(
      {
        activeXpertId: 'workspace-alpha',
        modelId: 'model-pa-live-1'
      },
      {
        loadSemanticModel,
        loadDataSource,
        createRuntimeAgent: () => buildAgentMock()
      }
    )

    expect(loadSemanticModel).toHaveBeenCalledWith('model-pa-live-1')
    expect(loadDataSource).toHaveBeenCalledWith('source-pa-live-1')

    const resolved = runtimeOptions?.resolveDataSourceOptions({
      dataSettings: {
        dataSource: 'model-pa-live-1',
        entitySet: 'Supermart Grocery Sales'
      }
    })

    expect(resolved).toMatchObject({
      id: 'model-pa-live-1',
      key: 'model-pa-live-1',
      type: 'XMLA',
      syntax: Syntax.MDX,
      agentType: AgentType.Server,
      settings: {
        dataSourceId: 'source-pa-live-1',
        dataSourceInfo: 'model-pa-live-1'
      },
      schema: {
        measures: [{ name: 'Sales' }],
        dimensions: [{ name: 'Time Calendar' }, { name: 'Region' }]
      }
    })
  })
})
