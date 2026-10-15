/** 登录及公开协议允许无登录态阅读，其他设置页仍需鉴权。 */
export function isPublicReadingRoute(route?: string) {
  const path = (route || '').replace(/^\//, '').split('?')[0]
  return path.startsWith('pages/login/') || path === 'pages/settings/content'
}
