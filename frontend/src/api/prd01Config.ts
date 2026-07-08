import request from './request';
import type { AppConfigVO } from './content';

export type Prd01ConfigGroup = 'PRD01_ACCESS' | 'PRD01_PROFILE_FIELD' | 'PRD01_UPLOAD' | 'PRD01_AUDIT';

export function getPrd01Config(group: Prd01ConfigGroup) {
  return request.get('/admin/prd01/config', { params: { group } });
}

export function savePrd01Config(items: Partial<AppConfigVO>[]) {
  return request.post('/admin/prd01/config', { items });
}
