'use client'

import {
  AggregationRole,
  C_MEASURES,
  type Dimension,
  type EntityType,
  getEntityCalendarHierarchy,
  getEntityDimensions,
  getEntityHierarchy,
  getEntityLevel,
  getEntityProperty,
  type IDimensionMember,
  type Property,
  type QueryOptions,
  type QueryReturn,
  PeriodFunctions,
  Semantics
} from '@metad/ocap-core'
import { from, Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { AbstractEntityService } from '../../../../../../../packages/core/src/lib/abstract-entity.service'
import {
  CURRENT,
  MOM,
  MOMGAP,
  MPM,
  MPMYOY,
  MTD,
  PYSM,
  PYSMYOY,
  PYYTD,
  QTD,
  WTD,
  YOY,
  YOYGAP,
  YTD,
  YTDOM,
  YTDOY,
  YTDOYGAP
} from '../../../../../../../packages/xmla/src/lib/functions/calendar'
import { generateMDXQuery } from '../../../../../../../packages/xmla/src/lib/mdx-query'
import { generateMDXStatement } from '../../../../../../../packages/xmla/src/lib/mdx-statement'
import type { MDXProperty } from '../../../../../../../packages/xmla/src/lib/filter'
import type { AnalyticalCardRuntimeXmlaDataSource } from './analytical-card-runtime-xmla-data-source'

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

type ChartRow = Record<string, unknown>

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isSyntheticCaptionProperty(value: unknown) {
  const normalized = normalizeText(value)
  return Boolean(normalized && normalized.endsWith('_Text') && !normalized.includes('['))
}

function stripUnsupportedDimensionProperties(property: MDXProperty): MDXProperty {
  if (property.dimension === C_MEASURES) {
    return property
  }

  return {
    ...property,
    ...(isSyntheticCaptionProperty(property.memberCaption) ? { memberCaption: undefined } : {}),
    properties: property.properties?.filter(item => !isSyntheticCaptionProperty(item))
  }
}

export class AnalyticalCardRuntimeXmlaEntityService<T extends ChartRow>
  extends AbstractEntityService<T> {
  declare readonly dataSource: AnalyticalCardRuntimeXmlaDataSource

  constructor(dataSource: AnalyticalCardRuntimeXmlaDataSource, entitySet: string) {
    super(dataSource, entitySet)
  }

  refresh(): void {
    // ChartBusinessService drives refresh; entity service itself is stateless.
  }

  override query(options?: QueryOptions<unknown>): Observable<QueryReturn<T>> {
    return this.selectQuery(options)
  }

  override selectQuery(options?: QueryOptions<unknown>): Observable<QueryReturn<T>> {
    if (!options || (!options.columns?.length && !options.rows?.length)) {
      return of({ data: [] as T[] })
    }

    const normalizedOptions = this.normalizeQueryOptions(options)
    const cube = this.dataSource.options.schema?.cubes?.find(item => item.name === this.entitySet)
    const mdxQuery = generateMDXQuery(
      this.entitySet,
      {
        ...this.entityType,
        cube
      },
      normalizedOptions
    )
    mdxQuery.rows = mdxQuery.rows?.map(stripUnsupportedDimensionProperties)
    mdxQuery.columns = mdxQuery.columns?.map(stripUnsupportedDimensionProperties)
    mdxQuery.cube = cube
    mdxQuery.parameters = normalizedOptions?.parameters

    const statement =
      normalizedOptions?.statement || generateMDXStatement(mdxQuery, this.entityType, this.entityType.dialect as never)

    return from(
      this.dataSource.executeChartStatement({
        entityType: this.entityType,
        query: mdxQuery,
        statement
      })
    ).pipe(
      map(result => ({
        data: result.data as T[],
        results: result.data as T[],
        schema: {
          rows: result.rows,
          columns: result.columns
        },
        stats: {
          statements: [statement]
        }
      }) as QueryReturn<T>),
      catchError(error =>
        of({
          status: 'ERROR' as QueryReturn<T>['status'],
          error: toErrorMessage(error),
          stats: {
            statements: [statement]
          }
        } as QueryReturn<T>)
      )
    )
  }

  getCalculatedMember(measure: string, type: PeriodFunctions, calendar?: string): Property {
    const measureProperty = getEntityProperty(this.entityType, measure)
    const calendarDimension = getEntityDimensions(this.entityType).find(
      property => property.semantics?.semantic === Semantics.Calendar
    )
    if (!calendarDimension) {
      throw new Error(`Calendar dimension not found for ${this.entityType?.name ?? this.entitySet}`)
    }

    const calendarHierarchy = calendar
      ? getEntityHierarchy(this.entityType, {
          dimension: calendarDimension.name,
          hierarchy: calendar
        })
      : getEntityCalendarHierarchy(this.entityType, {
          dimension: calendarDimension.name,
          hierarchy: calendarDimension.defaultHierarchy
        })

    switch (type) {
      case PeriodFunctions.CURRENT:
        return CURRENT(measure, measureProperty)
      case PeriodFunctions.YTD:
        return YTD(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.QTD:
        return QTD(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.WTD:
        return WTD(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.MTD:
        return MTD(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.PYYTD:
        return PYYTD(measure, calendarHierarchy)
      case PeriodFunctions.MOM:
        return MOM(measure, calendarHierarchy)
      case PeriodFunctions.MOMGAP:
        return MOMGAP(measure, calendarHierarchy)
      case PeriodFunctions.YOY:
        return YOY(measure, calendarHierarchy)
      case PeriodFunctions.YOYGAP:
        return YOYGAP(measure, calendarHierarchy)
      case PeriodFunctions.YTDOM:
        return YTDOM(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.YTDOY:
        return YTDOY(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.YTDOYGAP:
        return YTDOYGAP(measure, measureProperty, calendarHierarchy)
      case PeriodFunctions.PYSM:
        return PYSM(measure, calendarHierarchy)
      case PeriodFunctions.PYSMYOY:
        return PYSMYOY(measure, calendarHierarchy)
      case PeriodFunctions.MPM:
        return MPM(measure, calendarHierarchy)
      case PeriodFunctions.MPMYOY:
        return MPMYOY(measure, calendarHierarchy)
      default:
        return {
          name: measure,
          caption: measureProperty?.caption ?? measure,
          role: AggregationRole.measure
        }
    }
  }

  private normalizeQueryOptions(options: QueryOptions<unknown>) {
    return {
      ...options,
      rows: options.rows?.map(item => this.normalizeDimension(item)),
      columns: options.columns?.map(item => this.normalizeDimension(item)),
      filters: options.filters?.map(item => ({
        ...item,
        dimension: item.dimension ? this.normalizeDimension(item.dimension) : item.dimension
      }))
    }
  }

  private normalizeDimension(dimension: Dimension) {
    if (!dimension || dimension.dimension === C_MEASURES) {
      return dimension
    }

    const property = getEntityProperty(this.entityType, dimension)
    const requestedHierarchy = normalizeText(dimension.hierarchy)
    const hierarchy =
      getEntityHierarchy(this.entityType, dimension) ??
      property?.hierarchies?.find(item => {
        const caption = normalizeText(item.caption)
        const name = normalizeText(item.name)
        return (
          requestedHierarchy === caption ||
          requestedHierarchy === name ||
          (requestedHierarchy ? String(item.name).endsWith(`.[${requestedHierarchy}]`) : false)
        )
      }) ??
      property?.hierarchies?.[0]
    const requestedLevel = normalizeText(dimension.level)
    const level =
      getEntityLevel(this.entityType, {
        ...dimension,
        hierarchy: hierarchy?.name ?? dimension.hierarchy
      }) ??
      hierarchy?.levels?.find(item => {
        const caption = normalizeText(item.caption)
        const name = normalizeText(item.name)
        return (
          requestedLevel === caption ||
          requestedLevel === name ||
          (requestedLevel ? String(item.name).endsWith(`.[${requestedLevel}]`) : false)
        )
      })

    return {
      ...dimension,
      hierarchy: hierarchy?.name ?? dimension.hierarchy,
      level: level?.name ?? dimension.level,
      memberCaption: dimension.memberCaption ?? property?.memberCaption ?? hierarchy?.memberCaption
    }
  }
}

export function buildDefaultTimeDimension(entityType: EntityType) {
  return getEntityDimensions(entityType).find(property => property.semantics?.semantic === Semantics.Calendar)
}
