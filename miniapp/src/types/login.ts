/** 登录步骤 */
export type LoginStep =
  | 'auth'
  | 'gender'
  | 'identity'
  | 'goal'
  | 'education'
  | 'address'
  | 'age'
  | 'verification';

/** 登录用户信息 */
export interface LoginUserInfo {
  gender?: string;
  education?: string;
  educationLevel?: string;
  locationProvince?: string;
  locationCity?: string;
  locationDistrict?: string;
  locationProvinceLabel?: string;
  locationCityLabel?: string;
  locationDistrictLabel?: string;
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
  datingGoal?: string;
  career?: string;
  income?: string;
  maritalStatus?: string;
  introduction?: string;
  avatarLocalPath?: string;
  avatarReviewStatus?: 'none' | 'pending' | 'approved';
  realName?: string;
  idCard?: string;
  schoolName?: string;
  educationUploadLocalPath?: string;
  diplomaNo?: string;
  verificationCode?: string;
}
