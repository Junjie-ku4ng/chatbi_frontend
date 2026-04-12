'use client'

import { NexusButton, NexusCard } from '@/modules/shared/ui/primitives'

export function ThreadDiagnosticsDrawer(props: {
  open: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <section
      data-testid="ask-thread-diagnostics-drawer"
      data-contract="ask.diagnostics.drawer"
      className={`chat-thread-diagnostics-drawer ${props.open ? 'is-open' : 'is-collapsed'}`}
    >
      <div className="chat-thread-diagnostics-head nx-shell-meta-row">
        <strong className="chat-thread-diagnostics-title">Diagnostics</strong>
        <NexusButton
          data-testid="ask-thread-diagnostics-toggle"
          type="button"
          variant="ghost"
          className="chat-thread-diagnostics-toggle"
          onClick={props.onToggle}
        >
          {props.open ? '收起诊断' : '展开诊断'}
        </NexusButton>
      </div>
      {props.open ? (
        <div className="chat-thread-diagnostics-body">{props.children}</div>
      ) : (
        <NexusCard className="chat-thread-diagnostics-collapsed nx-shell-panel">
          运行证据已折叠，按需展开。
        </NexusCard>
      )}
    </section>
  )
}
