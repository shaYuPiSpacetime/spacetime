/**
 * 将 Error、微信原生 errMsg 和接口错误对象统一转换为可展示文案。
 * 禁止直接 String(object)，避免页面出现无意义的 [object Object]。
 */
export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()

  if (typeof error === 'string') {
    const message = error.trim()
    return message && message !== '[object Object]' ? message : fallback
  }

  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown
      errMsg?: unknown
      data?: { msg?: unknown }
    }
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim()
    }
    if (typeof value.data?.msg === 'string' && value.data.msg.trim()) {
      return value.data.msg.trim()
    }
    if (typeof value.errMsg === 'string' && value.errMsg.trim() && !/\bfail\b/i.test(value.errMsg)) {
      return value.errMsg.trim()
    }
  }

  return fallback
}
