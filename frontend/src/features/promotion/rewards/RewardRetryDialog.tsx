import { ConfirmActionDialog } from '@/features/promotion/shared/promotionUi';
import type { PromotionRewardListItem } from '@/types/promotion';

export function RewardRetryDialog({
  reward,
  loading,
  onClose,
  onConfirm,
}: {
  reward: PromotionRewardListItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmActionDialog
      open={Boolean(reward)}
      title="确认重试发放？"
      description={reward
        ? `奖励单 ${reward.rewardNo} 将复用原幂等键重新提交发放，不会创建新的奖励单。`
        : ''}
      confirmText="确认重试"
      loading={loading}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
