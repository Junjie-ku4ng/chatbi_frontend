'use client'

import { ReactNode } from 'react'
import { accessDeniedMessage, hasAccess } from './access'
import { ForbiddenState } from '@/modules/shared/states/forbidden-state'
import { useRbacCapabilities } from './use-capabilities'
import { LoadingState } from '@/modules/shared/states/loadable-state'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { UnauthorizedState } from '@/modules/shared/states/unauthorized-state'

export function AccessGuard({ scopes, children }: { scopes?: string[]; children: ReactNode }) {
  const { capabilities, isLoading, error } = useRbacCapabilities()

  if (isLoading) {
    return <LoadingState label="Resolving permissions..." />
  }

  if (error) {
    const normalized = normalizeUiError(error)
    if (normalized.type === 'unauthorized') {
      return <UnauthorizedState message={normalized.message} />
    }
    return <ForbiddenState message={normalized.message || 'Failed to resolve auth capabilities'} />
  }

  if (!hasAccess({ scopes }, capabilities)) {
    return <ForbiddenState message={accessDeniedMessage(scopes)} />
  }
  return <>{children}</>
}
