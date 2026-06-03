import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

/** 页面顶栏 Props */
interface PageHeaderProps {
  /** 标题文字 */
  title: string;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 返回按钮点击回调，默认 navigateBack */
  onBack?: () => void;
}

/**
 * 页面头部导航组件
 * 对齐蓝湖设计：居中标题 + 左侧返回箭头
 */
export function PageHeader({ title, showBack = true, onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      Taro.navigateBack();
    }
  };

  return (
    <View className="flex items-center justify-center px-6 py-5 relative bg-white">
      {/* 返回按钮 */}
      {showBack && (
        <View
          className="absolute left-6 flex items-center justify-center w-[44px] h-[44px]"
          onClick={handleBack}
        >
          <Text className="text-brand-blue text-lg font-medium">{'<'}</Text>
        </View>
      )}
      {/* 标题 */}
      <Text className="text-lg font-medium text-text-dark">{title}</Text>
    </View>
  );
}
