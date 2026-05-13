import request from './request';

export interface MenuVO {
  id: number;
  parentId: number;
  menuName: string;
  menuType: string;
  path: string;
  component: string;
  icon: string;
  perms: string;
  menuSort: number;
  status: string;
  visible: number;
  remark: string;
  children: MenuVO[];
}

export interface RouterVO {
  id: number;
  parentId: number;
  name: string;
  path: string;
  component: string;
  meta: { title: string; icon: string };
  sort: number;
  children: RouterVO[];
}

export function getMenuList() {
  return request.get('/admin/menu/list');
}

export function getMenuTree() {
  return request.get('/admin/menu/tree');
}

export function getMenuDetail(id: number) {
  return request.get(`/admin/menu/${id}`);
}

export function createMenu(data: {
  parentId?: number;
  menuName: string;
  menuType: string;
  path?: string;
  component?: string;
  icon?: string;
  perms?: string;
  menuSort?: number;
  status?: string;
  visible?: number;
  remark?: string;
}) {
  return request.post('/admin/menu', data);
}

export function updateMenu(id: number, data: {
  parentId?: number;
  menuName: string;
  menuType: string;
  path?: string;
  component?: string;
  icon?: string;
  perms?: string;
  menuSort?: number;
  status?: string;
  visible?: number;
  remark?: string;
}) {
  return request.put(`/admin/menu/${id}`, data);
}

export function deleteMenu(id: number) {
  return request.delete(`/admin/menu/${id}`);
}

export function getRouters() {
  return request.get('/admin/routers');
}
