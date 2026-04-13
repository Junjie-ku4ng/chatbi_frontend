'use client'

import { create } from 'zustand'
import type { ChatSourceItem } from './chat-source-items'

type ChatSourceRailStoreState = {
  isRailOpen: boolean
  selectedMessageId: string | null
  selectedMessageSources: ChatSourceItem[]
  toggleMessageSources: (input: { messageId: string; sources: ChatSourceItem[] }) => void
  openRail: () => void
  closeRail: () => void
  clearSelectedMessageSources: () => void
}

const initialState: Pick<ChatSourceRailStoreState, 'isRailOpen' | 'selectedMessageId' | 'selectedMessageSources'> = {
  isRailOpen: false,
  selectedMessageId: null,
  selectedMessageSources: []
}

export const useChatSourceRailStore = create<ChatSourceRailStoreState>(set => ({
  ...initialState,
  toggleMessageSources: input =>
    set(state => {
      if (state.isRailOpen && state.selectedMessageId === input.messageId) {
        return {
          isRailOpen: false,
          selectedMessageId: null,
          selectedMessageSources: []
        }
      }

      return {
        isRailOpen: true,
        selectedMessageId: input.messageId,
        selectedMessageSources: input.sources
      }
    }),
  openRail: () =>
    set({
      isRailOpen: true
    }),
  closeRail: () =>
    set({
      isRailOpen: false
    }),
  clearSelectedMessageSources: () =>
    set({
      isRailOpen: false,
      selectedMessageId: null,
      selectedMessageSources: []
    })
}))

export function resetChatSourceRailStore() {
  useChatSourceRailStore.setState({
    ...initialState
  })
}
