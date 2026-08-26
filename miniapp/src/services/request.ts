import Taro from '@tarojs/taro'
import { API_BASE_URL, TOKEN_HEADER, TOKEN_KEY, USER_INFO_KEY } from '@/constants/config'
import type { R } from '@/types/api'
import { getErrorMessage } from '@/utils/errorMessage'

/** 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 请求选项 */
interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  header?: Record<string, string>
}

export class ApiBusinessError extends Error {
  code?: number
  httpStatus?: number

  constructor(message: string, code?: number, httpStatus?: number) {
    super(message)
    this.name = 'ApiBusinessError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function getApiErrorCode(error: unknown): number | undefined {
  return error instanceof ApiBusinessError ? error.code : undefined
}

function compactRequestData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

/**
 * 统一请求封装
 * 自动注入 token、统一错误处理
 */
export async function request<T>(options: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync(TOKEN_KEY) || ''

  let res
  try {
    res = await Taro.request<R<T>>({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        [TOKEN_HEADER]: token,
        'Content-Type': 'application/json',
        ...options.header
      }
    })
  } catch (error) {
    throw new ApiBusinessError(getErrorMessage(error, '网络连接失败，请稍后重试'))
  }

  const { code, msg, data } = res.data

  // 401: token 过期或无效
  if (code === 401) {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.removeStorageSync(USER_INFO_KEY)
    const pages = Taro.getCurrentPages()
    const currentRoute = pages[pages.length - 1]?.route || ''
    if (!currentRoute.startsWith('pages/login/')) {
      void Taro.reLaunch({ url: '/pages/login/phone' })
    }
    return Promise.reject(new ApiBusinessError(msg || String(code), code, res.statusCode))
  }

  // 非 200: 业务错误
  if (code !== 200) {
    return Promise.reject(new ApiBusinessError(msg || String(code), code, res.statusCode))
  }

  return data
}

/** GET 请求 */
export function get<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', data: data ? compactRequestData(data) : undefined })
}

/** POST 请求 */
export function post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'POST', data })
}

/** PUT 请求 */
export function put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'PUT', data })
}

/** DELETE 请求 */
export function del<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data })
}
