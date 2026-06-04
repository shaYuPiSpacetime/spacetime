import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/stores/authStore';
import { mockMyMembership, mockCoinBalance } from '@/services/mock';
import type { MyMembership } from '@/types/membership';

/**
 * 成家币余额数据结构（当前阶段 mockCoinBalance 为 number，后续接口返回完整对象）
 */
interface CoinBalance {
  /** 可用余额 */
  balance: number;
}

/**
 * 我的页面完整数据 — 聚合 authStore + membership + coinBalance
 */
interface ProfileData {
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 用户昵称 */
  nickname: string;
  /** 用户头像 */
  avatarUrl: string;
  /** 位置（mock 占位，后续从接口获取） */
  location: string;
  /** 年龄（mock 占位） */
  age: number | null;
  /** 星座（mock 占位） */
  zodiac: string;
  /** 是否已认证 */
  isVerified: boolean;
  /** 认证标签列表（mock 占位） */
  verifiedLabels: string[];
  /** 会员信息 */
  membership: MyMembership | null;
  /** 成家币余额 */
  coinBalance: CoinBalance | null;
  /** 统计数据 — 我喜欢的 */
  likedCount: number;
  /** 统计数据 — 喜欢我的 */
  beLikedCount: number;
  /** 统计数据 — 最近来访 */
  visitorCount: number;
}

/**
 * useProfile 返回值
 */
interface UseProfileReturn {
  /** 页面数据 */
  data: ProfileData;
  /** 首次加载中 */
  loading: boolean;
  /** 下拉刷新中 */
  refreshing: boolean;
  /** 错误信息，无错误时为 null */
  error: string | null;
  /** 数据为空（未登录） */
  empty: boolean;
  /** 拉取数据（首次加载用） */
  fetch: () => void;
  /** 下拉刷新 */
  refresh: () => void;
  /** 跳转编辑资料 */
  goToEditProfile: () => void;
  /** 跳转 VIP 开通页 */
  goToVip: () => void;
  /** 跳转成家币明细 */
  goToCoin: () => void;
  /** 跳转邀请好友 */
  goToInvite: () => void;
  /** 跳转我的动态 */
  goToMyPosts: () => void;
  /** 跳转帮助与客服 */
  goToHelp: () => void;
  /** 跳转设置 */
  goToSettings: () => void;
}

/**
 * 构建页面数据：聚合 authStore + mock 数据
 * 当前阶段所有数据均为同步 mock，后续替换为真实接口时只需修改此函数内部实现。
 */
function buildProfileData(): ProfileData {
  const auth = useAuthStore.getState();

  return {
    isLoggedIn: auth.isLoggedIn,
    // mock 文案对齐 Figma 设计稿
    nickname: auth.nickname || '筱脑虎',
    avatarUrl: auth.avatar || '',
    location: '杭州市',
    age: 28,
    zodiac: '双鱼座',
    isVerified: true,
    verifiedLabels: ['实名认证', '学历认证', '工作认证'],
    // 会员信息
    membership: mockMyMembership ?? null,
    // 成家币余额（当前为 number，包装为对象以兼容后续接口）
    coinBalance: { balance: mockCoinBalance },
    // 统计数据（mock 占位）
    // 蓝湖设计稿：45心动 + 99被喜欢
    likedCount: 45,
    beLikedCount: 99,
    visitorCount: 99,
  };
}

/**
 * 我的页面 Hook
 *
 * 职责：
 * - 聚合 authStore + mock 数据构建页面所需的完整数据
 * - 管理 loading / error / empty / refreshing 状态
 * - 提供页面所需的所有导航方法
 *
 * 数据来源：当前阶段使用 authStore 同步数据 + mock 静态常量，
 * 后续对接真实接口时只需修改 buildProfileData 为异步即可，页面组件无需改动。
 */
export function useProfile(): UseProfileReturn {
  const [data, setData] = useState<ProfileData>(buildProfileData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 空状态：未登录视为空 */
  const empty = !data.isLoggedIn;

  /**
   * 核心数据拉取逻辑
   * 当前阶段数据均为同步，仅模拟异步加载过程以便后续对接真实接口。
   * @param isRefresh 是否为下拉刷新
   */
  const loadData = useCallback((isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 数据重建（当前为同步操作，后续改为 await 异步接口）
      const freshData = buildProfileData();
      setData(freshData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '加载失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** 首次加载 / 手动重试 */
  const fetch = useCallback(() => loadData(false), [loadData]);

  /** 下拉刷新 */
  const refresh = useCallback(() => loadData(true), [loadData]);

  // ======================== 导航方法 ========================

  /** 跳转编辑资料页 */
  const goToEditProfile = useCallback(() => {
    Taro.navigateTo({ url: '/pages/profile/edit/index' });
  }, []);

  /** 跳转 VIP 开通/权益页 */
  const goToVip = useCallback(() => {
    Taro.navigateTo({ url: '/pages/vip/index' });
  }, []);

  /** 跳转成家币明细页 */
  const goToCoin = useCallback(() => {
    Taro.navigateTo({ url: '/pages/coin/index' });
  }, []);

  /** 跳转邀请好友页 */
  const goToInvite = useCallback(() => {
    Taro.navigateTo({ url: '/pages/invite/index' });
  }, []);

  /** 跳转我的动态页 */
  const goToMyPosts = useCallback(() => {
    Taro.navigateTo({ url: '/pages/moments/my/index' });
  }, []);

  /** 跳转帮助与客服页 */
  const goToHelp = useCallback(() => {
    Taro.navigateTo({ url: '/pages/help/index' });
  }, []);

  /** 跳转设置页 */
  const goToSettings = useCallback(() => {
    Taro.navigateTo({ url: '/pages/settings/index' });
  }, []);

  return {
    data,
    loading,
    refreshing,
    error,
    empty,
    fetch,
    refresh,
    goToEditProfile,
    goToVip,
    goToCoin,
    goToInvite,
    goToMyPosts,
    goToHelp,
    goToSettings,
  };
}

export type { CoinBalance, ProfileData, UseProfileReturn };
