'use client'

import { ReactNode } from 'react'
import { ActionPermission, resolveActionPermission } from './access'
import { useRbacCapabilities } from './use-capabilities'

export function ActionGuard({
  scopes,
  children
}: {
  scopes?: string[]
  children: (permission: ActionPermission) => ReactNode
}) {
  const { capabilities } = useRbacCapabilities()
  const permission = resolveActionPermission({ scopes }, capabilities)
  return <>{children(permission)}</>
}
