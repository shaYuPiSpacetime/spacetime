/** 登录步骤 */
export type LoginStep =
  | 'auth'
  | 'gender'
  | 'education'
  | 'address'
  | 'age'
  | 'verification';

/** 登录用户信息 */
export interface LoginUserInfo {
  gender?: 'male' | 'female';
  education?: string;
  province?: string;
  city?: string;
  age?: number;
  birthday?: string;
  avatar?: string;
  nickname?: string;
  height?: string;
  weight?: string;
  hometown?: string;
  identity?: string;
  career?: string;
  income?: string;
  maritalStatus?: string;
  introduction?: string;
  avatarLocalPath?: string;
  avatarReviewStatus?: 'none' | 'pending' | 'approved';
  realName?: string;
  idCard?: string;
  schoolName?: string;
  educationLevel?: string;
  educationUploadLocalPath?: string;
  diplomaNo?: string;
  verificationCode?: string;
}
