/** API 基础地址 */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'

/** Token 本地存储 key */
export const TOKEN_KEY = 'token'

/** 用户信息本地存储 key */
export const USER_INFO_KEY = 'userInfo'

/** Token 请求头字段名，与后端 AuthConstant.TOKEN_HEADER 保持一致 */
export const TOKEN_HEADER = 'X-Token'

/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
