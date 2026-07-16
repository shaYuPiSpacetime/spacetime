import Taro from '@tarojs/taro'
import type { AboutMeQuestion, BasicProfile, VerificationStatus } from '@/types/prd01'
import type { ProfileTagItem } from '@/utils/profileTags'

export const PROFILE_UPDATED_EVENT = 'profileUpdated'

export type ProfileEditUpdate =
  | { type: 'basic'; basic: BasicProfile }
  | { type: 'intro'; value: string }
  | { type: 'tags'; codes: string[]; labels: string[]; items: ProfileTagItem[] }
  | { type: 'about'; questions: AboutMeQuestion[] }
  | { type: 'song'; display: string }
  | { type: 'verification'; status: VerificationStatus }

/** 向打开当前页的编辑资料页回传局部结果，避免父页重新请求整屏数据。 */
export function emitProfileUpdated(update: ProfileEditUpdate) {
  const channel = Taro.getCurrentInstance().page?.getOpenerEventChannel?.() as {
    emit?: (eventName: string, payload: ProfileEditUpdate) => void
  } | undefined
  channel?.emit?.(PROFILE_UPDATED_EVENT, update)
}
