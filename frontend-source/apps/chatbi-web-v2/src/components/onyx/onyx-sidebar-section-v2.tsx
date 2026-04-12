'use client'

import type { ReactNode } from 'react'
import { OnyxDonorCardV2 } from '@/components/onyx-donor/onyx-donor-card-v2'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'

type OnyxSidebarSectionV2Props = {
  title: string
  children: ReactNode
}

export function OnyxSidebarSectionV2({
  title,
  children
}: OnyxSidebarSectionV2Props) {
  const sectionHeaderTestId = `onyx-donor-sidebar-section-header-${title}`
  const sectionCardTestId = `onyx-native-donor-sidebar-section-card-${title}`

  return (
    <OnyxDonorCardV2
      className="onyx-sidebar-section-v2 onyx-donor-sidebar-section onyx-native-donor-sidebar-section-card"
      data-testid={sectionCardTestId}
      padding="sm"
      variant="secondary"
    >
      <div className="onyx-native-donor-sidebar-section-stack" data-testid="onyx-native-donor-sidebar-section-stack">
        <div
          className="pl-2 mr-1.5 py-1 sticky top-0 bg-background-tint-02 z-10 flex min-h-[2rem] flex-row items-center justify-between onyx-donor-sidebar-section-header"
          data-testid={sectionHeaderTestId}
        >
          <div className="w-full p-0.5 onyx-donor-sidebar-section-title">
            <OnyxTextV2 color="text-03" font="secondary-body">
              {title}
            </OnyxTextV2>
          </div>
        </div>
        {children}
      </div>
    </OnyxDonorCardV2>
  )
}
