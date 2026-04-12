'use client'

import {
  AbstractDataSource,
  AggregationRole,
  type Catalog,
  DataType,
  type DataSourceOptions,
  type DBCatalog,
  type DBTable,
  type Dimension,
  type EntityService,
  type EntitySet,
  type EntityType,
  getEntityHierarchy,
  getEntityLevel,
  getEntityProperty,
  type IDimensionMember,
  type MDCube,
  type OcapCache,
  type PropertyDimension,
  type PropertyHierarchy,
  type PropertyLevel,
  type PropertyMeasure,
  QueryReturn,
  RuntimeLevelType,
  Semantics,
  type Agent
} from '@metad/ocap-core'
import { from, map, Observable, of, shareReplay } from 'rxjs'
import {
  executeSemanticModelXmla,
  getSemanticModelRuntimeMetadata,
  listSemanticModelRuntimeMembers,
  type RuntimeMetadataDimension,
  type RuntimeMetadataHierarchy,
  type RuntimeMetadataLevel,
  type SemanticModelXmlaAxis,
  type SemanticModelXmlaResult
} from '@/lib/api-client'
import type { MDXQuery } from '../../../../../../../packages/xmla/src/lib/types/query'
import { AnalyticalCardRuntimeXmlaEntityService } from './analytical-card-runtime-xmla-entity-service'

type ChartRow = Record<string, unknown>

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

function asArray<T = Record<string, unknown>>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : []
}

function sanitizeCaptionField(name: string) {
  const sanitized = name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return `${sanitized || 'Member'}_Text`
}

function mapSemanticRole(value?: string) {
  switch (normalizeText(value)?.toLowerCase()) {
    case 'time':
    case 'calendar':
      return Semantics.Calendar
    case 'year':
      return Semantics['Calendar.Year']
    case 'quarter':
      return Semantics['Calendar.Quarter']
    case 'month':
      return Semantics['Calendar.Month']
    case 'week':
      return Semantics['Calendar.Week']
    case 'day':
      return Semantics['Calendar.Day']
    default:
      return undefined
  }
}

function mapLevelType(value?: string) {
  switch (normalizeText(value)?.toLowerCase()) {
    case 'all_periods':
    case 'all_regions':
    case 'all_categories':
    case 'all_orders':
    case 'all_customers':
      return RuntimeLevelType.ALL
    case 'year':
      return RuntimeLevelType.TIME_YEAR
    case 'quarter':
      return RuntimeLevelType.TIME_QUARTER
    case 'month':
      return RuntimeLevelType.TIME_MONTH
    case 'week':
      return RuntimeLevelType.TIME_WEEK
    case 'day':
      return RuntimeLevelType.TIME_DAY
    default:
      return RuntimeLevelType.REGULAR
  }
}

function resolveSchemaDimensions(options: DataSourceOptions) {
  const schemaDimensions = asArray<RuntimeMetadataDimension>(options.schema?.dimensions)
  if (schemaDimensions.length > 0) {
    return schemaDimensions
  }
  return []
}

function resolveSchemaMeasures(options: DataSourceOptions) {
  return asArray<Record<string, unknown>>(asRecord(options.schema)?.measures)
}

function toUniqueHierarchy(dimension: string, hierarchy?: string) {
  const normalizedDimension = normalizeText(dimension) ?? ''
  const normalizedHierarchy = normalizeText(hierarchy) ?? normalizedDimension
  return normalizedHierarchy !== normalizedDimension
    ? `[${normalizedDimension}].[${normalizedHierarchy}]`
    : `[${normalizedDimension}]`
}

function toUniqueLevel(dimension: string, hierarchy?: string, level?: string) {
  const base = toUniqueHierarchy(dimension, hierarchy)
  const normalizedLevel = normalizeText(level)
  return normalizedLevel ? `${base}.[${normalizedLevel}]` : base
}

function buildLevel(level: RuntimeMetadataLevel, dimensionName: string, hierarchyName: string, index: number): PropertyLevel {
  const levelName = normalizeText(level.execution?.level) ?? level.name
  return {
    name: toUniqueLevel(dimensionName, hierarchyName, levelName),
    caption: level.caption ?? level.name,
    role: AggregationRole.level,
    visible: true,
    dimension: dimensionName,
    hierarchy: hierarchyName,
    levelNumber: index,
    levelType: mapLevelType(level.semanticRole),
    semantics: mapSemanticRole(level.semanticRole)
      ? {
          semantic: mapSemanticRole(level.semanticRole),
          ...(level.formatter ? { formatter: level.formatter } : {})
        }
      : level.formatter
        ? { formatter: level.formatter }
        : undefined
  }
}

function buildHierarchy(dimension: RuntimeMetadataDimension, hierarchy: RuntimeMetadataHierarchy): PropertyHierarchy {
  const dimensionName = dimension.name
  const hierarchyName = normalizeText(hierarchy.execution?.hierarchy) ?? hierarchy.name ?? dimensionName
  return {
    name: toUniqueHierarchy(dimensionName, hierarchyName),
    caption: hierarchy.caption ?? hierarchy.name ?? dimension.caption ?? dimensionName,
    role: AggregationRole.hierarchy,
    visible: true,
    dimension: dimensionName,
    memberCaption: sanitizeCaptionField(dimensionName),
    semantics: mapSemanticRole(hierarchy.semanticRole)
      ? {
          semantic: mapSemanticRole(hierarchy.semanticRole)
        }
      : undefined,
    levels: asArray<RuntimeMetadataLevel>(hierarchy.levels).map((level, index) =>
      buildLevel(level, dimensionName, hierarchyName, index)
    )
  }
}

function buildDimension(dimension: RuntimeMetadataDimension): PropertyDimension {
  const hierarchies = asArray<RuntimeMetadataHierarchy>(dimension.hierarchies).map(hierarchy =>
    buildHierarchy(dimension, hierarchy)
  )
  const captionField = sanitizeCaptionField(dimension.name)
  return {
    name: dimension.name,
    caption: dimension.caption ?? dimension.name,
    role: AggregationRole.dimension,
    visible: true,
    memberCaption: captionField,
    defaultHierarchy: hierarchies[0]?.name ?? dimension.name,
    semantics: mapSemanticRole(dimension.semanticRole)
      ? {
          semantic: mapSemanticRole(dimension.semanticRole)
        }
      : undefined,
    hierarchies
  }
}

function buildMeasure(measure: Record<string, unknown>): PropertyMeasure {
  const name = normalizeText(measure.name) ?? normalizeText(measure.code) ?? 'Measure'
  return {
    name,
    caption: normalizeText(measure.caption) ?? normalizeText(measure.name) ?? name,
    role: AggregationRole.measure,
    visible: true,
    dataType: DataType.Numeric
  }
}

function buildEntityType(options: DataSourceOptions, entity: string, projection?: RuntimeMetadataDimension[]) {
  const dimensions = (projection?.length ? projection : resolveSchemaDimensions(options)).map(buildDimension)
  const measures = resolveSchemaMeasures(options).map(buildMeasure)
  const properties = [...dimensions, ...measures].reduce<EntityType['properties']>((acc, property) => {
    acc[property.name] = property
    return acc
  }, {})

  return {
    name: entity,
    caption: options.name ?? entity,
    defaultMeasure: measures[0]?.name,
    visible: true,
    syntax: options.syntax,
    dialect: String(options.type ?? 'XMLA'),
    properties,
    cube: {
      name: entity,
      caption: options.name ?? entity
    }
  } as EntityType
}

function isAllLevel(level?: PropertyLevel | null) {
  return (
    level?.levelType === RuntimeLevelType.ALL ||
    normalizeText(level?.name)?.toLowerCase().startsWith('all ')
  )
}

function resolveMemberContext(entityType: EntityType, dimension: Dimension) {
  const property = getEntityProperty(entityType, dimension) as PropertyDimension | undefined
  const requestedHierarchy = normalizeText(dimension.hierarchy)
  const hierarchy =
    getEntityHierarchy(entityType, dimension) ??
    property?.hierarchies?.find(item => {
      const caption = normalizeText(item.caption)
      const name = normalizeText(item.name)
      return (
        (!requestedHierarchy && item.name === property?.defaultHierarchy) ||
        requestedHierarchy === caption ||
        requestedHierarchy === name ||
        (requestedHierarchy ? String(item.name).endsWith(`.[${requestedHierarchy}]`) : false)
      )
    }) ??
    property?.hierarchies?.[0]

  const explicitLevel = dimension.level
    ? getEntityLevel(entityType, {
        ...dimension,
        hierarchy: hierarchy?.name ?? dimension.hierarchy ?? dimension.dimension
      })
    : undefined
  const semanticLevel =
    explicitLevel ??
    hierarchy?.levels?.find(level => {
      const requestedLevel = normalizeText(dimension.level)
      return (
        requestedLevel === normalizeText(level.caption) ||
        requestedLevel === normalizeText(level.name) ||
        (requestedLevel ? String(level.name).endsWith(`.[${requestedLevel}]`) : false)
      )
    }) ??
    hierarchy?.levels?.find(level => normalizeText(level.name) === normalizeText(dimension.dimension)) ??
    hierarchy?.levels?.find(level => !isAllLevel(level)) ??
    hierarchy?.levels?.[hierarchy.levels.length - 1]

  return {
    dimensionName: property?.name ?? dimension.dimension ?? hierarchy?.dimension ?? '',
    hierarchyName:
      hierarchy?.caption ??
      requestedHierarchy ??
      property?.caption ??
      property?.name ??
      dimension.dimension ??
      '',
    levelName: semanticLevel?.caption ?? normalizeText(dimension.level),
    mdxHierarchyName: hierarchy?.name ?? dimension.hierarchy ?? dimension.dimension ?? '',
    mdxLevelName: semanticLevel?.name ?? dimension.level,
    captionField:
      property?.memberCaption ??
      hierarchy?.memberCaption ??
      sanitizeCaptionField(property?.name ?? dimension.dimension ?? 'Member')
  }
}

function toDimensionMember(
  raw: {
    memberKey: string
    memberCaption: string
  },
  context: {
    dimensionName: string
    hierarchyName: string
    levelName?: string
  }
): IDimensionMember {
  return {
      dimension: context.dimensionName,
      hierarchy: context.hierarchyName,
      ...(context.levelName ? { level: context.levelName } : {}),
      memberKey: raw.memberKey,
      memberCaption: raw.memberCaption
  }
}

function buildRowRecords(input: {
  result: SemanticModelXmlaResult
  entityType: EntityType
  query: MDXQuery
}) {
  const rowDefinitions = input.query.rows ?? []
  const columnDefinitions = input.query.columns ?? []
  const columnAxis = input.result.axes.find(axis => axis.name === 'COLUMNS') ?? {
    name: 'COLUMNS',
    positions: []
  }
  const rowAxes = input.result.axes.filter(axis => axis.name === 'ROWS')
  const cells = Array.isArray(input.result.cells) ? input.result.cells : []

  let rowPositions: string[][] = []
  if (rowAxes.length === 1) {
    rowPositions = rowAxes[0]?.positions ?? []
  } else if (rowDefinitions.length > 0) {
    const selectedAxes = rowAxes.slice(0, rowDefinitions.length)
    rowPositions = selectedAxes.length
      ? selectedAxes[0]!.positions.map((_, rowIndex) =>
          selectedAxes.map(axis => axis.positions[rowIndex]?.[0] ?? '')
        )
      : []
  }

  const rowCount = rowDefinitions.length > 0 ? rowPositions.length : 1
  const rows: ChartRow[] = Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: ChartRow = {}
    rowDefinitions.forEach((definition, definitionIndex) => {
      const propertyName = definition.dimension ?? definition.name ?? `Dimension_${definitionIndex + 1}`
      const value =
        rowAxes.length === 1
          ? rowPositions[rowIndex]?.[definitionIndex] ?? rowPositions[rowIndex]?.[0] ?? null
          : rowPositions[rowIndex]?.[definitionIndex] ?? null
      const property = getEntityProperty(input.entityType, definition) as PropertyDimension | undefined
      const hierarchy = getEntityHierarchy(input.entityType, definition)
      const captionField = property?.memberCaption ?? hierarchy?.memberCaption ?? sanitizeCaptionField(propertyName)
      row[propertyName] = value
      row[captionField] = value
      if (definition.level) {
        row[definition.level] = value
      }
    })
    return row
  })

  const columnCount = Math.max(columnAxis.positions.length, columnDefinitions.length, 1)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const cell = cells[rowIndex * columnCount + columnIndex]
      const columnDefinition = columnDefinitions[columnIndex]
      const columnTuple = columnAxis.positions[columnIndex]
      const columnName =
        columnDefinition?.measure ??
        (Array.isArray(columnDefinition?.members) ? normalizeText(columnDefinition.members[0]) : undefined) ??
        columnDefinition?.dimension ??
        columnTuple?.[columnTuple.length - 1] ??
        `Value_${columnIndex + 1}`
      rows[rowIndex][columnName] = cell?.value ?? null
      if (cell?.formatted != null) {
        rows[rowIndex][`${columnName}_Formatted`] = cell.formatted
      }
    }
  }

  return rows
}

export class AnalyticalCardRuntimeXmlaDataSource extends AbstractDataSource<DataSourceOptions> {
  private readonly entityTypes = new Map<string, Observable<EntityType | Error>>()
  private readonly members = new Map<string, Observable<IDimensionMember[]>>()
  private readonly projectionPromise: Promise<RuntimeMetadataDimension[] | undefined>

  constructor(options: DataSourceOptions, agent: Agent, cacheService?: OcapCache) {
    super(options, agent)
    void cacheService
    this.projectionPromise = getSemanticModelRuntimeMetadata(String(options.id))
      .then(result => result?.projection?.dimensions)
      .catch(() => undefined)
  }

  discoverDBCatalogs(): Observable<DBCatalog[]> {
    return of([
      {
        name: this.options.catalog ?? this.options.name ?? 'default'
      } as DBCatalog
    ])
  }

  discoverDBTables(_refresh?: boolean): Observable<DBTable[]> {
    return this.selectEntitySets().pipe(map(items => items as unknown as DBTable[]))
  }

  discoverMDCubes(_refresh?: boolean): Observable<MDCube[]> {
    return this.selectEntitySets().pipe(map(items => items as unknown as MDCube[]))
  }

  discoverMDMembers(entity: string, dimension: Dimension): Observable<IDimensionMember[]> {
    return this.selectMembers(entity, dimension)
  }

  createEntityService<T>(entity: string): EntityService<T> {
    return new AnalyticalCardRuntimeXmlaEntityService<T & ChartRow>(this, entity) as unknown as EntityService<T>
  }

  getCatalogs() {
    return this.discoverDBCatalogs().pipe(
      map(items =>
        items.map(item => ({
          name: item.name,
          label: item.name
        })) as Catalog[]
      )
    )
  }

  getEntitySets(refresh?: boolean): Observable<EntitySet[]> {
    return this.selectEntitySets(refresh)
  }

  selectEntitySets(_refresh?: boolean): Observable<EntitySet[]> {
    const entityName = this.options.name ?? 'Cube'
    return from(this.resolveEntityType(entityName)).pipe(
      map(entityType => [
        {
          name: entityName,
          caption: entityType.caption ?? entityName,
          entityType
        } as EntitySet
      ]),
      shareReplay(1)
    )
  }

  getEntityType(entity: string): Observable<EntityType | Error> {
    if (!this.entityTypes.has(entity)) {
      this.entityTypes.set(entity, from(this.resolveEntityType(entity)).pipe(shareReplay(1)))
    }
    return this.entityTypes.get(entity)!
  }

  getMembers(entity: string, dimension: Dimension): Observable<IDimensionMember[]> {
    return this.selectMembers(entity, dimension)
  }

  selectMembers(entity: string, dimension: Dimension): Observable<IDimensionMember[]> {
    const key = `${entity}::${dimension.dimension ?? dimension.name ?? ''}::${dimension.hierarchy ?? ''}::${dimension.level ?? ''}`
    if (!this.members.has(key)) {
      this.members.set(
        key,
        from(this.loadMembers(entity, dimension)).pipe(shareReplay(1))
      )
    }
    return this.members.get(key)!
  }

  createEntity(_name: string, _columns: unknown[], _data?: unknown[]): Observable<string> {
    return of('')
  }

  async dropEntity(_name: string): Promise<void> {
    void _name
  }

  query(options: { statement: string; forceRefresh?: boolean; timeout?: number }): Observable<unknown> {
    return from(
      executeSemanticModelXmla(String(this.options.id), options.statement, {
        forceRefresh: options.forceRefresh
      })
    ).pipe(
      map(result =>
        ({
          data: result
        }) as unknown as QueryReturn<unknown>
      )
    )
  }

  async executeChartStatement(input: { entityType: EntityType; query: MDXQuery; statement: string }) {
    const result = await executeSemanticModelXmla(String(this.options.id), input.statement)
    const data = buildRowRecords({
      result,
      entityType: input.entityType,
      query: input.query
    })
    return {
      data,
      rows: input.query.rows ?? [],
      columns: input.query.columns ?? []
    }
  }

  private async resolveEntityType(entity: string) {
    const projection = await this.projectionPromise
    return buildEntityType(this.options, entity, projection)
  }

  private async loadMembers(entity: string, dimension: Dimension) {
    const entityType = await this.resolveEntityType(entity)
    const context = resolveMemberContext(entityType, dimension)

    const metadataPage = await listSemanticModelRuntimeMembers(String(this.options.id), {
      dimension: context.dimensionName,
      hierarchy: context.hierarchyName,
      ...(context.levelName ? { level: context.levelName } : {}),
      limit: 200
    }).catch(() => undefined)

    if (metadataPage?.items?.length) {
      return metadataPage.items.map(item =>
        toDimensionMember(
          {
            memberKey: item.memberKey,
            memberCaption: item.memberName
          },
          context
        )
      )
    }

    const statement = `SELECT NON EMPTY {${toUniqueLevel(
      context.dimensionName,
      context.mdxHierarchyName,
      context.mdxLevelName
    )}.Members} ON ROWS FROM [${entity}]`
    const result = await executeSemanticModelXmla(String(this.options.id), statement)
    const rowAxis = result.axes.find(axis => axis.name === 'ROWS')
    return (rowAxis?.positions ?? []).map(position =>
      toDimensionMember(
        {
          memberKey: position[position.length - 1] ?? '',
          memberCaption: position[position.length - 1] ?? ''
        },
        context
      )
    )
  }
}
