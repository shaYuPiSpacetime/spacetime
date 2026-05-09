import request from './request';

/** 管理后台登录 */
export function adminLogin(username: string, password: string) {
  return request.post('/admin/login', { username, password });
}

/** 管理后台退出 */
export function adminLogout() {
  return request.post('/admin/logout');
}
