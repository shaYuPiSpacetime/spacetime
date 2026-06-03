/** 登录步骤 */
export type LoginStep = 'auth' | 'gender' | 'education' | 'address' | 'age';

/** 登录用户信息 */
export interface LoginUserInfo {
  gender?: 'male' | 'female';
  education?: string;
  province?: string;
  city?: string;
  age?: number;
  avatar?: string;
  nickname?: string;
}
