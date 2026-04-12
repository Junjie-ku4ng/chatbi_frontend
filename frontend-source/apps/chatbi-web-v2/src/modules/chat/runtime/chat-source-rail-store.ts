'use client'

import { create } from 'zustand'
import type { ChatSourceItem } from './chat-source-items'

type ChatSourceRailStoreState = {
  selectedMessageId: string | null
  selectedMessageSources: ChatSourceItem[]
  toggleMessageSources: (input: { messageId: string; sources: ChatSourceItem[] }) => void
  clearSelectedMessageSources: () => void
}

const initialState: Pick<ChatSourceRailStoreState, 'selectedMessageId' | 'selectedMessageSources'> = {
  selectedMessageId: null,
  selectedMessageSources: []
}

export const useChatSourceRailStore = create<ChatSourceRailStoreState>(set => ({
  ...initialState,
  toggleMessageSources: input =>
    set(state => {
      if (state.selectedMessageId === input.messageId) {
        return {
          selectedMessageId: null,
          selectedMessageSources: []
        }
      }

      return {
        selectedMessageId: input.messageId,
        selectedMessageSources: input.sources
      }
    }),
  clearSelectedMessageSources: () =>
    set({
      selectedMessageId: null,
      selectedMessageSources: []
    })
}))

export function resetChatSourceRailStore() {
  useChatSourceRailStore.setState({
    ...initialState
  })
}
