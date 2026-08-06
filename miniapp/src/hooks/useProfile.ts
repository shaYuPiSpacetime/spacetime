import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/stores/authStore';
import { getCoinBalance, getVipStatus, type VipStatusVO } from '@/services/payment';
import { prd01Api } from '@/services/prd01';
import { usePrd01Store } from '@/stores/prd01Store';
import type { AccessStatus, BasicProfile, OpenTextDetail, ProfileHomeDetail, VerificationStatus } from '@/types/prd01';
import type { MyMembership } from '@/types/membership';

/**
 * 千寻币余额数据结构。
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
  /** 地区接口返回的城市名称 */
  location: string;
  /** 后端根据生日计算的年龄 */
  age: number | null;
  /** 当前接口未提供时为空 */
  zodiac: string;
  /** 是否已认证 */
  isVerified: boolean;
  /** 核心页面准入状态；未通过时“我的”只展示认证引导节点。 */
  accessStatus: AccessStatus | null;
  /** 我的未认证节点所需基础资料。 */
  basicProfile: BasicProfile | null;
  /** 我的未认证节点所需认证进度。 */
  verification: VerificationStatus | null;
  /** 我的未认证节点所需自我介绍审核进度。 */
  introduction: OpenTextDetail | null;
  /** 是否已完成一次我的页准入数据请求。 */
  entryResolved: boolean;
  /** 认证标签列表 */
  verifiedLabels: string[];
  profileScore: number;
  /** 会员信息 */
  membership: MyMembership | null;
  /** 千寻币余额 */
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
  fetch: () => Promise<void>;
  /** 下拉刷新 */
  refresh: () => Promise<void>;
  /** 跳转编辑资料 */
  goToEditProfile: () => void;
  /** 跳转 VIP 开通页 */
  goToVip: () => void;
  /** 跳转千寻币明细 */
  goToCoin: () => void;
  /** 跳转邀请好友 */
  goToInvite: () => void;
  /** 跳转我的动态 */
  goToMyPosts: () => void;
  /** 跳转帮助与客服 */
  goToHelp: () => void;
  /** 跳转设置 */
  goToSettings: () => void;
  /** 跳转心动页 */
  goToHeart: () => void;
}

/**
 * 构建页面数据：聚合主页统一详情、会员和余额接口。
 */
function adaptProfileMembership(status?: VipStatusVO): MyMembership {
  if (status?.vipStatus === 'active') {
    return {
      status: 'active',
      startTime: status.memberStartTime,
      expireTime: status.vipExpireTime,
      planName: status.packageName,
      orderNo: status.orderNo,
      packageId: status.packageId,
      subscriptionType: status.subscriptionType,
      payChannel: status.payChannel,
    };
  }
  if (status?.vipStatus === 'expired') {
    return {
      status: 'expired',
      startTime: status.memberStartTime,
      expireTime: status.vipExpireTime,
      planName: status.packageName,
      orderNo: status.orderNo,
      packageId: status.packageId,
      subscriptionType: status.subscriptionType,
      payChannel: status.payChannel,
    };
  }
  return { status: 'none' };
}

function buildProfileData(
  home?: ProfileHomeDetail,
  membership: MyMembership | null = null,
  coinBalance: CoinBalance | null = null,
  location = '',
  basicProfile: BasicProfile | null = null,
  introduction: OpenTextDetail | null = null,
): ProfileData {
  const auth = useAuthStore.getState();
  const profile = home?.profile || {};
  const verified = Boolean(home?.accessStatus?.canBrowseCards);

  return {
    isLoggedIn: auth.isLoggedIn,
    nickname: String(profile.nickname || auth.nickname || ''),
    avatarUrl: String(profile.avatar || auth.avatar || ''),
    location,
    age: typeof profile.age === 'number' ? profile.age : null,
    zodiac: '',
    isVerified: verified,
    accessStatus: home?.accessStatus || auth.accessStatus,
    basicProfile,
    verification: home?.verificationStatus || null,
    introduction,
    entryResolved: Boolean(home),
    verifiedLabels: [],
    profileScore: Number(profile.profileScore || 0),
    membership,
    coinBalance,
    likedCount: Number(profile.likedCount || 0),
    beLikedCount: Number(profile.beLikedCount || 0),
    visitorCount: Number(profile.visitorCount || 0),
  };
}

async function loadLocationLabel(home: ProfileHomeDetail) {
  const provinceCode = String(home.profile.locationProvince || '');
  const cityCode = String(home.profile.locationCity || '');
  if (!provinceCode) return '';
  const store = usePrd01Store.getState();
  const provinces = await store.locations();
  const province = provinces.find(item => item.code === provinceCode);
  if (!cityCode) return province?.label || '';
  const cities = await store.locations(provinceCode);
  return cities.find(item => item.code === cityCode)?.label || province?.label || '';
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
  const [data, setData] = useState<ProfileData>(() => buildProfileData());
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
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const auth = useAuthStore.getState();
      let membership: MyMembership | null = null;
      let coinBalance: CoinBalance | null = null;
      let home: ProfileHomeDetail | undefined;
      let basicProfile: BasicProfile | null = null;
      let introduction: OpenTextDetail | null = null;
      let location = '';
      if (auth.isLoggedIn) {
        await usePrd01Store.getState().bootstrap();
        const [homeResult, basicResult, introductionResult] = await Promise.all([
          prd01Api.getHomeDetail(),
          prd01Api.getBasicProfile(),
          prd01Api.getIntroduction(),
        ]);
        home = homeResult;
        basicProfile = basicResult;
        introduction = introductionResult;
        useAuthStore.getState().setAccessStatus(homeResult.accessStatus);
        location = await loadLocationLabel(homeResult);
        if (homeResult.accessStatus.coreAccessStatus === 'CORE_ALLOWED') {
          const [status, balance] = await Promise.all([getVipStatus(), getCoinBalance()]);
          membership = adaptProfileMembership(status);
          coinBalance = { balance: Number(balance.coinBalance || 0) };
        }
      }
      const freshData = buildProfileData(home, membership, coinBalance, location, basicProfile, introduction);
      setData(freshData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '资料加载失败，请稍后重试';
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
    Taro.navigateTo({ url: '/pages/profile/edit' });
  }, []);

  /** 跳转 VIP 开通/权益页 */
  const goToVip = useCallback(() => {
    Taro.navigateTo({ url: '/pages/membership/index' });
  }, []);

  /** 跳转千寻币明细页 */
  const goToCoin = useCallback(() => {
    Taro.navigateTo({ url: '/pages/coins/index' });
  }, []);

  /** 跳转邀请好友页 */
  const goToInvite = useCallback(() => {
    const auth = useAuthStore.getState()
    if (!auth.isLoggedIn) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }
    Taro.navigateTo({ url: '/pages/promotion/invite-home' })
  }, []);

  /** 跳转我的动态页 */
  const goToMyPosts = useCallback(() => {
    Taro.navigateTo({ url: '/pages/qianxun/my-posts' });
  }, []);

  /** 跳转帮助与客服页 */
  const goToHelp = useCallback(() => {
    Taro.navigateTo({ url: '/pages/settings/help' });
  }, []);

  /** 跳转设置页 */
  const goToSettings = useCallback(() => {
    Taro.navigateTo({ url: '/pages/settings/index' });
  }, []);

  /** 统计项统一跳转心动 Tab，避免普通路由与 Tab 路由混用。 */
  const goToHeart = useCallback(() => {
    Taro.switchTab({ url: '/pages/community/index' });
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
    goToHeart,
  };
}

export type { CoinBalance, ProfileData, UseProfileReturn };
