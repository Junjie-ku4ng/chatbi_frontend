'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OnyxTextFont =
  | 'heading-h1'
  | 'heading-h2'
  | 'heading-h3'
  | 'heading-h3-muted'
  | 'main-content-body'
  | 'main-content-muted'
  | 'main-content-emphasis'
  | 'main-content-mono'
  | 'main-ui-body'
  | 'main-ui-muted'
  | 'main-ui-action'
  | 'main-ui-mono'
  | 'secondary-body'
  | 'secondary-action'
  | 'secondary-mono'
  | 'secondary-mono-label'
  | 'figure-small-label'
  | 'figure-small-value'
  | 'figure-keystroke'

type OnyxTextColor =
  | 'inherit'
  | 'text-01'
  | 'text-02'
  | 'text-03'
  | 'text-04'
  | 'text-05'
  | 'text-inverted-01'
  | 'text-inverted-02'
  | 'text-inverted-03'
  | 'text-inverted-04'
  | 'text-inverted-05'
  | 'text-light-03'
  | 'text-light-05'
  | 'text-dark-03'
  | 'text-dark-05'

type OnyxTextV2Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'color'> & {
  as?: 'p' | 'span' | 'li' | 'h1' | 'h2' | 'h3' | 'div'
  children?: ReactNode
  color?: OnyxTextColor
  font?: OnyxTextFont
  maxLines?: number
  nowrap?: boolean
}

const FONT_CONFIG: Record<OnyxTextFont, string> = {
  'heading-h1': 'font-heading-h1',
  'heading-h2': 'font-heading-h2',
  'heading-h3': 'font-heading-h3',
  'heading-h3-muted': 'font-heading-h3-muted',
  'main-content-body': 'font-main-content-body',
  'main-content-muted': 'font-main-content-muted',
  'main-content-emphasis': 'font-main-content-emphasis',
  'main-content-mono': 'font-main-content-mono',
  'main-ui-body': 'font-main-ui-body',
  'main-ui-muted': 'font-main-ui-muted',
  'main-ui-action': 'font-main-ui-action',
  'main-ui-mono': 'font-main-ui-mono',
  'secondary-body': 'font-secondary-body',
  'secondary-action': 'font-secondary-action',
  'secondary-mono': 'font-secondary-mono',
  'secondary-mono-label': 'font-secondary-mono-label',
  'figure-small-label': 'font-figure-small-label',
  'figure-small-value': 'font-figure-small-value',
  'figure-keystroke': 'font-figure-keystroke'
}

const COLOR_CONFIG: Record<OnyxTextColor, string | null> = {
  inherit: null,
  'text-01': 'text-text-01',
  'text-02': 'text-text-02',
  'text-03': 'text-text-03',
  'text-04': 'text-text-04',
  'text-05': 'text-text-05',
  'text-inverted-01': 'text-text-inverted-01',
  'text-inverted-02': 'text-text-inverted-02',
  'text-inverted-03': 'text-text-inverted-03',
  'text-inverted-04': 'text-text-inverted-04',
  'text-inverted-05': 'text-text-inverted-05',
  'text-light-03': 'text-text-light-03',
  'text-light-05': 'text-text-light-05',
  'text-dark-03': 'text-text-dark-03',
  'text-dark-05': 'text-text-dark-05'
}

export function OnyxTextV2({
  as: Tag = 'span',
  children,
  color = 'text-04',
  font = 'main-ui-body',
  maxLines,
  nowrap,
  ...rest
}: OnyxTextV2Props) {
  const style =
    maxLines && maxLines > 1
      ? ({
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: maxLines
        } as const)
      : undefined

  return (
    <Tag
      {...rest}
      className={cn(
        'px-[2px]',
        FONT_CONFIG[font],
        COLOR_CONFIG[color],
        nowrap && 'whitespace-nowrap',
        maxLines === 1 && 'truncate',
        maxLines && maxLines > 1 && 'overflow-hidden',
        rest.className
      )}
      style={style}
    >
      {children}
    </Tag>
  )
}
