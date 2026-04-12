'use client'

import type { ReactNode } from 'react'
import { OnyxDonorCardV2 } from '../onyx-donor/onyx-donor-card-v2'

type OnyxAppInputBarV2Props = {
  input: ReactNode
  leftControls?: ReactNode
  rightControls?: ReactNode
  id?: string
}

export function OnyxAppInputBarV2({
  input,
  leftControls,
  rightControls,
  id = 'onyx-chat-input'
}: OnyxAppInputBarV2Props) {
  return (
    <div className="onyx-composer-shell" id={id}>
      <OnyxDonorCardV2
        className="onyx-native-donor-composer-card relative w-full flex flex-col"
        data-testid="onyx-native-donor-composer-card"
        padding="sm"
        variant="primary"
      >
        <div className="onyx-native-donor-composer-stack" data-testid="onyx-native-donor-composer-stack">
          <div className="onyx-app-input-bar-v2" data-testid="onyx-app-input-bar">
            <div className="onyx-app-input-bar-v2-surface">
              <div className="onyx-app-input-bar-v2-textarea-zone" data-testid="onyx-app-input-bar-textarea-zone">
                {input}
              </div>
              <div className="onyx-app-input-bar-v2-toolbar">
                <div className="onyx-app-input-bar-v2-toolbar-left" data-testid="onyx-app-input-bar-toolbar-left">
                  {leftControls}
                </div>
                <div className="onyx-app-input-bar-v2-toolbar-right" data-testid="onyx-app-input-bar-toolbar-right">
                  {rightControls}
                </div>
              </div>
            </div>
          </div>
        </div>
      </OnyxDonorCardV2>
    </div>
  )
}
