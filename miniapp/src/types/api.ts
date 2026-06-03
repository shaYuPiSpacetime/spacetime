/** 后端统一返回体 */
export interface R<T = unknown> {
  code: number
  msg: string
  data: T
}

/** 分页请求参数 */
export interface PageReq {
  page: number
  size: number
}

/** 分页返回数据 */
export interface PageVO<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
