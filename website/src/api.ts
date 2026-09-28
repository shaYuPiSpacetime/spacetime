export interface Legal { type: string; title: string; version: string; content: string }
export interface User { id: number; nickname: string; phoneMasked: string }
export interface Session { user: User; csrfToken: string }
export interface Media { id: number; url: string; status: string }
export interface Activity {
  id: number; authorId: number; authorName: string; title: string; content: string;
  startTime: string; location: string; estimatedCost: number; status: string;
  auditNote?: string; images: Media[]
}
export interface Registration { id: number; status: string; activity: Activity }
export interface Conversation { id: number; activityId: number; activityTitle: string; peerId: number; peerName: string }
export interface Message {
  id: number; conversationId: number; senderId: number; type: 'TEXT' | 'IMAGE';
  content?: string; imageUrl?: string; status: string; createTime: string
}
export interface UploadedMedia { id: number; previewUrl: string }

let csrfToken = ''
export const setCsrfToken = (value: string) => { csrfToken = value }

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.method && options.method !== 'GET' && csrfToken) headers.set('X-CSRF-Token', csrfToken)
  const response = await fetch(`/api/website${path}`, { credentials: 'same-origin', ...options, headers })
  const result = await response.json().catch(() => null) as { code: number; msg?: string; data: T } | null
  if (!response.ok || !result || result.code !== 200) throw new Error(result?.msg || `请求失败（${response.status}）`)
  return result.data
}

const post = <T,>(path: string, value: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(value) })

export const api = {
  legal: (type: 'USER_AGREEMENT' | 'PRIVACY_POLICY') => call<Legal>(`/legal/${type}`),
  me: () => call<Session>('/auth/me'),
  sendCode: (phone: string) => post<void>('/auth/sms-code', { phone }),
  login: (value: { phone: string; code: string; agreementAccepted: boolean; agreementVersion: string; privacyVersion: string }) => post<Session>('/auth/login', value),
  logout: () => post<void>('/auth/logout', {}),
  activities: (page = 1) => call<Activity[]>(`/activities?page=${page}&size=50`),
  activity: (id: number) => call<Activity>(`/activities/${id}`),
  myActivity: (id: number) => call<Activity>(`/me/activities/${id}`),
  myActivities: () => call<Activity[]>('/me/activities'),
  publish: (value: { title: string; content: string; startTime: string; location: string; estimatedCost: number; imageIds: number[] }) => post<Activity>('/activities', value),
  register: (id: number) => post<Registration>(`/activities/${id}/registrations`, {}),
  myRegistrations: () => call<Registration[]>('/me/registrations'),
  participants: (id: number) => call<User[]>(`/activities/${id}/participants`),
  startConversation: (activityId: number, peerId: number) => post<Conversation>('/conversations', { activityId, peerId }),
  conversations: () => call<Conversation[]>('/conversations'),
  messages: (id: number) => call<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: number, value: { type: 'TEXT' | 'IMAGE'; content?: string; mediaId?: number }) => post<Message>(`/conversations/${id}/messages`, value),
  upload: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    return call<UploadedMedia>('/media', { method: 'POST', body: form })
  },
  report: (value: { targetType: 'ACTIVITY' | 'MESSAGE' | 'USER' | 'OTHER'; targetId?: number; reason: string }) => post<{ id: number }>('/reports', value),
}
