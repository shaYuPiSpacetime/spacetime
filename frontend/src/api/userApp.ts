import request from './request';

export interface AppUserListVO {
  id: number;
  avatar: string;
  nickname: string;
  gender: string;
  age: number;
  school: string;
  phone?: string;
  city?: string;
  identity?: string;
  occupation?: string;
  annualIncome?: string;
  tags?: string;
  photos?: string;
  voiceIntroDuration?: number;
  voiceIntroAuditStatus?: string;
  mbtiType?: string;
  zodiac?: string;
  realNameStatus: string;
  educationStatus: string;
  avatarVerifyStatus: string;
  firstLoginCompleted: number;
  profileScore: number;
  accountStatus: string;
  accessStatus: string;
  registerTime: string;
  lastLoginTime: string;
}

export interface VerificationDetailVO {
  realNameStatus: string;
  realNameRejectReason: string;
  realNameSubmitTime: string;
  educationStatus: string;
  educationMethod: string;
  educationRejectReason: string;
  educationSubmitTime: string;
  avatarVerifyStatus: string;
  avatarVerifyRejectReason: string;
  avatarVerifySubmitTime: string;
  profilePhotoAuditStatus: string;
  profilePhotoRejectReason: string;
  openTextAuditStatus: string;
  openTextRejectReason: string;
  verifyLevel: number;
}

export interface AppUserDetailVO {
  id: number;
  nickname: string;
  avatar: string;
  gender: string;
  birthday: string;
  age: number;
  height: number;
  weight: number;
  identity: string;
  occupation: string;
  annualIncome: string;
  locationProvince: string;
  locationCity: string;
  hometownProvince: string;
  hometownCity: string;
  school: string;
  phone?: string;
  major: string;
  educationLevel: string;
  emotionalStatus: string;
  datingGoal: string;
  maritalStatus: string;
  aboutMe: string;
  hopeTheyKnow: string;
  tags: string;
  photos: string;
  profileBgImage: string;
  voiceIntroUrl: string;
  voiceIntroDuration: number;
  mbtiType: string;
  zodiac: string;
  profileScore: number;
  firstLoginCompleted: number;
  registerTime: string;
  lastLoginTime: string;
  accountStatus: string;
  verification: VerificationDetailVO;
  canBrowseCards: boolean;
  canMatch: boolean;
  canBeExposed: boolean;
  blockReason: string;
  violationCount: number;
  feedbackCount: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface AppUserStatsVO {
  currentUserCount: number;
  coreAccessAllowedCount: number;
}

export interface ImportBatchVO {
  batchNo: string;
  fileName: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  duplicateCount: number;
  status: string;
  errorSummaryJson: string;
  message: string;
  createTime: string;
}

export interface ExportTaskVO {
  taskNo: string;
  exportType: string;
  status: string;
  message: string;
  createTime: string;
}

export function getAppUserList(params: {
  page: number;
  size: number;
  keyword?: string;
  nickname?: string;
  school?: string;
  accountStatus?: string;
  coreAccessStatus?: string;
  verificationStatus?: string;
  identity?: string;
  city?: string;
  relationshipAccess?: string;
  vipStatus?: string;
  hideVisitRecord?: string;
  gender?: string;
  realNameStatus?: string;
  educationStatus?: string;
  avatarVerifyStatus?: string;
  firstLoginCompleted?: number;
  userId?: number;
  registerTimeStart?: string;
  registerTimeEnd?: string;
}) {
  return request.get('/admin/users/app/list', { params });
}

export function getAppUserStats() {
  return request.get('/admin/users/app/stats');
}

export function getAppUserDetail(id: number) {
  return request.get(`/admin/users/app/${id}`);
}

export function updateAppUserStatus(id: number, status: string) {
  return request.put(`/admin/users/app/${id}/status`, { status });
}

export function importAppUsers(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/admin/users/app/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function exportAppUsers(params: Record<string, unknown>, confirmNoMask: boolean) {
  return request.post('/admin/users/app/export', null, {
    params: { ...params, confirmNoMask },
  });
}
