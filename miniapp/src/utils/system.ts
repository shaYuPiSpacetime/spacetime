import Taro from '@tarojs/taro'

interface WindowMetrics {
  windowWidth: number
  windowHeight: number
  statusBarHeight: number
}

interface TaroSystemApis {
  getWindowInfo?: () => Partial<WindowMetrics>
}

/** 优先使用新版窗口 API，仅在不可用时兼容旧版真实尺寸。 */
export function getWindowMetrics(): WindowMetrics {
  try {
    const windowInfo = (Taro as typeof Taro & TaroSystemApis).getWindowInfo?.()
    if (windowInfo?.windowWidth && Number.isFinite(windowInfo.windowWidth) && windowInfo.windowWidth > 0) {
      return {
        windowWidth: windowInfo.windowWidth,
        windowHeight: windowInfo.windowHeight ?? 667,
        statusBarHeight: windowInfo.statusBarHeight ?? 20,
      }
    }
  } catch {
    // 新接口读取失败时继续尝试兼容接口。
  }

  // 旧微信基础库没有新窗口 API 时，使用真实系统尺寸，避免不同机型套用 375 宽度。
  try {
    const info = Taro.getSystemInfoSync?.()
    if (info?.windowWidth && Number.isFinite(info.windowWidth) && info.windowWidth > 0) {
      return { windowWidth: info.windowWidth, windowHeight: info.windowHeight || 667, statusBarHeight: info.statusBarHeight || 20 }
    }
  } catch {
    // 两种原生 API 都不可用时才回退，页面仍可展示。
  }
  return {
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 20,
  }
}
