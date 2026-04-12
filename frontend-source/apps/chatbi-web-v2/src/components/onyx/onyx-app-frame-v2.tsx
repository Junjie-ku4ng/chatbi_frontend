import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function OnyxAppFrameV2({
  sidebar,
  main,
  rail,
  sidebarCollapsed = false
}: {
  sidebar: ReactNode
  main: ReactNode
  rail: ReactNode
  sidebarCollapsed?: boolean
}) {
  return (
    <main className={cn('onyx-app-frame-v2', sidebarCollapsed && 'is-sidebar-collapsed')}>
      {sidebar}
      <section className="onyx-app-frame-v2-main">{main}</section>
      {rail}
    </main>
  )
}
