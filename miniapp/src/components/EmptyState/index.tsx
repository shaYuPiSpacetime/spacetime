import { View, Text, Image } from '@tarojs/components';

/** 空状态占位 Props */
interface EmptyStateProps {
  /** 空状态图标 */
  icon?: string;
  /** 提示文字 */
  text: string;
  /** 操作按钮文字 */
  actionText?: string;
  /** 操作按钮回调 */
  onAction?: () => void;
}

/**
 * 空状态占位组件
 * 用于列表无数据、暂无记录等场景
 */
export function EmptyState({ icon, text, actionText, onAction }: EmptyStateProps) {
  return (
    <View className="flex flex-col items-center justify-center py-20">
      {icon && <Image className="w-32 h-32 mb-6" src={icon} mode="aspectFit" />}
      <Text className="text-sm text-gray-400 mb-4">{text}</Text>
      {actionText && onAction && (
        <View
          className="bg-brand-blue rounded-btn px-8 py-3"
          onClick={onAction}
        >
          <Text className="text-white text-sm font-medium">{actionText}</Text>
        </View>
      )}
    </View>
  );
}
