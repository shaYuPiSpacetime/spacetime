import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { EmptyState } from '@/components/EmptyState'
import { useMembership } from '@/hooks/useMembership'
import CustomNavBar from '@/components/CustomNavBar'
import type { MemberStatus } from '@/types/membership'

/** Tab 选项配置 */
const STATUS_TABS: { key: MemberStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '已开通' },
  { key: 'expired', label: '已过期' },
]

/** 记录状态样式映射 */
const RECORD_STATUS_STYLE: Record<string, string> = {
  '已开通': 'text-green-500 bg-green-50',
  '生效中': 'text-green-500 bg-green-50',
  '已过期': 'text-gray-400 bg-gray-100',
  '即将过期': 'text-orange-500 bg-orange-50',
}

/**
 * 会员记录子页面
 * 支持按状态 Tab 筛选，展示开通/消费流水记录
 */
export default function RecordsPage() {
  const {
    activeStatus,
    recordsLoading,
    filteredRecords,
    fetchRecords,
    changeStatus,
  } = useMembership()

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  /** 格式化时间展示 */
  const formatTime = (time: string) => {
    if (!time) return ''
    // 只展示日期部分 YYYY-MM-DD
    return time.split(' ')[0] ?? time
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <CustomNavBar title="会员记录" showBack />
      {/* ===== Tab 筛选栏 ===== */}
      <View className="px-4 pt-3">
        <View className="flex flex-row gap-2 rounded-[10px] bg-white p-1">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.key === activeStatus
            return (
              <View
                key={tab.key}
                className="flex-1 rounded-[8px] py-2 flex items-center justify-center"
                style={{ background: isActive ? '#2876FF' : 'transparent' }}
                onClick={() => changeStatus(tab.key)}
              >
                <Text className="text-sm" style={{ color: isActive ? '#FFFFFF' : '#666666' }}>
                  {tab.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* ===== 记录列表 ===== */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {recordsLoading ? (
          /* 加载中 */
          <View className="flex justify-center py-20">
            <Text className="text-sm text-gray-400">加载中...</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          /* 空状态 */
          <EmptyState
            text={activeStatus === 'all' ? '暂无会员记录' : '暂无该状态的记录'}
            actionText="开通会员"
            onAction={() => {
              // 返回会员中心
              const pages = Taro.getCurrentPages()
              if (pages.length > 1) {
                Taro.navigateBack()
              } else {
                Taro.redirectTo({ url: '/pages/membership/index' })
              }
            }}
          />
        ) : (
          /* 记录卡片列表 */
          <View className="flex flex-col gap-3">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                formatTime={formatTime}
              />
            ))}
          </View>
        )}

        {/* 底部留白 */}
        <View className="h-6" />
      </ScrollView>
    </View>
  )
}

/** 记录卡片 Props */
interface RecordCardProps {
  record: {
    id: number
    planName: string
    amount: number
    startTime: string
    endTime: string
    status: string
  }
  formatTime: (time: string) => string
}

/**
 * 单条会员记录卡片
 */
function RecordCard({ record, formatTime }: RecordCardProps) {
  const statusStyle = RECORD_STATUS_STYLE[record.status] ?? 'text-gray-400 bg-gray-100'

  return (
    <View className="bg-white rounded-card p-4">
      {/* 头部：套餐名 + 状态 */}
      <View className="flex items-center justify-between mb-2">
        <Text className="text-base font-medium text-text-dark">
          {record.planName}
        </Text>
        <View className={`rounded-badge px-2 py-0.5 ${statusStyle}`}>
          <Text className="text-xs">{record.status}</Text>
        </View>
      </View>

      {/* 金额 */}
      <View className="mb-2">
        <Text className="text-lg font-bold text-red-500">¥{record.amount}</Text>
      </View>

      {/* 时间信息 */}
      <View className="flex flex-col gap-1">
        <View className="flex items-center">
          <Text className="text-xs text-gray-400 w-12">开通:</Text>
          <Text className="text-xs text-gray-600">
            {formatTime(record.startTime)}
          </Text>
        </View>
        <View className="flex items-center">
          <Text className="text-xs text-gray-400 w-12">到期:</Text>
          <Text className="text-xs text-gray-600">
            {formatTime(record.endTime)}
          </Text>
        </View>
      </View>
    </View>
  )
}
