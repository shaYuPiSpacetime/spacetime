import { View, Text } from '@tarojs/components'

/** 测评项目 Mock 数据 */
interface AssessmentItem {
  id: number
  icon: string
  title: string
  description: string
  participantCount: number
  duration: string
  category: string
}

const MOCK_ASSESSMENTS: AssessmentItem[] = [
  {
    id: 1,
    icon: '🧠',
    title: '性格类型测试',
    description: 'MBTI 性格分析，了解你的性格特质与行为偏好，找到最适合你的另一半',
    participantCount: 12860,
    duration: '约5分钟',
    category: '性格',
  },
  {
    id: 2,
    icon: '💕',
    title: '恋爱匹配度',
    description: '科学评估你们的恋爱契合度，从价值观到生活习惯全方位解析',
    participantCount: 9823,
    duration: '约8分钟',
    category: '情感',
  },
  {
    id: 3,
    icon: '💎',
    title: '价值观测试',
    description: '探索你的核心价值观，帮助你在感情中做出更明智的选择',
    participantCount: 6542,
    duration: '约6分钟',
    category: '成长',
  },
  {
    id: 4,
    icon: '🌈',
    title: '依恋风格测试',
    description: '了解你的依恋模式，改善亲密关系中的沟通与相处方式',
    participantCount: 4380,
    duration: '约4分钟',
    category: '情感',
  },
]

/** 格式化参与人数 */
function formatCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return String(count)
}

/**
 * 测评主页
 * 展示测评项目卡片列表，每项包含图标、标题、描述、参与人数和开始按钮
 */
export default function AssessmentPage() {
  // 空状态
  if (MOCK_ASSESSMENTS.length === 0) {
    return (
      <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Text className="text-4xl mb-4">📋</Text>
        <Text className="text-sm text-gray-400">暂无测评项目，敬请期待</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 页面头部横幅 */}
      <View className="mx-3 mt-3 bg-gradient-to-r from-primary to-primary-light rounded-card px-5 py-6">
        <Text className="text-lg font-bold text-white">发现你的情感密码</Text>
        <Text className="text-xs text-white text-opacity-80 mt-2 block">
          科学的测评工具，帮你更好地认识自己和TA
        </Text>
      </View>

      {/* 测评卡片列表 */}
      <View className="pt-3 pb-4">
        {MOCK_ASSESSMENTS.map((item) => (
          <View
            key={item.id}
            className="mx-3 mt-3 bg-white rounded-card px-4 py-4"
          >
            {/* 左侧图标 + 中间信息 */}
            <View className="flex items-start">
              {/* 图标 */}
              <View className="w-14 h-14 bg-brand-blue-bg rounded-xl flex items-center justify-center flex-shrink-0">
                <Text className="text-2xl">{item.icon}</Text>
              </View>

              {/* 信息区域 */}
              <View className="ml-3 flex-1 min-w-0">
                {/* 标题行 */}
                <View className="flex items-center gap-2">
                  <Text className="text-sm font-medium text-text-dark">
                    {item.title}
                  </Text>
                  <View className="bg-gray-100 rounded px-2 py-0.5">
                    <Text className="text-xs text-gray-500">{item.category}</Text>
                  </View>
                </View>

                {/* 描述 */}
                <Text className="text-xs text-gray-400 mt-2 leading-relaxed block">
                  {item.description}
                </Text>

                {/* 底部信息：人数 + 时长 + 按钮 */}
                <View className="mt-4 flex items-center justify-between">
                  <View className="flex items-center gap-3">
                    <View className="flex items-center gap-1">
                      <Text className="text-xs">👥</Text>
                      <Text className="text-xs text-gray-400">
                        {formatCount(item.participantCount)}人已测
                      </Text>
                    </View>
                    <View className="flex items-center gap-1">
                      <Text className="text-xs">⏱</Text>
                      <Text className="text-xs text-gray-400">
                        {item.duration}
                      </Text>
                    </View>
                  </View>

                  {/* 开始测评按钮 */}
                  <View className="bg-primary rounded-btn px-5 py-2">
                    <Text className="text-xs text-white font-medium">
                      开始测评
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* 底部提示 */}
        <View className="flex items-center justify-center py-6">
          <Text className="text-xs text-gray-300">— 更多测评即将上线 —</Text>
        </View>
      </View>
    </View>
  )
}
