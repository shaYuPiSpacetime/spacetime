/**
 * 微信号是可选资料；空白内容表示暂不填写，不触发保存请求。
 */
export function normalizeOptionalWechatId(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}
