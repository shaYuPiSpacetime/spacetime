import { ConfirmActionDialog, formatMonthPeriod } from '@/features/promotion/shared/promotionUi';
import type { PromotionSettlementListItem } from '@/types/promotion';

export function SettlementConfirmDialog({
  settlement,
  loading,
  onClose,
  onConfirm,
}: {
  settlement: PromotionSettlementListItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const period = settlement
    ? settlement.periodStart && settlement.periodEnd
      ? `${settlement.periodStart} 至 ${settlement.periodEnd}`
      : formatMonthPeriod(settlement.periodStart)
    : '';

  return (
    <ConfirmActionDialog
      open={Boolean(settlement)}
      title="确定本期结算？"
      description={settlement
        ? `结算单 ${settlement.settlementNo}，周期 ${period}，金额 ¥${Number(settlement.amount || 0).toFixed(2)}。确定后不可在本页回退。`
        : ''}
      confirmText="确定结算"
      loading={loading}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
