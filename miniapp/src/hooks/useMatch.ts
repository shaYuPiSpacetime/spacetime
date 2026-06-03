import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { mockMatchUsers } from '@/services/mock';
import type { MockMatchUser } from '@/services/mock';

/**
 * 觅缘页核心逻辑 Hook
 * 管理用户卡片数据、操作行为、弹窗状态
 */
export function useMatch() {
  // ========== 数据状态 ==========
  /** 推荐用户列表 */
  const [matchUsers] = useState<MockMatchUser[]>(mockMatchUsers);
  /** 当前卡片索引 */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 当前展示的用户（越界时返回 null） */
  const currentUser = matchUsers[currentIndex] ?? null;

  // ========== 弹窗状态 ==========
  /** Yo 打招呼弹窗 */
  const [showYoPopup, setShowYoPopup] = useState(false);
  /** Yo 文字消息弹窗 */
  const [showYoTextPopup, setShowYoTextPopup] = useState(false);
  /** 三重认证弹窗 */
  const [showCertPopup, setShowCertPopup] = useState(false);
  /** 悄悄话说明弹窗 */
  const [showWhisperPopup, setShowWhisperPopup] = useState(false);

  // ========== 用户状态 ==========
  /** 是否已完善个人信息（Mock：默认完善） */
  const [isProfileComplete] = useState(true);
  /** 当前输入的悄悄话文字 */
  const [yoText, setYoText] = useState('');

  // ========== 卡片操作 ==========

  /** 切换到下一张卡片 */
  const swipeToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      // 超过列表长度则回到第一张
      return next >= matchUsers.length ? 0 : next;
    });
  }, [matchUsers.length]);

  // ========== 互动操作 ==========

  /** Yo 打招呼 */
  const yoUser = useCallback(() => {
    if (!currentUser) return;
    setShowYoPopup(true);
  }, [currentUser]);

  /** 确认发送 Yo */
  const confirmYo = useCallback(() => {
    if (!currentUser) return;
    Taro.showToast({ title: `已向 ${currentUser.nickname} 打招呼`, icon: 'success' });
    setShowYoPopup(false);
  }, [currentUser]);

  /** 打开 Yo 文字弹窗 */
  const openYoText = useCallback(() => {
    setShowYoPopup(false);
    setShowYoTextPopup(true);
  }, []);

  /** 发送悄悄话文字消息 */
  const sendYoText = useCallback(() => {
    if (!currentUser || !yoText.trim()) return;
    Taro.showToast({ title: `悄悄话已发送给 ${currentUser.nickname}`, icon: 'success' });
    setYoText('');
    setShowYoTextPopup(false);
  }, [currentUser, yoText]);

  /** 喜欢当前用户 */
  const likeUser = useCallback(() => {
    if (!currentUser) return;
    Taro.showToast({ title: `已喜欢 ${currentUser.nickname}`, icon: 'success' });
  }, [currentUser]);

  /** 收藏当前用户 */
  const favoriteUser = useCallback(() => {
    if (!currentUser) return;
    Taro.showToast({ title: `已收藏 ${currentUser.nickname}`, icon: 'success' });
  }, [currentUser]);

  // ========== 弹窗控制 ==========

  /** 关闭 Yo 弹窗 */
  const closeYoPopup = useCallback(() => {
    setShowYoPopup(false);
  }, []);

  /** 关闭 Yo 文字弹窗 */
  const closeYoTextPopup = useCallback(() => {
    setShowYoTextPopup(false);
    setYoText('');
  }, []);

  /** 打开认证弹窗 */
  const openCertPopup = useCallback(() => {
    setShowCertPopup(true);
  }, []);

  /** 关闭认证弹窗 */
  const closeCertPopup = useCallback(() => {
    setShowCertPopup(false);
  }, []);

  /** 打开悄悄话弹窗 */
  const openWhisperPopup = useCallback(() => {
    setShowWhisperPopup(true);
  }, []);

  /** 关闭悄悄话弹窗 */
  const closeWhisperPopup = useCallback(() => {
    setShowWhisperPopup(false);
  }, []);

  // ========== 导航 ==========

  /** 跳转到个人信息编辑页 */
  const navigateToProfileEdit = useCallback(() => {
    Taro.switchTab({ url: '/pages/profile/index' });
  }, []);

  return {
    // 数据
    matchUsers,
    currentIndex,
    currentUser,
    // 操作
    swipeToNext,
    yoUser,
    likeUser,
    favoriteUser,
    confirmYo,
    openYoText,
    sendYoText,
    // 弹窗状态与控制
    showYoPopup,
    showYoTextPopup,
    showCertPopup,
    showWhisperPopup,
    closeYoPopup,
    closeYoTextPopup,
    openCertPopup,
    closeCertPopup,
    openWhisperPopup,
    closeWhisperPopup,
    // 辅助
    isProfileComplete,
    yoText,
    setYoText,
    navigateToProfileEdit,
  };
}
