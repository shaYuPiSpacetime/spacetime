import { useState } from 'react'
import { mockFeaturedGuests } from '@/services/mock'
import type { FeaturedGuest } from '@/types/featured'

/**
 * 精选页业务逻辑 Hook
 * 管理嘉宾数据、Tab 切换、弹窗显隐等状态
 */
export function useFeatured() {
  // 嘉宾列表（Mock 数据）
  const [guests] = useState(mockFeaturedGuests)

  // Tab 选中索引：0=心印测试, 1=精选, 2=理想型
  const [activeTab, setActiveTab] = useState(1)

  // 弹窗显隐状态
  const [authModalVisible, setAuthModalVisible] = useState(false)
  const [coinModalVisible, setCoinModalVisible] = useState(false)
  const [unlockModalVisible, setUnlockModalVisible] = useState(false)

  // 当前选中的嘉宾（用于解锁弹窗展示）
  const [selectedGuest, setSelectedGuest] = useState<FeaturedGuest | null>(null)

  /** Tab 名称列表 */
  const tabs = ['心印测试', '精选', '理想型']

  // 弹窗控制方法
  const showAuthModal = () => setAuthModalVisible(true)
  const hideAuthModal = () => setAuthModalVisible(false)

  const showCoinModal = () => setCoinModalVisible(true)
  const hideCoinModal = () => setCoinModalVisible(false)

  /** 显示解锁弹窗，并记录目标嘉宾 */
  const showUnlockModal = (guest: FeaturedGuest) => {
    setSelectedGuest(guest)
    setUnlockModalVisible(true)
  }

  /** 关闭解锁弹窗，清空选中嘉宾 */
  const hideUnlockModal = () => {
    setSelectedGuest(null)
    setUnlockModalVisible(false)
  }

  return {
    guests,
    tabs,
    activeTab,
    setActiveTab,
    authModalVisible,
    showAuthModal,
    hideAuthModal,
    coinModalVisible,
    showCoinModal,
    hideCoinModal,
    unlockModalVisible,
    showUnlockModal,
    hideUnlockModal,
    selectedGuest,
  }
}
