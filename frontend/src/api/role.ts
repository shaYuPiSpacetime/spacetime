import request from './request';

export interface RoleVO {
  id: number;
  roleName: string;
  roleCode: string;
  roleGroup: string;
  roleSort: number;
  status: string;
  remark: string;
  createTime: string;
}

export interface RoleDetailVO extends RoleVO {
  menuIds: number[];
}

export function getRoleList(params: {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
}) {
  return request.get('/admin/role/list', { params });
}

export function getAllRoles() {
  return request.get('/admin/role/all');
}

export function getRoleDetail(id: number) {
  return request.get(`/admin/role/${id}`);
}

export function createRole(data: {
  roleName: string;
  roleCode: string;
  roleGroup?: string;
  roleSort?: number;
  status?: string;
  remark?: string;
}) {
  return request.post('/admin/role', data);
}

export function updateRole(id: number, data: {
  roleName: string;
  roleCode: string;
  roleGroup?: string;
  roleSort?: number;
  status?: string;
  remark?: string;
}) {
  return request.put(`/admin/role/${id}`, data);
}

export function deleteRole(id: number) {
  return request.delete(`/admin/role/${id}`);
}

export function bindRoleMenus(id: number, menuIds: number[]) {
  return request.put(`/admin/role/${id}/menus`, { roleId: id, menuIds });
}
