export interface VerificationStatusVO {
  realNameStatus?: string
  realNameRejectReason?: string
  educationStatus?: string
  educationRejectReason?: string
  avatarVerifyStatus?: string
  avatarVerifyRejectReason?: string
  profilePhotoAuditStatus?: string
  openTextAuditStatus?: string
  verifyLevel?: number
  unlockMateRecommend?: boolean
}

export interface RealNameSubmitReq {
  realName: string
  idCard: string
}

export interface EducationSubmitReq {
  educationMethod: 'CHSI' | 'ONLINE_CODE' | 'DIPLOMA_NO' | 'CERTIFICATE_UPLOAD'
  verificationCode?: string
  diplomaNo?: string
}
