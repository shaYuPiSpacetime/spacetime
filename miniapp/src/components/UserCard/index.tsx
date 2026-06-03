import { View, Text, Image } from '@tarojs/components';
import type { FeaturedGuest } from '@/types/featured';

/** 用户卡片 Props */
interface UserCardProps {
  /** 用户数据 */
  user: FeaturedGuest;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 用户信息卡片组件
 * 对齐蓝湖设计：照片区域 + 认证标签 + 成家币角标 + 底部信息
 */
export function UserCard({ user, onClick }: UserCardProps) {
  /** 认证标签文字 */
  const authLabel =
    user.authStatus === 'triple' ? '三重认证'
    : user.authStatus === 'double' ? '双重认证'
    : '已认证';

  return (
    <View
      className="relative bg-white rounded-card overflow-hidden shadow-sm"
      onClick={onClick}
    >
      {/* 照片区域 */}
      <View className="relative w-full h-[400px] bg-gray-200">
        {user.photos.length > 0 && (
          <Image className="w-full h-full" src={user.photos[0]} mode="aspectFill" />
        )}
        {/* 锁定遮罩 */}
        {user.isLocked && (
          <View className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
            <Text className="text-white text-xl font-medium mb-3">
              {user.unlockCost} 成家币解锁
            </Text>
            <View className="bg-primary rounded-btn px-6 py-2">
              <Text className="text-white text-sm font-medium">立即解锁</Text>
            </View>
          </View>
        )}
        {/* 认证标签 */}
        <View className="absolute top-5 left-5 bg-brand-blue/80 rounded-md px-2 py-1">
          <Text className="text-white text-xs">{authLabel}</Text>
        </View>
        {/* 成家币角标 */}
        {user.isLocked && (
          <View className="absolute top-5 right-5 bg-primary rounded-full w-12 h-12 flex items-center justify-center border-2 border-white">
            <Text className="text-white text-xs font-medium">{user.unlockCost}</Text>
          </View>
        )}
      </View>
      {/* 底部信息 */}
      <View className="p-4">
        <View className="flex items-center gap-2">
          <Text className="text-base font-medium text-gray-800">{user.nickname}</Text>
          <Text className="text-xs text-gray-400">
            {user.age}岁 · {user.education}
          </Text>
        </View>
        {/* 标签 */}
        {user.tags.length > 0 && (
          <View className="flex flex-wrap gap-2 mt-2">
            {user.tags.map((tag, i) => (
              <View key={i} className="bg-brand-blue-bg rounded-md px-2 py-0.5">
                <Text className="text-xs text-brand-blue">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
