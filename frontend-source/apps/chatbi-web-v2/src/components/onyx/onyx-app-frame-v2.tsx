import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function OnyxAppFrameV2({
  sidebar,
  main,
  rail,
  sidebarCollapsed = false,
  sourceRailOpen = true
}: {
  sidebar: ReactNode
  main: ReactNode
  rail?: ReactNode
  sidebarCollapsed?: boolean
  sourceRailOpen?: boolean
}) {
  return (
    <main className={cn('onyx-app-frame-v2', sidebarCollapsed && 'is-sidebar-collapsed', !sourceRailOpen && 'is-source-rail-hidden')}>
      {sidebar}
      <section className="onyx-app-frame-v2-main">{main}</section>
      {sourceRailOpen ? rail : null}
    </main>
  )
}
