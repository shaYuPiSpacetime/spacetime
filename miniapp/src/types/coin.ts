/** 千寻币套餐 */
export interface CoinPackage {
  id: number;
  amount: number;
  price: number;
  label: string;
  originalPrice?: string;
  discountLabel?: string;
  tag?: string;
  recommended: boolean;
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
  code: string;
  icon: string;
  label: string;
  price: number;
  description: string;
}
