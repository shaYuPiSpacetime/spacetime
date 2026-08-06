import request from './request';

export interface AppUserListVO {
  id: number;
  avatar: string;
  nickname: string;
  gender: string;
  genderLabel?: string;
  age: number;
  height?: number;
  weight?: number;
  school: string;
  phone?: string;
  city?: string;
  identity?: string;
  identityCode?: string;
  identityLabel?: string;
  industryCode?: string;
  industryLabel?: string;
  occupation?: string;
  occupationCode?: string;
  occupationLabel?: string;
  company?: string;
  annualIncome?: string;
  annualIncomeCode?: string;
  annualIncomeLabel?: string;
  educationLevelCode?: string;
  educationLevelLabel?: string;
  wechatId?: string;
  coinBalance?: number;
  vipStatus?: string;
  vipVisible?: boolean;
  vipExpireTime?: string;
  tags?: string;
  photos?: string;
  voiceIntroDuration?: number;
  voiceIntroAuditStatus?: string;
  mbtiType?: string;
  zodiac?: string;
  realNameStatus: string;
  educationStatus: string;
  avatarVerifyStatus: string;
  avatarAuditRecordId?: number;
  avatarAuditMediaUrl?: string;
  avatarAuditThumbUrl?: string;
  avatarAuditRejectReason?: string;
  avatarAuditSubmitTime?: string;
  firstLoginCompleted: number;
  profileScore: number;
  accountStatus: string;
  accessStatus: string;
  relationshipAccess?: 'OPEN' | 'CLOSED' | 'ABNORMAL';
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
  genderLabel?: string;
  birthday: string;
  age: number;
  height: number;
  weight: number;
  identity: string;
  identityCode?: string;
  identityLabel?: string;
  industryCode?: string;
  industryLabel?: string;
  occupation: string;
  occupationCode?: string;
  occupationLabel?: string;
  company?: string;
  annualIncome: string;
  annualIncomeCode?: string;
  annualIncomeLabel?: string;
  locationProvince: string;
  locationCity: string;
  locationDistrict?: string;
  locationProvinceLabel?: string;
  locationCityLabel?: string;
  locationDistrictLabel?: string;
  hometownProvince: string;
  hometownCity: string;
  hometownDistrict?: string;
  hometownProvinceLabel?: string;
  hometownCityLabel?: string;
  hometownDistrictLabel?: string;
  school: string;
  phone?: string;
  major: string;
  educationLevel: string;
  educationLevelCode?: string;
  educationLevelLabel?: string;
  emotionalStatus: string;
  emotionalStatusCode?: string;
  emotionalStatusLabel?: string;
  datingGoal: string;
  datingGoalCode?: string;
  datingGoalLabel?: string;
  maritalStatus: string;
  maritalStatusCode?: string;
  maritalStatusLabel?: string;
  aboutMe: string;
  tags: string;
  wechatId?: string;
  favoriteSongId?: string;
  favoriteSongName?: string;
  favoriteSongArtist?: string;
  favoriteSongCoverUrl?: string;
  coinBalance?: number;
  vipStatus?: string;
  vipExpireTime?: string;
  photos: string;
  profileBgImage: string;
  voiceIntroUrl: string;
  voiceIntroDuration: number;
  voiceIntroAuditStatus?: string;
  voiceIntroRejectReason?: string;
  mbtiType: string;
  zodiac: string;
  profileScore: number;
  firstLoginCompleted: number;
  registerTime: string;
  lastLoginTime: string;
  accountStatus: string;
  verification: VerificationDetailVO;
  avatarAuditRecordId?: number;
  avatarAuditMediaUrl?: string;
  avatarAuditThumbUrl?: string;
  avatarAuditRejectReason?: string;
  avatarAuditSubmitTime?: string;
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
  relationshipAccessOpenCount: number;
  visitorUv7d: number;
}

export interface ImportBatchVO {
  batchNo: string;
  fileName: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  duplicateCount: number;
  importedCount?: number;
  importedUserIds?: number[];
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
  filterSummary?: string;
  fileName?: string;
  rowCount?: number;
  downloadContent?: string;
  createTime: string;
}

export interface AppUserWorkflowHistoryVO {
  id: string;
  type: 'import' | 'export';
  createTime: string;
  importResult?: ImportBatchVO;
  exportResult?: ExportTaskVO;
}

export interface RelationCounterpartyVO {
  userId?: number;
  userNo: string;
  nickname?: string;
  maskedPhone?: string;
  avatar?: string;
  anonymous: boolean;
}

export interface AppUserRelationSummaryVO {
  userId: number;
  relationshipAccess: 'OPEN' | 'CLOSED' | 'ABNORMAL';
  vipVisible: boolean;
  vipStatus?: string;
  activeLikedCount: number;
  visitorUv7d: number;
  visitorPv7d: number;
  activeMutualCount: number;
  lastMatchTime?: string;
}

export interface AppUserRelationLikeVO {
  recordNo: string;
  direction: 'OUTBOUND' | 'INBOUND';
  counterparty: RelationCounterpartyVO;
  sourceScene: string;
  status: string;
  invalidReason?: string;
  invalidTime?: string;
  likedTime: string;
  unlockNo?: string;
}

export interface AppUserRelationVisitVO {
  recordNo: string;
  direction: 'OUTBOUND' | 'INBOUND';
  counterparty: RelationCounterpartyVO;
  sourceScene: string;
  status: string;
  invalidReason?: string;
  invalidTime?: string;
  firstVisitTime: string;
  lastVisitTime: string;
  visitCount: number;
  unlockNo?: string;
}

export interface AppUserRelationMatchVO {
  recordNo: string;
  counterparty: RelationCounterpartyVO;
  primarySource: string;
  activeSources: string[];
  status: string;
  invalidReason?: string;
  invalidTime?: string;
  matchedTime: string;
}

export interface AppUserRelationUnlockVO {
  unlockNo: string;
  targetBizType?: string;
  targetBizNo?: string;
  counterparty: RelationCounterpartyVO;
  unlockScene: string;
  unlockMethod: string;
  coinCost?: number;
  status: string;
  effectiveTime: string;
  expireTime?: string;
  targetAvailable: boolean;
  targetInvalidReason?: string;
  targetInvalidTime?: string;
  assetVisible: boolean;
}

export interface RelationPageParams {
  page: number;
  size: 5 | 10 | 20 | 50;
  unlockNo?: string;
  direction?: 'ALL' | 'OUTBOUND' | 'INBOUND';
  status?: string;
  source?: string;
  startTime?: string;
  endTime?: string;
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

export interface DeleteAppUserPayload {
  confirmation: string;
  reason: string;
}

export function deleteAppUser(id: number, payload: DeleteAppUserPayload) {
  return request.delete(`/admin/users/app/${id}`, { data: payload });
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

export function getAppUserWorkflowHistory(params: { page: number; size: number }) {
  return request.get('/admin/users/app/workflow-history', { params });
}

export function getAppUserRelationSummary(userId: number) {
  return request.get(`/admin/users/app/${userId}/relations/summary`);
}

export function getAppUserRelationLikes(userId: number, params: RelationPageParams) {
  return request.get(`/admin/users/app/${userId}/relations/likes`, { params });
}

export function getAppUserRelationVisits(userId: number, params: RelationPageParams) {
  return request.get(`/admin/users/app/${userId}/relations/visits`, { params });
}

export function getAppUserRelationMatches(userId: number, params: RelationPageParams) {
  return request.get(`/admin/users/app/${userId}/relations/matches`, { params });
}

export function getAppUserRelationUnlocks(userId: number, params: RelationPageParams) {
  return request.get(`/admin/users/app/${userId}/relations/unlocks`, { params });
}
