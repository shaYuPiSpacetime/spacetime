import request from './request';

export interface AppUserListVO {
  id: number;
  avatar: string;
  nickname: string;
  gender: string;
  age: number;
  school: string;
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
  locationProvince: string;
  locationCity: string;
  hometownProvince: string;
  hometownCity: string;
  school: string;
  major: string;
  educationLevel: string;
  emotionalStatus: string;
  datingGoal: string;
  maritalStatus: string;
  aboutMe: string;
  hopeTheyKnow: string;
  tags: string;
  photos: string;
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

export function getAppUserList(params: {
  page: number;
  size: number;
  keyword?: string;
  nickname?: string;
  school?: string;
  accountStatus?: string;
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

export function getAppUserDetail(id: number) {
  return request.get(`/admin/users/app/${id}`);
}

export function updateAppUserStatus(id: number, status: string) {
  return request.put(`/admin/users/app/${id}/status`, { status });
}
