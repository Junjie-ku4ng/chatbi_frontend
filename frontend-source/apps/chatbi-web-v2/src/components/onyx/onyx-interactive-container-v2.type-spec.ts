import type React from 'react'
import type { OnyxButtonType } from '@/components/onyx/onyx-types'
import { OnyxButtonV2 } from '@/components/onyx/onyx-button-v2'
import { OnyxInteractiveContainerV2 } from '@/components/onyx/onyx-interactive-container-v2'

const buttonContainerProps: React.ComponentProps<typeof OnyxInteractiveContainerV2> = {
  type: 'button' satisfies OnyxButtonType,
  name: 'chat-action',
  form: 'chat-form',
  onCopy: (event: React.ClipboardEvent<HTMLButtonElement>) => {
    void event.currentTarget.form
  },
  children: 'Chat'
}

const anchorContainerProps: React.ComponentProps<typeof OnyxInteractiveContainerV2> = {
  href: '/chat',
  target: '_blank',
  onCopy: (event: React.ClipboardEvent<HTMLAnchorElement>) => {
    void event.currentTarget.href
  },
  children: 'Chat'
}

const buttonProps: React.ComponentProps<typeof OnyxButtonV2> = {
  children: 'New Session',
  name: 'chat-action',
  form: 'chat-form',
  onCopy: (event: React.ClipboardEvent<HTMLButtonElement>) => {
    void event.currentTarget.form
  }
}

const anchorButtonProps: React.ComponentProps<typeof OnyxButtonV2> = {
  children: 'Open Chat',
  href: '/chat',
  target: '_blank',
  onCopy: (event: React.ClipboardEvent<HTMLAnchorElement>) => {
    void event.currentTarget.href
  }
}

void buttonContainerProps
void anchorContainerProps
void buttonProps
void anchorButtonProps
