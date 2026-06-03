/** 成家币套餐 */
export interface CoinPackage {
  id: number;
  amount: number;
  price: number;
  label: string;
  tag?: string;
}

/** 成家币交易明细 */
export interface CoinTransaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  time: string;
  balance: number;
}

/** 成家币用途项 */
export interface CoinUsage {
  icon: string;
  label: string;
}
