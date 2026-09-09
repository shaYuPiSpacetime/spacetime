export type SensitiveWordStatus = 'ENABLED' | 'DISABLED';

export interface SensitiveWordVO {
  id: number;
  word: string;
  categoryCode: string;
  categoryName: string;
  status: SensitiveWordStatus;
  remark?: string;
  createTime: string;
  updateTime: string;
}

export interface SensitiveWordCategoryVO { code: string; name: string }
export interface SensitiveWordQuery {
  page: number;
  size: number;
  keyword?: string;
  categoryCode?: string;
  status?: SensitiveWordStatus;
}
export interface SensitiveWordSaveRequest {
  word: string;
  categoryCode: string;
  status: SensitiveWordStatus;
  remark?: string;
}
export interface PageResult<T> { records: T[]; total: number; current: number; size: number }
export interface ApiResponse<T> { code: number; msg: string; data: T }
