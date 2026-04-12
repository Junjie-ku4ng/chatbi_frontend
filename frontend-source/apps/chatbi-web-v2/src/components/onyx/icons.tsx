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

function SvgOnyxLogoV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10.4014 13.25L18.875 32L10.3852 50.75L2 32L10.4014 13.25Z" fill="var(--theme-primary-05)" />
      <path d="M53.5264 13.25L62 32L53.5102 50.75L45.125 32L53.5264 13.25Z" fill="var(--theme-primary-05)" />
      <path d="M32 45.125L50.75 53.5625L32 62L13.25 53.5625L32 45.125Z" fill="var(--theme-primary-05)" />
      <path d="M32 2L50.75 10.4375L32 18.875L13.25 10.4375L32 2Z" fill="var(--theme-primary-05)" />
    </svg>
  )
}

function SvgOnyxTypedV2({ size, ...props }: OnyxIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      viewBox="0 0 152 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.1795 51.2136C15.6695 51.2136 12.4353 50.3862 9.47691 48.7315C6.56865 47.0768 4.2621 44.8454 2.55726 42.0374C0.85242 39.1793 0 36.0955 0 32.7861C0 30.279 0.451281 27.9223 1.35384 25.716C2.30655 23.4596 3.76068 21.3285 5.71623 19.3228L11.8085 13.08C12.4604 12.6789 13.4131 12.3529 14.6666 12.1022C15.9202 11.8014 17.2991 11.6509 18.8034 11.6509C22.3134 11.6509 25.5225 12.4783 28.4307 14.133C31.3891 15.7877 33.7208 18.0441 35.4256 20.9023C37.1304 23.7103 37.9829 26.794 37.9829 30.1536C37.9829 32.6106 37.5065 34.9673 36.5538 37.2237C35.6512 39.4802 34.147 41.6864 32.041 43.8426L26.3248 49.7845C25.3219 50.2358 24.2188 50.5868 23.0154 50.8375C21.8621 51.0882 20.5835 51.2136 19.1795 51.2136ZM20.1572 43.8426C21.8621 43.8426 23.4917 43.4164 25.0461 42.5639C26.6005 41.6614 27.8541 40.3577 28.8068 38.6528C29.8097 36.948 30.3111 34.9172 30.3111 32.5605C30.3111 30.0032 29.6843 27.6966 28.4307 25.6408C27.2273 23.5849 25.6478 21.9803 23.6923 20.8271C21.7869 19.6236 19.8313 19.0219 17.8256 19.0219C16.0706 19.0219 14.4159 19.4732 12.8615 20.3758C11.3573 21.2282 10.1288 22.5068 9.17606 24.2117C8.22335 25.9166 7.747 27.9473 7.747 30.304C7.747 32.8613 8.34871 35.1679 9.55212 37.2237C10.7555 39.2796 12.31 40.9092 14.2154 42.1127C16.1709 43.2659 18.1515 43.8426 20.1572 43.8426Z" fill="var(--theme-primary-05)" />
      <path d="M42.6413 50.4614V12.4031H50.6891V17.7433L55.5028 12.7039C56.0544 12.4532 56.8065 12.2276 57.7592 12.027C58.7621 11.7763 59.8903 11.6509 61.1438 11.6509C64.0521 11.6509 66.5843 12.3028 68.7404 13.6065C70.9467 14.8601 72.6264 16.6401 73.7797 18.9467C74.9831 21.2533 75.5848 23.961 75.5848 27.0698V50.4614H67.6122V29.1006C67.6122 26.9946 67.2612 25.1895 66.5592 23.6852C65.9074 22.1308 64.9547 20.9775 63.7011 20.2253C62.4977 19.4231 61.0686 19.0219 59.4139 19.0219C56.7564 19.0219 54.6253 19.9245 53.0208 21.7296C51.4663 23.4846 50.6891 25.9416 50.6891 29.1006V50.4614H42.6413Z" fill="var(--theme-primary-05)" />
      <path d="M82.3035 64V56.0273H89.9753C91.2288 56.0273 92.2066 55.7264 92.9086 55.1247C93.6607 54.523 94.2625 53.5452 94.7137 52.1913L108.027 12.4031H116.751L103.664 49.4084C103.062 51.1634 102.461 52.5173 101.859 53.47C101.307 54.4227 100.53 55.4506 99.5274 56.5538L92.4573 64H82.3035ZM90.7274 46.6255L76.9633 12.4031H85.989L99.4522 46.6255H90.7274Z" fill="var(--theme-primary-05)" />
      <path d="M115.657 50.4614L129.045 31.2066L116.033 12.4031H125.435L134.085 24.8134L142.358 12.4031H151.308L138.372 31.0562L151.684 50.4614H142.358L133.332 37.3742L124.683 50.4614H115.657Z" fill="var(--theme-primary-05)" />
    </svg>
  )
}

export function SvgOnyxMarkV2({ className, size }: { className?: string; size?: number }) {
  return <SvgOnyxLogoV2 className={className} size={size} />
}

const HEIGHT_TO_GAP_RATIO = 5 / 16

export function SvgOnyxLogoTypedV2({
  className,
  size
}: {
  className?: string
  size?: number
}) {
  const gap = size != null ? size * HEIGHT_TO_GAP_RATIO : undefined

  return (
    <div className={cn('flex flex-row items-center', className)} style={{ gap }}>
      <SvgOnyxLogoV2 size={size} />
      <SvgOnyxTypedV2 size={size} />
    </div>
  )
}
