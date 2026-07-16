import Taro from '@tarojs/taro'

interface WindowMetrics {
  windowWidth: number
  windowHeight: number
  statusBarHeight: number
}

interface TaroSystemApis {
  getWindowInfo?: () => Partial<WindowMetrics>
}

/** 使用微信新版窗口 API，避免触发旧系统信息接口的废弃警告。 */
export function getWindowMetrics(): WindowMetrics {
  try {
    const windowInfo = (Taro as typeof Taro & TaroSystemApis).getWindowInfo?.()
    if (windowInfo?.windowWidth) {
      return {
        windowWidth: windowInfo.windowWidth,
        windowHeight: windowInfo.windowHeight ?? 667,
        statusBarHeight: windowInfo.statusBarHeight ?? 20,
      }
    }
  } catch {
    // 非微信端或低版本环境读取失败时走保守默认值。
  }

  return {
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 20,
  }
}
