import request from './request';
import type { ApiResponse, PageResult, SensitiveWordCategoryVO, SensitiveWordQuery, SensitiveWordSaveRequest, SensitiveWordStatus, SensitiveWordVO } from '@/types/sensitiveWord';

export const getSensitiveWords = (params: SensitiveWordQuery) =>
  request.get<unknown, ApiResponse<PageResult<SensitiveWordVO>>>('/admin/sensitive-words', { params });
export const getSensitiveWordCategories = () =>
  request.get<unknown, ApiResponse<SensitiveWordCategoryVO[]>>('/admin/sensitive-words/categories');
export const getSensitiveWord = (id: number) =>
  request.get<unknown, ApiResponse<SensitiveWordVO>>('/admin/sensitive-words/' + id);
export const createSensitiveWord = (data: SensitiveWordSaveRequest) =>
  request.post<unknown, ApiResponse<number>>('/admin/sensitive-words', data);
export const updateSensitiveWord = (id: number, data: SensitiveWordSaveRequest) =>
  request.put<unknown, ApiResponse<void>>('/admin/sensitive-words/' + id, data);
export const changeSensitiveWordStatus = (id: number, status: SensitiveWordStatus) =>
  request.patch<unknown, ApiResponse<void>>('/admin/sensitive-words/' + id + '/status', { status });
export const deleteSensitiveWord = (id: number) =>
  request.delete<unknown, ApiResponse<void>>('/admin/sensitive-words/' + id);
