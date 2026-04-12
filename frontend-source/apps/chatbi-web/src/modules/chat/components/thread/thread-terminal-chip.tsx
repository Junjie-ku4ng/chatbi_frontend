'use client'

export function ThreadTerminalChip(props: { status: 'running' | 'done' | 'error'; label: string }) {
  return (
    <div
      data-testid="thread-terminal-chip"
      className={`chat-assistant-thread-terminal chat-assistant-thread-terminal-${props.status}`}
    >
      {props.label}
    </div>
  )
}
