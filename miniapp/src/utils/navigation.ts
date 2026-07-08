import Taro from '@tarojs/taro'

export const PROFILE_EDIT_FALLBACK_URL = '/pages/profile/edit'

export function navigateBackOrRedirect(fallbackUrl = PROFILE_EDIT_FALLBACK_URL) {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    const backResult = Taro.navigateBack({
      delta: 1,
      fail: () => {
        void Taro.redirectTo({ url: fallbackUrl })
      },
    })
    void Promise.resolve(backResult).catch(() => {
      void Taro.redirectTo({ url: fallbackUrl })
    })
    return
  }
  void Taro.redirectTo({ url: fallbackUrl })
}
