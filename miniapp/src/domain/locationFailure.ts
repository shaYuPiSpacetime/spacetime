/** 用失败环节区分设备定位与省市解析；不向用户暴露底层异常或请求内容。 */
export function toLocationFailureMessage(error: unknown, stage: 'coordinates' | 'city'): string {
  if (stage === 'city') return '城市识别服务暂不可用，请手动选择'
  const detail = error as { errMsg?: unknown; message?: unknown } | null
  const message = String(detail?.errMsg || detail?.message || '').toLowerCase()
  if (/system permission|location switch|location service.*disabled/.test(message)) {
    return '请开启手机定位服务，或手动选择城市'
  }
  if (/auth deny|auth denied|permission|authorize/.test(message)) {
    return '未获得定位权限，请开启权限或手动选择'
  }
  if (/timeout|time out/.test(message)) return '获取位置超时，请重试或手动选择'
  return '暂未获取到位置，请重试或手动选择'
}
