import { create } from 'zustand'
import type {
  MessageAccessMode,
  MessageHomeResponse,
  MessageUnreadSummary,
} from '../types/message'

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
  setImState: (imReady, imReadOnly = false) => set({ imReady, imReadOnly }),
  setLoading: loading => set({ loading }),
  setError: errorMessage => set({ errorMessage }),
  clear: (accessMode = 'normal', restrictionPrompt = '') =>
    set({
      accessMode,
      restrictionPrompt,
      home: undefined,
      unreadSummary: EMPTY_UNREAD,
      imReady: false,
      imReadOnly: false,
      loading: false,
      errorMessage: '',
    }),
}))
