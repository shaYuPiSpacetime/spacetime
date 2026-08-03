function readErrorText(error?: unknown): string {
  if (error instanceof Error) return error.message.trim()
  if (typeof error === 'string') return error.trim()
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; errMsg?: unknown; msg?: unknown }
    return String(value.message || value.errMsg || value.msg || '').trim()
  }
  return ''
}

/** 中国大陆手机号格式校验，仅用于登录页即时反馈。 */
export function isValidLoginPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.trim())
}

/** 将后端多种错误表达归一为用户能直接采取行动的登录提示。 */
export function resolvePhoneLoginError(fallback: string, error?: unknown): string {
  const message = readErrorText(error)

  if (
    /验证码|短信码|sms|verification\s*code|code\s*(?:is\s*)?(?:invalid|incorrect|error|wrong)/i.test(
      message
    )
  ) {
    return '验证码错误，请重新输入'
  }

  if (/手机号|手机号码|phone|mobile/i.test(message)) {
    return '你输入的手机号有误'
  }

  return message || fallback
}
