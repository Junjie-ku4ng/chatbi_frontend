import type { ReactNode } from 'react'

export function OnyxAppFrameV2({
  sidebar,
  main,
  rail
}: {
  sidebar: ReactNode
  main: ReactNode
  rail: ReactNode
}) {
  return (
    <main className="onyx-app-frame-v2">
      {sidebar}
      <section className="onyx-app-frame-v2-main">{main}</section>
      {rail}
    </main>
  )
}
