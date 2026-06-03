/** 认证状态 */
export type AuthStatus = 'none' | 'single' | 'double' | 'triple';

/** 精选嘉宾 */
export interface FeaturedGuest {
  id: number;
  nickname: string;
  avatar: string;
  age: number;
  education: string;
  location: string;
  height: number;
  photos: string[];
  authStatus: AuthStatus;
  isLocked: boolean;
  unlockCost: number;
  tags: string[];
}

/** 精选分页请求 */
export interface FeaturedPageReq {
  page: number;
  size: number;
}
