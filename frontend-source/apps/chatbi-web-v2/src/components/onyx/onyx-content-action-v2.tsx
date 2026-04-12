'use client'

import type { ReactNode } from 'react'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import type { OnyxIconComponent } from '@/components/onyx/onyx-types'

type OnyxContentActionV2Props = {
  icon?: OnyxIconComponent
  rightChildren?: ReactNode
  title: string
}

export function OnyxContentActionV2({
  icon: Icon,
  rightChildren,
  title
}: OnyxContentActionV2Props) {
  return (
    <div className="flex flex-row items-stretch w-full">
      <div className="flex-1 min-w-0 self-center px-2">
        <div className="flex w-full min-w-0 flex-row items-center gap-2">
          {Icon ? (
            <div className="flex items-center justify-center p-0.5">
              <Icon className="h-[1rem] w-[1rem] text-text-03" />
            </div>
          ) : null}
          <OnyxTextV2 color="inherit" font="main-ui-body" maxLines={1}>
            {title}
          </OnyxTextV2>
        </div>
      </div>
      {rightChildren ? <div className="flex items-stretch shrink-0">{rightChildren}</div> : null}
    </div>
  )
}
