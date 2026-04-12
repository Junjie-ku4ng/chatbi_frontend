'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'

type AskRuntimeContextValue = {
  conversationId?: string
}

const AskRuntimeContextV2 = createContext<AskRuntimeContextValue>({})

export function AskRuntimeContextProviderV2({
  children,
  value
}: {
  children: ReactNode
  value: AskRuntimeContextValue
}) {
  return <AskRuntimeContextV2.Provider value={value}>{children}</AskRuntimeContextV2.Provider>
}

export function useAskRuntimeContextV2() {
  return useContext(AskRuntimeContextV2)
}
