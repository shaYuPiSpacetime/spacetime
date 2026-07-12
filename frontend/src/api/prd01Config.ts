import request from './request';
import type { AppConfigVO, ContentOperationLogVO } from './content';

export type Prd01ConfigGroup = 'PRD01_ACCESS' | 'PRD01_PROFILE_FIELD' | 'PRD01_UPLOAD' | 'PRD01_AUDIT';

export interface Prd01ConfigSaveMeta {
  tabName?: string;
  changeReason?: string;
  summary?: string;
  changeDetailsJson?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export function getPrd01Config(group: Prd01ConfigGroup) {
  return request.get('/admin/prd01/config', { params: { group } });
}

export function savePrd01Config(items: Partial<AppConfigVO>[], meta: Prd01ConfigSaveMeta = {}) {
  return request.post('/admin/prd01/config', { items, ...meta });
}

export function getPrd01ConfigLogs(page: number) {
  return request.get<PageResult<ContentOperationLogVO>>('/admin/prd01/config/logs', {
    params: { page, size: 5 },
  });
}
