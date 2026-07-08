/** 千寻币套餐 */
export interface CoinPackage {
  id: number;
  amount: number;
  price: number;
  label: string;
  originalPrice?: string;
  discountLabel?: string;
  tag?: string;
}

/** 千寻币交易明细 */
export interface CoinTransaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  time: string;
  balance: number;
}

/** 千寻币用途项 */
export interface CoinUsage {
  icon: string;
  label: string;
}
