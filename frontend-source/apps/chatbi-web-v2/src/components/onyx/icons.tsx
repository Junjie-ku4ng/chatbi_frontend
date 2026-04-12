'use client'

import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type OnyxIconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

export function SvgBubbleTextV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.4939 6.5H5.5M8.00607 9.5H5.50607M1.5 13.5H10.5C12.7091 13.5 14.5 11.7091 14.5 9.5V6.5C14.5 4.29086 12.7091 2.5 10.5 2.5H5.5C3.29086 2.5 1.5 4.29086 1.5 6.5V13.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  )
}

export function SvgEditBigV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 2.5H4C3.17157 2.5 2.5 3.17157 2.5 4V12C2.5 12.8284 3.17157 13.5 4 13.5H12C12.8284 13.5 13.5 12.8284 13.5 12V8M6 10V8.26485C6 8.08682 6.0707 7.91617 6.19654 7.79028L11.5938 2.3931C12.1179 1.86897 12.9677 1.86897 13.4918 2.3931L13.6069 2.50823C14.131 3.03236 14.131 3.88213 13.6069 4.40626L8.20971 9.80345C8.08389 9.92934 7.91317 10 7.73521 10H6Z"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  )
}

export function SvgFolderV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M14.5 12V6C14.5 5.17157 13.8284 4.5 13 4.5H9.12132C8.7235 4.5 8.34196 4.34196 8.06066 4.06066L6.93934 2.93934C6.65804 2.65804 6.2765 2.5 5.87868 2.5H3C2.17157 2.5 1.5 3.17157 1.5 4V12C1.5 12.8284 2.17157 13.5 3 13.5H13C13.8284 13.5 14.5 12.8284 14.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  )
}

export function SvgSidebarV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 2.5H13M3 8H13M3 13.5H13" strokeLinecap="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgPanelLeftV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect height="11" rx="1.5" strokeWidth={1.5} width="11" x="2.5" y="2.5" />
      <path d="M6.5 2.5V13.5" strokeLinecap="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgCraftBoxV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 5.5L8 2.75L13 5.5L8 8.25L3 5.5Z" strokeLinejoin="round" strokeWidth={1.4} />
      <path d="M3 5.5V10.5L8 13.25L13 10.5V5.5M8 8.25V13.25" strokeLinejoin="round" strokeWidth={1.4} />
      <path d="M5.5 4.125L10.5 6.875" strokeLinecap="round" strokeWidth={1.4} />
    </svg>
  )
}

export function SvgGearV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.85 1.75H9.15L9.55 3.45C9.92 3.58 10.27 3.77 10.59 4L12.25 3.48L13.4 5.52L12.12 6.7C12.18 7.08 12.18 7.46 12.12 7.84L13.4 9.02L12.25 11.06L10.59 10.54C10.27 10.77 9.92 10.96 9.55 11.09L9.15 12.8H6.85L6.45 11.09C6.08 10.96 5.73 10.77 5.41 10.54L3.75 11.06L2.6 9.02L3.88 7.84C3.82 7.46 3.82 7.08 3.88 6.7L2.6 5.52L3.75 3.48L5.41 4C5.73 3.77 6.08 3.58 6.45 3.45L6.85 1.75Z"
        strokeLinejoin="round"
        strokeWidth={1.3}
      />
      <circle cx="8" cy="7.275" r="2" strokeWidth={1.3} />
    </svg>
  )
}

export function SvgChevronDownV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M4 6.5L8 10L12 6.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgSearchMenuV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7 12.5C10.0376 12.5 12.5 10.0376 12.5 7C12.5 3.96243 10.0376 1.5 7 1.5C3.96243 1.5 1.5 3.96243 1.5 7C1.5 10.0376 3.96243 12.5 7 12.5Z"
        strokeWidth={1.5}
      />
      <path d="M11 11L14.5 14.5" strokeLinecap="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgPlusV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 3V13M3 8H13" strokeLinecap="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgSparkleV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 1.5L9.262 5.238L13 6.5L9.262 7.762L8 11.5L6.738 7.762L3 6.5L6.738 5.238L8 1.5Z" strokeLinejoin="round" strokeWidth={1.2} />
      <path d="M12.5 10.5L13.1 12.4L15 13L13.1 13.6L12.5 15.5L11.9 13.6L10 13L11.9 12.4L12.5 10.5Z" strokeLinejoin="round" strokeWidth={1.2} />
    </svg>
  )
}

export function SvgHourglassV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 2.5H12M4 13.5H12M5 2.5V4.07107C5 4.46957 5.15804 4.85111 5.43934 5.13241L7.29289 6.98596C7.68342 7.37648 7.68342 8.00965 7.29289 8.40017L5.43934 10.2537C5.15804 10.535 5 10.9166 5 11.3151V13.5M11 2.5V4.07107C11 4.46957 10.842 4.85111 10.5607 5.13241L8.70711 6.98596C8.31658 7.37648 8.31658 8.00965 8.70711 8.40017L10.5607 10.2537C10.842 10.535 11 10.9166 11 11.3151V13.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
      />
    </svg>
  )
}

export function SvgDocumentV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.5 1.5H9.08579C9.351 1.5 9.60536 1.60536 9.79289 1.79289L12.2071 4.20711C12.3946 4.39464 12.5 4.649 12.5 4.91421V13C12.5 13.5523 12.0523 14 11.5 14H4.5C3.94772 14 3.5 13.5523 3.5 13V2.5C3.5 1.94772 3.94772 1.5 4.5 1.5Z"
        strokeLinejoin="round"
        strokeWidth={1.4}
      />
      <path d="M9 1.75V4.5H11.75" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} />
      <path d="M5.5 7H10.5M5.5 9.5H10.5M5.5 12H8.5" strokeLinecap="round" strokeWidth={1.4} />
    </svg>
  )
}

export function SvgMailV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect height="10.5" rx="1.5" strokeWidth={1.4} width="13" x="1.5" y="2.75" />
      <path d="M2 4L7.11325 8.0906C7.62473 8.49979 8.37527 8.49979 8.88675 8.0906L14 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} />
    </svg>
  )
}

export function SvgArrowRightV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 8H13M13 8L9.5 4.5M13 8L9.5 11.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgArrowLeftV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M13 8H3M3 8L6.5 4.5M3 8L6.5 11.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgArrowUpV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 13V3M8 3L4.5 6.5M8 3L11.5 6.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgStopV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="currentColor"
      height={size}
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect height="8" rx="1.5" width="8" x="4" y="4" />
    </svg>
  )
}

export function SvgUserCircleV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      viewBox="0 0 16 16"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5Z" strokeWidth={1.5} />
      <path d="M8 8.2C9.38071 8.2 10.5 7.08071 10.5 5.7C10.5 4.31929 9.38071 3.2 8 3.2C6.61929 3.2 5.5 4.31929 5.5 5.7C5.5 7.08071 6.61929 8.2 8 8.2Z" strokeWidth={1.5} />
      <path d="M4.6 12.4C5.35846 10.9947 6.58227 10.2 8 10.2C9.41773 10.2 10.6415 10.9947 11.4 12.4" strokeLinecap="round" strokeWidth={1.5} />
    </svg>
  )
}

export function SvgCopyV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg fill="none" height={size} stroke="currentColor" viewBox="0 0 16 16" width={size} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5.5 5.5V3.5C5.5 2.94772 5.94772 2.5 6.5 2.5H12.5C13.0523 2.5 13.5 2.94772 13.5 3.5V9.5C13.5 10.0523 13.0523 10.5 12.5 10.5H10.5" strokeWidth={1.5} />
      <rect height="8" rx="1" strokeWidth={1.5} width="8" x="2.5" y="5.5" />
    </svg>
  )
}

export function SvgThumbUpV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg fill="none" height={size} stroke="currentColor" viewBox="0 0 16 16" width={size} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6.5 7L8.5 2.5H9.5C10.0523 2.5 10.5 2.94772 10.5 3.5V6H12.5C13.0523 6 13.5 6.44772 13.5 7V8C13.5 8.13745 13.4717 8.27343 13.4168 8.39943L11.6168 12.3994C11.4584 12.7514 11.1086 12.9775 10.7223 12.9775H6.5M6.5 7H3.5C2.94772 7 2.5 7.44772 2.5 8V12C2.5 12.5523 2.94772 13 3.5 13H6.5M6.5 7V13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} />
    </svg>
  )
}

export function SvgThumbDownV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg fill="none" height={size} stroke="currentColor" viewBox="0 0 16 16" width={size} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9.5 9L7.5 13.5H6.5C5.94772 13.5 5.5 13.0523 5.5 12.5V10H3.5C2.94772 10 2.5 9.55228 2.5 9V8C2.5 7.86255 2.52831 7.72657 2.58318 7.60057L4.38318 3.60057C4.54161 3.24858 4.8914 3.02246 5.27766 3.02246H9.5M9.5 9H12.5C13.0523 9 13.5 8.55228 13.5 8V4C13.5 3.44772 13.0523 3 12.5 3H9.5M9.5 9V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} />
    </svg>
  )
}

export function SvgRotateV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg fill="none" height={size} stroke="currentColor" viewBox="0 0 16 16" width={size} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M13 5V2.5M13 2.5H10.5M13 2.5L10.9 4.6C10.1231 3.62226 8.93872 3 7.60938 3C5.26167 3 3.2926 4.93134 3.25 7.27866M3 11V13.5M3 13.5H5.5M3 13.5L5.1 11.4C5.87694 12.3777 7.06128 13 8.39062 13C10.7383 13 12.7074 11.0687 12.75 8.72134" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} />
    </svg>
  )
}

function ChatbiLogoImageV2({ className, size, style }: OnyxIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('chatbi-logo-mark-v2', className)}
      style={{ width: size, height: size, ...style }}
    />
  )
}

export function SvgChatbiMarkV2({ size, ...props }: OnyxIconProps) {
  return <ChatbiLogoImageV2 size={size} {...props} />
}

export function SvgOnyxMarkV2(props: OnyxIconProps) {
  return <SvgChatbiMarkV2 {...props} />
}

const HEIGHT_TO_GAP_RATIO = 5 / 16

export function SvgChatbiLogoTypedV2({
  className,
  size
}: {
  className?: string
  size?: number
}) {
  const gap = size != null ? size * HEIGHT_TO_GAP_RATIO : undefined

  return (
    <div className={cn('chatbi-logo-typed-v2 flex flex-row items-center', className)} style={{ gap }}>
      <ChatbiLogoImageV2 size={size} />
      <span className="chatbi-logo-wordmark-v2">镜元智算</span>
    </div>
  )
}

export function SvgOnyxLogoTypedV2(props: { className?: string; size?: number }) {
  return <SvgChatbiLogoTypedV2 {...props} />
}
