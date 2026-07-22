import request from './request';

/** 字典类型 */
export interface DictTypeVO {
  id: number;
  dictName: string;
  dictType: string;
  dictSort: number;
  status: string;
  remark: string;
  createTime: string;
}

/** 字典数据（含子节点支持树形） */
export interface DictDataVO {
  id: number;
  dictType: string;
  parentId: number;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: string;
  remark: string;
  createTime: string;
  hasChildren: boolean;
  children?: DictDataVO[];
}

export interface RegionTreeVO {
  code: string;
  name: string;
  level: 'PROVINCE' | 'CITY';
  children?: RegionTreeVO[];
}

// ============ 字典类型 API ============

export function getDictTypeList(params: { page?: number; size?: number; keyword?: string; status?: string }) {
  return request.get('/admin/dict-type/list', { params });
}

export function getAllDictTypes() {
  return request.get('/admin/dict-type/all');
}

export function createDictType(data: { dictName: string; dictType: string; dictSort?: number; status?: string; remark?: string }) {
  return request.post('/admin/dict-type', data);
}

export function updateDictType(id: number, data: { dictName: string; dictType: string; dictSort?: number; status?: string; remark?: string }) {
  return request.put(`/admin/dict-type/${id}`, data);
}

export function deleteDictType(id: number) {
  return request.delete(`/admin/dict-type/${id}`);
}

// ============ 字典数据 API ============

export function getDictDataChildren(dictType: string, parentId: number = 0) {
  return request.get('/admin/dict-data/children', { params: { dictType, parentId } });
}

export function getTwoLevelRegions() {
  return request.get('/miniapp/dict/locations/two-level');
}

export function createDictData(data: { dictType: string; parentId?: number; dictLabel: string; dictValue: string; dictSort?: number; status?: string; remark?: string }) {
  return request.post('/admin/dict-data', data);
}

export function updateDictData(id: number, data: { dictType: string; parentId?: number; dictLabel: string; dictValue: string; dictSort?: number; status?: string; remark?: string }) {
  return request.put(`/admin/dict-data/${id}`, data);
}

export function deleteDictData(id: number) {
  return request.delete(`/admin/dict-data/${id}`);
}
