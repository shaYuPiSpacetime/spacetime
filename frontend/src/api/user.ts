import request from './request';

export interface UserVO {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  status: string;
  roleNames: string[];
  lastLoginTime: string;
  createTime: string;
}

export interface UserDetailVO extends UserVO {
  roleIds: number[];
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export function getUserList(params: {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
}) {
  return request.get('/admin/user/list', { params });
}

export function getUserDetail(id: number) {
  return request.get(`/admin/user/${id}`);
}

export function createUser(data: {
  username: string;
  password: string;
  nickname: string;
  email?: string;
  phone?: string;
  status?: string;
}) {
  return request.post('/admin/user', data);
}

export function updateUser(id: number, data: {
  nickname: string;
  email?: string;
  phone?: string;
  status?: string;
}) {
  return request.put(`/admin/user/${id}`, data);
}

export function deleteUser(id: number) {
  return request.delete(`/admin/user/${id}`);
}

export function resetUserPassword(id: number, newPassword: string) {
  return request.put(`/admin/user/${id}/password`, { userId: id, newPassword });
}

export function assignUserRoles(id: number, roleIds: number[]) {
  return request.put(`/admin/user/${id}/roles`, { userId: id, roleIds });
}
