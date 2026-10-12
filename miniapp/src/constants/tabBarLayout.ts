export const APP_TAB_BAR_HEIGHT_RPX = 150

export function getTabBarBottom(gapRpx = 0) {
  return `calc(${APP_TAB_BAR_HEIGHT_RPX + gapRpx}rpx + env(safe-area-inset-bottom))`
}
