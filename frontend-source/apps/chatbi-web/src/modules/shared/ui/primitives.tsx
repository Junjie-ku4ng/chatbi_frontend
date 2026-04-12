import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  HTMLAttributes
} from 'react'
import { cn } from './cn'

type NexusTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'brand'

export function NexusCard(props: HTMLAttributes<HTMLElement>) {
  const { className, ...rest } = props
  return <section className={cn('nx-card', className)} {...rest} />
}

export function NexusBadge({
  tone = 'neutral',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: NexusTone }) {
  return <span className={cn('nx-badge', `nx-badge-${tone}`, className)} {...rest} />
}

export function NexusButton({
  variant = 'secondary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={cn('nx-btn', `nx-btn-${variant}`, rest.disabled && 'is-disabled', className)} {...rest} />
}

export function NexusInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, readOnly, disabled, ...rest } = props
  return <input className={cn('nx-input', readOnly && 'is-readonly', disabled && 'is-disabled', className)} readOnly={readOnly} disabled={disabled} {...rest} />
}

export function NexusSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, disabled, ...rest } = props
  const isReadOnly = rest['aria-readonly'] === true || rest['aria-readonly'] === 'true'
  return <select className={cn('nx-select', isReadOnly && 'is-readonly', disabled && 'is-disabled', className)} disabled={disabled} {...rest} />
}
