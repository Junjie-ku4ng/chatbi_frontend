'use client'

import { OffSetDirection, TimeGranularity, TimeRange, TimeRangeType } from '@metad/ocap-core'

export type XpertSlicerDateVariable = {
  dateRange: TimeRange
  id: string
  name: string
}

// Direct port of the date-variable catalog that xpert's slicer menu actually surfaces
// (`getDateVariables().filter(variable => !!variable.dateRange)` in BaseSlicersComponent).
export const XPERT_SLICER_DATE_VARIABLES: XpertSlicerDateVariable[] = [
  {
    id: 'TODAY',
    name: '当前日期',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0
    }
  },
  {
    id: 'YESTERDAY',
    name: '昨天',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 1
      }
    }
  },
  {
    id: 'DBY',
    name: '前天',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 2
      }
    }
  },
  {
    id: 'DAYS_7_AGO',
    name: '七天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 7
      }
    }
  },
  {
    id: 'DAYS_8_AGO',
    name: '八天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 8
      }
    }
  },
  {
    id: 'DAYS_14_AGO',
    name: '十四天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 14
      }
    }
  },
  {
    id: 'DAYS_15_AGO',
    name: '十五天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 15
      }
    }
  },
  {
    id: 'DAYS_30_AGO',
    name: '三十天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 30
      }
    }
  },
  {
    id: 'DAYS_31_AGO',
    name: '三十一天前',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Day,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Day,
        amount: 31
      }
    }
  },
  {
    id: 'RECENT_7_DAYS',
    name: '最近七天',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 7,
      lookAhead: 0
    }
  },
  {
    id: 'RECENT_14_DAYS',
    name: '最近十四天',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 14,
      lookAhead: 0
    }
  },
  {
    id: 'RECENT_30_DAYS',
    name: '最近三十天',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 30,
      lookAhead: 0
    }
  },
  {
    id: 'RECENT_90_DAYS',
    name: '最近九十天',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 90,
      lookAhead: 0
    }
  },
  {
    id: 'RECENT_180_DAYS',
    name: '最近一百八十天',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Day,
      lookBack: 180,
      lookAhead: 0
    }
  },
  {
    id: 'THIS_MONTH',
    name: '本月',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Month,
      lookBack: 0,
      lookAhead: 0
    }
  },
  {
    id: 'PREVIOUS_MONTH',
    name: '上月',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Month,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Month,
        amount: 1
      }
    }
  },
  {
    id: 'THIS_QUARTER',
    name: '本季度',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Quarter,
      lookBack: 0,
      lookAhead: 0
    }
  },
  {
    id: 'THIS_WHOLE_YEAR',
    name: '今年(包含整年)',
    dateRange: {
      type: TimeRangeType.Standard,
      granularity: TimeGranularity.Year,
      lookBack: 0,
      lookAhead: 0
    }
  },
  {
    id: 'PREVIOUS_YEAR',
    name: '去年',
    dateRange: {
      type: TimeRangeType.Offset,
      granularity: TimeGranularity.Year,
      lookBack: 0,
      lookAhead: 0,
      current: {
        direction: OffSetDirection.LookBack,
        granularity: TimeGranularity.Year,
        amount: 1
      }
    }
  }
]
