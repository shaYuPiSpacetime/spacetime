import Taro from '@tarojs/taro'
import { API_BASE_URL, TOKEN_HEADER, TOKEN_KEY } from '@/constants/config'
import type { R } from '@/types/api'

/** 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 请求选项 */
interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  header?: Record<string, string>
}

/**
 * 统一请求封装
 * 自动注入 token、统一错误处理
 */
export async function request<T>(options: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync(TOKEN_KEY) || ''

  const res = await Taro.request<R<T>>({
    url: API_BASE_URL + options.url,
    method: options.method || 'GET',
    data: options.data,
    header: {
      [TOKEN_HEADER]: token,
      'Content-Type': 'application/json',
      ...options.header
    }
  })

  const { code, msg, data } = res.data

  // 401: token 过期或无效
  if (code === 401) {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
    return Promise.reject(new Error('UNAUTHORIZED'))
  }

  // 非 200: 业务错误
  if (code !== 200) {
    Taro.showToast({ title: msg || '请求失败', icon: 'none' })
    return Promise.reject(new Error(msg))
  }

  return data
}

/** GET 请求 */
export function get<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', data })
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
