import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useCoins } from '@/hooks/useCoins'
import { EmptyState } from '@/components/EmptyState'

/**
 * 成家币交易明细页
 * 展示收入/支出记录列表，支持空状态提示
 * 对齐蓝湖设计：交易记录列表 / 空状态占位
 */
export default function CoinsDetailPage() {
  const {
    transactions,
    transactionsLoading,
    fetchTransactions,
  } = useCoins()

  /** 页面加载时拉取交易明细 */
  useLoad(() => {
    fetchTransactions()
  })

  /** 格式化金额显示：收入显示 +金额，支出显示 -金额 */
  const formatAmount = (amount: number): string => {
    return amount > 0 ? `+${amount}` : `${amount}`
  }

  /** 根据交易类型返回颜色 */
  const getAmountColor = (type: 'income' | 'expense'): string => {
    return type === 'income' ? 'text-brand-blue' : 'text-[#333333]'
  }

  return (
    <View className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* 加载中 */}
      {transactionsLoading && (
        <View className="flex items-center justify-center py-20">
          <Text className="text-sm text-gray-400">加载中...</Text>
        </View>
      )}

      {/* 空状态 */}
      {!transactionsLoading && transactions.length === 0 && (
        <EmptyState text="暂无交易记录" />
      )}

      {/* 交易记录列表 */}
      {!transactionsLoading && transactions.length > 0 && (
        <ScrollView scrollY className="flex-1 px-6 pt-4">
          {transactions.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-card px-6 py-4 mb-3 flex items-center justify-between"
            >
              {/* 左侧：类型描述 + 时间 */}
              <View className="flex flex-col flex-1 min-w-0">
                <Text className="text-base text-text-dark font-medium truncate">
                  {item.description}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">{item.time}</Text>
              </View>

              {/* 右侧：金额 + 余额 */}
              <View className="flex flex-col items-end ml-4 shrink-0">
                <Text
                  className={`text-base font-semibold ${getAmountColor(item.type)}`}
                >
                  {formatAmount(item.amount)}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  余额 {item.balance}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
