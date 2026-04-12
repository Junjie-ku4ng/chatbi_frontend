import { firstValueFrom } from 'rxjs'
import { AgentStatusEnum, AgentType, Syntax, type Agent, type DataSourceFactory, type DataSourceOptions } from '@metad/ocap-core'
import { Observable, of } from 'rxjs'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createRuntimeAnalyticalCardServiceFactory } from './create-analytical-card-service'
import { AnalyticalCardRuntimeXmlaDataSource } from './analytical-card-runtime-xmla-data-source'

const {
  executeSemanticModelXmlaMock,
  listSemanticModelRuntimeMembersMock,
  getSemanticModelRuntimeMetadataMock
} = vi.hoisted(() => ({
  executeSemanticModelXmlaMock: vi.fn(),
  listSemanticModelRuntimeMembersMock: vi.fn(),
  getSemanticModelRuntimeMetadataMock: vi.fn()
}))

vi.mock('@/lib/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return {
    ...actual,
    executeSemanticModelXmla: executeSemanticModelXmlaMock,
    listSemanticModelRuntimeMembers: listSemanticModelRuntimeMembersMock,
    getSemanticModelRuntimeMetadata: getSemanticModelRuntimeMetadataMock
  }
})

function buildAgentMock(): Agent {
  return {
    type: AgentType.Server,
    selectStatus: () => of(AgentStatusEnum.ONLINE),
    selectError: () => of(null),
    error: vi.fn(),
    request: vi.fn(async () => ({}))
  }
}

function buildRuntimeModel(): DataSourceOptions {
  return {
    id: 'model-pa-live-1',
    key: 'model-pa-live-1',
    name: 'codex-xmla-proof',
    catalog: 'codex-xmla-proof',
    type: 'XMLA',
    syntax: Syntax.MDX,
    mode: 'server',
    agentType: AgentType.Server,
    settings: {
      dataSourceId: 'source-pa-live-1',
      dataSourceInfo: 'model-pa-live-1'
    } as DataSourceOptions['settings'] & { dataSourceInfo: string },
    schema: {
      name: 'codex-xmla-proof',
      measures: [
        { name: 'Sales', code: 'Sales' }
      ],
      dimensions: [
        {
          name: 'Time Calendar',
          caption: 'Time Calendar',
          semanticRole: 'time',
          hierarchies: [
            {
              name: 'Time Calendar',
              caption: 'Time Calendar',
              semanticRole: 'calendar',
              levels: [
                {
                  name: 'All Periods',
                  caption: 'All Periods',
                  semanticRole: 'all_periods'
                },
                {
                  name: 'Month',
                  caption: 'Month',
                  semanticRole: 'month',
                  formatter: 'yyyy-MM'
                }
              ]
            }
          ]
        },
        {
          name: 'Region',
          caption: 'Region',
          hierarchies: [
            {
              name: 'Region',
              caption: 'Region',
              levels: [
                {
                  name: 'All Regions',
                  caption: 'All Regions',
                  semanticRole: 'all_regions'
                },
                {
                  name: 'Region',
                  caption: 'Region',
                  semanticRole: 'region'
                }
              ]
            }
          ]
        }
      ]
    } as unknown as DataSourceOptions['schema']
  }
}

function buildPayload() {
  return {
    dataSettings: {
      dataSource: 'model-pa-live-1',
      entitySet: 'Supermart Grocery Sales',
      chartAnnotation: {
        chartType: { type: 'Line', name: 'Line' },
        dimensions: [
          {
            dimension: 'Time Calendar',
            hierarchy: 'Time Calendar',
            level: 'Month'
          }
        ],
        measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
      }
    }
  }
}

describe('AnalyticalCardRuntimeXmlaDataSource', () => {
  beforeEach(() => {
    executeSemanticModelXmlaMock.mockReset()
    listSemanticModelRuntimeMembersMock.mockReset()
    getSemanticModelRuntimeMetadataMock.mockReset()
  })

  it('uses the runtime XMLA adapter to turn normalized XMLA cells into chart rows and falls back to live member query when runtime-metadata members are empty', async () => {
    getSemanticModelRuntimeMetadataMock.mockResolvedValue({
      projection: {
        modelId: 'model-pa-live-1',
        cube: 'Supermart Grocery Sales',
        dimensions: []
      }
    })
    listSemanticModelRuntimeMembersMock.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0
    })

    executeSemanticModelXmlaMock.mockImplementation(async (_modelId: string, statement: string) => {
      if (statement.includes('.Members') && statement.includes('Region')) {
        return {
          axes: [
            { name: 'COLUMNS', positions: [['Region']] },
            { name: 'ROWS', positions: [['East'], ['West']] }
          ],
          cells: []
        }
      }

      return {
        axes: [
          { name: 'COLUMNS', positions: [['Sales']] },
          { name: 'ROWS', positions: [['2025-01'], ['2025-02']] }
        ],
        cells: [
          { value: 166267, formatted: '166267.00' },
          { value: 234739, formatted: '234739.00' }
        ]
      }
    })

    const factory = createRuntimeAnalyticalCardServiceFactory({
      agents: [buildAgentMock()],
      factories: [
        {
          type: 'XMLA',
          factory: (async () =>
            AnalyticalCardRuntimeXmlaDataSource as unknown as Awaited<ReturnType<DataSourceFactory>>) as DataSourceFactory
        }
      ],
      resolveDataSourceOptions: () => buildRuntimeModel()
    })

    const payload = buildPayload()
    const service = factory(payload)

    expect(service).toBeDefined()

    service!.dataSettings = payload.dataSettings as never

    await firstValueFrom(service!.onAfterServiceInit())
    const entityType = await service!.getEntityType()

    expect(entityType.properties['Time Calendar']).toMatchObject({
      name: 'Time Calendar',
      caption: 'Time Calendar'
    })
    expect(entityType.properties['Time Calendar'].hierarchies?.[0]?.levels?.map(level => level.levelNumber)).toEqual([
      0,
      1
    ])

    const resultPromise = firstValueFrom(service!.selectResult())
    service!.refresh()
    const result = await resultPromise

    const chartStatement = executeSemanticModelXmlaMock.mock.calls.find(
      ([, statement]) => typeof statement === 'string' && statement.includes('FROM [Supermart Grocery Sales]')
    )?.[1] as string | undefined

    expect(executeSemanticModelXmlaMock).toHaveBeenCalledWith(
      'model-pa-live-1',
      expect.stringContaining('FROM [Supermart Grocery Sales]')
    )
    expect(chartStatement).toBeDefined()
    expect(chartStatement).not.toContain('DIMENSION PROPERTIES Time_Calendar_Text')
    expect(result.data).toMatchObject([
      {
        'Time Calendar': '2025-01',
        Time_Calendar_Text: '2025-01',
        Sales: 166267
      },
      {
        'Time Calendar': '2025-02',
        Time_Calendar_Text: '2025-02',
        Sales: 234739
      }
    ])

    const members = await firstValueFrom(
      (service as typeof service & {
        entityService: {
          selectMembers: (dimension: { dimension: string }) => Observable<unknown>
        }
      })!.entityService.selectMembers({
        dimension: 'Region'
      } as never)
    )

    expect(listSemanticModelRuntimeMembersMock).toHaveBeenCalledWith('model-pa-live-1', {
      dimension: 'Region',
      hierarchy: 'Region',
      level: 'Region',
      limit: 200
    })
    expect(members).toEqual([
      {
        dimension: 'Region',
        hierarchy: 'Region',
        level: 'Region',
        memberCaption: 'East',
        memberKey: 'East'
      },
      {
        dimension: 'Region',
        hierarchy: 'Region',
        level: 'Region',
        memberCaption: 'West',
        memberKey: 'West'
      }
    ])
  })
})
