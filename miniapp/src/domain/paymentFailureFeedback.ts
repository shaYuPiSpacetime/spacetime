export interface PaymentFailureFeedback {
  cancelled: boolean
  capabilityRestricted: boolean
  message: string
}

function readPaymentErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const candidate = error as { errMsg?: unknown; message?: unknown }
    if (typeof candidate.errMsg === 'string') return candidate.errMsg
    if (typeof candidate.message === 'string') return candidate.message
  }
  return ''
}

function readPaymentErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { errCode?: unknown; errno?: unknown }
  const value = candidate.errCode ?? candidate.errno
  return typeof value === 'number' ? value : undefined
}

/** 将微信原生支付错误归一化为页面可直接展示的反馈。 */
export function resolvePaymentFailureFeedback(error: unknown): PaymentFailureFeedback {
  const rawMessage = readPaymentErrorMessage(error).trim()
  const normalized = rawMessage.toLowerCase()
  const cancelled = readPaymentErrorCode(error) === -2
    || normalized.includes('cancel')
    || rawMessage.includes('取消')
  if (cancelled) {
    return {
      cancelled: true,
      capabilityRestricted: false,
      message: '用户取消支付',
    }
  }

  const capabilityRestricted = rawMessage.includes('支付能力')
    && (rawMessage.includes('限制') || rawMessage.includes('受限'))
  if (capabilityRestricted) {
    return {
      cancelled: false,
      capabilityRestricted: true,
      message: '当前小程序支付能力受限，请联系客服处理',
    }
  }

  const virtualPayUnsupported = rawMessage.includes('暂不支持虚拟支付')
    || (normalized.includes('requestvirtualpayment')
      && (normalized.includes('not support') || normalized.includes('unsupported')))
  if (virtualPayUnsupported) {
    return {
      cancelled: false,
      capabilityRestricted: false,
      message: '当前设备或微信版本暂不支持虚拟支付，请升级微信后重试',
    }
  }

  const providerMessage = rawMessage
    .replace(/^requestVirtualPayment:(?:fail|fail\s*)/i, '')
    .replace(/^requestPayment:(?:fail|fail\s*)/i, '')
    .trim()

  return {
    cancelled: false,
    capabilityRestricted: false,
    message: providerMessage && providerMessage !== '[object Object]'
      ? providerMessage
      : '支付失败，请稍后重试',
  }
}
