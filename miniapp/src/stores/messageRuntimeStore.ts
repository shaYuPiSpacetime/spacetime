import { create } from 'zustand'
import type {
  MessageAccessMode,
  MessageHomeResponse,
  MessageUnreadSummary,
} from '../types/message'
import { clearConversationReadCache, rememberConversationRead } from '../domain/conversationReadCache'

const EMPTY_UNREAD: MessageUnreadSummary = {
  privateUnreadCount: 0,
  whisperUnreadCount: 0,
  assistantUnreadCount: 0,
  systemUnreadCount: 0,
  messageUnreadCount: 0,
  snapshotTime: '',
}

interface MessageRuntimeState {
  accessMode: MessageAccessMode
  restrictionPrompt: string
  home?: MessageHomeResponse
  unreadSummary: MessageUnreadSummary
  imReady: boolean
  imReadOnly: boolean
  loading: boolean
  errorMessage: string
  applyHome: (home: MessageHomeResponse) => void
  applyUnread: (summary: MessageUnreadSummary) => void
  markConversationRead: (conversationNo: string, lastMessageNo?: string) => void
  setImState: (ready: boolean, readOnly?: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (message: string) => void
  clear: (accessMode?: MessageAccessMode, prompt?: string) => void
}

export const useMessageRuntimeStore = create<MessageRuntimeState>(set => ({
  accessMode: 'normal',
  restrictionPrompt: '',
  unreadSummary: EMPTY_UNREAD,
  imReady: false,
  imReadOnly: false,
  loading: false,
  errorMessage: '',

  applyHome: home =>
    set({
      home,
      accessMode: home.accessMode,
      restrictionPrompt: home.restrictionPrompt || '',
      unreadSummary: home.unreadSummary || EMPTY_UNREAD,
      errorMessage: '',
    }),

  applyUnread: unreadSummary => set({ unreadSummary, errorMessage: '' }),
  markConversationRead: (conversationNo, lastMessageNo = '') =>
    set(state => {
      rememberConversationRead(conversationNo, lastMessageNo)
      const item = state.home?.conversationPage.list.find(row => row.conversationNo === conversationNo)
      const cleared = Math.max(0, item?.unreadCount || 0)
      if (!state.home || cleared === 0) return state
      const unreadSummary = {
        ...state.unreadSummary,
        privateUnreadCount: Math.max(0, state.unreadSummary.privateUnreadCount - cleared),
        messageUnreadCount: Math.max(0, state.unreadSummary.messageUnreadCount - cleared),
      }
      return {
        home: {
          ...state.home,
          unreadSummary,
          conversationPage: {
            ...state.home.conversationPage,
            list: state.home.conversationPage.list.map(row =>
              row.conversationNo === conversationNo ? { ...row, unreadCount: 0 } : row),
          },
        },
        unreadSummary,
      }
    }),
  setImState: (imReady, imReadOnly = false) => set({ imReady, imReadOnly }),
  setLoading: loading => set({ loading }),
  setError: errorMessage => set({ errorMessage }),
  clear: (accessMode = 'normal', restrictionPrompt = '') =>
    set(() => {
      clearConversationReadCache()
      return {
      accessMode,
      restrictionPrompt,
      home: undefined,
      unreadSummary: EMPTY_UNREAD,
      imReady: false,
      imReadOnly: false,
      loading: false,
      errorMessage: '',
      }
    }),
}))
