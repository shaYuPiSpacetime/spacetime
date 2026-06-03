import { View } from '@tarojs/components';
import type { ReactNode } from 'react';

/** 通用卡片容器 Props */
interface SectionCardProps {
  /** 卡片内容 */
  children: ReactNode;
  /** 额外样式类名 */
  className?: string;
}

/**
 * 通用卡片容器组件
 * 对齐蓝湖设计：白色背景 + 12px 圆角 + 统一内边距
 */
export function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <View className={`bg-white rounded-card px-8 py-7 ${className}`}>
      {children}
    </View>
  );
}
