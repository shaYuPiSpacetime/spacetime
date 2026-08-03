/** 体验版和生产构建固定使用生产接口域名，避免 watch 产物固化旧环境变量。 */
export const API_BASE_URL = 'https://admin.shikongxiehou.com/api'

/** Token 本地存储 key */
export const TOKEN_KEY = 'token'

/** 用户信息本地存储 key */
export const USER_INFO_KEY = 'userInfo'

/** Token 请求头字段名，与后端 AuthConstant.TOKEN_HEADER 保持一致 */
export const TOKEN_HEADER = 'X-Auth-Token'

/** 本地预览固定登录；与 app.config 启动页共用同一个构建环境变量。 */
export const DEV_FIXED_LOGIN = {
  enabled: process.env.MINIAPP_DEV_FIXED_LOGIN === 'true',
  token: process.env.MINIAPP_DEV_FIXED_TOKEN || '',
  userId: 50,
  phone: '17366629764',
  maskedPhone: '173****9764',
}

/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = false
